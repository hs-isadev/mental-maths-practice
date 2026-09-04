export const PRACTICE_SESSION_LENGTH = 20;
export const PRACTICE_SESSION_DURATION_MS = 10 * 60 * 1_000;

export type PracticeModeId =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "fractions"
  | "percentages"
  | "ratios"
  | "powers"
  | "estimation"
  | "applied"
  | "mixed";

const MIXED_CATEGORY_IDS = [
  "addition", "subtraction", "multiplication", "division", "fractions",
  "percentages", "ratios", "powers", "estimation", "applied",
] as const satisfies readonly Exclude<PracticeModeId, "mixed">[];

export interface PracticeMode {
  id: PracticeModeId;
  label: string;
  description: string;
}

export const PRACTICE_MODES: readonly PracticeMode[] = [
  { id: "addition", label: "Addition", description: "Build speed with sums at your current range." },
  { id: "subtraction", label: "Subtraction", description: "Positive differences with progressively larger values." },
  { id: "multiplication", label: "Multiplication", description: "Times tables first, then larger factors." },
  { id: "division", label: "Division", description: "Exact whole-number divisions without remainders." },
  { id: "fractions", label: "Fractions", description: "Work with proper and improper fractions." },
  { id: "percentages", label: "Percentages", description: "Common percentages and increasingly varied values." },
  { id: "ratios", label: "Ratios", description: "Split totals into two-part ratios." },
  { id: "powers", label: "Powers", description: "Squares and cubes for quick recall." },
  { id: "estimation", label: "Estimation", description: "Round values to useful place values." },
  { id: "applied", label: "Applied problems", description: "Short price, grouping, and change questions." },
  { id: "mixed", label: "General maths", description: "A shuffled mix with two questions from every topic." },
] as const;

export interface PracticeQuestion {
  id: string;
  ordinal: number;
  mode: PracticeModeId;
  prompt: string;
  answer: number;
  strategy: string;
  level: number;
}

export interface PracticeAttempt {
  questionId?: string;
  prompt?: string;
  expectedAnswer?: number;
  submittedAnswer?: string;
  correct: boolean;
  responseMs: number;
}

export interface PracticeSummary {
  attempts: number;
  correct: number;
  accuracy: number;
  meanMs: number;
}

export interface PracticeSessionResult {
  id: string;
  completedAt: string;
  mode: PracticeModeId;
  level: number;
  seed: number;
  durationMs: number;
  timedOut: boolean;
  attempts: PracticeAttempt[];
  summary: PracticeSummary;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function modeHash(mode: PracticeModeId): number {
  return [...mode].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16_777_619), 2_166_136_261) >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function integer(random: () => number, minimum: number, maximum: number): number {
  return Math.floor(random() * (maximum - minimum + 1)) + minimum;
}

function choose<T>(random: () => number, values: readonly T[]): T {
  return values[integer(random, 0, values.length - 1)]!;
}

function greatestCommonDivisor(a: number, b: number): number {
  let left = a;
  let right = b;
  while (right) [left, right] = [right, left % right];
  return left;
}

