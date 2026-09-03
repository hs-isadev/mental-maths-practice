import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createSeededRandom, generateQuestion } from "./index";

describe("question engine", () => {
  it("replays the same random sequence from the same seed", () => {
    const first = createSeededRandom(4312);
    const second = createSeededRandom(4312);
    expect(Array.from({ length: 8 }, () => first())).toEqual(
      Array.from({ length: 8 }, () => second()),
    );
  });

  it("generates a deterministic question contract", () => {
    expect(generateQuestion({ skillId: "multiplication", difficulty: 3, seed: 71 })).toEqual(
      generateQuestion({ skillId: "multiplication", difficulty: 3, seed: 71 }),
    );
  });

  it("always emits mathematically correct core-operation answers", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("addition", "subtraction", "multiplication", "division"),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 100_000 }),
        (skillId, difficulty, seed) => {
          const question = generateQuestion({ skillId, difficulty, seed });
          expect(Number.isFinite(question.answer)).toBe(true);
          expect(question.verify(question.answer)).toBe(true);
          expect(question.prompt.length).toBeGreaterThan(2);
        },
      ),
    );
  });

  it("supports every planned skill family", () => {
    const skills = [
      "addition", "subtraction", "multiplication", "division", "fractions",
      "percentages", "ratios", "powers", "estimation", "applied",
    ];
    for (const [index, skillId] of skills.entries()) {
      const question = generateQuestion({ skillId, difficulty: 2, seed: index + 20 });
      expect(question.skillId).toBe(skillId);
      expect(question.strategy).toBeTruthy();
    }
  });
});
