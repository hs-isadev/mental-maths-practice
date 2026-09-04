import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPracticeSession } from "../lib/practice-engine";
import { PracticeSession } from "./PracticeSession";

describe("practice session", () => {
  afterEach(() => vi.useRealTimers());

  it("gives short level five calculations 1.5 seconds before hiding them", () => {
    vi.useFakeTimers();
    const questions = createPracticeSession(555, "addition", 5);
    render(<PracticeSession questions={questions} mode="addition" level={5} seed={555} onComplete={vi.fn()} onExit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: questions[0]!.prompt })).toBeVisible();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole("heading", { name: questions[0]!.prompt })).toBeVisible();

    act(() => vi.advanceTimersByTime(1_000));

    expect(screen.queryByText(questions[0]!.prompt)).not.toBeInTheDocument();
    expect(screen.getByText(/question hidden/i)).toBeVisible();
    expect(screen.getByRole("textbox")).toBeEnabled();
  });

  it("keeps sentence-style level five questions visible", () => {
    vi.useFakeTimers();
    const questions = createPracticeSession(556, "applied", 5);
    render(<PracticeSession questions={questions} mode="applied" level={5} seed={556} onComplete={vi.fn()} onExit={vi.fn()} />);

    act(() => vi.advanceTimersByTime(5_000));

    expect(screen.getByRole("heading", { name: questions[0]!.prompt })).toBeVisible();
    expect(screen.queryByText(/question hidden/i)).not.toBeInTheDocument();
  });
});
