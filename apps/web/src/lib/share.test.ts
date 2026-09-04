import { describe, expect, it } from "vitest";
import { buildChallengeUrl, readChallenge } from "./share";

describe("shareable practice links", () => {
  it("round-trips a challenge mode, level, and seed", () => {
    const url = buildChallengeUrl("hexadecimal", 3, 98765, "https://maths.example/practice");
    expect(readChallenge(url)).toEqual({ mode: "hexadecimal", level: 3, seed: 98765 });
  });

  it("rejects unknown or malformed challenge parameters", () => {
    expect(readChallenge("https://maths.example/?mode=unknown&level=2&seed=4")).toBeNull();
    expect(readChallenge("https://maths.example/?mode=addition&level=x&seed=4")).toBeNull();
  });
});
