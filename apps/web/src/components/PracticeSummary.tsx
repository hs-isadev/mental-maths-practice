import { ArrowLeft, Check, Copy, RotateCcw, Share2, X } from "lucide-react";
import { useState } from "react";
import { formatDuration } from "../lib/hex-engine";
import { adaptPracticeLevel, getPracticeMode, type PracticeSessionResult } from "../lib/practice-engine";

interface PracticeSummaryProps {
  result: PracticeSessionResult;
  onHome: () => void;
  onRetry: () => void;
  onShare: () => Promise<void>;
}

export function PracticeSummary({ result, onHome, onRetry, onShare }: PracticeSummaryProps) {
  const [shared, setShared] = useState(false);
  const mode = getPracticeMode(result.mode);
  const nextLevel = adaptPracticeLevel(result.level, result.summary);
  const errors = result.attempts.filter((attempt) => !attempt.correct);

  async function share() {
    await onShare();
    setShared(true);
  }

  return (
    <main className="simple-results">
      <header><button onClick={onHome}><ArrowLeft />Topics</button><strong>Mental Maths</strong></header>
      <div className="simple-result-wrap">
        <span className="eyebrow">{mode.label} complete</span>
        <h1>{result.summary.correct} of {result.summary.attempts} correct</h1>
        <p>{result.timedOut ? "The 10-minute limit ended this session." : `Finished in ${formatDuration(result.durationMs)}.`} Your next {mode.label.toLowerCase()} session is level {nextLevel}.</p>
        <section className="simple-result-metrics" aria-label="Session results">
          <div><small>Accuracy</small><strong>{Math.round(result.summary.accuracy * 100)}%</strong></div>
          <div><small>Average answer</small><strong>{result.summary.meanMs ? `${(result.summary.meanMs / 1_000).toFixed(1)}s` : "—"}</strong></div>
          <div><small>Next level</small><strong>{nextLevel}</strong></div>
        </section>
        <div className="simple-result-actions"><button className="primary" onClick={onRetry}><RotateCcw />Try another set</button><button onClick={() => void share()}>{shared ? <Check /> : <Share2 />}{shared ? "Link copied" : "Challenge a friend"}</button></div>
        <section className="simple-review">
          <h2>{errors.length ? "Questions to review" : "No mistakes"}</h2>
          {errors.length ? errors.slice(0, 8).map((attempt, index) => (
            <article key={`${attempt.questionId}-${index}`}>
              <X />
              <span>
                <small>{attempt.prompt}</small>
                <strong>{attempt.expectedAnswer?.toLocaleString()}</strong>
                {attempt.strategy && <small className="review-shortcut">💡 {attempt.strategy}</small>}
              </span>
            </article>
          )) : <p><Check /> All answers were correct.</p>}
        </section>
        <button className="text-button" onClick={() => void share()}><Copy />Copy these questions as a challenge</button>
      </div>
    </main>
  );
}
