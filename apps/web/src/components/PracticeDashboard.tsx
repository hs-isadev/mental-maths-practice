import {
  Asterisk,
  Binary,
  ChevronRight,
  Divide,
  History,
  Minus,
  Percent,
  PieChart,
  Plus,
  Ruler,
  Share2,
  ShoppingBasket,
  Split,
  Superscript,
  Target,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { LEVEL_LABELS, formatDuration, type HexSessionResult } from "../lib/hex-engine";
import { PRACTICE_MODES, type PracticeModeId, type PracticeSessionResult } from "../lib/practice-engine";
import type { ChallengeMode } from "../lib/share";

interface PracticeDashboardProps {
  practiceHistory: PracticeSessionResult[];
  hexHistory: HexSessionResult[];
  levels: Record<PracticeModeId, number>;
  hexLevel: number;
  onStart: (mode: ChallengeMode, options?: { level: number }) => void;
  onClear: () => void;
  onShareApp: () => Promise<void>;
}

const icons: Record<PracticeModeId, LucideIcon> = {
  addition: Plus,
  subtraction: Minus,
  multiplication: Asterisk,
  division: Divide,
  fractions: PieChart,
  percentages: Percent,
  ratios: Split,
  powers: Superscript,
  estimation: Ruler,
  applied: ShoppingBasket,
};

export function PracticeDashboard({ practiceHistory, hexHistory, levels, hexLevel, onStart, onClear, onShareApp }: PracticeDashboardProps) {
  const [shareStatus, setShareStatus] = useState("Share app");
  const [hexRange, setHexRange] = useState<"basic" | "adaptive">("basic");
  const combined = [
    ...practiceHistory.map((result) => ({ id: result.id, completedAt: result.completedAt, label: PRACTICE_MODES.find((mode) => mode.id === result.mode)!.label, level: result.level, attempts: result.summary.attempts, accuracy: result.summary.accuracy, medianMs: result.summary.medianMs, durationMs: result.durationMs })),
    ...hexHistory.map((result) => ({ id: result.id, completedAt: result.completedAt, label: "Hexadecimal", level: result.level, attempts: result.summary.attempts, accuracy: result.summary.accuracy, medianMs: result.summary.medianMs, durationMs: result.durationMs })),
  ].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const totalAnswers = combined.reduce((sum, result) => sum + result.attempts, 0);
  const bestAccuracy = combined.length ? Math.max(...combined.map((result) => result.accuracy)) : 0;
  const latestMedian = combined.find((result) => result.medianMs > 0)?.medianMs ?? 0;

  async function shareApp() {
    await onShareApp();
    setShareStatus("Link copied");
    window.setTimeout(() => setShareStatus("Share app"), 1_800);
  }

  return (
    <main className="practice-dashboard">
      <header className="practice-header">
        <a href="./" className="practice-brand" aria-label="Mental Maths home"><span>M²</span><strong>Mental Maths</strong></a>
        <div><span className="saved-note">Progress saved on this device</span><button onClick={() => void shareApp()}><Share2 />{shareStatus}</button></div>
      </header>

      <div className="practice-shell">
        <section className="practice-intro">
          <div><span className="eyebrow">Practice dashboard</span><h1>Mental maths practice</h1><p>Choose a topic. Each answer is timed, and difficulty adjusts as your results improve.</p></div>
          <dl><div><dt>Sessions</dt><dd>{combined.length}</dd></div><div><dt>Answers</dt><dd>{totalAnswers}</dd></div><div><dt>Best</dt><dd>{combined.length ? `${Math.round(bestAccuracy * 100)}%` : "—"}</dd></div><div><dt>Latest pace</dt><dd>{latestMedian ? `${(latestMedian / 1_000).toFixed(1)}s` : "—"}</dd></div></dl>
        </section>

        <section className="topic-section" aria-labelledby="core-topics">
          <div className="section-heading"><div><span className="eyebrow">20 questions · 10 minutes</span><h2 id="core-topics">Core arithmetic</h2></div><p>Start with the four operations.</p></div>
          <div className="topic-grid core-grid">{PRACTICE_MODES.slice(0, 4).map((mode) => <TopicCard key={mode.id} mode={mode.id} label={mode.label} description={mode.description} level={levels[mode.id]} icon={icons[mode.id]} onStart={onStart} />)}</div>
        </section>

        <section className="topic-section" aria-labelledby="more-topics">
          <div className="section-heading"><div><span className="eyebrow">20 questions · 10 minutes</span><h2 id="more-topics">More topics</h2></div><p>Practise common test question types.</p></div>
          <div className="topic-grid">{PRACTICE_MODES.slice(4).map((mode) => <TopicCard key={mode.id} mode={mode.id} label={mode.label} description={mode.description} level={levels[mode.id]} icon={icons[mode.id]} onStart={onStart} />)}</div>
        </section>

        <section className="hex-mode-card" aria-labelledby="hex-topic">
          <div className="hex-mode-icon"><Binary /></div>
          <div><span className="eyebrow">40 questions · 20 minutes</span><h2 id="hex-topic">Hexadecimal</h2><p>20 decimal to hexadecimal and 20 hexadecimal to decimal. Every new session gets a newly randomized set.</p></div>
          <label className="hex-range-select" htmlFor="hex-range">
            <span>Hex range</span>
            <select id="hex-range" name="hex-range" value={hexRange} onChange={(event) => setHexRange(event.target.value as "basic" | "adaptive")}>
              <option value="basic">Basic · up to 2 digits (00–FF)</option>
              <option value="adaptive">Adaptive · Level {hexLevel} ({LEVEL_LABELS[hexLevel - 1]})</option>
            </select>
          </label>
          <button onClick={() => onStart("hexadecimal", { level: hexRange === "basic" ? 1 : hexLevel })} aria-label="Hexadecimal. Start 40-question session">Start</button>
        </section>

        <section className="recent-practice" aria-labelledby="recent-title">
          <div className="section-heading"><div><span className="eyebrow">Saved locally</span><h2 id="recent-title">Recent sessions</h2></div>{combined.length > 0 && <button className="clear-history-button" onClick={onClear}><Trash2 />Clear history</button>}</div>
          {combined.length === 0 ? <div className="practice-empty"><History /><p>Complete a session to see your accuracy and speed history here.</p></div> : <div className="practice-history-list">{combined.slice(0, 8).map((result) => <article key={result.id}><span className="history-topic">{result.label}</span><span><small>Accuracy</small><strong>{Math.round(result.accuracy * 100)}%</strong></span><span><small>Median</small><strong>{result.medianMs ? `${(result.medianMs / 1_000).toFixed(1)}s` : "—"}</strong></span><span><small>Time</small><strong>{formatDuration(result.durationMs)}</strong></span><span className="history-level">L{result.level}</span><ChevronRight /></article>)}</div>}
        </section>
      </div>
      <footer className="practice-page-footer"><span><Target />Accuracy and speed both affect the next level.</span><span>Works offline after the first load.</span></footer>
    </main>
  );
}

function TopicCard({ mode, label, description, level, icon: Icon, onStart }: { mode: PracticeModeId; label: string; description: string; level: number; icon: LucideIcon; onStart: (mode: ChallengeMode, options?: { level: number }) => void }) {
  return <button className="topic-card" onClick={() => onStart(mode)} aria-label={`${label}. Start 20-question session`}><span className="topic-icon"><Icon /></span><span className="topic-copy"><strong>{label}</strong><small>{description}</small></span><span className="topic-level"><small>LEVEL</small>{level}</span><ChevronRight /></button>;
}
