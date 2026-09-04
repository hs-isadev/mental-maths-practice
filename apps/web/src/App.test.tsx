import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("mental maths practice app", () => {
  it("opens on a straightforward topic picker", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /mental maths practice/i })).toBeVisible();
    expect(screen.queryByText(/convert faster under pressure/i)).not.toBeInTheDocument();
    for (const topic of ["Addition", "Subtraction", "Multiplication", "Division", "Fractions", "Percentages", "Ratios", "Powers", "Estimation", "Applied problems", "Hexadecimal"]) {
      expect(screen.getByRole("button", { name: new RegExp(topic, "i") })).toBeEnabled();
    }
  });

  it("starts a normal mental maths session without removing hexadecimal practice", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^addition/i }));
    expect(screen.getByText(/Question 1 of 20/)).toBeVisible();
  });

  it("starts the hexadecimal mode as a 40-question session", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^hexadecimal/i }));
    expect(screen.getByText("of 40")).toBeVisible();
  });
});
