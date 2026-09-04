import { useEffect, useRef, useState } from "react";
import { Check, Clock3, Command, CornerDownLeft, Lightbulb, Timer, X } from "lucide-react";
import {
  PRACTICE_SESSION_DURATION_MS,
  getPracticeMode,
  remainingPracticeMs,
  summarizePracticeAttempts,
  verifyPracticeAnswer,
  type PracticeAttempt,
  type PracticeModeId,
  type PracticeQuestion,
  type PracticeSessionResult,
} from "../lib/practice-engine";
import { formatDuration } from "../lib/hex-engine";

interface PracticeSessionProps {
  questions: PracticeQuestion[];
  mode: PracticeModeId;
  level: number;
  seed: number;
  onComplete: (result: PracticeSessionResult) => void;
  onExit: () => void;
}

interface Feedback { correct: boolean; answer: number; strategy: string }

const FLASH_DURATION_MS = 500;

export function PracticeSession({ questions, mode, level, seed, onComplete, onExit }: PracticeSessionProps) {
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [remaining, setRemaining] = useState(PRACTICE_SESSION_DURATION_MS);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [validation, setValidation] = useState("");
  const startedAt = useRef(performance.now());
  const questionStartedAt = useRef(startedAt.current);
  const attemptsRef = useRef<PracticeAttempt[]>([]);
  const finished = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const advanceTimer = useRef<number | null>(null);
  const question = questions[index]!;
  const descriptor = getPracticeMode(mode);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextRemaining = remainingPracticeMs(startedAt.current, performance.now());
      setRemaining(nextRemaining);
      if (nextRemaining === 0 && !finished.current) {
        finished.current = true;
        onComplete(makeResult(seed, mode, level, attemptsRef.current, PRACTICE_SESSION_DURATION_MS, true));
      }
    }, 200);
    return () => window.clearInterval(interval);
  }, [level, mode, onComplete, seed]);

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
    if (!/^-?[\d,]+(?:\.\d+)?$/.test(answer)) {
      setValidation("Enter a number only.");
      return;
    }

    const correct = verifyPracticeAnswer(answer, question);
    const attempt: PracticeAttempt = {
      questionId: question.id,
      prompt: question.prompt,
      expectedAnswer: question.answer,
      submittedAnswer: answer,
      correct,
      responseMs: Math.max(1, performance.now() - questionStartedAt.current),
    };
    const nextAttempts = [...attemptsRef.current, attempt];
    attemptsRef.current = nextAttempts;
    setAttempts(nextAttempts);
    setValidation("");
    setFeedback({ correct, answer: question.answer, strategy: question.strategy });
    input.value = "";

    advanceTimer.current = window.setTimeout(() => {
      if (index + 1 >= questions.length) {
        if (!finished.current) {
          finished.current = true;
          onComplete(makeResult(seed, mode, level, nextAttempts, Math.min(PRACTICE_SESSION_DURATION_MS, performance.now() - startedAt.current), false));
        }
        return;
      }
      setIndex((current) => current + 1);
      setFeedback(null);
      questionStartedAt.current = performance.now();
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }, correct ? 300 : 1_100);
  }

  const summary = summarizePracticeAttempts(attempts);

  return (
    <main className="drill-screen practice-drill">
      <header className="drill-topbar">
        <button className="exit-drill" onClick={onExit} aria-label="Exit session"><X /></button>
        <div className="drill-progress-copy"><span><strong>{descriptor.label}</strong><small>Question {index + 1} of 20</small></span><div className="drill-progress"><i style={{ width: `${(index / questions.length) * 100}%` }} /></div></div>
        <div className={remaining <= 60_000 ? "countdown urgent" : "countdown"} aria-label={`${formatDuration(remaining)} remaining`}><Timer /><span><small>TIME LEFT</small><strong>{formatDuration(remaining)}</strong></span></div>
      </header>

      <div className="question-rail" aria-label="Question progress">
        {questions.map((item, itemIndex) => {
          const attempt = attempts[itemIndex];
          return <span key={item.id} className={itemIndex === index ? "current" : attempt?.correct ? "done correct" : attempt ? "done wrong" : ""}>{attempt?.correct ? <Check /> : attempt ? <X /> : itemIndex + 1}</span>;
        })}
      </div>

      <div className="practice-drill-body">
        <section className="practice-question-stage">
          <span className="practice-topic">{descriptor.label} · Level {level}</span>
          <FlashedQuestion key={question.id} prompt={question.prompt} flash={level === 5} />
          <form className="conversion-form practice-answer-form" onSubmit={submit}>
            <label htmlFor="practice-answer">Your answer</label>
            <div className="conversion-input"><span aria-hidden="true">=</span><input ref={inputRef} id="practice-answer" autoFocus autoComplete="off" spellCheck={false} inputMode="decimal" aria-invalid={Boolean(validation)} aria-describedby={validation ? "practice-validation" : "practice-instruction"} /><button type="submit" aria-label="Submit answer"><CornerDownLeft /><span>Submit</span></button></div>
            {validation ? <p id="practice-validation" className="validation" role="alert">{validation}</p> : <p id="practice-instruction"><kbd>ENTER</kbd> submits your answer</p>}
          </form>
        </section>

        <aside className="practice-live-panel">
          <h2>Current session</h2>
          <dl><div><dt>Accuracy</dt><dd>{attempts.length ? `${Math.round(summary.accuracy * 100)}%` : "—"}</dd></div><div><dt>Average speed</dt><dd>{summary.meanMs ? `${(summary.meanMs / 1_000).toFixed(1)}s` : "—"}</dd></div><div><dt>Correct</dt><dd>{summary.correct} / {attempts.length}</dd></div></dl>
          <p><Lightbulb /> Speed is measured per question. Difficulty changes only after a complete session.</p>
        </aside>
      </div>

      {feedback && <div className={feedback.correct ? "answer-feedback correct" : "answer-feedback wrong"} role="status" aria-live="assertive"><span className="feedback-icon">{feedback.correct ? <Check /> : <X />}</span><div><small>{feedback.correct ? "CORRECT" : `ANSWER · ${feedback.answer.toLocaleString()}`}</small><strong>{feedback.correct ? "Next question" : feedback.strategy}</strong></div></div>}
      <footer className="drill-footer"><span><Command />ESC to exit</span><span><Clock3 />Each answer is timed</span></footer>
    </main>
  );
}

function FlashedQuestion({ prompt, flash }: { prompt: string; flash: boolean }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setVisible(false), FLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);

  return (
    <>
      <h1 className={visible ? "" : "flash-hidden"}>{visible ? prompt : "•••"}</h1>
      {flash && <span className={visible ? "flash-status" : "flash-status hidden"}>{visible ? "Memorise the question" : "Question hidden — answer from memory"}</span>}
    </>
  );
}

function makeResult(seed: number, mode: PracticeModeId, level: number, attempts: PracticeAttempt[], durationMs: number, timedOut: boolean): PracticeSessionResult {
  return {
    id: `practice-session-${seed}-${Date.now()}`,
    completedAt: new Date().toISOString(),
    mode,
    level,
    seed,
    durationMs,
    timedOut,
    attempts,
    summary: summarizePracticeAttempts(attempts),
  };
}
