import test from "node:test";
import assert from "node:assert/strict";

// Regression for issue #2: a fresh install without a generated Prisma client
// crashed startup with "Named export 'Status' not found".
test("every controller imports without missing Prisma exports", async () => {
  const controllers = [
    "account",
    "activity",
    "auth",
    "call",
    "campaign",
    "contact",
    "dashboard",
    "integration",
    "invitation",
    "opportunity",
    "organization",
    "project",
    "search",
    "task",
    "tenant",
    "user",
  ];

  for (const name of controllers) {
    await assert.doesNotReject(
      () => import(`../src/controllers/${name}.controller.js`),
      `${name}.controller.js failed to import`
    );
  }
});
