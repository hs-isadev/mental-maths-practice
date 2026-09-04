import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Command, CornerDownLeft, Hash, ShieldAlert, Timer, X, Zap } from "lucide-react";
import {
  HEX_SESSION_DURATION_MS,
  checkHexAnswer,
  formatDuration,
  remainingSessionMs,
  summarizeHexAttempts,
  type HexAttempt,
  type HexQuestion,
  type HexSessionResult,
} from "../lib/hex-engine";
import { HexReference } from "./HexReference";

interface HexSessionProps {
  questions: HexQuestion[];
  level: number;
  seed: number;
  onComplete: (result: HexSessionResult) => void;
  onExit: () => void;
}

interface Feedback { correct: boolean; answer: string; explanation: string }

export function HexSession({ questions, level, seed, onComplete, onExit }: HexSessionProps) {
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<HexAttempt[]>([]);
  const [remaining, setRemaining] = useState(HEX_SESSION_DURATION_MS);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [validation, setValidation] = useState("");
  const startedAt = useRef(performance.now());
  const questionStartedAt = useRef(startedAt.current);
  const attemptsRef = useRef<HexAttempt[]>([]);
  const finished = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const advanceTimer = useRef<number | null>(null);
  const question = questions[index]!;

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextRemaining = remainingSessionMs(startedAt.current, performance.now());
      setRemaining(nextRemaining);
      if (nextRemaining === 0 && !finished.current) {
        finished.current = true;
        onComplete(makeResult(seed, level, attemptsRef.current, HEX_SESSION_DURATION_MS, true));
      }
    }, 200);
    return () => window.clearInterval(interval);
  }, [level, onComplete, seed]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onExit();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit]);

  useEffect(() => () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = inputRef.current;
    if (!input || feedback || finished.current) return;
    const answer = input.value.trim();
    const validPattern = question.direction === "decimal-to-hex" ? /^(?:0x)?[0-9a-f]+$/i : /^\d+$/;
    if (!validPattern.test(answer)) {
      setValidation(question.direction === "decimal-to-hex" ? "Use 0–9 and A–F only." : "Use decimal digits only.");
      return;
    }
    const correct = checkHexAnswer(answer, question.answer, question.direction);
    const attempt: HexAttempt = {
      questionId: question.id,
      direction: question.direction,
      prompt: question.prompt,
      expectedAnswer: question.answer,
      submittedAnswer: answer.toUpperCase(),
      correct,
      responseMs: Math.max(1, performance.now() - questionStartedAt.current),
    };
    const nextAttempts = [...attemptsRef.current, attempt];
    attemptsRef.current = nextAttempts;
    setAttempts(nextAttempts);
    setValidation("");
    setFeedback({ correct, answer: question.answer, explanation: explain(question) });
    input.value = "";

    advanceTimer.current = window.setTimeout(() => {
      if (index + 1 >= questions.length) {
        if (!finished.current) {
          finished.current = true;
          const duration = Math.min(HEX_SESSION_DURATION_MS, performance.now() - startedAt.current);
          onComplete(makeResult(seed, level, nextAttempts, duration, false));
        }
        return;
      }
      setIndex((current) => current + 1);
      setFeedback(null);
      questionStartedAt.current = performance.now();
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }, correct ? 360 : 1_150);
  }

  const liveSummary = summarizeHexAttempts(attempts);
  const urgent = remaining <= 60_000;

  return (
    <main className="drill-screen">
      <header className="drill-topbar">
        <button className="exit-drill" onClick={onExit} aria-label="Exit session"><X /></button>
        <div className="drill-progress-copy"><span><strong>Question {index + 1}</strong><small>of 40</small></span><div className="drill-progress"><i style={{ width: `${(index / questions.length) * 100}%` }} /></div></div>
        <div className={urgent ? "countdown urgent" : "countdown"} aria-label={`${formatDuration(remaining)} remaining`}><Timer /><span><small>TIME LEFT</small><strong>{formatDuration(remaining)}</strong></span></div>
      </header>

      <div className="question-rail" aria-label="Question progress">
        {questions.map((item, itemIndex) => {
          const attempt = attempts[itemIndex];
          return <span key={item.id} className={itemIndex === index ? "current" : attempt?.correct ? "done correct" : attempt ? "done wrong" : ""}>{attempt?.correct ? <Check /> : attempt ? <X /> : itemIndex + 1}</span>;
        })}
      </div>

      <div className="drill-body">
        <section className="conversion-stage">
          <div className="direction-label"><span>{question.sourceLabel}</span><ArrowRight /><span>{question.targetLabel}</span></div>
          <div className="question-value"><small>{question.sourceLabel === "HEX" ? "0x" : ""}</small>{question.prompt}<sub>{question.sourceLabel === "HEX" ? "16" : "10"}</sub></div>
          <form className="conversion-form" onSubmit={submit}>
            <label htmlFor="hex-answer">Convert to {question.targetLabel === "HEX" ? "hexadecimal" : "decimal"}</label>
            <div className="conversion-input"><span>{question.targetLabel === "HEX" ? "0x" : ""}</span><input ref={inputRef} id="hex-answer" autoFocus autoComplete="off" spellCheck={false} inputMode={question.targetLabel === "DEC" ? "numeric" : "text"} aria-invalid={Boolean(validation)} aria-describedby={validation ? "answer-validation" : "input-instruction"} /><button type="submit" aria-label="Submit answer"><CornerDownLeft /><span>Submit</span></button></div>
            {validation ? <p id="answer-validation" className="validation" role="alert">{validation}</p> : <p id="input-instruction"><kbd>ENTER</kbd> submits · prefix <code>0x</code> is optional · case does not matter</p>}
          </form>
          <div className="place-guide"><Hash /><span><small>Active place values</small><strong>{question.placeValues.map((value) => value.toLocaleString()).join(" · ")}</strong></span></div>
        </section>

        <aside className="drill-aside">
          <div className="live-readout"><span className="kicker">Live readout</span><div><span><small>Accuracy</small><strong>{attempts.length ? `${Math.round(liveSummary.accuracy * 100)}%` : "—"}</strong></span><span><small>Median</small><strong>{liveSummary.medianMs ? `${(liveSummary.medianMs / 1000).toFixed(1)}s` : "—"}</strong></span></div></div>
          <div className="pace-ticks"><div className="panel-title"><span>RESPONSE PACE</span><small>LAST 12</small></div><div>{attempts.slice(-12).map((attempt, itemIndex) => <i key={`${attempt.questionId}-${itemIndex}`} className={attempt.correct ? "" : "miss"} style={{ height: `${Math.max(12, Math.min(100, 110 - attempt.responseMs / 90))}%` }} />)}{attempts.length === 0 && Array.from({ length: 12 }, (_, itemIndex) => <i key={itemIndex} className="empty" style={{ height: `${25 + ((itemIndex * 17) % 55)}%` }} />)}</div><span><small>slower</small><small>faster</small></span></div>
          <HexReference compact />
          <div className="protocol-note"><ShieldAlert /><p><strong>Test protocol</strong>The 20-minute clock does not pause. Leaving the tab does not create extra time.</p></div>
        </aside>
      </div>

      {feedback && <div className={feedback.correct ? "answer-feedback correct" : "answer-feedback wrong"} role="status" aria-live="assertive"><span className="feedback-icon">{feedback.correct ? <Check /> : <X />}</span><div><small>{feedback.correct ? "CORRECT" : `CORRECT ANSWER · ${feedback.answer}`}</small><strong>{feedback.correct ? "Locked." : feedback.explanation}</strong></div><Zap /></div>}
      <footer className="drill-footer"><span><Command />ESC to exit</span><span><Clock3 />Every answer timed with a high-resolution clock</span></footer>
    </main>
  );
}

function makeResult(seed: number, level: number, attempts: HexAttempt[], durationMs: number, timedOut: boolean): HexSessionResult {
  return {
    id: `hex-session-${seed}-${Date.now()}`,
    completedAt: new Date().toISOString(),
    level,
    durationMs,
    timedOut,
    attempts,
    summary: summarizeHexAttempts(attempts),
  };
}

function explain(question: HexQuestion): string {
  if (question.direction === "hex-to-decimal") {
    const terms = question.prompt.split("").map((digit, index, digits) => {
      const value = Number.parseInt(digit, 16);
      const power = 16 ** (digits.length - index - 1);
      return `${value}×${power}`;
    });
    return `${terms.join(" + ")} = ${question.answer}`;
  }
  const quotient = Math.floor(question.value / 16);
  const remainder = question.value % 16;
  return `${question.value} ÷ 16 = ${quotient} remainder ${remainder.toString(16).toUpperCase()} → ${question.answer}`;
}
