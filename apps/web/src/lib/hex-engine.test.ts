import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  HEX_SESSION_DURATION_MS,
  HEX_SESSION_LENGTH,
  adaptHexLevel,
  checkHexAnswer,
  createHexSession,
  decimalToHex,
  hexToDecimal,
  remainingSessionMs,
  summarizeHexAttempts,
} from "./hex-engine";

describe("hex conversion engine", () => {
  it("locks every session to 40 questions and 20 minutes", () => {
    expect(HEX_SESSION_LENGTH).toBe(40);
    expect(HEX_SESSION_DURATION_MS).toBe(20 * 60 * 1_000);
    expect(createHexSession(901, 2)).toHaveLength(40);
  });

  it("round-trips every supported value without precision loss", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 0xffffff }), (value) => {
      expect(hexToDecimal(decimalToHex(value))).toBe(value);
    }));
  });

  it("balances both conversion directions exactly", () => {
    const questions = createHexSession(902, 3);
    expect(questions.filter((question) => question.direction === "decimal-to-hex")).toHaveLength(20);
    expect(questions.filter((question) => question.direction === "hex-to-decimal")).toHaveLength(20);
    expect(new Set(questions.map((question) => question.id)).size).toBe(40);
  });

  it("generates deterministic sessions from a seed", () => {
    expect(createHexSession(123456, 4)).toEqual(createHexSession(123456, 4));
  });

  it("accepts uppercase, lowercase, and an optional 0x prefix for hex answers", () => {
    expect(checkHexAnswer("ff", "FF", "decimal-to-hex")).toBe(true);
    expect(checkHexAnswer("0xFF", "FF", "decimal-to-hex")).toBe(true);
    expect(checkHexAnswer(" 255 ", "255", "hex-to-decimal")).toBe(true);
    expect(checkHexAnswer("FG", "FF", "decimal-to-hex")).toBe(false);
  });

  it("clamps the hard countdown at zero", () => {
    expect(remainingSessionMs(1_000, 601_000)).toBe(600_000);
    expect(remainingSessionMs(1_000, 1_300_000)).toBe(0);
  });

  it("uses accuracy and pace together when adapting the next session", () => {
    expect(adaptHexLevel(2, { accuracy: .95, medianMs: 2_500, attempts: 40 })).toBe(3);
    expect(adaptHexLevel(4, { accuracy: .62, medianMs: 8_000, attempts: 40 })).toBe(3);
    expect(adaptHexLevel(3, { accuracy: .9, medianMs: 6_000, attempts: 10 })).toBe(3);
  });

  it("summarizes pace from correct answers and keeps direction splits", () => {
    const summary = summarizeHexAttempts([
      { direction: "decimal-to-hex", correct: true, responseMs: 2_000 },
      { direction: "decimal-to-hex", correct: false, responseMs: 800 },
      { direction: "hex-to-decimal", correct: true, responseMs: 4_000 },
    ]);
    expect(summary.accuracy).toBeCloseTo(2 / 3);
    expect(summary.medianMs).toBe(3_000);
    expect(summary.byDirection["decimal-to-hex"].accuracy).toBe(.5);
    expect(summary.byDirection["hex-to-decimal"].accuracy).toBe(1);
  });
});
