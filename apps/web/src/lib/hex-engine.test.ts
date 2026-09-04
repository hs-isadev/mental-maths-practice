import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  HEX_SESSION_DURATION_MS,
  HEX_SESSION_LENGTH,
  adaptHexLevel,
  checkHexAnswer,
  createHexSession,
  decimalToHex,
  formatDuration,
  hexToDecimal,
  levelMaximum,
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

  it("rejects invalid and out-of-range conversions", () => {
    expect(() => decimalToHex(-1)).toThrow(RangeError);
    expect(() => decimalToHex(1.5)).toThrow(RangeError);
    expect(() => hexToDecimal("G1")).toThrow(TypeError);
    expect(() => hexToDecimal("1000000")).toThrow(RangeError);
  });

  it("balances both conversion directions exactly", () => {
    const questions = createHexSession(902, 3);
    expect(questions.filter((question) => question.direction === "decimal-to-hex")).toHaveLength(20);
    expect(questions.filter((question) => question.direction === "hex-to-decimal")).toHaveLength(20);
    expect(new Set(questions.map((question) => question.id)).size).toBe(40);
  });

  it("keeps basic sessions within the two-digit hexadecimal range", () => {
    const questions = createHexSession(903, 1);
    expect(questions).toHaveLength(40);
    expect(questions.every((question) => question.value >= 0 && question.value <= 0xff)).toBe(true);
    expect(questions.filter((question) => question.direction === "decimal-to-hex")).toHaveLength(20);
    expect(questions.filter((question) => question.direction === "hex-to-decimal")).toHaveLength(20);
  });

  it("generates deterministic sessions from a seed", () => {
    expect(createHexSession(123456, 4)).toEqual(createHexSession(123456, 4));
  });

  it("creates a fresh question set when a new session seed is used", () => {
    const first = createHexSession(123456, 2).map((question) => `${question.direction}:${question.value}`);
    const second = createHexSession(654321, 2).map((question) => `${question.direction}:${question.value}`);
    expect(second).not.toEqual(first);
  });

  it("accepts uppercase, lowercase, and an optional 0x prefix for hex answers", () => {
    expect(checkHexAnswer("ff", "FF", "decimal-to-hex")).toBe(true);
    expect(checkHexAnswer("0xFF", "FF", "decimal-to-hex")).toBe(true);
    expect(checkHexAnswer(" 255 ", "255", "hex-to-decimal")).toBe(true);
    expect(checkHexAnswer("FG", "FF", "decimal-to-hex")).toBe(false);
    expect(checkHexAnswer("25.5", "255", "hex-to-decimal")).toBe(false);
    expect(checkHexAnswer("254", "255", "hex-to-decimal")).toBe(false);
  });

  it("clamps the hard countdown at zero", () => {
    expect(remainingSessionMs(1_000, 601_000)).toBe(600_000);
    expect(remainingSessionMs(1_000, 1_300_000)).toBe(0);
  });

  it("uses accuracy and pace together when adapting the next session", () => {
    expect(adaptHexLevel(2, { accuracy: .95, meanMs: 2_500, attempts: 40 })).toBe(3);
    expect(adaptHexLevel(4, { accuracy: .62, meanMs: 8_000, attempts: 40 })).toBe(3);
    expect(adaptHexLevel(3, { accuracy: .9, meanMs: 6_000, attempts: 10 })).toBe(3);
  });

  it("summarizes mean pace from correct answers and keeps direction splits", () => {
    const summary = summarizeHexAttempts([
      { direction: "decimal-to-hex", correct: true, responseMs: 1_000 },
      { direction: "decimal-to-hex", correct: true, responseMs: 2_000 },
      { direction: "decimal-to-hex", correct: false, responseMs: 100 },
      { direction: "hex-to-decimal", correct: true, responseMs: 9_000 },
    ]);
    expect(summary.accuracy).toBeCloseTo(3 / 4);
    expect(summary.meanMs).toBe(4_000);
    expect(summary.byDirection["decimal-to-hex"].meanMs).toBe(1_500);
    expect(summary.byDirection["decimal-to-hex"].accuracy).toBeCloseTo(2 / 3);
    expect(summary.byDirection["hex-to-decimal"].accuracy).toBe(1);
  });

  it("formats durations and clamps level bounds for display", () => {
    expect(formatDuration(61_001)).toBe("01:02");
    expect(formatDuration(-10)).toBe("00:00");
    expect(levelMaximum(0)).toBe(0xff);
    expect(levelMaximum(99)).toBe(0xffffff);
    expect(summarizeHexAttempts([]).meanMs).toBe(0);
  });
});
