import { useCallback, useEffect, useRef, useState } from "react";
import { HexSession } from "./components/HexSession";
import { HexSummary } from "./components/HexSummary";
import { PracticeDashboard } from "./components/PracticeDashboard";
import { PracticeSession } from "./components/PracticeSession";
import { PracticeSummary } from "./components/PracticeSummary";
import { adaptHexLevel, createHexSession, type HexQuestion, type HexSessionResult } from "./lib/hex-engine";
import { clearHexHistory, loadHexHistory, saveHexSession } from "./lib/hex-storage";
import {
  PRACTICE_MODES,
  adaptPracticeLevel,
  createPracticeSession,
  createRandomSeed,
  type PracticeModeId,
  type PracticeQuestion,
  type PracticeSessionResult,
} from "./lib/practice-engine";
import { clearPracticeHistory, loadPracticeHistory, savePracticeSession } from "./lib/practice-storage";
import { buildChallengeUrl, readChallenge, type Challenge, type ChallengeMode } from "./lib/share";

type Screen = "dashboard" | "practice-session" | "hex-session" | "practice-summary" | "hex-summary";

function initialLevels(): Record<PracticeModeId, number> {
  return Object.fromEntries(PRACTICE_MODES.map((mode) => [mode.id, 2])) as Record<PracticeModeId, number>;
}

export function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [practiceHistory, setPracticeHistory] = useState<PracticeSessionResult[]>([]);
  const [hexHistory, setHexHistory] = useState<HexSessionResult[]>([]);
  const [levels, setLevels] = useState(initialLevels);
  const [hexLevel, setHexLevel] = useState(2);
  const [activeMode, setActiveMode] = useState<ChallengeMode>("addition");
  const [activeLevel, setActiveLevel] = useState(2);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [hexQuestions, setHexQuestions] = useState<HexQuestion[]>([]);
  const [seed, setSeed] = useState(0);
  const [practiceResult, setPracticeResult] = useState<PracticeSessionResult | null>(null);
  const [hexResult, setHexResult] = useState<HexSessionResult | null>(null);
  const challengeStarted = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadPracticeHistory(), loadHexHistory()]).then(([storedPractice, storedHex]) => {
      if (!active) return;
      setPracticeHistory(storedPractice);
      setHexHistory(storedHex);
      setLevels((current) => {
        const next = { ...current };
        for (const mode of PRACTICE_MODES) {
          const latest = storedPractice.find((result) => result.mode === mode.id);
          if (latest) next[mode.id] = adaptPracticeLevel(latest.level, latest.summary);
        }
        return next;
      });
      const latestHex = storedHex[0];
      if (latestHex) setHexLevel(adaptHexLevel(latestHex.level, latestHex.summary));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const startSession = useCallback((mode: ChallengeMode, challenge?: Challenge) => {
    const nextSeed = challenge?.seed ?? createRandomSeed();
    const nextLevel = challenge?.level ?? (mode === "hexadecimal" ? hexLevel : levels[mode]);
    setActiveMode(mode);
    setActiveLevel(nextLevel);
    setSeed(nextSeed);
    if (mode === "hexadecimal") {
      setHexQuestions(createHexSession(nextSeed, nextLevel));
      setScreen("hex-session");
    } else {
      setQuestions(createPracticeSession(nextSeed, mode, nextLevel));
      setScreen("practice-session");
    }
  }, [hexLevel, levels]);

  useEffect(() => {
    if (challengeStarted.current) return;
    challengeStarted.current = true;
    const challenge = readChallenge(window.location.href);
    if (challenge) startSession(challenge.mode, challenge);
  }, [startSession]);

  function finishPractice(result: PracticeSessionResult) {
    setPracticeResult(result);
    setPracticeHistory((current) => [result, ...current].slice(0, 120));
    setLevels((current) => ({ ...current, [result.mode]: adaptPracticeLevel(result.level, result.summary) }));
    setScreen("practice-summary");
    void savePracticeSession(result).catch(() => undefined);
  }

  function finishHex(result: HexSessionResult) {
    setHexResult(result);
    setHexHistory((current) => [result, ...current].slice(0, 60));
    setHexLevel(adaptHexLevel(result.level, result.summary));
    setScreen("hex-summary");
    void saveHexSession(result).catch(() => undefined);
  }

  async function clearHistory() {
    if (!window.confirm("Clear all locally saved practice history?")) return;
    await Promise.all([clearPracticeHistory(), clearHexHistory()]).catch(() => undefined);
    setPracticeHistory([]);
    setHexHistory([]);
    setLevels(initialLevels());
    setHexLevel(2);
  }

  async function shareUrl(url: string, title: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
    window.prompt("Copy this link", url);
  }

  function shareChallenge(mode: ChallengeMode, level: number, challengeSeed: number) {
    return shareUrl(buildChallengeUrl(mode, level, challengeSeed), `${mode === "hexadecimal" ? "Hexadecimal" : "Mental maths"} challenge`);
  }

  if (screen === "practice-session" && activeMode !== "hexadecimal") {
    return <PracticeSession questions={questions} mode={activeMode} level={activeLevel} seed={seed} onComplete={finishPractice} onExit={() => setScreen("dashboard")} />;
  }
  if (screen === "hex-session") {
    return <HexSession questions={hexQuestions} level={activeLevel} seed={seed} onComplete={finishHex} onExit={() => setScreen("dashboard")} />;
  }
  if (screen === "practice-summary" && practiceResult) {
    return <PracticeSummary result={practiceResult} onHome={() => setScreen("dashboard")} onRetry={() => startSession(practiceResult.mode)} onShare={() => shareChallenge(practiceResult.mode, practiceResult.level, practiceResult.seed)} />;
  }
  if (screen === "hex-summary" && hexResult) {
    return <HexSummary result={hexResult} onHome={() => setScreen("dashboard")} onRetry={() => startSession("hexadecimal")} onShare={() => shareChallenge("hexadecimal", hexResult.level, hexResult.seed)} />;
  }
  return <PracticeDashboard practiceHistory={practiceHistory} hexHistory={hexHistory} levels={levels} hexLevel={hexLevel} onStart={startSession} onClear={() => void clearHistory()} onShareApp={() => {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    return shareUrl(url.toString(), "Mental Maths practice");
  }} />;
}
