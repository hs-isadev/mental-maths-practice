export const PRACTICE_SESSION_LENGTH = 20;
export const PRACTICE_SESSION_DURATION_MS = 10 * 60 * 1_000;

// Configurable level parameters - makes levels changeable
const PRACTICE_LEVEL_CONFIG = {
  1: { minMax: [20, 100], desc: "Basic addition/subtraction" },
  2: { minMax: [100, 500], desc: "Intermediate calculations" },
  3: { minMax: [500, 2_000], desc: "Advanced arithmetic" },
  4: { minMax: [2_000, 10_000], desc: "High-level math" },
  5: { minMax: [10_000, 50_000], desc: "Mastery level" },
};

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
  { id: "physics", label: "Physics scenarios", description: "Work through real situations, units, and useful distractions." },
  { id: "mixed", label: "General maths", description: "A shuffled mix with two questions from every topic." },
] as const;

export interface PracticeQuestion {
  id: string;
  ordinal: number;
  mode: PracticeModeId;
  prompt: string;
  answer: number;
  answers?: number[];
  strategy: string;
  level: number;
}
export interface PracticeAttempt {
  questionId?: string;
  prompt?: string;
  expectedAnswer?: number | number[];
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

export type PracticeLevelConfig = Record<number, {
  minMax: [number, number];
  desc: string;
  params?: Record<string, unknown>;
}>;

export const PRACTICE_LEVEL_CONFIGS: PracticeLevelConfig = {
  1: { minMax: [20, 100], desc: "Basic addition/subtraction", params: { factorMax: 6, decimalPlaces: 1 } },
  2: { minMax: [100, 500], desc: "Intermediate calculations", params: { factorMax: 12, decimalPlaces: 2 } },
  3: { minMax: [500, 2_000], desc: "Advanced arithmetic", params: { factorMax: 20, decimalPlaces: 2 } },
  4: { minMax: [2_000, 10_000], desc: "High-level math", params: { factorMax: 30, decimalPlaces: 3 } },
  5: { minMax: [10_000, 50_000], desc: "Mastery level", params: { factorMax: 100, decimalPlaces: 3 } },
};

export function updateLevelConfig(config: Partial<PracticeLevelConfig>): void {
  Object.assign(PRACTICE_LEVEL_CONFIGS, config);
}

export function getLevelConfig(level: number): {
  minMax: [number, number];
  desc: string;
  params: Record<string, unknown>;
} {
  return PRACTICE_LEVEL_CONFIGS[Math.min(level, 5) as 1 | 2 | 3 | 4 | 5] ?? PRACTICE_LEVEL_CONFIGS[1]!;
}

function allRoots(
  mode: Exclude<PracticeModeId, "mixed">,
  equation: string,
  roots: number[],
  strategy: string,
  level: number,
): Omit<PracticeQuestion, "id" | "ordinal"> {
  const answers = [...roots].sort((left, right) => left - right);
  return {
    mode,
    prompt: `Solve for x: ${equation}`,
    answer: answers[0]!,
    answers,
    strategy,
    level,
  };
}

function quadraticRootTip(roots: [number, number], linear: number, constant: number): string {
  const [first, second] = roots;
  const firstBracket = -first;
  const secondBracket = -second;
  const bracket = (value: number) => value < 0 ? `x - ${Math.abs(value)}` : `x + ${value}`;
  const signReason = constant < 0
    ? `The constant is ${constant}, so the product of the roots is negative: one root is positive and one is negative. The roots add to ${-linear}, so the root with the larger magnitude has that sign. The bracket numbers must multiply to ${constant} and add to the x-term coefficient, ${linear}.`
    : `The constant is ${constant}, so the roots have the same sign. Their sum is ${-linear}, so both roots are ${-linear > 0 ? "positive" : "negative"}. The bracket numbers must multiply to ${constant} and add to the x-term coefficient, ${linear}.`;
  return `${signReason} The matching pair is ${firstBracket} and ${secondBracket}, since ${firstBracket} + (${secondBracket}) = ${linear} and their product is ${constant}. Factor as (${bracket(firstBracket)})(${bracket(secondBracket)}) = 0, so the solutions are ${first} and ${second}.`;
}

function generatePhysicsQuestion(
  random: () => number,
  level: number,
): Omit<PracticeQuestion, "id" | "ordinal"> {
  const type = integer(random, 0, 3);
  if (level === 1) {
    if (type === 0) {
      const [distance, movingSeconds, waitSeconds, average] = choose(random, [[240, 40, 20, 4], [300, 50, 10, 5], [360, 40, 20, 6], [180, 30, 30, 3]] as const);
      return { mode: "physics", prompt: `A minibus travels ${distance} m in ${movingSeconds} s, then waits ${waitSeconds} s at a crossing. The route is marked 30 km/h. What is its average speed over the full journey, in m/s?`, answer: average, strategy: `Average speed uses the full elapsed time, including the wait: ${distance} ÷ (${movingSeconds} + ${waitSeconds}) = ${average} m/s.`, level };
    }
    if (type === 1) {
      const [cart, load, changeInSpeed, seconds, force] = choose(random, [[22, 18, 8, 4, 80], [15, 25, 12, 6, 80], [30, 10, 6, 3, 80], [18, 12, 10, 5, 60]] as const);
      return { mode: "physics", prompt: `A ${cart} kg delivery cart carries a ${load} kg load. It speeds up from rest by ${changeInSpeed} m/s in ${seconds} s. What average resultant force acts on the loaded cart?`, answer: force, strategy: `Total mass = ${cart} + ${load} = ${cart + load} kg; acceleration = ${changeInSpeed} ÷ ${seconds} = ${changeInSpeed / seconds} m/s²; F = ma = ${cart + load} × ${changeInSpeed / seconds} = ${force} N.`, level };
    }
    if (type === 2) {
      const mass = choose(random, [4, 6, 8, 12]);
      const tagMass = choose(random, [0.2, 0.5, 0.8]);
      return { mode: "physics", prompt: `A ${mass} kg equipment case is weighed on Earth, where g = 10 N/kg. A ${tagMass} kg tag belongs to a different case. What is this case's weight, in N?`, answer: mass * 10, strategy: `Ignore the other case and use W = mg = ${mass} × 10 = ${mass * 10} N.`, level };
    }
    const count = choose(random, [2, 3]);
    const current = choose(random, [1, 2, 3]);
    return { mode: "physics", prompt: `${count} identical lamps are connected in parallel to a 12 V supply. Each lamp draws ${current} A. A spare lamp is disconnected. What current leaves the supply?`, answer: count * current, strategy: `Add the currents in the ${count} connected parallel branches: ${count} × ${current} = ${count * current} A.`, level };
  }

  if (level === 2) {
    if (type === 0) {
      const force = choose(random, [30, 40, 45, 60]);
      const distance = choose(random, [5, 6, 8, 10]);
      const slack = choose(random, [1, 2]);
      return { mode: "physics", prompt: `A warehouse worker pulls a crate with a steady ${force} N force over ${distance + slack} m. The rope is slack for the first ${slack} m. How much work does the pull do?`, answer: force * distance, strategy: `Work uses the distance while the force acts: ${force} × (${distance + slack} − ${slack}) = ${force * distance} J.`, level };
    }
    if (type === 1) {
      const [length, width, height, density] = choose(random, [[5, 2, 3, 8], [4, 3, 2, 6], [6, 2, 2, 9], [5, 4, 2, 3]] as const);
      const volume = length * width * height;
      const mass = volume * density;
      const tray = choose(random, [30, 40, 50]);
      return { mode: "physics", prompt: `A metal sample has a mass of ${mass} g. Its rectangular dimensions are ${length} cm by ${width} cm by ${height} cm; the tray it arrived in has a mass of ${tray} g. Find the sample's density in g/cm³.`, answer: density, strategy: `Ignore the tray mass. Sample volume = ${length} × ${width} × ${height} = ${volume} cm³; density = ${mass} ÷ ${volume} = ${density} g/cm³.`, level };
    }
    if (type === 2) {
      const [mass, speed, seconds, force] = choose(random, [[800, 15, 4, 3000], [1200, 15, 3, 6000], [1000, 12, 3, 4000], [1500, 20, 5, 6000]] as const);
      const tripMinutes = choose(random, [8, 12, 25]);
      return { mode: "physics", prompt: `A ${mass} kg car travelling at ${speed} m/s comes to rest in ${seconds} s. Its dashboard says the trip began ${tripMinutes} minutes ago. What is the magnitude of the average braking force?`, answer: force, strategy: `The trip time is irrelevant. Deceleration magnitude = ${speed} ÷ ${seconds} = ${speed / seconds} m/s²; force magnitude = ${mass} × ${speed / seconds} = ${force} N.`, level };
    }
    const [voltage, firstR, secondR] = choose(random, [[12, 4, 2], [18, 6, 3], [9, 2, 1], [24, 8, 4]] as const);
    const spare = choose(random, [3, 5, 7]);
    return { mode: "physics", prompt: `A ${voltage} V battery is connected to two resistors in series, ${firstR} Ω and ${secondR} Ω. A spare ${spare} Ω resistor is not connected. What current flows through the circuit?`, answer: voltage / (firstR + secondR), strategy: `Only the series resistors count: total resistance = ${firstR} + ${secondR} = ${firstR + secondR} Ω; I = ${voltage} ÷ ${firstR + secondR} = ${voltage / (firstR + secondR)} A.`, level };
  }

  if (level === 3) {
    if (type === 0) {
      const [mass, height, loss] = choose(random, [[400, 12.5, 20], [600, 10, 25], [800, 7.5, 20], [500, 12, 30]] as const);
      const lostGpe = mass * 10 * height;
      const gainedKinetic = lostGpe * (100 - loss) / 100;
      return { mode: "physics", prompt: `A ${mass} kg coaster car starts from rest and drops ${height} m. Take g = 10 m/s². Track friction dissipates ${loss}% of the lost gravitational energy. How much kinetic energy does the car gain?`, answer: gainedKinetic, strategy: `Lost GPE = ${mass} × 10 × ${height} = ${lostGpe} J. The car retains ${100 - loss}%: ${100 - loss}% × ${lostGpe} = ${gainedKinetic} J.`, level };
    }
    if (type === 1) {
      const [mass, rise, efficiency] = choose(random, [[1.5, 20, 80], [2, 15, 80], [1, 30, 80], [2.5, 12, 80]] as const);
      const usefulKj = mass * 4.2 * rise;
      const inputKj = usefulKj / (efficiency / 100);
      return { mode: "physics", prompt: `A ${mass} kg flask of water is heated by ${rise}°C. Use c = 4,200 J/(kg·°C). The heater is ${efficiency}% efficient. How much electrical energy must it receive, in kJ?`, answer: inputKj, strategy: `Useful heat = ${mass} × 4.2 × ${rise} = ${usefulKj} kJ. Input energy = ${usefulKj} ÷ ${efficiency / 100} = ${inputKj} kJ.`, level };
    }
    if (type === 2) {
      const [voltage, lampR, r1, r2] = choose(random, [[24, 12, 6, 6], [18, 9, 3, 6], [12, 6, 4, 8], [30, 15, 5, 10]] as const);
      const current = voltage / lampR + voltage / (r1 + r2);
      return { mode: "physics", prompt: `A ${voltage} V supply powers two parallel branches. One branch has a ${lampR} Ω lamp; the other has ${r1} Ω and ${r2} Ω resistors in series. What total current does the supply provide?`, answer: current, strategy: `The series branch has ${r1 + r2} Ω. Branch currents are ${voltage} ÷ ${lampR} = ${voltage / lampR} A and ${voltage} ÷ ${r1 + r2} = ${voltage / (r1 + r2)} A; total = ${current} A.`, level };
    }
    const [standWeight, signWeight, feet, area] = choose(random, [[500, 20, 4, 5], [360, 40, 4, 4], [600, 0, 3, 10], [420, 60, 4, 6]] as const);
    const pressure = (standWeight + signWeight) / feet / area;
    return { mode: "physics", prompt: `A ${standWeight} N display stand rests on ${feet} identical feet. Each foot touches the floor over ${area} cm². A ${signWeight} N sign is mounted on the stand. What pressure does each foot exert, in N/cm²?`, answer: pressure, strategy: `Total force = ${standWeight} + ${signWeight} = ${standWeight + signWeight} N. Each foot supports ${(standWeight + signWeight) / feet} N over ${area} cm², so pressure = ${pressure} N/cm².`, level };
  }

  if (level === 4) {
    if (type === 0) {
      const [mass, speedKmh, seconds] = choose(random, [[1200, 72, 4], [1000, 54, 3], [1500, 90, 5], [800, 36, 2]] as const);
      const speed = speedKmh / 3.6;
      const force = mass * speed / seconds;
      return { mode: "physics", prompt: `A ${mass} kg car brakes uniformly from ${speedKmh} km/h to rest in ${seconds} s. The driver's reaction delay happened before braking and is not part of this time. Find the average braking force magnitude.`, answer: force, strategy: `Convert ${speedKmh} km/h to ${speed} m/s. Braking acceleration magnitude = ${speed} ÷ ${seconds} = ${speed / seconds} m/s²; F = ${mass} × ${speed / seconds} = ${force} N.`, level };
    }
    if (type === 1) {
      const [voltage, measuredCurrent, otherResistance] = choose(random, [[12, 2, 3], [18, 3, 6], [24, 4, 4], [15, 2.5, 5]] as const);
      const totalCurrent = measuredCurrent + voltage / otherResistance;
      return { mode: "physics", prompt: `A ${voltage} V battery powers two parallel branches. A technician measures ${measuredCurrent} A in one branch; the other branch has resistance ${otherResistance} Ω. What total current leaves the battery?`, answer: totalCurrent, strategy: `The other branch draws ${voltage} ÷ ${otherResistance} = ${voltage / otherResistance} A. Add the measured current: ${measuredCurrent} + ${voltage / otherResistance} = ${totalCurrent} A.`, level };
    }
    if (type === 2) {
      const [speed, roundTrip] = choose(random, [[1500, 0.8], [1480, 1], [1500, 1.2], [1480, 0.5]] as const);
      const depth = speed * roundTrip / 2;
      return { mode: "physics", prompt: `A sonar pulse travels through seawater at ${speed} m/s and returns to a research boat ${roundTrip} s after transmission. How far away is the seabed?`, answer: depth, strategy: `The pulse travels down and back: total path = ${speed} × ${roundTrip} = ${speed * roundTrip} m. One-way distance = ${speed * roundTrip} ÷ 2 = ${depth} m.`, level };
    }
    const [acceleration, distance, speed] = choose(random, [[2, 25, 10], [4, 12.5, 10], [2, 50, Math.sqrt(200)], [8, 6.25, 10]] as const);
    return { mode: "physics", prompt: `A cyclist accelerates uniformly from rest down a ${distance} m straight section at ${acceleration} m/s². A marker shows the full route is 100 m, but the cyclist has not reached it yet. What speed has the cyclist reached after this section?`, answer: speed, strategy: `Use v² = u² + 2as for this section: v² = 0 + 2 × ${acceleration} × ${distance} = ${2 * acceleration * distance}; v = ${speed} m/s.`, level };
  }

  if (type === 0) {
    const [speedKmh, reactionSeconds, deceleration] = choose(random, [[90, 1.2, 5], [72, 1, 4], [108, 1.5, 6], [54, 1.2, 3]] as const);
    const speed = speedKmh / 3.6;
    const reactionDistance = speed * reactionSeconds;
    const brakingDistance = speed * speed / (2 * deceleration);
    const stoppingDistance = reactionDistance + brakingDistance;
    return { mode: "physics", prompt: `On a dry road, a driver travels at ${speedKmh} km/h. Reaction time is ${reactionSeconds} s and braking deceleration is ${deceleration} m/s². A roadside sign shows a 70 km/h limit. Estimate the total stopping distance from first seeing the hazard.`, answer: stoppingDistance, strategy: `Convert speed to ${speed} m/s. Reaction distance = ${speed} × ${reactionSeconds} = ${reactionDistance} m. Braking distance = v² ÷ (2a) = ${speed * speed} ÷ ${2 * deceleration} = ${brakingDistance} m. Total = ${stoppingDistance} m.`, level };
  }
  if (type === 1) {
    const [inputMj, outputKj, label] = choose(random, [[1.2, 720, 65], [0.9, 540, 55], [1.5, 900, 70], [2, 1200, 58]] as const);
    const efficiency = outputKj / (inputMj * 1000) * 100;
    return { mode: "physics", prompt: `A small generator receives ${inputMj} MJ of chemical energy and delivers ${outputKj} kJ of useful electrical energy. A label claims ${label}% efficiency. What is the efficiency from these measurements?`, answer: efficiency, strategy: `Convert ${inputMj} MJ to ${inputMj * 1000} kJ. Efficiency = (${outputKj} ÷ ${inputMj * 1000}) × 100 = ${efficiency}%; the label is a distractor.`, level };
  }
  if (type === 2) {
    const [hotMass, hotTemp, coldMass, coldTemp] = choose(random, [[2, 80, 3, 20], [1, 90, 2, 30], [3, 70, 2, 25], [2, 75, 4, 25]] as const);
    const finalTemp = (hotMass * hotTemp + coldMass * coldTemp) / (hotMass + coldMass);
    return { mode: "physics", prompt: `A ${hotMass} kg hot-water pack at ${hotTemp}°C is mixed with ${coldMass} kg of water at ${coldTemp}°C in a perfectly insulated container. Assume equal specific heat capacities and no heat loss. What is the final temperature?`, answer: finalTemp, strategy: `Equal specific heats cancel. Final temperature = (${hotMass} × ${hotTemp} + ${coldMass} × ${coldTemp}) ÷ (${hotMass} + ${coldMass}) = ${finalTemp}°C.`, level };
  }
  const [primaryV, secondaryV, secondaryA, efficiency] = choose(random, [[240, 12, 4, 80], [120, 12, 5, 75], [230, 23, 4, 80], [200, 20, 5, 80]] as const);
  const inputPower = secondaryV * secondaryA / (efficiency / 100);
  const primaryCurrent = inputPower / primaryV;
  return { mode: "physics", prompt: `A transformer steps ${primaryV} V down to ${secondaryV} V. It supplies a ${secondaryA} A lamp and is ${efficiency}% efficient. What current does it draw from the high-voltage supply?`, answer: primaryCurrent, strategy: `Output power = ${secondaryV} × ${secondaryA} = ${secondaryV * secondaryA} W. Input power = ${secondaryV * secondaryA} ÷ ${efficiency / 100} = ${inputPower} W. Primary current = ${inputPower} ÷ ${primaryV} = ${primaryCurrent} A.`, level };
}

function generateQuestion(random: () => number, mode: Exclude<PracticeModeId, "mixed">, level: number): Omit<PracticeQuestion, "id" | "ordinal"> {
  const maximums = [20, 100, 500, 2_000, 10_000];
  const maximum = maximums[level - 1] ?? maximums[0]!;

  if (mode === "physics") return generatePhysicsQuestion(random, level);

  if (mode === "addition") {
    const a = integer(random, 1, maximum);
    const b = integer(random, 1, maximum);
    const tensA = Math.floor(a / 10) * 10;
    const tensB = Math.floor(b / 10) * 10;
    return { mode, prompt: `${a} + ${b}`, answer: a + b, strategy: `Split into tens and ones: ${tensA} + ${tensB} = ${tensA + tensB}, and ${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}. Combine them: ${tensA + tensB} + ${(a % 10) + (b % 10)} = ${a + b}.`, level };
  }
  if (mode === "subtraction") {
    const a = integer(random, 1, maximum);
    const b = integer(random, 1, maximum);
    const high = Math.max(a, b);
    const low = Math.min(a, b);
    const lowTens = Math.floor(low / 10) * 10;
    return { mode, prompt: `${high} − ${low}`, answer: high - low, strategy: `Subtract in parts: ${high} − ${lowTens} = ${high - lowTens}, then subtract the remaining ${low % 10}: ${high - lowTens} − ${low % 10} = ${high - low}.`, level };
  }
  if (mode === "multiplication") {
    const factorMaximum = [6, 10, 12, 20, 30][level - 1] ?? 6;
    const a = integer(random, 2, factorMaximum);
    const b = integer(random, 2, factorMaximum);
    const split = b >= 10 ? b : a;
    const other = split === b ? a : b;
    const tens = Math.floor(split / 10) * 10;
    const strategy = split >= 10
      ? `Split ${split} into ${tens} + ${split - tens}: (${other} × ${tens}) + (${other} × ${split - tens}) = ${other * tens} + ${other * (split - tens)} = ${a * b}.`
      : `${a} × ${b} means ${a} groups of ${b}. Add the groups: ${Array.from({ length: a }, () => b).join(" + ")} = ${a * b}.`;
    return { mode, prompt: `${a} × ${b}`, answer: a * b, strategy, level };
  }
  if (mode === "division") {
    const factorMaximum = [6, 10, 12, 20, 30][level - 1] ?? 6;
    const divisor = integer(random, 2, factorMaximum);
    const quotient = integer(random, 2, factorMaximum);
    return { mode, prompt: `${divisor * quotient} ÷ ${divisor}`, answer: quotient, strategy: `Division reverses multiplication. Ask “${divisor} times what equals ${divisor * quotient}?” Since ${divisor} × ${quotient} = ${divisor * quotient}, the quotient is ${quotient}.`, level };
  }
  if (mode === "fractions") {
    if (level >= 2) {
      const denominator = integer(random, 7, 15 + level * 5);
      let numerator = integer(random, denominator + 1, denominator * 3);
      if (numerator % denominator === 0) numerator += 1;
      let amount = integer(random, 3, 12 + level * 4);
      while ((numerator * amount) % denominator === 0) amount += 1;
      const exact = numerator * amount / denominator;
      const answer = Math.round((exact + Number.EPSILON) * 100) / 100;
      const exactText = Number(exact.toFixed(8)).toString();
      return { mode, prompt: `${numerator}/${denominator} of ${amount} (2 d.p.)`, answer, strategy: `“Of” means multiply: ${numerator}/${denominator} × ${amount} = (${numerator} × ${amount}) ÷ ${denominator} = ${exactText}. Round to 2 decimal places: ${answer}.`, level };
    }
    const denominators = level <= 2 ? [2, 3, 4, 5] : level <= 4 ? [2, 3, 4, 5, 6, 8, 10] : [3, 4, 5, 6, 8, 10, 12];
    const denominator = choose(random, denominators);
    const numerator = integer(random, 1, denominator - 1);
    const multiplier = integer(random, 2, 6 + level * 3);
    return { mode, prompt: `${numerator}/${denominator} of ${denominator * multiplier}`, answer: numerator * multiplier, strategy: `“Of” means multiply. First ${denominator * multiplier} ÷ ${denominator} = ${multiplier} (one denominator-sized part); then ${multiplier} × ${numerator} = ${numerator * multiplier}.`, level };
  }
  if (mode === "percentages") {
    const pools = [[10, 25, 50], [5, 10, 20, 25, 50], [5, 10, 15, 20, 25, 50, 75], [5, 12, 15, 20, 25, 30, 40, 60, 75], [3, 5, 12, 15, 18, 25, 35, 62, 75]];
    const percent = choose(random, pools[level - 1] ?? pools[0]!);
    const step = 100 / greatestCommonDivisor(percent, 100);
    const base = step * integer(random, 2, 10 + level * 5);
    const answer = percent * base / 100;
    return { mode, prompt: `${percent}% of ${base}`, answer, strategy: `${percent}% means ${percent}/100. Calculate ${base} × ${percent}/100 = (${base} ÷ 100) × ${percent} = ${answer}. For a mental shortcut, split the percentage into familiar parts such as 10%, 5%, 25%, or 50%.`, level };
  }
  if (mode === "ratios") {
    const partMaximum = 3 + level * 2;
    const first = integer(random, 1, partMaximum);
    const second = integer(random, 1, partMaximum);
    const unit = integer(random, 2, 5 + level * 3);
    const total = (first + second) * unit;
    return { mode, prompt: `Split ${total} in the ratio ${first}:${second}. First share?`, answer: first * unit, strategy: `There are ${first} + ${second} = ${first + second} equal parts. One part is ${total} ÷ ${first + second} = ${unit}; the first share is ${first} × ${unit} = ${first * unit}.`, level };
  }
  if (mode === "powers") {
    const exponent = choose(random, level <= 2 ? [2, 3] : [2, 2, 3]);
    const base = integer(random, 2, 12 + level * 4);
    return { mode, prompt: `${base}${exponent === 2 ? "²" : "³"}`, answer: base ** exponent, strategy: exponent === 2 ? `${base}² means ${base} × ${base} = ${base ** exponent}.` : `${base}³ means three factors of ${base}: ${base} × ${base} = ${base ** 2}, then ${base ** 2} × ${base} = ${base ** exponent}.`, level };
  }
  if (mode === "estimation") {
    const place = level <= 2 ? 10 : level <= 4 ? 100 : 1_000;
    const value = integer(random, place, place * (15 + level * 12)) + integer(random, 1, place - 1);
    const lower = Math.floor(value / place) * place;
    const upper = lower + place;
    const answer = value - lower < place / 2 ? lower : upper;
    return { mode, prompt: `Round ${value.toLocaleString()} to the nearest ${place.toLocaleString()}`, answer, strategy: `The two nearest ${place.toLocaleString()}s are ${lower.toLocaleString()} and ${upper.toLocaleString()}; the halfway point is ${Math.floor(lower + place / 2).toLocaleString()}. ${value.toLocaleString()} is ${value - lower < place / 2 ? "below" : "at or above"} halfway, so round ${value - lower < place / 2 ? "down" : "up"} to ${answer.toLocaleString()}.`, level };
  }

  if (mode === "applied") {
    const template = integer(random, 0, 2);
    const a = integer(random, 2, 8 + level * 4);
    const b = integer(random, 2, 10 + level * 6);
    if (template === 0) return { mode, prompt: `${a} items cost £${b} each. Total cost?`, answer: a * b, strategy: `${a} equal items at £${b} each cost ${a} × ${b} = £${a * b} altogether.`, level };
    if (template === 1) return { mode, prompt: `${a * b} items shared between ${a} people. Each?`, answer: b, strategy: `Share equally by dividing: ${a * b} ÷ ${a} = ${b} items per person. Check: ${a} × ${b} = ${a * b}.`, level };
    const paid = Math.ceil((a * b + 5) / 10) * 10;
    return { mode, prompt: `Pay £${paid} for items costing £${a * b}. Change?`, answer: paid - a * b, strategy: `Change = amount paid − cost: £${paid} − £${a * b} = £${paid - a * b}.`, level };
  }

  if (mode === "physics" && level === 0) {
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
    if (level === 4) {
      const type = integer(random, 0, 5);
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
      const cases = [
        [800, 15, 4, 3000], [1000, 20, 5, 4000], [1200, 20, 4, 6000],
        [600, 25, 5, 3000], [1500, 10, 3, 5000], [800, 25, 5, 4000],
      ] as const;
      const [m, dv, t, F] = choose(random, cases);
      return { mode, prompt: `Average braking force: m = ${m} kg, Δv = ${dv} m/s, t = ${t} s. Find F (N)`, answer: F, strategy: `F = m(Δv)/t: (${m} × ${dv}) ÷ ${t} = ${m * dv} ÷ ${t} = ${F} N.`, level };
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
      if (type === 0) return allRoots(mode, `(x - ${a})(x - ${b}) = 0`, [a, b], `Set each factor to zero: x - ${a} = 0 gives x = ${a}, and x - ${b} = 0 gives x = ${b}.`, level);
      if (type === 1) return allRoots(mode, `(x - ${a})(x - ${b}) = 0`, [a, b], `Set each factor to zero: x - ${a} = 0 gives x = ${a}, and x - ${b} = 0 gives x = ${b}.`, level);
      if (type === 2) return { mode, prompt: `Smallest integer satisfying (x - ${a})(x - ${b}) < 0`, answer: a + 1, strategy: `The product is negative between its roots, ${a} and ${b}. The inequality is strict, so the endpoints are excluded; the first integer after ${a} is ${a} + 1 = ${a + 1}.`, level };
      return { mode, prompt: `Largest integer satisfying (x - ${a})(x - ${b}) < 0`, answer: b - 1, strategy: `The product is negative between its roots, ${a} and ${b}. The strict inequality excludes ${b}; the last integer before it is ${b} - 1 = ${b - 1}.`, level };
    }
    if (level === 2) {
      const a = integer(random, 2, 6);
      const b = integer(random, a + 2, a + 7);
      const S = a + b;
      const P = a * b;
      const type = integer(random, 0, 3);
      if (type === 0) return allRoots(mode, `x² - ${S}x + ${P} = 0`, [a, b], quadraticRootTip([a, b], -S, P), level);
      if (type === 1) return allRoots(mode, `x² - ${S}x + ${P} = 0`, [a, b], quadraticRootTip([a, b], -S, P), level);
      if (type === 2) return { mode, prompt: `Number of integer solutions to x² - ${S}x + ${P} ≤ 0`, answer: b - a + 1, strategy: `Factor as (x - ${a})(x - ${b}). Since the parabola opens upward, it is at or below zero between the roots; “≤” includes both endpoints. Count the integers ${a} through ${b}: ${b} - ${a} + 1 = ${b - a + 1}.`, level };
      const r = integer(random, 3, 10);
      return { mode, prompt: `Smallest integer satisfying x² ≤ ${r * r}`, answer: -r, strategy: `Taking square roots gives |x| ≤ ${r}, which means -${r} ≤ x ≤ ${r}. The smallest integer in that interval is -${r}.`, level };
    }
    if (level === 3) {
      const a = integer(random, 2, 6);
      const b = integer(random, 2, 7);
      const diff = b - a;
      const P = a * b;
      const quadStr = diff > 0 ? `x² - ${diff}x - ${P}` : diff < 0 ? `x² + ${Math.abs(diff)}x - ${P}` : `x² - ${P}`;
      const type = integer(random, 0, 3);
      if (type === 0) return { mode, prompt: `Smallest integer satisfying ${quadStr} ≤ 0`, answer: -a, strategy: `Factor as (x + ${a})(x - ${b}). An upward-opening quadratic is at or below zero between its roots, so -${a} ≤ x ≤ ${b}; the smallest integer is -${a}.`, level };
      if (type === 1) return { mode, prompt: `Largest integer satisfying ${quadStr} < 0`, answer: b - 1, strategy: `Factor as (x + ${a})(x - ${b}). The expression is negative strictly between the roots, so -${a} < x < ${b}; the largest integer below ${b} is ${b} - 1 = ${b - 1}.`, level };
      if (type === 2) return { mode, prompt: `Number of integer solutions to ${quadStr} ≤ 0`, answer: b + a + 1, strategy: `The roots are -${a} and ${b}, and “≤ 0” includes them. Count every integer from -${a} to ${b}: ${b} - (-${a}) + 1 = ${b + a + 1}.`, level };
      return allRoots(mode, `${quadStr} = 0`, [-a, b], quadraticRootTip([-a, b], b - a, -(a * b)), level);
    }
    if (level === 4) {
      const type = integer(random, 0, 2);
      if (type === 0) {
        const a = integer(random, 2, 4);
        const b = integer(random, a + 2, a + 6);
        return { mode, prompt: `Smallest integer satisfying (x - ${a})(x - ${b}) > 0 with x > ${a}`, answer: b + 1, strategy: `The product is positive outside its roots: x < ${a} or x > ${b}. The question also requires x > ${a}, leaving x > ${b}; the first integer is ${b} + 1 = ${b + 1}.`, level };
      }
      if (type === 1) {
        const b = integer(random, 2, 6);
        const B = 2 * b + 1;
        return allRoots(mode, `2x² - ${B}x + ${b} = 0`, [0.5, b], `Factor as (2x - 1)(x - ${b}) = 0. Set each factor to zero: 2x - 1 = 0 gives x = 1/2 = 0.5, and x - ${b} = 0 gives x = ${b}.`, level);
      }
      const b = integer(random, 3, 9);
      return { mode, prompt: `Number of positive integer solutions to x² - ${b}x ≤ 0`, answer: b, strategy: `Factor: x² - ${b}x = x(x - ${b}). It is ≤ 0 between roots 0 and ${b}, inclusive. The positive integers are 1 through ${b}, giving ${b} solutions.`, level };
    }
    const type = integer(random, 0, 2);
    if (type === 0) {
      const roots = [3, 4, 5, 6, 7, 8, 9, 10];
      const r = choose(random, roots);
      const c = r * r;
      return { mode, prompt: `Positive critical value of k for x² + kx + ${c} = 0 to have real roots`, answer: 2 * r, strategy: `Real roots require the discriminant b² - 4ac to be at least zero. Here that is k² - 4(${c}) ≥ 0, so k² ≥ ${(2 * r) ** 2}. At the critical boundary the discriminant is zero: k = √${(2 * r) ** 2} = ${2 * r} (take the positive value requested).`, level };
    }
    if (type === 1) {
      const roots = [3, 4, 5, 6, 7, 8];
      const r = choose(random, roots);
      const c = r * r;
      return { mode, prompt: `Upper bound for k (k > 0) if x² + kx + ${c} > 0 for all real x`, answer: 2 * r, strategy: `The parabola opens upward and stays strictly above zero only when it has no real roots, so its discriminant must be negative. k² - 4(${c}) < 0 gives k² < ${(2 * r) ** 2}; because k > 0, this means k < ${2 * r}.`, level };
    }
    const a = integer(random, 1, 3);
    const b = integer(random, 2, 5);
    const diff = b - a;
    const P = a * b;
    const quadStr = diff > 0 ? `x² - ${diff}x - ${P}` : diff < 0 ? `x² + ${Math.abs(diff)}x - ${P}` : `x² - ${P}`;
    let sum = 0;
    for (let i = -a + 1; i <= b - 1; i++) sum += i;
      return { mode, prompt: `Sum of integer solutions to ${quadStr} < 0`, answer: sum, strategy: `The roots are -${a} and ${b}. Since the parabola opens upward, it is negative strictly between them, so the integer solutions run from ${-a} + 1 = ${-a + 1} through ${b} - 1 = ${b - 1}. Add that consecutive range: ${sum}.`, level };
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
        return { mode, prompt: `x² - ${a + b}x + ${a * b} = (x - a)(x - b) with a < b. Find b`, answer: b, strategy: `For x² - ${a + b}x + ${a * b}, find two positive factors of ${a * b} that add to ${a + b}. They are ${a} and ${b}, because ${a} × ${b} = ${a * b} and ${a} + ${b} = ${a + b}; the larger is b = ${b}.`, level };
      }
      if (type === 2) {
        const a = integer(random, 1, 8);
        const b = integer(random, a + 1, a + 10);
        return allRoots(mode, `x² - ${a + b}x + ${a * b} = 0`, [a, b], quadraticRootTip([a, b], -(a + b), a * b), level);
      }
      const a = integer(random, 1, 8);
      const b = integer(random, a + 1, a + 10);
      return allRoots(mode, `x² - ${a + b}x + ${a * b} = 0`, [a, b], quadraticRootTip([a, b], -(a + b), a * b), level);
    }
    if (level === 2) {
      const type = integer(random, 0, 3);
      if (type === 0) {
        const p = integer(random, 1, 8);
        const q = integer(random, p + 1, p + 12);
        return allRoots(mode, `x² - ${q - p}x - ${p * q} = 0`, [-p, q], quadraticRootTip([-p, q], -(q - p), -(p * q)), level);
      }
      if (type === 1) {
        const p = integer(random, 1, 8);
        const q = integer(random, p + 1, p + 12);
        return { mode, prompt: `x² + ${q - p}x - ${p * q} = (x + a)(x - b) with a, b > 0. Find a`, answer: q, strategy: `The constant is negative, so the bracket numbers have opposite signs. The pair ${q} and -${p} multiplies to -${p * q} and adds to ${q - p}, matching the middle term. Thus the factorisation is (x + ${q})(x - ${p}), so a = ${q}.`, level };
      }
      if (type === 2) {
        const k = integer(random, 2, 16);
        return allRoots(mode, `x² - x - ${k * (k + 1)} = 0`, [-k, k + 1], quadraticRootTip([-k, k + 1], -1, -(k * (k + 1))), level);
      }
      const p = integer(random, 1, 8);
      const q = integer(random, p + 1, p + 12);
      return allRoots(mode, `x² + ${q - p}x - ${p * q} = 0`, [-q, p], quadraticRootTip([-q, p], q - p, -(p * q)), level);
    }
    if (level === 3) {
      const type = integer(random, 0, 4);
      if (type === 0) {
        const k = integer(random, 2, 20);
        return { mode, prompt: `Constant added to x² - ${2 * k}x to complete the square`, answer: k * k, strategy: `A square has the form (x + m)² = x² + 2mx + m². Match 2m to -${2 * k}, giving m = -${k}; the required constant is m² = (-${k})² = ${k * k}.`, level };
      }
      if (type === 1) {
        const k = integer(random, 2, 20);
        return { mode, prompt: `Constant added to x² + ${2 * k}x to complete the square`, answer: k * k, strategy: `A square has the form (x + m)² = x² + 2mx + m². Match 2m to ${2 * k}, so m = ${k}; add m² = ${k}² = ${k * k}.`, level };
      }
      if (type === 2) {
        const a = choose(random, [3, 5, 7, 9, 11, 13, 15, 17, 19]);
        return { mode, prompt: `4x² - ${a * a} = (2x - a)(2x + a). Find a`, answer: a, strategy: `This is a difference of squares: (2x)² - a² = (2x - a)(2x + a). Since a² = ${a * a}, take the positive square root: a = √${a * a} = ${a}.`, level };
      }
      if (type === 3) {
        const a = choose(random, [2, 4, 5, 7, 8, 10, 11, 13, 14]);
        return { mode, prompt: `9x² - ${a * a} = (3x - a)(3x + a). Find a`, answer: a, strategy: `This is a difference of squares: (3x)² - a² = (3x - a)(3x + a). Since a² = ${a * a}, take the positive square root: a = √${a * a} = ${a}.`, level };
      }
      const c = integer(random, 2, 16);
      return { mode, prompt: `x² + bx + ${c * c} is a perfect square (b > 0). Find b`, answer: 2 * c, strategy: `Match it to (x + m)² = x² + 2mx + m². Since m² = ${c * c}, m = ${c}; therefore b = 2m = 2 × ${c} = ${2 * c}.` , level };
    }
    if (level === 4) {
      const type = integer(random, 0, 4);
      if (type === 0) {
        const a = choose(random, [1, 3, 5]);
        const b = integer(random, 1, 9);
        return { mode, prompt: `2x² + ${2 * b + a}x + ${a * b} = (2x + ${a})(x + b). Find b`, answer: b, strategy: `Expand the constant parts: ${a} × b must equal ${a * b}. Divide by ${a}: b = ${a * b} ÷ ${a} = ${b}. Check the x-term: 2b + ${a} = ${2 * b + a}.`, level };
      }
      if (type === 1) {
        const b = integer(random, 2, 12);
        return allRoots(mode, `2x² - ${2 * b + 1}x + ${b} = 0`, [0.5, b], `Factor as (2x - 1)(x - ${b}) = 0. Set each factor to zero: 2x - 1 = 0 gives x = 1/2 = 0.5, and x - ${b} = 0 gives x = ${b}.`, level);
      }
      if (type === 2) {
        const a = choose(random, [1, 2]);
        const b = integer(random, 1, 8);
        return { mode, prompt: `3x² + ${3 * b + a}x + ${a * b} = (3x + ${a})(x + b). Find b`, answer: b, strategy: `Expand the constant parts: ${a} × b must equal ${a * b}. Divide by ${a}: b = ${a * b} ÷ ${a} = ${b}. Check the x-term: 3b + ${a} = ${3 * b + a}.`, level };
      }
      if (type === 3) {
        const b = integer(random, 2, 12);
        return allRoots(mode, `3x² - ${3 * b + 1}x + ${b} = 0`, [1 / 3, b], `Factor as (3x - 1)(x - ${b}) = 0. Set each factor to zero: 3x - 1 = 0 gives x = 1/3, and x - ${b} = 0 gives x = ${b}.`, level);
      }
      const a = choose(random, [2, 3, 4, 6, 7, 8, 9, 11]);
      return { mode, prompt: `25x² - ${a * a} = (5x - a)(5x + a). Find a`, answer: a, strategy: `Recognise (5x)² - a² as a difference of squares: (5x - a)(5x + a). Match a² = ${a * a}, so a = √${a * a} = ${a} (the positive value).`, level };
    }
    const type = integer(random, 0, 3);
    if (type === 0) {
      const h = integer(random, 2, 9);
      const k = integer(random, 1, 14);
      const c = h * h + k;
      return { mode, prompt: `Minimum value of y = x² - ${2 * h}x + ${c}`, answer: k, strategy: `Complete the square: x² - ${2 * h}x + ${c} = (x - ${h})² + ${c - h * h} = (x - ${h})² + ${k}. A square cannot be below zero, so the minimum occurs at x = ${h} and equals ${k}.`, level };
    }
    if (type === 1) {
      const h = integer(random, 2, 8);
      const k = integer(random, 10, 25);
      const c = k - h * h;
      const cStr = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`;
      return { mode, prompt: `Maximum value of y = -x² + ${2 * h}x ${cStr}`, answer: k, strategy: `Complete the square: -x² + ${2 * h}x ${cStr} = -(x - ${h})² + ${k}. Since -(x - ${h})² is at most zero, the maximum value is ${k}, reached at x = ${h}.`, level };
    }
    if (type === 2) {
      const a = integer(random, 1, 4);
      const b = integer(random, a + 1, a + 5);
      const B = a * a + b * b;
      const C = a * a * b * b;
      return allRoots(mode, `x⁴ - ${B}x² + ${C} = 0`, [-b, -a, a, b], `Substitute u = x² to get u² - ${B}u + ${C} = 0, which factors as (u - ${a * a})(u - ${b * b}) = 0. Thus x² = ${a * a} or ${b * b}; take both square roots of each: x = ±${a} or x = ±${b}.`, level);
    }
    const b = integer(random, 2, 12);
    return allRoots(mode, `3x² - ${3 * b - 1}x - ${b} = 0`, [-1 / 3, b], `Factor as (3x + 1)(x - ${b}) = 0. Set each factor to zero: 3x + 1 = 0 gives x = -1/3, and x - ${b} = 0 gives x = ${b}.`, level);
  }

  // mode === "decimals-large-numbers"
  if (level === 1) {
    const type = integer(random, 0, 3);
    if (type === 0) {
      const a = choose(random, [2, 3, 4, 5, 6, 7, 8]);
      const b = choose(random, [2, 3, 4, 5, 6, 7, 8, 9]);
      const ans = Number(((a * b) / 100).toFixed(2));
      return { mode, prompt: `0.${a} × 0.${b}`, answer: ans, strategy: `There is one decimal place in each factor, so the product has two decimal places. Multiply the digits first: ${a} × ${b} = ${a * b}; divide by 100: ${a * b} ÷ 100 = ${ans}.`, level };
    }
    if (type === 1) {
      const n = choose(random, [6, 8, 12, 14, 16, 24, 28, 36, 42]);
      const ans = Math.round(1.5 * n);
      return { mode, prompt: `1.5 × ${n}`, answer: ans, strategy: `Write 1.5 as 1 + 0.5. So 1.5 × ${n} = one ${n} (${n}) plus half of ${n} (${n / 2}): ${n} + ${n / 2} = ${ans}.`, level };
    }
    if (type === 2) {
      const n = choose(random, [8, 12, 14, 16, 18, 24, 28, 32]);
      const ans = Math.round(2.5 * n);
      return { mode, prompt: `2.5 × ${n}`, answer: ans, strategy: `Use 2.5 = 2 + 0.5: ${n} × 2 = ${2 * n} and half of ${n} is ${n / 2}. Add them: ${2 * n} + ${n / 2} = ${ans}.`, level };
    }
    const n = choose(random, [7, 9, 13, 14, 18, 23, 27, 34, 45]);
    return { mode, prompt: `${n} ÷ 0.5`, answer: n * 2, strategy: `Dividing by 0.5 asks how many halves fit in ${n}. Each whole contains 2 halves, so ${n} ÷ 0.5 = ${n} × 2 = ${n * 2}.`, level };
  }
  if (level === 2) {
    const type = integer(random, 0, 3);
    if (type === 0) {
      const tens = integer(random, 2, 9);
      const val = tens * 10 + 5;
      return { mode, prompt: `${val}²`, answer: val * val, strategy: `For a number ending in 5, multiply the digits before 5 by the next integer: ${tens} × ${tens + 1} = ${tens * (tens + 1)}. Append 25: ${tens * (tens + 1)}25 = ${val * val}.`, level };
    }
    if (type === 1) {
      const k = integer(random, 6, 24);
      const n = k * 4;
      return { mode, prompt: `${n} × 25`, answer: n * 25, strategy: `Since 25 = 100 ÷ 4, calculate ${n} ÷ 4 = ${k}, then multiply by 100: ${k} × 100 = ${n * 25}.`, level };
    }
    if (type === 2) {
      const n = integer(random, 6, 30);
      return { mode, prompt: `${n} ÷ 0.25`, answer: n * 4, strategy: `0.25 is one quarter. Dividing by one quarter asks how many quarters fit in ${n}; each whole has 4, so ${n} × 4 = ${n * 4}.`, level };
    }
    const a = choose(random, [3, 4, 6, 7, 8, 9]);
    const b = choose(random, [4, 5, 6, 7, 8, 9]);
    const prod = a * b;
    return { mode, prompt: `${prod} ÷ 0.0${a}`, answer: b * 100, strategy: `Multiply both numbers by 100 to clear the divisor's two decimal places: ${prod} × 100 ÷ ${a} = ${prod * 100} ÷ ${a} = ${b * 100}.`, level };
  }
  if (level === 3) {
    const type = integer(random, 0, 3);
    if (type === 0) {
      const k = integer(random, 2, 12);
      const n = k * 8;
      return { mode, prompt: `${n} × 125`, answer: n * 125, strategy: `Use 125 = 1,000 ÷ 8. First ${n} ÷ 8 = ${k}; then ${k} × 1,000 = ${n * 125}. This is the same as multiplying by 125.`, level };
    }
    if (type === 1) {
      const n = integer(random, 3, 15);
      return { mode, prompt: `${n} ÷ 0.125`, answer: n * 8, strategy: `0.125 = 1/8. Dividing by 1/8 asks how many eighths fit in ${n}, so multiply by 8: ${n} × 8 = ${n * 8}.`, level };
    }
    if (type === 2) {
      const T = choose(random, [30, 40, 50, 60, 70, 80]);
      const d = choose(random, [2, 3, 4]);
      const ans = T * T - d * d;
      return { mode, prompt: `${T + d} × ${T - d}`, answer: ans, strategy: `These factors are equally far from ${T}: (${T} + ${d})(${T} − ${d}). Use (a+b)(a−b) = a²−b²: ${T}² − ${d}² = ${T * T} − ${d * d} = ${ans}.`, level };
    }
    const k = choose(random, [6, 7, 8, 9, 11, 12, 13, 14, 15]);
    const val = Number(((k * k) / 100).toFixed(2));
    const ans = Number((k / 10).toFixed(1));
    return { mode, prompt: `√${val}`, answer: ans, strategy: `Look for the square root of the digits: ${k * k} is ${k}², so ${val} = ${k}²/100 = (${k}/10)². Therefore √${val} = ${k}/10 = ${ans}.`, level };
  }
  if (level === 4) {
    const type = integer(random, 0, 2);
    if (type === 0) {
      const d1 = integer(random, 2, 7);
      const d2 = integer(random, 2, 7);
      const a = 100 - d1;
      const b = 100 - d2;
      const rightPart = String(d1 * d2).padStart(2, "0");
      return { mode, prompt: `${a} × ${b}`, answer: a * b, strategy: `Both numbers are close to 100. Their deficits are ${d1} and ${d2}. Cross-subtract: ${a} - ${d2} = ${a - d2}. Multiply the deficits: ${d1} × ${d2} = ${rightPart}. Join the two-digit parts: ${a - d2}|${rightPart} = ${a * b}.`, level };
    }
    if (type === 1) {
      const s1 = integer(random, 2, 8);
      const s2 = integer(random, 2, 8);
      const a = 100 + s1;
      const b = 100 + s2;
      const rightPart = String(s1 * s2).padStart(2, "0");
      return { mode, prompt: `${a} × ${b}`, answer: a * b, strategy: `Both numbers are above 100 by ${s1} and ${s2}. Cross-add: ${a} + ${s2} = ${a + s2}. Multiply the surpluses: ${s1} × ${s2} = ${rightPart}. Join the two-digit parts: ${a + s2}|${rightPart} = ${a * b}.`, level };
    }
    const k = integer(random, 6, 20);
    const n = k * 4;
    const ans = Math.round(n * 1.25);
    return { mode, prompt: `1.25 × ${n}`, answer: ans, strategy: `1.25 = 1 + 1/4, so take the whole ${n} and add one quarter of it. ${n} ÷ 4 = ${k}; then ${n} + ${k} = ${ans}.`, level };
  }
  const type = integer(random, 0, 2);
  if (type === 0) {
    const tens = choose(random, [10, 11, 12]);
    const val = tens * 10 + 5;
    return { mode, prompt: `${val}²`, answer: val * val, strategy: `For a square ending in 5, multiply the part before 5 by the next integer: ${tens} × ${tens + 1} = ${tens * (tens + 1)}. Append 25: ${tens * (tens + 1)}25 = ${val * val}.`, level };
  }
  if (type === 1) {
    const pairs = [[75, 25], [65, 35], [85, 15], [55, 45], [70, 30], [80, 20]] as const;
    const [a, b] = choose(random, pairs);
    const ans = (a - b) * 100;
    return { mode, prompt: `${a}² − ${b}²`, answer: ans, strategy: `Use the difference-of-squares identity a² - b² = (a - b)(a + b). Here ${a} + ${b} = 100, so ${a}² - ${b}² = (${a} - ${b}) × 100 = ${ans}.`, level };
  }
  const deficit = integer(random, 2, 5);
  const mult = 1000 - deficit;
  const k = integer(random, 3, 9);
  return { mode, prompt: `${mult} × ${k}`, answer: mult * k, strategy: `Write ${mult} as 1,000 - ${deficit}. Then ${mult} × ${k} = (1,000 × ${k}) - (${deficit} × ${k}) = ${1000 * k} - ${deficit * k} = ${mult * k}.`, level };
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

export function verifyPracticeAnswer(input: string, question: Pick<PracticeQuestion, "answer" | "answers">): boolean {
  const answers = question.answers && question.answers.length > 1
    ? question.answers
    : [question.answer];
  if (answers.length > 1 && /^-?\d+(?:\.\d+)?$/.test(input.trim())
    && matchesRoundedAnswer(Number(input.trim()), question.answer)) return true;
  return verifyAllAnswers(input, answers);
}

function matchesRoundedAnswer(actual: number, expected: number): boolean {
  const displayed = Number(expected.toFixed(4));
  return Math.abs(actual - expected) <= Math.abs(displayed - expected) + 1e-10;
}

export function verifyAllAnswers(input: string, answers: number[]): boolean {
  if (answers.length > 1) {
    const parts = input.trim().split(/[,;\s]+/);
    if (parts.length !== answers.length || parts.some((part) => !/^-?\d+(?:\.\d+)?$/.test(part))) return false;
    const unmatched = [...answers];
    for (const part of parts) {
      const match = unmatched.findIndex((expected) => matchesRoundedAnswer(Number(part), expected));
      if (match === -1) return false;
      unmatched.splice(match, 1);
    }
    return unmatched.length === 0;
  }

  const normalized = input.trim().replaceAll(",", "");
  return /^-?\d+(?:\.\d+)?$/.test(normalized)
    && matchesRoundedAnswer(Number(normalized), answers[0]!);
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
