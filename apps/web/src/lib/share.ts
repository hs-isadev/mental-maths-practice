import { PRACTICE_MODES, type PracticeModeId } from "./practice-engine";

export type ChallengeMode = PracticeModeId | "hexadecimal";

export interface Challenge {
  mode: ChallengeMode;
  level: number;
  seed: number;
}

const validModes = new Set<string>([...PRACTICE_MODES.map((mode) => mode.id), "hexadecimal"]);

export function buildChallengeUrl(mode: ChallengeMode, level: number, seed: number, baseUrl = window.location.href): string {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("mode", mode);
  url.searchParams.set("level", String(level));
  url.searchParams.set("seed", String(seed >>> 0));
  return url.toString();
}

export function readChallenge(urlValue: string): Challenge | null {
  const url = new URL(urlValue);
  const mode = url.searchParams.get("mode");
  const level = Number(url.searchParams.get("level"));
  const seedText = url.searchParams.get("seed");
  const seed = Number(seedText);
  if (!mode || !validModes.has(mode) || !Number.isInteger(level) || level < 1 || level > 5 || !seedText || !/^\d+$/.test(seedText) || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) return null;
  return { mode: mode as ChallengeMode, level, seed };
}