function generateQuestion(random: () => number, mode: Exclude<PracticeModeId, "mixed">, level: number): Omit<PracticeQuestion, "id" | "ordinal"> {
  const maximums = [20, 100, 500, 2_000, 10_000];
  const maximum = maximums[level - 1] ?? maximums[0]!;

  if (mode === "addition") {
    const a = integer(random, 1, maximum);
    const b = integer(random, 1, maximum);
    return { mode, prompt: `${a} + ${b}`, answer: a + b, strategy: "Add from the largest place value first.", level };
  }
  if (mode === "subtraction") {
    const a = integer(random, 1, maximum);
    const b = integer(random, 1, maximum);
    const high = Math.max(a, b);
    const low = Math.min(a, b);
    return { mode, prompt: `${high} − ${low}`, answer: high - low, strategy: "Count up from the smaller number or subtract in parts.", level };
  }
  if (mode === "multiplication") {
    const factorMaximum = [6, 10, 12, 20, 30][level - 1] ?? 6;
    const a = integer(random, 2, factorMaximum);
    const b = integer(random, 2, factorMaximum);
    return { mode, prompt: `${a} × ${b}`, answer: a * b, strategy: "Split one factor into an easy multiple when needed.", level };
  }
  if (mode === "division") {
    const factorMaximum = [6, 10, 12, 20, 30][level - 1] ?? 6;
    const divisor = integer(random, 2, factorMaximum);
    const quotient = integer(random, 2, factorMaximum);
    return { mode, prompt: `${divisor * quotient} ÷ ${divisor}`, answer: quotient, strategy: "Reverse the related multiplication fact.", level };
  }
  if (mode === "fractions") {
    if (level >= 2) {
      const denominator = integer(random, 7, 15 + level * 5);
      let numerator = integer(random, denominator + 1, denominator * 3);
      if (numerator % denominator === 0) numerator += 1;
      let amount = integer(random, 3, 12 + level * 4);
      while ((numerator * amount) % denominator === 0) amount += 1;
      const answer = Math.round((numerator * amount / denominator + Number.EPSILON) * 100) / 100;
      return { mode, prompt: `${numerator}/${denominator} of ${amount} (2 d.p.)`, answer, strategy: "Multiply by the numerator, divide by the denominator, then round to two decimal places.", level };
    }
    const denominators = level <= 2 ? [2, 3, 4, 5] : level <= 4 ? [2, 3, 4, 5, 6, 8, 10] : [3, 4, 5, 6, 8, 10, 12];
    const denominator = choose(random, denominators);
    const numerator = integer(random, 1, denominator - 1);
    const multiplier = integer(random, 2, 6 + level * 3);
    return { mode, prompt: `${numerator}/${denominator} of ${denominator * multiplier}`, answer: numerator * multiplier, strategy: "Divide by the denominator, then multiply by the numerator.", level };
  }
  if (mode === "percentages") {
    const pools = [[10, 25, 50], [5, 10, 20, 25, 50], [5, 10, 15, 20, 25, 50, 75], [5, 12, 15, 20, 25, 30, 40, 60, 75], [3, 5, 12, 15, 18, 25, 35, 62, 75]];
    const percent = choose(random, pools[level - 1] ?? pools[0]!);
    const step = 100 / greatestCommonDivisor(percent, 100);
    const base = step * integer(random, 2, 10 + level * 5);
    return { mode, prompt: `${percent}% of ${base}`, answer: percent * base / 100, strategy: "Use 10%, 5%, 25%, or 50% as a building block.", level };
  }
  if (mode === "ratios") {
    const partMaximum = 3 + level * 2;
    const first = integer(random, 1, partMaximum);
    const second = integer(random, 1, partMaximum);
    const unit = integer(random, 2, 5 + level * 3);
    const total = (first + second) * unit;
    return { mode, prompt: `Split ${total} in the ratio ${first}:${second}. First share?`, answer: first * unit, strategy: "Add the ratio parts, find one part, then multiply.", level };
  }
  if (mode === "powers") {
    const exponent = choose(random, level <= 2 ? [2, 3] : [2, 2, 3]);
    const base = integer(random, 2, 12 + level * 4);
    return { mode, prompt: `${base}${exponent === 2 ? "²" : "³"}`, answer: base ** exponent, strategy: exponent === 2 ? "Multiply the base by itself." : "Square the base, then multiply once more.", level };
  }
  if (mode === "estimation") {
    const place = level <= 2 ? 10 : level <= 4 ? 100 : 1_000;
    const value = integer(random, place, place * (15 + level * 12)) + integer(random, 1, place - 1);
    return { mode, prompt: `Round ${value.toLocaleString()} to the nearest ${place.toLocaleString()}`, answer: Math.round(value / place) * place, strategy: "Check the digit immediately to the right of the rounding place.", level };
  }

  const template = integer(random, 0, 2);
  const a = integer(random, 2, 8 + level * 4);
  const b = integer(random, 2, 10 + level * 6);
  if (template === 0) return { mode, prompt: `${a} items cost £${b} each. Total cost?`, answer: a * b, strategy: "Multiply the number of items by the price.", level };
  if (template === 1) return { mode, prompt: `${a * b} items shared between ${a} people. Each?`, answer: b, strategy: "Divide the total by the number of people.", level };
  const paid = Math.ceil((a * b + 5) / 10) * 10;
  return { mode, prompt: `Pay £${paid} for items costing £${a * b}. Change?`, answer: paid - a * b, strategy: "Subtract the cost from the amount paid.", level };
}

