import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("invitation controller imports every service function it calls", async () => {
  const source = await readFile(
    new URL("../src/controllers/invitation.controller.js", import.meta.url),
    "utf8"
  );
  const importBlock =
    source.match(/import\s*\{([\s\S]*?)\}\s*from\s*"\.\.\/services\/invitation\.service\.js"/)?.[1] || "";

  for (const name of [
    "createInvitation",
    "inviteUrlFor",
    "reissueInvitation",
    "previewInvitation",
    "acceptInvitation",
  ]) {
    assert.match(importBlock, new RegExp(`\\b${name}\\b`), `${name} is called but not imported`);
  }
});
