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
  | "decimals-large-numbers"
  | "fast-factorising"
  | "quadratic-inequalities"
  | "physics"
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
  { id: "decimals-large-numbers", label: "Decimals & large numbers", description: "Mental tricks for decimals, base 100, and large products." },
  { id: "fast-factorising", label: "Fast factorising", description: "Quadratic roots, difference of squares, and factor shortcuts." },
  { id: "quadratic-inequalities", label: "Quadratic inequalities", description: "Critical values, boundary roots, and integer solution counts." },
  { id: "physics", label: "Physics calculations", description: "Speed, force, work, energy, and circuit formulas with speed tips." },
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
  strategy?: string;
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

  if (mode === "applied") {
    const template = integer(random, 0, 2);
    const a = integer(random, 2, 8 + level * 4);
    const b = integer(random, 2, 10 + level * 6);
    if (template === 0) return { mode, prompt: `${a} items cost £${b} each. Total cost?`, answer: a * b, strategy: "Multiply the number of items by the price.", level };
    if (template === 1) return { mode, prompt: `${a * b} items shared between ${a} people. Each?`, answer: b, strategy: "Divide the total by the number of people.", level };
    const paid = Math.ceil((a * b + 5) / 10) * 10;
    return { mode, prompt: `Pay £${paid} for items costing £${a * b}. Change?`, answer: paid - a * b, strategy: "Subtract the cost from the amount paid.", level };
  }

  if (mode === "physics") {
    if (level === 1) {
      const type = integer(random, 0, 3);
      if (type === 0) {
        const speeds = [10, 15, 20, 25, 30, 40, 50];
        const times = [2, 3, 4, 5, 6, 8, 10];
        const v = choose(random, speeds);
        const t = choose(random, times);
        const d = v * t;
        const sub = integer(random, 0, 2);
        if (sub === 0) return { mode, prompt: `Speed: d = ${d} m, t = ${t} s. Find v (m/s)`, answer: v, strategy: `v = d/t: divide ${d} by ${t} = ${v} m/s.`, level };
        if (sub === 1) return { mode, prompt: `Distance: v = ${v} m/s, t = ${t} s. Find d (m)`, answer: d, strategy: `d = v × t: multiply ${v} × ${t} = ${d} m.`, level };
        return { mode, prompt: `Time: d = ${d} m, v = ${v} m/s. Find t (s)`, answer: t, strategy: `t = d/v: divide ${d} by ${v} = ${t} s.`, level };
      }
      if (type === 1) {
        const masses = [2, 3, 4, 5, 6, 8, 10];
        const accs = [2, 3, 4, 5, 6, 8];
        const m = choose(random, masses);
        const a = choose(random, accs);
        const F = m * a;
        if (integer(random, 0, 1) === 0) return { mode, prompt: `Force: m = ${m} kg, a = ${a} m/s². Find F (N)`, answer: F, strategy: `F = ma: ${m} × ${a} = ${F} N.`, level };
        return { mode, prompt: `Acceleration: F = ${F} N, m = ${m} kg. Find a (m/s²)`, answer: a, strategy: `a = F/m: divide ${F} by ${m} = ${a} m/s².`, level };
      }
      if (type === 2) {
        const m = integer(random, 3, 35);
        return { mode, prompt: `Weight (g = 10 m/s²): mass = ${m} kg. Find W (N)`, answer: m * 10, strategy: `W = mg: with g = 10, append zero: ${m} × 10 = ${m * 10} N.`, level };
      }
      const I = choose(random, [2, 3, 4, 5, 6]);
      const R = choose(random, [5, 8, 10, 12, 15, 20]);
      const V = I * R;
      if (integer(random, 0, 1) === 0) return { mode, prompt: `Voltage: I = ${I} A, R = ${R} Ω. Find V (V)`, answer: V, strategy: `V = IR: ${I} × ${R} = ${V} V.`, level };
      return { mode, prompt: `Current: V = ${V} V, R = ${R} Ω. Find I (A)`, answer: I, strategy: `I = V/R: ${V} ÷ ${R} = ${I} A.`, level };
    }
    if (level === 2) {
      const type = integer(random, 0, 4);
      if (type === 0) {
        const F = choose(random, [15, 20, 25, 30, 40, 50]);
        const d = choose(random, [4, 6, 8, 12, 16, 20]);
        return { mode, prompt: `Work done: F = ${F} N, d = ${d} m. Find W (J)`, answer: F * d, strategy: `W = F × d: ${F} × ${d} = ${F * d} J.`, level };
      }
      if (type === 1) {
        const P = choose(random, [20, 25, 30, 40, 50, 60, 80]);
        const t = choose(random, [5, 10, 15, 20, 25]);
        const W = P * t;
        return { mode, prompt: `Power: W = ${W} J, t = ${t} s. Find P (W)`, answer: P, strategy: `P = W/t: divide work by time: ${W} ÷ ${t} = ${P} W.`, level };
      }
      if (type === 2) {
        const rho = choose(random, [2, 3, 4, 5, 6, 8, 9]);
        const V = choose(random, [10, 15, 20, 25, 30, 40, 50]);
        const m = rho * V;
        return { mode, prompt: `Density: mass = ${m} g, volume = ${V} cm³. Find ρ (g/cm³)`, answer: rho, strategy: `ρ = m/V: divide ${m} by ${V} = ${rho} g/cm³.`, level };
      }
      if (type === 3) {
        const m = choose(random, [8, 12, 14, 15, 18, 20, 25]);
        const v = choose(random, [5, 6, 8, 10, 12, 15]);
        return { mode, prompt: `Momentum: m = ${m} kg, v = ${v} m/s. Find p (kg·m/s)`, answer: m * v, strategy: `p = mv: ${m} × ${v} = ${m * v} kg·m/s.`, level };
      }
      const a = choose(random, [2, 3, 4, 5, 6, 8]);
      const t = choose(random, [3, 4, 5, 6, 8]);
      const u = choose(random, [5, 10, 15, 20]);
      const v = u + a * t;
      return { mode, prompt: `Acceleration: u = ${u} m/s, v = ${v} m/s, t = ${t} s. Find a (m/s²)`, answer: a, strategy: `a = (v - u)/t: change in speed is ${v - u}; ${v - u} ÷ ${t} = ${a} m/s².`, level };
    }
    if (level === 3) {
      const type = integer(random, 0, 3);
      if (type === 0) {
        const m = choose(random, [2, 4, 6, 8, 10]);
        const v = choose(random, [4, 5, 6, 8, 10, 12]);
        const Ek = 0.5 * m * v * v;
        return { mode, prompt: `Kinetic energy: m = ${m} kg, v = ${v} m/s. Find Ek (J)`, answer: Ek, strategy: `Ek = 0.5 × m × v²: halve mass first (${m / 2}), then multiply by ${v}² (${v * v}) = ${Ek} J.`, level };
      }
      if (type === 1) {
        const m = choose(random, [3, 4, 5, 6, 8, 12]);
        const h = choose(random, [5, 8, 12, 15, 20, 25]);
        const Ep = m * 10 * h;
        return { mode, prompt: `GPE (g = 10 m/s²): m = ${m} kg, h = ${h} m. Find Ep (J)`, answer: Ep, strategy: `Ep = mgh: ${m} × ${h} = ${m * h}, then append 0 (×10) = ${Ep} J.`, level };
      }
      if (type === 2) {
        const I = choose(random, [2, 3, 4, 5]);
        const R = choose(random, [10, 12, 15, 20, 25]);
        const P = I * I * R;
        return { mode, prompt: `Electrical power: I = ${I} A, R = ${R} Ω. Find P = I²R (W)`, answer: P, strategy: `P = I²R: ${I}² = ${I * I}; ${I * I} × ${R} = ${P} W.`, level };
      }
      const P = choose(random, [15, 20, 25, 30, 40, 50]);
      const A = choose(random, [4, 5, 10, 20, 25]);
      const F = P * A;
      return { mode, prompt: `Pressure: F = ${F} N, area = ${A} cm². Find P (N/cm²)`, answer: P, strategy: `P = F/A: divide ${F} by ${A} = ${P} N/cm².`, level };
    }
    if (level === 4) {
      const type = integer(random, 0, 3);
      if (type === 0) {
        if (integer(random, 0, 1) === 0) {
          const v_ms = choose(random, [10, 15, 20, 25, 30, 35, 40]);
          const v_kmh = Math.round(v_ms * 3.6);
          return { mode, prompt: `Convert ${v_kmh} km/h to m/s`, answer: v_ms, strategy: `Divide by 3.6: note that 36 km/h = 10 m/s, so ${v_kmh} km/h = ${v_ms} m/s.`, level };
        }
        const v_ms = choose(random, [5, 15, 20, 25, 30]);
        const v_kmh = Math.round(v_ms * 3.6);
        return { mode, prompt: `Convert ${v_ms} m/s to km/h`, answer: v_kmh, strategy: `Multiply by 3.6: ${v_ms} × 3 + 0.6 × ${v_ms} = ${v_kmh} km/h.`, level };
      }
      if (type === 1) {
        const pairs = [
          [6, 3, 2], [12, 4, 3], [12, 6, 4], [20, 5, 4], [30, 6, 5],
          [20, 20, 10], [15, 10, 6], [24, 8, 6], [40, 10, 8], [60, 20, 15],
        ] as const;
        const [r1, r2, req] = choose(random, pairs);
        return { mode, prompt: `Parallel resistors: R₁ = ${r1} Ω, R₂ = ${r2} Ω. Find Req (Ω)`, answer: req, strategy: `Product over sum: (${r1} × ${r2}) / (${r1} + ${r2}) = ${r1 * r2} / ${r1 + r2} = ${req} Ω.`, level };
      }
      if (type === 2) {
        const triples = [
          [2, 25, 10], [4, 18, 12], [5, 10, 10], [3, 24, 12],
          [8, 16, 16], [4, 32, 16], [10, 20, 20], [6, 12, 12],
        ] as const;
        const [a, s, v] = choose(random, triples);
        return { mode, prompt: `Speed from rest (u = 0): a = ${a} m/s², s = ${s} m. Find v (m/s)`, answer: v, strategy: `v² = 2as: 2 × ${a} × ${s} = ${2 * a * s}; √${2 * a * s} = ${v} m/s.`, level };
      }
      const f = choose(random, [200, 250, 400, 500, 600, 800]);
      const lambda = choose(random, [0.5, 0.6, 0.8, 1.2, 1.5]);
      const v = Math.round(f * lambda);
      return { mode, prompt: `Wave speed: f = ${f} Hz, λ = ${lambda} m. Find v (m/s)`, answer: v, strategy: `v = fλ: ${f} × ${lambda} = ${v} m/s.`, level };
    }
    const type = integer(random, 0, 3);
    if (type === 0) {
      const pairs = [[240, 300, 80], [350, 500, 70], [420, 500, 84], [180, 200, 90], [360, 400, 90], [300, 400, 75], [450, 600, 75], [480, 600, 80]] as const;
      const [useful, total, eff] = choose(random, pairs);
      return { mode, prompt: `Efficiency (%): Useful energy = ${useful} J, total input = ${total} J`, answer: eff, strategy: `Efficiency = (useful / total) × 100%: ${useful} / ${total} = ${eff}%.`, level };
    }
    if (type === 1) {
      const k = choose(random, [2, 3, 4, 5, 6]);
      return { mode, prompt: `Speed increases by a factor of ${k}. Kinetic energy multiplies by what factor?`, answer: k * k, strategy: `Ek ∝ v²: increasing speed by ${k}× multiplies kinetic energy by ${k}² = ${k * k}.`, level };
    }
    if (type === 2) {
      const m = choose(random, [2, 3, 4, 5]);
      const dt = choose(random, [5, 10, 15, 20]);
      const qKj = Math.round(m * 4.2 * dt);
      return { mode, prompt: `Thermal energy in kJ: m = ${m} kg, c = 4200 J/kg°C, ΔT = ${dt}°C. Find Q (kJ)`, answer: qKj, strategy: `Q = mcΔT: in kJ use c = 4.2 kJ/kg°C: ${m} × 4.2 × ${dt} = ${qKj} kJ.`, level };
    }
    const cases = [
      [800, 15, 4, 3000], [1000, 20, 5, 4000], [1200, 20, 4, 6000],
      [600, 25, 5, 3000], [1500, 10, 3, 5000], [800, 25, 5, 4000],
    ] as const;
    const [m, dv, t, F] = choose(random, cases);
    return { mode, prompt: `Average braking force: m = ${m} kg, Δv = ${dv} m/s, t = ${t} s. Find F (N)`, answer: F, strategy: `F = m(Δv)/t: (${m} × ${dv}) ÷ ${t} = ${m * dv} ÷ ${t} = ${F} N.`, level };
  }

  if (mode === "quadratic-inequalities") {
    if (level === 1) {
      const a = integer(random, 1, 5);
      const b = integer(random, a + 2, a + 8);
      const type = integer(random, 0, 3);
      if (type === 0) return { mode, prompt: `Upper boundary root of (x - ${a})(x - ${b}) < 0`, answer: b, strategy: `Parabola opens upwards; roots are ${a} and ${b}. Upper root is ${b}.`, level };
      if (type === 1) return { mode, prompt: `Lower boundary root of (x - ${a})(x - ${b}) > 0`, answer: a, strategy: `Roots are ${a} and ${b}. Lower critical value is ${a}.`, level };
      if (type === 2) return { mode, prompt: `Smallest integer satisfying (x - ${a})(x - ${b}) < 0`, answer: a + 1, strategy: `Inequality holds strictly between ${a} and ${b}: smallest integer is ${a} + 1 = ${a + 1}.`, level };
      return { mode, prompt: `Largest integer satisfying (x - ${a})(x - ${b}) < 0`, answer: b - 1, strategy: `Inequality holds strictly between ${a} and ${b}: largest integer is ${b} - 1 = ${b - 1}.`, level };
    }
    if (level === 2) {
      const a = integer(random, 2, 6);
      const b = integer(random, a + 2, a + 7);
      const S = a + b;
      const P = a * b;
      const type = integer(random, 0, 3);
      if (type === 0) return { mode, prompt: `Upper bound of x for x² - ${S}x + ${P} < 0`, answer: b, strategy: `Factor to (x - ${a})(x - ${b}) < 0; roots are ${a} and ${b}. Upper root is ${b}.`, level };
      if (type === 1) return { mode, prompt: `Lower bound of x for x² - ${S}x + ${P} ≤ 0`, answer: a, strategy: `Factor to (x - ${a})(x - ${b}) ≤ 0; roots are ${a} and ${b}. Lower root is ${a}.`, level };
      if (type === 2) return { mode, prompt: `Number of integer solutions to x² - ${S}x + ${P} ≤ 0`, answer: b - a + 1, strategy: `Roots ${a} and ${b} inclusive: count = ${b} - ${a} + 1 = ${b - a + 1}.`, level };
      const r = integer(random, 3, 10);
      return { mode, prompt: `Smallest integer satisfying x² ≤ ${r * r}`, answer: -r, strategy: `x² ≤ ${r * r} means -${r} ≤ x ≤ ${r}; minimum integer is -${r}.`, level };
    }
    if (level === 3) {
      const a = integer(random, 2, 6);
      const b = integer(random, 2, 7);
      const diff = b - a;
      const P = a * b;
      const quadStr = diff > 0 ? `x² - ${diff}x - ${P}` : diff < 0 ? `x² + ${Math.abs(diff)}x - ${P}` : `x² - ${P}`;
      const type = integer(random, 0, 3);
      if (type === 0) return { mode, prompt: `Smallest integer satisfying ${quadStr} ≤ 0`, answer: -a, strategy: `Factors to (x + ${a})(x - ${b}) ≤ 0: interval [ -${a}, ${b} ]; smallest integer is -${a}.`, level };
      if (type === 1) return { mode, prompt: `Largest integer satisfying ${quadStr} < 0`, answer: b - 1, strategy: `Factors to (x + ${a})(x - ${b}) < 0: open interval (-${a}, ${b}); largest integer is ${b} - 1 = ${b - 1}.`, level };
      if (type === 2) return { mode, prompt: `Number of integer solutions to ${quadStr} ≤ 0`, answer: b + a + 1, strategy: `Inclusive integer solutions from -${a} to ${b}: count = ${b} - (-${a}) + 1 = ${b + a + 1}.`, level };
      return { mode, prompt: `Lower boundary root of ${quadStr} ≤ 0`, answer: -a, strategy: `Roots are -${a} and ${b}; lower root is -${a}.`, level };
    }
    if (level === 4) {
      const type = integer(random, 0, 2);
      if (type === 0) {
        const a = integer(random, 2, 4);
        const b = integer(random, a + 2, a + 6);
        return { mode, prompt: `Smallest integer satisfying (x - ${a})(x - ${b}) > 0 with x > ${a}`, answer: b + 1, strategy: `Solutions are x < ${a} or x > ${b}. For x > ${b}, smallest integer is ${b} + 1 = ${b + 1}.`, level };
      }
      if (type === 1) {
        const b = integer(random, 2, 6);
        const B = 2 * b + 1;
        return { mode, prompt: `Upper root of 2x² - ${B}x + ${b} ≤ 0`, answer: b, strategy: `Factors to (2x - 1)(x - ${b}) ≤ 0; roots are 0.5 and ${b}. Upper root is ${b}.`, level };
      }
      const b = integer(random, 3, 9);
      return { mode, prompt: `Number of positive integer solutions to x² - ${b}x ≤ 0`, answer: b, strategy: `x(x - ${b}) ≤ 0 gives 0 ≤ x ≤ ${b}; positive integers are 1 to ${b} (${b} solutions).`, level };
    }
    const type = integer(random, 0, 2);
    if (type === 0) {
      const roots = [3, 4, 5, 6, 7, 8, 9, 10];
      const r = choose(random, roots);
      const c = r * r;
      return { mode, prompt: `Positive critical value of k for x² + kx + ${c} = 0 to have real roots`, answer: 2 * r, strategy: `b² - 4ac ≥ 0 requires k² ≥ 4 × ${c} = ${(2 * r) ** 2}, so k = ${2 * r}.`, level };
    }
    if (type === 1) {
      const roots = [3, 4, 5, 6, 7, 8];
      const r = choose(random, roots);
      const c = r * r;
      return { mode, prompt: `Upper bound for k (k > 0) if x² + kx + ${c} > 0 for all real x`, answer: 2 * r, strategy: `b² - 4ac < 0 requires k² < 4 × ${c} = ${(2 * r) ** 2}, so k < ${2 * r}.`, level };
    }
    const a = integer(random, 1, 3);
    const b = integer(random, 2, 5);
    const diff = b - a;
    const P = a * b;
    const quadStr = diff > 0 ? `x² - ${diff}x - ${P}` : diff < 0 ? `x² + ${Math.abs(diff)}x - ${P}` : `x² - ${P}`;
    let sum = 0;
    for (let i = -a + 1; i <= b - 1; i++) sum += i;
    return { mode, prompt: `Sum of integer solutions to ${quadStr} < 0`, answer: sum, strategy: `Roots are -${a} and ${b}. Integers strictly inside: from ${-a + 1} to ${b - 1}; sum = ${sum}.`, level };
  }

  if (mode === "fast-factorising") {
    if (level === 1) {
      const type = integer(random, 0, 3);
      if (type === 0) {
        const a = integer(random, 3, 20);
        return { mode, prompt: `x² - ${a * a} = (x - a)(x + a). Find a`, answer: a, strategy: `Difference of two squares: √${a * a} = ${a}.`, level };
      }
      if (type === 1) {
        const a = integer(random, 2, 8);
        const b = integer(random, a + 1, a + 12);
        return { mode, prompt: `x² - ${a + b}x + ${a * b} = (x - a)(x - b) with a < b. Find b`, answer: b, strategy: `Factors of ${a * b} adding to ${a + b} are ${a} and ${b}; larger is ${b}.`, level };
      }
      if (type === 2) {
        const a = integer(random, 1, 8);
        const b = integer(random, a + 1, a + 10);
        return { mode, prompt: `Larger root of x² - ${a + b}x + ${a * b} = 0`, answer: b, strategy: `Roots multiply to ${a * b} and sum to ${a + b}: roots are ${a} and ${b}; larger is ${b}.`, level };
      }
      const a = integer(random, 1, 8);
      const b = integer(random, a + 1, a + 10);
      return { mode, prompt: `Smaller root of x² - ${a + b}x + ${a * b} = 0`, answer: a, strategy: `Roots multiply to ${a * b} and sum to ${a + b}: smaller root is ${a}.`, level };
    }
    if (level === 2) {
      const type = integer(random, 0, 3);
      if (type === 0) {
        const p = integer(random, 1, 8);
        const q = integer(random, p + 1, p + 12);
        return { mode, prompt: `Positive root of x² - ${q - p}x - ${p * q} = 0`, answer: q, strategy: `Find factors of -${p * q} with difference ${q - p}: ${q} and -${p}; positive root is ${q}.`, level };
      }
      if (type === 1) {
        const p = integer(random, 1, 8);
        const q = integer(random, p + 1, p + 12);
        return { mode, prompt: `x² + ${q - p}x - ${p * q} = (x + a)(x - b) with a, b > 0. Find a`, answer: q, strategy: `Factors of -${p * q} adding to +${q - p}: (x + ${q})(x - ${p}), so a = ${q}.`, level };
      }
      if (type === 2) {
        const k = integer(random, 2, 16);
        return { mode, prompt: `Larger root of x² - x - ${k * (k + 1)} = 0`, answer: k + 1, strategy: `Consecutive factors of ${k * (k + 1)} are ${k} and ${k + 1}; larger root is ${k + 1}.`, level };
      }
      const p = integer(random, 1, 8);
      const q = integer(random, p + 1, p + 12);
      return { mode, prompt: `Negative root of x² + ${q - p}x - ${p * q} = 0`, answer: -q, strategy: `Factors to (x + ${q})(x - ${p}) = 0; negative root is -${q}.`, level };
    }
    if (level === 3) {
      const type = integer(random, 0, 4);
      if (type === 0) {
        const k = integer(random, 2, 20);
        return { mode, prompt: `Constant added to x² - ${2 * k}x to complete the square`, answer: k * k, strategy: `(b/2)² = (-${2 * k}/2)² = (-${k})² = ${k * k}.`, level };
      }
      if (type === 1) {
        const k = integer(random, 2, 20);
        return { mode, prompt: `Constant added to x² + ${2 * k}x to complete the square`, answer: k * k, strategy: `(b/2)² = (${2 * k}/2)² = ${k}² = ${k * k}.`, level };
      }
      if (type === 2) {
        const a = choose(random, [3, 5, 7, 9, 11, 13, 15, 17, 19]);
        return { mode, prompt: `4x² - ${a * a} = (2x - a)(2x + a). Find a`, answer: a, strategy: `√${a * a} = ${a}.`, level };
      }
      if (type === 3) {
        const a = choose(random, [2, 4, 5, 7, 8, 10, 11, 13, 14]);
        return { mode, prompt: `9x² - ${a * a} = (3x - a)(3x + a). Find a`, answer: a, strategy: `√${a * a} = ${a}.`, level };
      }
      const c = integer(random, 2, 16);
      return { mode, prompt: `x² + bx + ${c * c} is a perfect square (b > 0). Find b`, answer: 2 * c, strategy: `b = 2√c = 2 × ${c} = ${2 * c}.`, level };
    }
    if (level === 4) {
      const type = integer(random, 0, 4);
      if (type === 0) {
        const a = choose(random, [1, 3, 5]);
        const b = integer(random, 1, 9);
        return { mode, prompt: `2x² + ${2 * b + a}x + ${a * b} = (2x + ${a})(x + b). Find b`, answer: b, strategy: `Constant term ${a * b} ÷ ${a} = ${b}.`, level };
      }
      if (type === 1) {
        const b = integer(random, 2, 12);
        return { mode, prompt: `Larger root of 2x² - ${2 * b + 1}x + ${b} = 0`, answer: b, strategy: `Factors to (2x - 1)(x - ${b}) = 0; roots are 0.5 and ${b}; larger root is ${b}.`, level };
      }
      if (type === 2) {
        const a = choose(random, [1, 2]);
        const b = integer(random, 1, 8);
        return { mode, prompt: `3x² + ${3 * b + a}x + ${a * b} = (3x + ${a})(x + b). Find b`, answer: b, strategy: `Constant term ${a * b} ÷ ${a} = ${b}.`, level };
      }
      if (type === 3) {
        const b = integer(random, 2, 12);
        return { mode, prompt: `Larger root of 3x² - ${3 * b + 1}x + ${b} = 0`, answer: b, strategy: `Factors to (3x - 1)(x - ${b}) = 0; roots are 1/3 and ${b}; larger root is ${b}.`, level };
      }
      const a = choose(random, [2, 3, 4, 6, 7, 8, 9, 11]);
      return { mode, prompt: `25x² - ${a * a} = (5x - a)(5x + a). Find a`, answer: a, strategy: `Difference of two squares: √${a * a} = ${a}.`, level };
    }
    const type = integer(random, 0, 3);
    if (type === 0) {
      const h = integer(random, 2, 9);
      const k = integer(random, 1, 14);
      const c = h * h + k;
      return { mode, prompt: `Minimum value of y = x² - ${2 * h}x + ${c}`, answer: k, strategy: `Vertex at x = ${h}: (${h})² - ${2 * h}(${h}) + ${c} = ${k}.`, level };
    }
    if (type === 1) {
      const h = integer(random, 2, 8);
      const k = integer(random, 10, 25);
      const c = k - h * h;
      const cStr = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`;
      return { mode, prompt: `Maximum value of y = -x² + ${2 * h}x ${cStr}`, answer: k, strategy: `Inverted parabola max at x = ${h}: -(${h})² + ${2 * h}(${h}) ${cStr} = ${k}.`, level };
    }
    if (type === 2) {
      const a = integer(random, 1, 4);
      const b = integer(random, a + 1, a + 5);
      const B = a * a + b * b;
      const C = a * a * b * b;
      return { mode, prompt: `Positive root of x⁴ - ${B}x² + ${C} = 0 (largest root)`, answer: b, strategy: `Let u = x²: (u - ${a * a})(u - ${b * b}) = 0 ⟹ x² = ${b * b} ⟹ x = ${b}.`, level };
    }
    const b = integer(random, 2, 12);
    return { mode, prompt: `Larger root of 3x² - ${3 * b - 1}x - ${b} = 0`, answer: b, strategy: `(3x + 1)(x - ${b}) = 0; roots are -1/3 and ${b}; larger is ${b}.`, level };
  }

  // mode === "decimals-large-numbers"
  if (level === 1) {
    const type = integer(random, 0, 3);
    if (type === 0) {
      const a = choose(random, [2, 3, 4, 5, 6, 7, 8]);
      const b = choose(random, [2, 3, 4, 5, 6, 7, 8, 9]);
      const ans = Number(((a * b) / 100).toFixed(2));
      return { mode, prompt: `0.${a} × 0.${b}`, answer: ans, strategy: `${a} × ${b} = ${a * b}, then shift decimal point 2 places left = ${ans}.`, level };
    }
    if (type === 1) {
      const n = choose(random, [6, 8, 12, 14, 16, 24, 28, 36, 42]);
      const ans = Math.round(1.5 * n);
      return { mode, prompt: `1.5 × ${n}`, answer: ans, strategy: `1.5 × ${n} = ${n} + half of ${n} (${n / 2}) = ${ans}.`, level };
    }
    if (type === 2) {
      const n = choose(random, [8, 12, 14, 16, 18, 24, 28, 32]);
      const ans = Math.round(2.5 * n);
      return { mode, prompt: `2.5 × ${n}`, answer: ans, strategy: `Double 2.5 to 5, halve ${n} to ${n / 2}: 5 × ${n / 2} = ${ans}.`, level };
    }
    const n = choose(random, [7, 9, 13, 14, 18, 23, 27, 34, 45]);
    return { mode, prompt: `${n} ÷ 0.5`, answer: n * 2, strategy: `Dividing by 0.5 is doubling: ${n} × 2 = ${n * 2}.`, level };
  }
  if (level === 2) {
    const type = integer(random, 0, 3);
    if (type === 0) {
      const tens = integer(random, 2, 9);
      const val = tens * 10 + 5;
      return { mode, prompt: `${val}²`, answer: val * val, strategy: `Ending in 5: ${tens} × ${tens + 1} = ${tens * (tens + 1)}, append 25 ⟹ ${val * val}.`, level };
    }
    if (type === 1) {
      const k = integer(random, 6, 24);
      const n = k * 4;
      return { mode, prompt: `${n} × 25`, answer: n * 25, strategy: `Divide by 4 (${k}) then multiply by 100 = ${n * 25}.`, level };
    }
    if (type === 2) {
      const n = integer(random, 6, 30);
      return { mode, prompt: `${n} ÷ 0.25`, answer: n * 4, strategy: `Dividing by 0.25 is multiplying by 4: ${n} × 4 = ${n * 4}.`, level };
    }
    const a = choose(random, [3, 4, 6, 7, 8, 9]);
    const b = choose(random, [4, 5, 6, 7, 8, 9]);
    const prod = a * b;
    return { mode, prompt: `${prod} ÷ 0.0${a}`, answer: b * 100, strategy: `Shift 2 decimal places: ${prod}00 ÷ ${a} = ${b * 100}.`, level };
  }
  if (level === 3) {
    const type = integer(random, 0, 3);
    if (type === 0) {
      const k = integer(random, 2, 12);
      const n = k * 8;
      return { mode, prompt: `${n} × 125`, answer: n * 125, strategy: `125 = 1000/8: ${n} ÷ 8 = ${k}; ${k} × 1000 = ${n * 125}.`, level };
    }
    if (type === 1) {
      const n = integer(random, 3, 15);
      return { mode, prompt: `${n} ÷ 0.125`, answer: n * 8, strategy: `Dividing by 0.125 is multiplying by 8: ${n} × 8 = ${n * 8}.`, level };
    }
    if (type === 2) {
      const T = choose(random, [30, 40, 50, 60, 70, 80]);
      const d = choose(random, [2, 3, 4]);
      const ans = T * T - d * d;
      return { mode, prompt: `${T + d} × ${T - d}`, answer: ans, strategy: `(a+b)(a-b) = ${T}² - ${d}² = ${T * T} - ${d * d} = ${ans}.`, level };
    }
    const k = choose(random, [6, 7, 8, 9, 11, 12, 13, 14, 15]);
    const val = Number(((k * k) / 100).toFixed(2));
    const ans = Number((k / 10).toFixed(1));
    return { mode, prompt: `√${val}`, answer: ans, strategy: `√${k * k} = ${k}; 2 decimal places become 1 decimal place: ${ans}.`, level };
  }
  if (level === 4) {
    const type = integer(random, 0, 2);
    if (type === 0) {
      const d1 = integer(random, 2, 7);
      const d2 = integer(random, 2, 7);
      const a = 100 - d1;
      const b = 100 - d2;
      return { mode, prompt: `${a} × ${b}`, answer: a * b, strategy: `Base 100 deficits -${d1} and -${d2}: ${a} - ${d2} = ${a - d2}, (${d1} × ${d2} = ${d1 * d2}) ⟹ ${a * b}.`, level };
    }
    if (type === 1) {
      const s1 = integer(random, 2, 8);
      const s2 = integer(random, 2, 8);
      const a = 100 + s1;
      const b = 100 + s2;
      return { mode, prompt: `${a} × ${b}`, answer: a * b, strategy: `Base 100 surplus +${s1} and +${s2}: ${a} + ${s2} = ${a + s2}, (${s1} × ${s2} = ${s1 * s2}) ⟹ ${a * b}.`, level };
    }
    const k = integer(random, 6, 20);
    const n = k * 4;
    const ans = Math.round(n * 1.25);
    return { mode, prompt: `1.25 × ${n}`, answer: ans, strategy: `1.25 = 1 + 1/4: ${n} + ${k} = ${ans}.`, level };
  }
  const type = integer(random, 0, 2);
  if (type === 0) {
    const tens = choose(random, [10, 11, 12]);
    const val = tens * 10 + 5;
    return { mode, prompt: `${val}²`, answer: val * val, strategy: `${tens} × ${tens + 1} = ${tens * (tens + 1)}, append 25 ⟹ ${val * val}.`, level };
  }
  if (type === 1) {
    const pairs = [[75, 25], [65, 35], [85, 15], [55, 45], [70, 30], [80, 20]] as const;
    const [a, b] = choose(random, pairs);
    const ans = (a - b) * 100;
    return { mode, prompt: `${a}² − ${b}²`, answer: ans, strategy: `(a - b)(a + b) = (${a} - ${b}) × 100 = ${ans}.`, level };
  }
  const deficit = integer(random, 2, 5);
  const mult = 1000 - deficit;
  const k = integer(random, 3, 9);
  return { mode, prompt: `${mult} × ${k}`, answer: mult * k, strategy: `(1000 - ${deficit}) × ${k} = ${1000 * k} - ${deficit * k} = ${mult * k}.`, level };
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
  return /^-?\d+(?:\.\d+)?$/.test(normalized) && Math.abs(Number(normalized) - question.answer) < 1e-5;
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
