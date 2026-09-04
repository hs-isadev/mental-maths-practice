import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("hex conversion trainer", () => {
  it("opens on the focused hexadecimal test briefing", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /convert faster under pressure/i })).toBeVisible();
    expect(screen.getByText("40 conversions")).toBeVisible();
    expect(screen.getByText("20:00 limit")).toBeVisible();
  });

  it("has one obvious action to start the timed session", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /start 40-question session/i })).toBeEnabled();
  });
});
