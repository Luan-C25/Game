import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDollars, parseQuantity, lineAmount, divRoundHalfUp, formatAud, formatQuantity, centsToInput } from "../src/shared/money.ts";

test("parseDollars handles common inputs", () => {
  assert.equal(parseDollars("70.23"), 7023);
  assert.equal(parseDollars("$1,200"), 120000);
  assert.equal(parseDollars("15"), 1500);
  assert.equal(parseDollars("0.5"), 50);
  assert.equal(parseDollars(" 9.9 "), 990);
  assert.equal(parseDollars(""), null);
  assert.equal(parseDollars("1.234"), null);
  assert.equal(parseDollars("-5"), null);
  assert.equal(parseDollars("abc"), null);
});

test("parseQuantity keeps two decimal places", () => {
  assert.equal(parseQuantity("1.5"), 150);
  assert.equal(parseQuantity("2.25"), 225);
  assert.equal(parseQuantity("3"), 300);
  assert.equal(parseQuantity("1.255"), null);
});

test("divRoundHalfUp rounds halves up", () => {
  assert.equal(divRoundHalfUp(5, 10), 1);
  assert.equal(divRoundHalfUp(4, 10), 0);
  assert.equal(divRoundHalfUp(15, 10), 2);
  assert.equal(divRoundHalfUp(25, 10), 3);
  assert.throws(() => divRoundHalfUp(-1, 10));
});

test("lineAmount multiplies quantity by rate exactly then rounds once", () => {
  assert.equal(lineAmount(100, 7358), 7358); // 1 h at $73.58
  assert.equal(lineAmount(250, 7358), 18395); // 2.5 h
  assert.equal(lineAmount(133, 7023), 9341); // 1.33 h x 70.23 = 93.4059 -> 93.41
  assert.equal(lineAmount(1250, 100), 1250); // 12.5 km at $1.00
  assert.equal(lineAmount(1, 50), 1); // 0.01 x 0.50 = 0.005 -> 0.01 (half up)
  assert.equal(lineAmount(0, 9999), 0);
});

test("formatting", () => {
  assert.equal(formatAud(123456), "$1,234.56");
  assert.equal(formatAud(5), "$0.05");
  assert.equal(formatAud(-250), "-$2.50");
  assert.equal(formatQuantity(150), "1.5");
  assert.equal(formatQuantity(225), "2.25");
  assert.equal(formatQuantity(300), "3");
  assert.equal(centsToInput(7023), "70.23");
  assert.equal(centsToInput(5), "0.05");
});
