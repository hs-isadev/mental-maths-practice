import { useCallback, useEffect, useState } from "react";
import { HexDashboard } from "./components/HexDashboard";
import { HexSession } from "./components/HexSession";
import { HexSummary } from "./components/HexSummary";
import { adaptHexLevel, createHexSession, type HexQuestion, type HexSessionResult } from "./lib/hex-engine";
import { clearHexHistory, loadHexHistory, saveHexSession } from "./lib/hex-storage";

type Screen = "dashboard" | "session" | "summary";

export function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [history, setHistory] = useState<HexSessionResult[]>([]);
  const [level, setLevel] = useState(2);
  const [questions, setQuestions] = useState<HexQuestion[]>([]);
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<HexSessionResult | null>(null);

  useEffect(() => {
    let active = true;
    loadHexHistory().then((stored) => {
      if (!active) return;
      setHistory(stored);
      const latest = stored[0];
      if (latest) setLevel(adaptHexLevel(latest.level, latest.summary));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const startSession = useCallback(() => {
    const nextSeed = Date.now() >>> 0;
    setSeed(nextSeed);
    setQuestions(createHexSession(nextSeed, level));
    setScreen("session");
  }, [level]);

  useEffect(() => {
    if (screen !== "dashboard") return;
    function startFromKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.key === "Enter" && target?.tagName !== "BUTTON") startSession();
    }
    window.addEventListener("keydown", startFromKeyboard);
    return () => window.removeEventListener("keydown", startFromKeyboard);
  }, [screen, startSession]);

  function finishSession(nextResult: HexSessionResult) {
    setResult(nextResult);
    setHistory((current) => [nextResult, ...current].slice(0, 60));
    setLevel(adaptHexLevel(nextResult.level, nextResult.summary));
    setScreen("summary");
    void saveHexSession(nextResult).catch(() => undefined);
  }

  async function clearHistory() {
    if (!window.confirm("Clear all locally saved hexadecimal session history?")) return;
    await clearHexHistory().catch(() => undefined);
    setHistory([]);
    setLevel(2);
  }

  if (screen === "session") {
    return <HexSession questions={questions} level={level} seed={seed} onComplete={finishSession} onExit={() => setScreen("dashboard")} />;
  }
  if (screen === "summary" && result) {
    return <HexSummary result={result} onHome={() => setScreen("dashboard")} onRetry={startSession} />;
  }
  return <HexDashboard history={history} level={level} setLevel={setLevel} onStart={startSession} onClear={() => void clearHistory()} />;
}
