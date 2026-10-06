import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("mental maths practice app", () => {
  it("opens on a straightforward topic picker", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /mental maths practice/i })).toBeVisible();
    expect(screen.queryByText(/convert faster under pressure/i)).not.toBeInTheDocument();
    for (const topic of [
      "Addition", "Subtraction", "Multiplication", "Division",
      "Fractions", "Percentages", "Ratios", "Powers", "Estimation", "Applied problems",
      "Decimals & large numbers", "Fast factorising", "Quadratic inequalities", "Physics calculations",
      "General maths", "Hexadecimal",
    ]) {
      expect(screen.getByRole("button", { name: new RegExp(topic, "i") })).toBeEnabled();
    }
  });

  it("starts a normal mental maths session without removing hexadecimal practice", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^addition/i }));
    expect(screen.getByText(/Question 1 of 20/)).toBeVisible();
  });

  it("starts a physics speed calculation session", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /physics calculations/i }));
    expect(screen.getByText(/Question 1 of 20/)).toBeVisible();
    expect(screen.getByText(/Physics calculations · Level 2/i)).toBeVisible();
  });

  it("starts a randomized general maths session", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^general maths/i }));
    expect(screen.getByText(/Question 1 of 20/)).toBeVisible();
    expect(screen.getByText(/General maths · Level 2/i)).toBeVisible();
  });

  it("starts the hexadecimal mode as a 40-question session", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^hexadecimal/i }));
    expect(screen.getByText("of 40")).toBeVisible();
  });

  it("lets the user start basic hexadecimal practice limited to 00–FF", () => {
    render(<App />);
    const range = screen.getByRole("combobox", { name: /hex range/i });
    fireEvent.change(range, { target: { value: "basic" } });
    fireEvent.click(screen.getByRole("button", { name: /^hexadecimal/i }));

    expect(screen.getByText("Basic range · 00–FF")).toBeVisible();
    expect(screen.getByText("of 40")).toBeVisible();
  });
});
