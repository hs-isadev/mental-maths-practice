import { ArrowLeft, ArrowRight, Check, Clock3, Gauge, RotateCcw, Trophy, X } from "lucide-react";
import type { CSSProperties } from "react";
import { adaptHexLevel, formatDuration, type HexSessionResult } from "../lib/hex-engine";

interface HexSummaryProps { result: HexSessionResult; onHome: () => void; onRetry: () => void }

export function HexSummary({ result, onHome, onRetry }: HexSummaryProps) {
  const { summary } = result;
  const nextLevel = adaptHexLevel(result.level, summary);
  const errors = result.attempts.filter((attempt) => !attempt.correct);
  const promoted = nextLevel > result.level;

  return (
    <main className="result-screen">
      <header className="result-topbar"><button onClick={onHome}><ArrowLeft />Dashboard</button><span className="hex-logo compact"><span className="logo-cube">H<sub>16</sub></span><strong>HEX//DRILL</strong></span><span>SESSION ARCHIVED</span></header>
      <div className="result-wrap">
        <section className="result-heading"><span className={summary.accuracy >= .85 ? "result-mark good" : "result-mark"}>{summary.accuracy >= .85 ? <Check /> : <Gauge />}</span><span className="kicker">Session complete</span><h1>{summary.accuracy >= .9 ? "Conversion locked in." : summary.accuracy >= .75 ? "Baseline secured." : "Weak spots located."}</h1><p>{result.timedOut ? "The 20-minute limit ended this run." : `All ${result.attempts.length} attempted conversions are saved.`} {promoted ? `Level ${nextLevel} is ready next.` : "The next set will hold this range."}</p></section>

        <section className="result-metrics">
          <article className="score-article"><div className="score-ring" style={{ "--score": `${summary.accuracy * 360}deg` } as CSSProperties}><span><strong>{Math.round(summary.accuracy * 100)}</strong><small>% ACCURACY</small></span></div></article>
          <article><span><Trophy />Correct</span><strong>{summary.correct}<small> / {summary.attempts}</small></strong><p>{40 - summary.attempts} unanswered</p></article>
          <article><span><Clock3 />Median pace</span><strong>{summary.medianMs ? `${(summary.medianMs/1000).toFixed(1)}s` : "—"}</strong><p>{formatDuration(result.durationMs)} total</p></article>
          <article><span><Gauge />Next range</span><strong>L{nextLevel}</strong><p>{nextLevel === result.level ? "Level held" : promoted ? "Promotion earned" : "Foundation reset"}</p></article>
        </section>

        <div className="result-grid">
          <section className="direction-card"><div className="panel-title"><div><span className="kicker">Direction split</span><h2>Back and forth</h2></div></div><DirectionRow label="Decimal → Hex" data={summary.byDirection["decimal-to-hex"]} accent="var(--acid)" /><DirectionRow label="Hex → Decimal" data={summary.byDirection["hex-to-decimal"]} accent="var(--cyan)" /></section>
          <section className="review-card"><div className="panel-title"><div><span className="kicker">Review queue</span><h2>{errors.length ? `${errors.length} to repair` : "No errors"}</h2></div></div>{errors.length ? <div className="error-list">{errors.slice(0,5).map((attempt, index) => <article key={`${attempt.questionId}-${index}`}><span className="error-x"><X /></span><span><small>{attempt.direction === "decimal-to-hex" ? "DEC → HEX" : "HEX → DEC"}</small><strong>{attempt.prompt}</strong></span><ArrowRight /><span><small>Correct</small><strong>{attempt.expectedAnswer}</strong></span></article>)}</div> : <div className="perfect-message"><Check /><p>Every conversion was correct. The next run can safely prioritize speed.</p></div>}</section>
        </div>
        <div className="result-actions"><button className="main-action" onClick={onRetry}><RotateCcw />Run another 40</button><button className="ghost-action" onClick={onHome}>Back to dashboard</button></div>
      </div>
    </main>
  );
}

function DirectionRow({ label, data, accent }: { label: string; data: HexSessionResult["summary"]["byDirection"]["decimal-to-hex"]; accent: string }) {
  const percent = Math.round(data.accuracy * 100);
  return <div className="direction-row"><div><strong>{label}</strong><small>{data.correct} of {data.attempts} correct</small></div><div className="direction-bar"><i style={{ width: `${percent}%`, background: accent }} /></div><span><strong>{percent}%</strong><small>{data.medianMs ? `${(data.medianMs/1000).toFixed(1)}s` : "—"}</small></span></div>;
}
