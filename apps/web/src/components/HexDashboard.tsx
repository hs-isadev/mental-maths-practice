import { ArrowRight, Binary, CalendarClock, ChevronRight, CircleGauge, Clock3, Flame, Gauge, History, Keyboard, LockKeyhole, RotateCcw, ShieldCheck, Timer, Trophy, Zap } from "lucide-react";
import { LEVEL_LABELS, adaptHexLevel, formatDuration, levelMaximum, type HexSessionResult } from "../lib/hex-engine";
import { HexReference } from "./HexReference";

interface DashboardProps {
  history: HexSessionResult[];
  level: number;
  setLevel: (level: number) => void;
  onStart: () => void;
  onClear: () => void;
}

function formatPace(milliseconds: number): string {
  return milliseconds ? `${(milliseconds / 1_000).toFixed(1)}s` : "—";
}

export function HexDashboard({ history, level, setLevel, onStart, onClear }: DashboardProps) {
  const latest = history[0];
  const best = history.reduce<HexSessionResult | undefined>((current, result) => {
    if (!current) return result;
    return result.summary.accuracy > current.summary.accuracy || (result.summary.accuracy === current.summary.accuracy && result.summary.medianMs < current.summary.medianMs) ? result : current;
  }, undefined);
  const nextLevel = latest ? adaptHexLevel(latest.level, latest.summary) : level;
  const bestStreak = Math.max(0, ...history.map((session) => {
    let streak = 0; let bestRun = 0;
    for (const attempt of session.attempts) { streak = attempt.correct ? streak + 1 : 0; bestRun = Math.max(bestRun, streak); }
    return bestRun;
  }));

  return (
    <main className="hex-dashboard">
      <header className="hex-topbar">
        <a className="hex-logo" href="#top" aria-label="Hex Drill home"><span className="logo-cube">H<sub>16</sub></span><span><strong>HEX//DRILL</strong><small>CONVERSION TRAINER</small></span></a>
        <div className="topbar-status"><span><i />Offline ready</span><span className="topbar-divider" /><span><CalendarClock />Test protocol · 40 / 20</span></div>
      </header>

      <div className="dashboard-wrap" id="top">
        <section className="dashboard-heading">
          <div><span className="kicker">Hexadecimal</span><h1>Hexadecimal<br /><em>practice</em></h1><p>Forty conversions in twenty minutes, split evenly in both directions.</p></div>
          <div className="session-specs" aria-label="Session rules"><span className="visually-hidden">40 conversions</span><span className="visually-hidden">20:00 limit</span><span><strong>40</strong><small>conversions</small></span><i /><span><strong>20:00</strong><small>limit</small></span><i /><span><strong>50/50</strong><small>both ways</small></span></div>
        </section>

        <div className="dashboard-grid">
          <section className="launch-console" aria-labelledby="launch-title">
            <div className="console-noise" aria-hidden="true" />
            <div className="console-header"><span><i />Next session</span><span>SEED {new Date().toISOString().slice(0,10).replaceAll("-", "")}</span></div>
            <div className="conversion-demo">
              <span><small>DEC</small><strong>255</strong></span><div className="convert-arrow"><ArrowRight /></div><span><small>HEX</small><strong>FF</strong></span>
            </div>
            <div className="launch-copy"><span className="level-chip">LEVEL {nextLevel} · {LEVEL_LABELS[nextLevel - 1]}</span><h2 id="launch-title">Full conversion set</h2><p>Values from 0 to {levelMaximum(nextLevel).toLocaleString()}. Directions are balanced and shuffled.</p></div>
            <button className="launch-button" onClick={onStart}><span><Zap fill="currentColor" />Start 40-question session</span><kbd>ENTER</kbd></button>
            <div className="launch-footer"><span><Keyboard />Keyboard first</span><span><ShieldCheck />Saved locally</span><span><Timer />Hard 20-minute stop</span></div>
          </section>

          <aside className="level-panel">
            <div className="panel-title"><div><span className="kicker">Difficulty</span><h2>Number range</h2></div><CircleGauge /></div>
            <div className="level-selector" role="group" aria-label="Difficulty level">
              {[1,2,3,4,5].map((value) => <button key={value} className={value === level ? "active" : ""} onClick={() => setLevel(value)} aria-label={`Level ${value}, ${LEVEL_LABELS[value - 1]}`}><span>{value}</span><i /></button>)}
            </div>
            <div className="level-readout"><span><small>Current range</small><strong>0 — {decimalCompact(levelMaximum(level))}</strong></span><span><small>Max hex</small><strong>0x{levelMaximum(level).toString(16).toUpperCase()}</strong></span></div>
            <div className="adaptive-note"><Gauge /><p><strong>Adaptive guardrail</strong>{latest ? ` Your last complete result recommends level ${nextLevel}.` : " Complete one set to establish your pace baseline."}</p></div>
          </aside>
        </div>

        <section className="metric-row" aria-label="Training metrics">
          <article><span className="metric-symbol"><Trophy /></span><div><small>Best accuracy</small><strong>{best ? `${Math.round(best.summary.accuracy * 100)}%` : "—"}</strong><p>{best ? `${best.summary.correct} / ${best.summary.attempts} answered` : "No session yet"}</p></div></article>
          <article><span className="metric-symbol cyan"><Clock3 /></span><div><small>Median conversion</small><strong>{latest ? formatPace(latest.summary.medianMs) : "—"}</strong><p>Correct answers only</p></div></article>
          <article><span className="metric-symbol orange"><Flame /></span><div><small>Longest clean run</small><strong>{bestStreak || "—"}</strong><p>Consecutive answers</p></div></article>
          <article><span className="metric-symbol purple"><Binary /></span><div><small>Conversions logged</small><strong>{history.reduce((sum, session) => sum + session.attempts.length, 0) || "—"}</strong><p>Across {history.length} sessions</p></div></article>
        </section>

        <div className="lower-dashboard">
          <HexReference />
          <section className="history-panel">
            <div className="panel-title"><div><span className="kicker">History</span><h2>Recent sessions</h2></div>{history.length > 0 && <button className="clear-button" onClick={onClear}><RotateCcw />Clear</button>}</div>
            {history.length === 0 ? <div className="empty-history"><History /><strong>Your baseline starts here.</strong><p>Complete the first set to unlock direction splits, pace trends, and adaptive ranges.</p></div> : <div className="history-list">{history.slice(0,4).map((session, index) => <article key={session.id}><span className="history-index">{String(index + 1).padStart(2,"0")}</span><span><strong>{Math.round(session.summary.accuracy * 100)}%</strong><small>accuracy</small></span><span><strong>{formatPace(session.summary.medianMs)}</strong><small>median</small></span><span><strong>{formatDuration(session.durationMs)}</strong><small>total</small></span><span className="history-level">L{session.level}</span><ChevronRight /></article>)}</div>}
          </section>
        </div>

        <footer className="dashboard-footer"><span><LockKeyhole />All performance data stays in this browser.</span><span>HEX//DRILL · v1.0</span></footer>
      </div>
    </main>
  );
}

function decimalCompact(value: number): string {
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)}K` : String(value);
}
