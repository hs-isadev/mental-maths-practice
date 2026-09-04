import { describe, expect, it } from "vitest";
import { joinBasePath, normalizeBasePath } from "./pwa-paths";

describe("PWA deployment paths", () => {
  it("normalizes root and repository subpaths", () => {
    expect(normalizeBasePath()).toBe("/");
    expect(normalizeBasePath("mental-maths-practice")).toBe("/mental-maths-practice/");
    expect(normalizeBasePath("/mental-maths-practice/")).toBe("/mental-maths-practice/");
  });

  it("joins public assets without losing the repository prefix", () => {
    expect(joinBasePath("/", "sw.js")).toBe("/sw.js");
    expect(joinBasePath("/mental-maths-practice/", "/icon-192.png")).toBe(
      "/mental-maths-practice/icon-192.png",
    );
  });
});
