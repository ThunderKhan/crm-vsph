import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAccountType } from "../src/controllers/account.controller.js";

test("account type labels map onto the Prisma enum", () => {
  assert.equal(normalizeAccountType("Customer"), "CUSTOMER");
  assert.equal(normalizeAccountType("competitor"), "COMPETITER");
  assert.equal(normalizeAccountType("COMPETITER"), "COMPETITER");
  assert.equal(normalizeAccountType("Reseller"), "RESELLER");
});

test("unknown account types are dropped instead of failing the insert", () => {
  assert.equal(normalizeAccountType("Vendor"), undefined);
  assert.equal(normalizeAccountType("Other"), undefined);
  assert.equal(normalizeAccountType(""), undefined);
  assert.equal(normalizeAccountType(undefined), undefined);
});
