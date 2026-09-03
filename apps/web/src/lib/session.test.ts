import { describe, expect, it } from "vitest";
import { createSession, reduceSession } from "./session";

describe("practice session state machine", () => {
  it("records an immutable attempt and advances", () => {
    const started = createSession({ seed: 44, size: 8, now: 1_000 });
    const answered = reduceSession(started, {
      type: "answer",
      answer: String(started.questions[0]?.answer),
      now: 3_400,
    });
    expect(answered.attempts).toHaveLength(1);
    expect(answered.attempts[0]?.correct).toBe(true);
    expect(answered.attempts[0]?.responseMs).toBe(2_400);
    expect(answered.index).toBe(1);
  });

  it("excludes paused time from response latency", () => {
    let session = createSession({ seed: 44, size: 8, now: 1_000 });
    session = reduceSession(session, { type: "pause", now: 2_000 });
    session = reduceSession(session, { type: "resume", now: 7_000 });
    session = reduceSession(session, {
      type: "answer",
      answer: String(session.questions[0]?.answer),
      now: 9_000,
    });
    expect(session.attempts[0]?.responseMs).toBe(3_000);
  });

  it("marks backgrounded answers as timing-invalid", () => {
    let session = createSession({ seed: 90, size: 8, now: 1_000 });
    session = reduceSession(session, { type: "visibility-lost", now: 1_500 });
    session = reduceSession(session, {
      type: "answer",
      answer: "0",
      now: 4_000,
    });
    expect(session.attempts[0]?.timingValid).toBe(false);
  });
});
