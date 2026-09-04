import { ArrowLeft, Check, RotateCcw, Share2, X } from "lucide-react";
import { useState } from "react";
import { adaptHexLevel, formatDuration, type HexSessionResult } from "../lib/hex-engine";

interface HexSummaryProps {
  result: HexSessionResult;
  onHome: () => void;
  onRetry: () => void;
  onShare: () => Promise<void>;
}

export function HexSummary({ result, onHome, onRetry, onShare }: HexSummaryProps) {
  const [shared, setShared] = useState(false);
  const nextLevel = adaptHexLevel(result.level, result.summary);
  const errors = result.attempts.filter((attempt) => !attempt.correct);

  async function share() {
    await onShare();
    setShared(true);
  }

  return (
    <main className="simple-results">
      <header><button onClick={onHome}><ArrowLeft />Topics</button><strong>Mental Maths</strong></header>
      <div className="simple-result-wrap">
        <span className="eyebrow">Hexadecimal complete</span>
        <h1>{result.summary.correct} of {result.summary.attempts} correct</h1>
        <p>{result.timedOut ? "The 20-minute limit ended this session." : `Finished in ${formatDuration(result.durationMs)}.`} Your next hexadecimal session is level {nextLevel}.</p>
        <section className="simple-result-metrics" aria-label="Session results">
          <div><small>Accuracy</small><strong>{Math.round(result.summary.accuracy * 100)}%</strong></div>
          <div><small>Decimal → hex</small><strong>{result.summary.byDirection["decimal-to-hex"].correct} / 20</strong></div>
          <div><small>Hex → decimal</small><strong>{result.summary.byDirection["hex-to-decimal"].correct} / 20</strong></div>
          <div><small>Median answer</small><strong>{result.summary.medianMs ? `${(result.summary.medianMs / 1_000).toFixed(1)}s` : "—"}</strong></div>
        </section>
        <div className="simple-result-actions"><button className="primary" onClick={onRetry}><RotateCcw />New random set</button><button onClick={() => void share()}>{shared ? <Check /> : <Share2 />}{shared ? "Link copied" : "Challenge a friend"}</button></div>
        <section className="simple-review">
          <h2>{errors.length ? "Questions to review" : "No mistakes"}</h2>
          {errors.length ? errors.slice(0, 8).map((attempt, index) => <article key={`${attempt.questionId}-${index}`}><X /><span><small>{attempt.direction === "decimal-to-hex" ? `${attempt.prompt} (decimal)` : `0x${attempt.prompt}`}</small><strong>{attempt.expectedAnswer}</strong></span></article>) : <p><Check /> All answers were correct.</p>}
        </section>
      </div>
    </main>
  );
}
