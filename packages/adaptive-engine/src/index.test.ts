import { describe, expect, it } from "vitest";
import { buildDailyPlan, createInitialEstimate, updateSkillEstimate } from "./index";

describe("adaptive engine", () => {
  it("does not promote from one lucky fast answer", () => {
    const initial = createInitialEstimate("addition", 2);
    const next = updateSkillEstimate(initial, [
      { correct: true, responseMs: 620, timingValid: true, difficulty: 2 },
    ]);
    expect(next.level).toBe(2);
    expect(next.reason).toContain("more evidence");
  });

  it("promotes after sustained accurate evidence", () => {
    const initial = createInitialEstimate("addition", 2);
    const attempts = Array.from({ length: 10 }, () => ({
      correct: true,
      responseMs: 1_700,
      timingValid: true,
      difficulty: 2,
    }));
    const next = updateSkillEstimate(initial, attempts);
    expect(next.level).toBe(3);
    expect(next.reason).toContain("accuracy held");
  });

  it("demotes gently after repeated struggle", () => {
    const initial = createInitialEstimate("division", 4);
    const attempts = Array.from({ length: 8 }, (_, index) => ({
      correct: index < 4,
      responseMs: 9_000,
      timingValid: true,
      difficulty: 4,
    }));
    const next = updateSkillEstimate(initial, attempts);
    expect(next.level).toBe(3);
  });

  it("builds a deterministic, chaptered daily plan", () => {
    const estimates = [
      createInitialEstimate("addition", 4),
      { ...createInitialEstimate("division", 2), accuracy: 0.58, dueScore: 0.92 },
      createInitialEstimate("percentages", 1),
    ];
    const plan = buildDailyPlan({ estimates, seed: 20260903, size: 20 });
    expect(plan).toEqual(buildDailyPlan({ estimates, seed: 20260903, size: 20 }));
    expect(plan).toHaveLength(20);
    expect(new Set(plan.map((item) => item.chapter))).toEqual(
      new Set(["warmup", "core", "repair", "finish"]),
    );
    expect(plan.filter((item) => item.skillId === "division").length).toBeGreaterThan(2);
  });
});
