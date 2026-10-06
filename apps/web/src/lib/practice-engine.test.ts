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
      "decimals-large-numbers", "fast-factorising", "quadratic-inequalities", "physics", "mixed",
    ]);
  });

  it("creates 20 varied, mathematically valid questions for every topic", () => {
    for (const [index, mode] of PRACTICE_MODES.entries()) {
      const questions = createPracticeSession(7_000 + index, mode.id, 3);
      expect(questions).toHaveLength(20);
      expect(new Set(questions.map((question) => question.id)).size).toBe(20);
      for (const question of questions) {
        expect(verifyPracticeAnswer(String(question.answer), question)).toBe(true);
        expect(question.strategy.length).toBeGreaterThan(5);
      }
    }
  });

  it("generates progressive difficulty questions with shortcut tips for physics", () => {
    for (let lvl = 1; lvl <= 5; lvl++) {
      const physics = createPracticeSession(8_100 + lvl, "physics", lvl);
      expect(physics).toHaveLength(20);
      for (const q of physics) {
        expect(verifyPracticeAnswer(String(q.answer), q)).toBe(true);
        expect(q.strategy.length).toBeGreaterThan(5);
      }
    }
  });

  it("generates progressive difficulty for quadratic inequalities and fast factorising", () => {
    for (let lvl = 1; lvl <= 5; lvl++) {
      const quad = createPracticeSession(8_200 + lvl, "quadratic-inequalities", lvl);
      expect(quad).toHaveLength(20);
      for (const q of quad) {
        expect(verifyPracticeAnswer(String(q.answer), q)).toBe(true);
        expect(q.strategy.length).toBeGreaterThan(5);
      }
      const factor = createPracticeSession(8_300 + lvl, "fast-factorising", lvl);
      expect(factor).toHaveLength(20);
      for (const q of factor) {
        expect(verifyPracticeAnswer(String(q.answer), q)).toBe(true);
        expect(q.strategy.length).toBeGreaterThan(5);
      }
    }
  });

  it("generates accurate decimal and large number questions", () => {
    for (let lvl = 1; lvl <= 5; lvl++) {
      const decimals = createPracticeSession(8_400 + lvl, "decimals-large-numbers", lvl);
      expect(decimals).toHaveLength(20);
      for (const q of decimals) {
        expect(verifyPracticeAnswer(String(q.answer), q)).toBe(true);
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

  it("mixes every maths category into each general session", () => {
    const questions = createPracticeSession(333, "mixed", 3);
    const counts = new Map<string, number>();
    for (const question of questions) counts.set(question.mode, (counts.get(question.mode) ?? 0) + 1);

    expect(questions).toHaveLength(20);
    expect([...counts.keys()].sort()).toEqual([
      "addition", "applied", "division", "estimation", "fractions",
      "multiplication", "percentages", "powers", "ratios", "subtraction",
    ]);
    expect([...counts.values()].every((count) => count === 2)).toBe(true);
    expect(createPracticeSession(333, "mixed", 3)).toEqual(questions);
  });

  it("generates awkward improper fractions with non-whole answers", () => {
    const questions = createPracticeSession(444, "fractions", 5);
    expect(questions.some((question) => {
      const match = question.prompt.match(/^(\d+)\/(\d+)/);
      return match && Number(match[1]) > Number(match[2]) && !Number.isInteger(question.answer);
    })).toBe(true);
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
