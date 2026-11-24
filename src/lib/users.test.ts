import { test } from "node:test";
import assert from "node:assert/strict";
import { passwordError, usernameError, usernameToEmail } from "./users.ts";

test("username maps to a lowercase synthetic email", () => {
  assert.equal(usernameToEmail(" Admin "), "admin@users.ghalti.local");
});

test("username rules", () => {
  for (const ok of ["abc", "kane_2", "a".repeat(32)]) assert.equal(usernameError(ok), null);
  for (const bad of ["ab", "Kane", "a b", "x@y", "a".repeat(33), ""]) assert.notEqual(usernameError(bad), null);
});

test("password length bounds", () => {
  assert.equal(passwordError("12345678"), null);
  assert.notEqual(passwordError("1234567"), null);
  assert.notEqual(passwordError("x".repeat(73)), null);
});
