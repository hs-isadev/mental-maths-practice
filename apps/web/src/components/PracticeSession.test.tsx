import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPracticeSession } from "../lib/practice-engine";
import { PracticeSession } from "./PracticeSession";

describe("practice session", () => {
  afterEach(() => vi.useRealTimers());

  it("hides level five questions after a 500 ms flash while leaving the answer enabled", () => {
    vi.useFakeTimers();
    const questions = createPracticeSession(555, "addition", 5);
    render(<PracticeSession questions={questions} mode="addition" level={5} seed={555} onComplete={vi.fn()} onExit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: questions[0]!.prompt })).toBeVisible();
    act(() => vi.advanceTimersByTime(500));

    expect(screen.queryByText(questions[0]!.prompt)).not.toBeInTheDocument();
    expect(screen.getByText(/question hidden/i)).toBeVisible();
    expect(screen.getByRole("textbox")).toBeEnabled();
  });
});
