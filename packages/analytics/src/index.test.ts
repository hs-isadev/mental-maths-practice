import { describe, expect, it } from "vitest";
import { buildTrend, summarizeAttempts } from "./index";

describe("analytics", () => {
  const attempts = [
    { correct: true, responseMs: 3_000, timingValid: true },
    { correct: false, responseMs: 8_000, timingValid: true },
    { correct: true, responseMs: 1_000, timingValid: true },
    { correct: true, responseMs: 99_000, timingValid: false },
  ];

  it("reports accuracy from all completed attempts but pace from valid correct attempts", () => {
    const summary = summarizeAttempts(attempts);
    expect(summary.accuracy).toBe(0.75);
    expect(summary.medianResponseMs).toBe(2_000);
    expect(summary.validPaceSampleSize).toBe(2);
  });

  it("labels tiny samples as provisional", () => {
    expect(summarizeAttempts(attempts).confidence).toBe("provisional");
  });

  it("builds a seven-day trend with empty days preserved", () => {
    const trend = buildTrend(
      [{ completedAt: "2026-09-03T08:00:00.000Z", attempts }],
      new Date("2026-09-03T10:00:00.000Z"),
    );
    expect(trend).toHaveLength(7);
    expect(trend.at(-1)?.attempts).toBe(4);
    expect(trend[0]?.attempts).toBe(0);
  });
});
