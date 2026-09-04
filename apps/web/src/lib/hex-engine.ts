export const HEX_SESSION_LENGTH = 40;
export const HEX_SESSION_DURATION_MS = 20 * 60 * 1_000;

export type HexDirection = "decimal-to-hex" | "hex-to-decimal";

export interface HexQuestion {
  id: string;
  ordinal: number;
  direction: HexDirection;
  value: number;
  prompt: string;
  sourceLabel: "DEC" | "HEX";
  targetLabel: "HEX" | "DEC";
  answer: string;
  level: number;
  placeValues: number[];
}

export interface HexAttempt {
  questionId?: string;
  direction: HexDirection;
  prompt?: string;
  expectedAnswer?: string;
  submittedAnswer?: string;
  correct: boolean;
  responseMs: number;
}

export interface DirectionSummary {
  attempts: number;
  correct: number;
  accuracy: number;
  meanMs: number;
}

export interface HexSummary extends DirectionSummary {
  byDirection: Record<HexDirection, DirectionSummary>;
}

export interface HexSessionResult {
  id: string;
  completedAt: string;
  level: number;
  seed: number;
  durationMs: number;
  timedOut: boolean;
  attempts: HexAttempt[];
  summary: HexSummary;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomInteger(random: () => number, minimum: number, maximum: number): number {
  return Math.floor(random() * (maximum - minimum + 1)) + minimum;
}

const LEVEL_MAXIMUMS = [0xff, 0xfff, 0xffff, 0xfffff, 0xffffff] as const;
export const LEVEL_LABELS = ["8-bit", "3-digit hex", "16-bit", "5-digit hex", "24-bit"] as const;

export function decimalToHex(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffff) {
    throw new RangeError("Hex practice values must be whole numbers from 0 to 16,777,215.");
  }
  return value.toString(16).toUpperCase();
}

export function hexToDecimal(value: string): number {
  const normalized = value.trim().replace(/^0x/i, "");
  if (!/^[0-9a-f]+$/i.test(normalized)) throw new TypeError("Invalid hexadecimal value.");
  const parsed = Number.parseInt(normalized, 16);
  if (!Number.isSafeInteger(parsed) || parsed > 0xffffff) throw new RangeError("Hexadecimal value is outside the supported range.");
  return parsed;
}

export function checkHexAnswer(input: string, expected: string, direction: HexDirection): boolean {
  const candidate = input.trim();
  if (direction === "decimal-to-hex") {
    if (!/^(?:0x)?[0-9a-f]+$/i.test(candidate)) return false;
    return Number.parseInt(candidate.replace(/^0x/i, ""), 16) === Number.parseInt(expected, 16);
  }
  if (!/^\d+$/.test(candidate)) return false;
  return Number(candidate) === Number(expected);
}

function powersFor(value: number): number[] {
  const digits = Math.max(1, decimalToHex(value).length);
  return Array.from({ length: digits }, (_, index) => 16 ** (digits - index - 1));
}

export function createHexSession(seed: number, requestedLevel: number): HexQuestion[] {
  const level = clamp(Math.round(requestedLevel), 1, 5);
  const maximum = LEVEL_MAXIMUMS[level - 1] ?? LEVEL_MAXIMUMS[0];
  const random = createSeededRandom(seed);
  const seen = new Set<number>();
  const values: number[] = [];

  while (values.length < HEX_SESSION_LENGTH) {
    const useFoundationBand = level > 1 && values.length % 5 === 0;
    const bandMaximum = useFoundationBand ? (LEVEL_MAXIMUMS[level - 2] ?? 0xff) : maximum;
    const value = randomInteger(random, 0, bandMaximum);
    if (!seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
  }

  const directions: HexDirection[] = Array.from({ length: HEX_SESSION_LENGTH }, (_, index) =>
    index < HEX_SESSION_LENGTH / 2 ? "decimal-to-hex" : "hex-to-decimal",
  );

  return values.map((value, index) => {
    const direction = directions[index]!;
    return {
      id: `hex-${seed}-${index}-${value}`,
      ordinal: index + 1,
      direction,
      value,
      prompt: direction === "decimal-to-hex" ? String(value) : decimalToHex(value),
      sourceLabel: direction === "decimal-to-hex" ? "DEC" : "HEX",
      targetLabel: direction === "decimal-to-hex" ? "HEX" : "DEC",
      answer: direction === "decimal-to-hex" ? decimalToHex(value) : String(value),
      level,
      placeValues: powersFor(value),
    };
  });
}

export function remainingSessionMs(startedAt: number, now: number): number {
  return Math.max(0, HEX_SESSION_DURATION_MS - Math.max(0, now - startedAt));
}

function mean(values: number[]): number {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function summarizeDirection(attempts: HexAttempt[]): DirectionSummary {
  const correct = attempts.filter((attempt) => attempt.correct).length;
  return {
    attempts: attempts.length,
    correct,
    accuracy: attempts.length ? correct / attempts.length : 0,
    meanMs: mean(attempts.filter((attempt) => attempt.correct).map((attempt) => attempt.responseMs)),
  };
}

export function summarizeHexAttempts(attempts: HexAttempt[]): HexSummary {
  const overall = summarizeDirection(attempts);
  return {
    ...overall,
    byDirection: {
      "decimal-to-hex": summarizeDirection(attempts.filter((attempt) => attempt.direction === "decimal-to-hex")),
      "hex-to-decimal": summarizeDirection(attempts.filter((attempt) => attempt.direction === "hex-to-decimal")),
    },
  };
}

export function adaptHexLevel(level: number, result: Pick<HexSummary, "accuracy" | "meanMs" | "attempts">): number {
  const current = clamp(Math.round(level), 1, 5);
  if (result.attempts < 30) return current;
  const paceTarget = [3_200, 4_100, 5_100, 6_200, 7_300][current - 1] ?? 5_100;
  if (result.accuracy >= 0.9 && result.meanMs > 0 && result.meanMs <= paceTarget) return clamp(current + 1, 1, 5);
  if (result.accuracy < 0.7) return clamp(current - 1, 1, 5);
  return current;
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  return `${String(minutesPart).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}`;
}

export function levelMaximum(level: number): number {
  return LEVEL_MAXIMUMS[clamp(Math.round(level), 1, 5) - 1] ?? LEVEL_MAXIMUMS[0];
}