export function createPracticeSession(seed: number, mode: PracticeModeId, requestedLevel: number): PracticeQuestion[] {
  const level = clamp(Math.round(requestedLevel), 1, 5);
  const random = seededRandom((seed >>> 0) ^ modeHash(mode));
  const questions: PracticeQuestion[] = [];
  const prompts = new Set<string>();
  const schedule: Exclude<PracticeModeId, "mixed">[] = mode === "mixed"
    ? [...MIXED_CATEGORY_IDS, ...MIXED_CATEGORY_IDS]
    : Array.from({ length: PRACTICE_SESSION_LENGTH }, () => mode);
  if (mode === "mixed") {
    for (let index = schedule.length - 1; index > 0; index -= 1) {
      const swapIndex = integer(random, 0, index);
      [schedule[index], schedule[swapIndex]] = [schedule[swapIndex]!, schedule[index]!];
    }
  }
  let attempts = 0;
  while (questions.length < PRACTICE_SESSION_LENGTH && attempts < 5_000) {
    attempts += 1;
    const generated = generateQuestion(random, schedule[questions.length]!, level);
    if (prompts.has(generated.prompt)) continue;
    prompts.add(generated.prompt);
    questions.push({ ...generated, id: `practice-${seed}-${mode}-${questions.length}`, ordinal: questions.length + 1 });
  }
  if (questions.length !== PRACTICE_SESSION_LENGTH) throw new Error(`Could not generate enough unique ${mode} questions.`);
  return questions;
}

export function verifyPracticeAnswer(input: string, question: Pick<PracticeQuestion, "answer">): boolean {
  const normalized = input.trim().replaceAll(",", "");
  return /^-?\d+(?:\.\d+)?$/.test(normalized) && Number(normalized) === question.answer;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

export function summarizePracticeAttempts(attempts: Pick<PracticeAttempt, "correct" | "responseMs">[]): PracticeSummary {
  const correctAttempts = attempts.filter((attempt) => attempt.correct);
  return {
    attempts: attempts.length,
    correct: correctAttempts.length,
    accuracy: attempts.length ? correctAttempts.length / attempts.length : 0,
    meanMs: mean(correctAttempts.map((attempt) => attempt.responseMs)),
  };
}

export function adaptPracticeLevel(level: number, summary: PracticeSummary): number {
  const current = clamp(Math.round(level), 1, 5);
  if (summary.attempts < 15) return current;
  const paceTarget = [3_000, 3_600, 4_200, 5_000, 6_000][current - 1]!;
  if (summary.accuracy >= 0.9 && summary.meanMs > 0 && summary.meanMs <= paceTarget) return clamp(current + 1, 1, 5);
  if (summary.accuracy < 0.7) return clamp(current - 1, 1, 5);
  return current;
}

export function remainingPracticeMs(startedAt: number, now: number): number {
  return Math.max(0, PRACTICE_SESSION_DURATION_MS - Math.max(0, now - startedAt));
}

export function createRandomSeed(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") return crypto.getRandomValues(new Uint32Array(1))[0]!;
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

export function getPracticeMode(mode: PracticeModeId): PracticeMode {
  return PRACTICE_MODES.find((item) => item.id === mode)!;
}
