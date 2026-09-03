import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("app shell", () => {
  it("opens on the actionable Today workspace", () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /ready for today's run/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /start daily workout/i })).toBeEnabled();
  });

  it("exposes the primary product areas", () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    for (const name of ["Today", "Practice", "Skill map", "Progress", "Challenges"]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }
  });
});
