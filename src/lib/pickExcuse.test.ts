import { test } from "node:test";
import assert from "node:assert/strict";
import { pickExcuse } from "./pickExcuse.ts";

const list = [{ id: 1 }, { id: 2 }, { id: 3 }];

test("empty list gives null", () => {
  assert.equal(pickExcuse([], null), null);
});

test("single item is returned even if it was the previous one", () => {
  assert.deepEqual(pickExcuse([{ id: 7 }], 7), { id: 7 });
});

test("never repeats the previous excuse", () => {
  for (const r of [0, 0.5, 0.999]) {
    assert.notEqual(pickExcuse(list, 2, () => r)?.id, 2);
  }
});

test("covers the whole pool", () => {
  assert.equal(pickExcuse(list, null, () => 0)?.id, 1);
  assert.equal(pickExcuse(list, null, () => 0.999)?.id, 3);
});
