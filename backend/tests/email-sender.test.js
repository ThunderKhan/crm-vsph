import test from "node:test";
import assert from "node:assert/strict";
import { sendMail, senderBlockedReason } from "../src/services/email.service.js";

const withEnv = async (vars, fn) => {
  const previous = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]));
  Object.assign(process.env, vars);
  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test("employees may send from their own address on a verified domain", async () => {
  await withEnv({ EMAIL_SENDER_DOMAINS: "vsph.in", EMAIL_FROM: "crm@vsph.in" }, () => {
    assert.equal(senderBlockedReason("hardik@vsph.in"), null);
    assert.match(senderBlockedReason("hardik@gmail.com"), /not verified/);
  });
});

test("EMAIL_FROM domain is the default when EMAIL_SENDER_DOMAINS is unset", async () => {
  await withEnv({ EMAIL_SENDER_DOMAINS: "", EMAIL_FROM: "crm@vsph.in" }, () => {
    assert.equal(senderBlockedReason("sales@vsph.in"), null);
  });
});

test("the shared resend.dev domain only allows its own demo address", async () => {
  await withEnv({ EMAIL_SENDER_DOMAINS: "", EMAIL_FROM: "onboarding@resend.dev" }, () => {
    assert.equal(senderBlockedReason("onboarding@resend.dev"), null);
    assert.match(senderBlockedReason("employee@resend.dev"), /shared/);
  });
});

test("an account without an email cannot send", () => {
  assert.match(senderBlockedReason(""), /no email address/);
});

test("sending fails loudly when Resend is not configured", async () => {
  await withEnv({ RESEND_API_KEY: "" }, async () => {
    await assert.rejects(
      () => sendMail({ from: "a@vsph.in", to: "b@vsph.in", subject: "Hi", text: "Body" }),
      (error) => error.status === 503
    );
  });
});
