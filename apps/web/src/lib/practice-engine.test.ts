import { describe, expect, it } from "vitest";
import {
  PRACTICE_MODES,
  adaptPracticeLevel,
  createPracticeSession,
  summarizePracticeAttempts,
  verifyPracticeAnswer,
} from "./practice-engine";

describe("general mental maths engine", () => {
  it("supports every requested non-hexadecimal topic", () => {
    expect(PRACTICE_MODES.map((mode) => mode.id)).toEqual([
      "addition", "subtraction", "multiplication", "division", "fractions",
      "percentages", "ratios", "powers", "estimation", "applied",
    ]);
  });

  it("creates 20 varied, mathematically valid questions for every topic", () => {
    for (const [index, mode] of PRACTICE_MODES.entries()) {
      const questions = createPracticeSession(7_000 + index, mode.id, 3);
      expect(questions).toHaveLength(20);
      expect(new Set(questions.map((question) => question.id)).size).toBe(20);
      for (const question of questions) {
        expect(verifyPracticeAnswer(String(question.answer), question)).toBe(true);
      }
    }
  });

  it("keeps subtraction non-negative and division exact", () => {
    const subtraction = createPracticeSession(111, "subtraction", 5);
    const division = createPracticeSession(222, "division", 5);
    expect(subtraction.every((question) => question.answer >= 0)).toBe(true);
    expect(division.every((question) => Number.isInteger(question.answer))).toBe(true);
  });

  it("uses different seeds to produce different sessions", () => {
    const first = createPracticeSession(1, "multiplication", 2).map((question) => question.prompt);
    const second = createPracticeSession(2, "multiplication", 2).map((question) => question.prompt);
    expect(second).not.toEqual(first);
  });

  it("tracks mean speed from correct answers and uses it for difficulty", () => {
    const varied = summarizePracticeAttempts([
      { correct: true, responseMs: 1_000 },
      { correct: true, responseMs: 2_000 },
      { correct: true, responseMs: 9_000 },
      { correct: false, responseMs: 100 },
    ]);
    const strong = summarizePracticeAttempts(Array.from({ length: 20 }, () => ({ correct: true, responseMs: 1_500 })));
    const struggling = summarizePracticeAttempts(Array.from({ length: 20 }, (_, index) => ({ correct: index < 10, responseMs: 7_000 })));
    expect(varied.meanMs).toBe(4_000);
    expect(strong.accuracy).toBe(1);
    expect(strong.meanMs).toBe(1_500);
    expect(adaptPracticeLevel(2, strong)).toBe(3);
    expect(adaptPracticeLevel(4, struggling)).toBe(3);
  });
});
