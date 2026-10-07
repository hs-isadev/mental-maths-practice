import { useEffect, useRef, useState } from "react";
import { Check, Clock3, Command, CornerDownLeft, Eraser, Lightbulb, Timer, X } from "lucide-react";
import {
  PRACTICE_SESSION_DURATION_MS,
  getPracticeMode,
  remainingPracticeMs,
  summarizePracticeAttempts,
  verifyAllAnswers,
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

interface Feedback { correct: boolean; answer: string; strategy: string }
interface PhysicsGrade {
  score: number;
  outOf: number;
  answerCorrect: boolean;
  methodMark: number;
  unitMark: number;
  expectedUnit: string;
  wordedFeedback: string | null;
  wordedFeedbackSource: "groq" | "basic";
  feedback: { answer: string; method: string; units: string };
}

const FLASH_DURATION_MS = 1_500;
const PHYSICS_GRADER_URL = import.meta.env.VITE_PHYSICS_GRADER_URL ?? "";
const FLASHABLE_MODES = new Set<PracticeModeId>([
  "addition", "subtraction", "multiplication", "division", "fractions", "percentages", "powers",
]);

export function PracticeSession({ questions, mode, level, seed, onComplete, onExit }: PracticeSessionProps) {
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [remaining, setRemaining] = useState(PRACTICE_SESSION_DURATION_MS);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [validation, setValidation] = useState("");
  const [showTip, setShowTip] = useState(false);
  const [hasWorking, setHasWorking] = useState(false);
  const [workingError, setWorkingError] = useState("");
  const [workingRevision, setWorkingRevision] = useState(0);
  const [recognizedWorking, setRecognizedWorking] = useState("");
  const [physicsGrade, setPhysicsGrade] = useState<PhysicsGrade | null>(null);
  const [gradingStep, setGradingStep] = useState<"ocr" | "grade" | null>(null);
  const startedAt = useRef(performance.now());
  const questionStartedAt = useRef(startedAt.current);
  const attemptsRef = useRef<PracticeAttempt[]>([]);
  const finished = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement>(null);
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = inputRef.current;
    if (!input || feedback || finished.current || gradingStep) return;
    const answer = input.value.trim();
    if (mode === "physics" && !hasWorking) {
      setWorkingError("Show your working in the space above before submitting.");
      return;
    }
    const hasMultipleAnswers = (question.answers?.length ?? 0) > 1;
    const validAnswerShape = hasMultipleAnswers
      ? /^-?\d+(?:\.\d+)?(?:[,;\s]+-?\d+(?:\.\d+)?)+$/.test(answer)
      : /^-?[\d,]+(?:\.\d+)?$/.test(answer);
    if (!validAnswerShape) {
      setValidation(hasMultipleAnswers ? "Enter every solution as a number, separated by commas." : "Enter a number only.");
      return;
    }

    if (mode === "physics") {
      const canvas = workingCanvasRef.current;
      if (!canvas) return;
      try {
        setValidation("");
        if (!PHYSICS_GRADER_URL) throw new Error("The physics grader is not connected yet. Its service URL must be configured before OCR and Laya grading can run.");
        if (!recognizedWorking) {
          setGradingStep("ocr");
          const ocrResponse = await fetch(`${graderUrl()}/api/physics/ocr`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ imageDataUrl: canvas.toDataURL("image/png") }),
          });
          const ocrResult = await ocrResponse.json().catch(() => ({ error: "The physics grader is unavailable. Check its service URL and try again." }));
          if (!ocrResponse.ok) throw new Error(ocrResult.error || "Could not read the handwriting.");
          setRecognizedWorking(String(ocrResult.transcription || ""));
          if (!ocrResult.transcription) throw new Error("OCR could not read the working. Try writing larger and darker.");
          return;
        }

        const expectedUnit = extractExpectedUnit(question.strategy);
        if (!expectedUnit) throw new Error("This question is missing its expected unit, so the work cannot be graded safely.");
        setGradingStep("grade");
        const gradeResponse = await fetch(`${graderUrl()}/api/physics/grade`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt: question.prompt,
            transcription: recognizedWorking,
            expectedStrategy: question.strategy,
            expectedUnit,
            answer,
            expectedAnswer: question.answer,
          }),
        });
        const gradeResult = await gradeResponse.json().catch(() => ({ error: "The physics grader is unavailable. Check its service URL and try again." }));
        if (!gradeResponse.ok) throw new Error(gradeResult.error || "Could not grade the working.");
        setPhysicsGrade(gradeResult);

        const gradeCorrect = gradeResult.score === gradeResult.outOf;
        const attempt: PracticeAttempt = {
          questionId: question.id,
          prompt: question.prompt,
          expectedAnswer: question.answer,
          submittedAnswer: answer,
          strategy: question.strategy,
          correct: gradeCorrect,
          responseMs: Math.max(1, performance.now() - questionStartedAt.current),
          workScore: gradeResult.score,
          workOutOf: gradeResult.outOf,
          methodMark: gradeResult.methodMark,
          unitMark: gradeResult.unitMark,
          expectedUnit: gradeResult.expectedUnit,
        };
        finishAttempt(attempt, [question.answer]);
      } catch (error) {
        setValidation(error instanceof Error ? error.message : "The grading service is unavailable.");
      } finally {
        setGradingStep(null);
      }
      return;
    }

    const correct = verifyAllAnswers(answer, question.answers && question.answers.length > 1 ? question.answers : [question.answer]);
    const attempt: PracticeAttempt = {
      questionId: question.id,
      prompt: question.prompt,
      expectedAnswer: hasMultipleAnswers ? question.answers : question.answer,
      submittedAnswer: answer,
      strategy: question.strategy,
      correct,
      responseMs: Math.max(1, performance.now() - questionStartedAt.current),
    };
    finishAttempt(attempt, question.answers && question.answers.length > 1 ? question.answers : [question.answer]);
  }

  function finishAttempt(attempt: PracticeAttempt, expectedAnswers: number[]) {
    const nextAttempts = [...attemptsRef.current, attempt];
    attemptsRef.current = nextAttempts;
    setAttempts(nextAttempts);
    setValidation("");
    setFeedback({
      correct: attempt.correct,
      answer: expectedAnswers.map((value) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })).join(", "),
      strategy: question.strategy,
    });
    if (inputRef.current) inputRef.current.value = "";

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
      setShowTip(false);
      setHasWorking(false);
      setWorkingError("");
      setRecognizedWorking("");
      setPhysicsGrade(null);
      setWorkingRevision((revision) => revision + 1);
      questionStartedAt.current = performance.now();
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }, attempt.correct ? 300 : 1_100);
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
          <FlashedQuestion key={question.id} prompt={question.prompt} flash={level === 5 && FLASHABLE_MODES.has(question.mode)} className={mode === "physics" ? "scenario-question" : ""} />
          {mode === "physics" && <section className="physics-working" aria-labelledby="physics-working-label">
            <div className="physics-working-heading"><label id="physics-working-label">Show your working</label><button type="button" className="clear-working" onClick={() => { setHasWorking(false); setWorkingError(""); setRecognizedWorking(""); setPhysicsGrade(null); setWorkingRevision((revision) => revision + 1); }}><Eraser /> Clear</button></div>
            <WorkingCanvas key={`${question.id}-${workingRevision}`} canvasRef={workingCanvasRef} onDraw={() => { setHasWorking(true); setWorkingError(""); }} />
            <p className="working-note">Write the formula, substitution, final answer, and units. Your writing is sent to the configured grader; its OCR text is sent to Groq for feedback when configured. It is not saved.</p>
            {recognizedWorking && <label className="ocr-transcription">OCR transcription — correct anything it misread<textarea value={recognizedWorking} onChange={(event) => { setRecognizedWorking(event.target.value); setPhysicsGrade(null); }} rows={4} /></label>}
            {workingError && <p className="validation" role="alert">{workingError}</p>}
          </section>}
          <form className="conversion-form practice-answer-form" onSubmit={submit}>
            <label htmlFor="practice-answer">Your answer</label>
            <div className="conversion-input"><span aria-hidden="true">=</span><input ref={inputRef} id="practice-answer" autoFocus autoComplete="off" spellCheck={false} inputMode={question.answers && question.answers.length > 1 ? "text" : "decimal"} aria-invalid={Boolean(validation)} aria-describedby={validation ? "practice-validation" : "practice-instruction"} /><button type="submit" aria-label={mode === "physics" ? recognizedWorking ? "Grade written work" : "Read written work" : "Submit answer"} disabled={Boolean(gradingStep)}><CornerDownLeft /><span>{gradingStep === "ocr" ? "Reading…" : gradingStep === "grade" ? "Grading…" : mode === "physics" ? recognizedWorking ? "Grade work" : "Read work" : "Submit"}</span></button></div>
            {validation ? <p id="practice-validation" className="validation" role="alert">{validation}</p> : <p id="practice-instruction">{mode === "physics" ? recognizedWorking ? "Review the transcription above, correct OCR mistakes, then grade your workings." : "Enter the final number, then read your written working." : question.answers && question.answers.length > 1 ? "Enter every solution, separated by commas (for example: -9, 10)." : <><kbd>ENTER</kbd> submits your answer</>}</p>}
          </form>
          <div className="practice-tip-container">
            <button type="button" className="practice-tip-toggle" onClick={() => setShowTip((prev) => !prev)}>
              <Lightbulb />
              <span>{showTip ? "Hide shortcut tip" : "Shortcut tip"}</span>
            </button>
            {showTip && <p className="practice-tip-content">💡 {question.strategy}</p>}
          </div>
        </section>

        <aside className="practice-live-panel">
          <h2>Current session</h2>
          <dl><div><dt>Accuracy</dt><dd>{attempts.length ? `${Math.round(summary.accuracy * 100)}%` : "—"}</dd></div><div><dt>Average speed</dt><dd>{summary.meanMs ? `${(summary.meanMs / 1_000).toFixed(1)}s` : "—"}</dd></div><div><dt>Correct</dt><dd>{summary.correct} / {attempts.length}</dd></div></dl>
          <p><Lightbulb /> Speed is measured per question. Difficulty changes only after a complete session.</p>
        </aside>
      </div>

      {feedback && <div className={feedback.correct ? "answer-feedback correct" : "answer-feedback wrong"} role="status" aria-live="assertive"><span className="feedback-icon">{feedback.correct ? <Check /> : <X />}</span><div><small>{mode === "physics" && physicsGrade ? `WORKING · ${physicsGrade.score}/${physicsGrade.outOf} · Answer ${physicsGrade.answerCorrect ? 2 : 0}/2 · Method ${physicsGrade.methodMark}/2 · Units ${physicsGrade.unitMark}/1 · ${physicsGrade.wordedFeedbackSource === "groq" ? "Groq feedback" : "Basic feedback"}` : feedback.correct ? "CORRECT" : `ANSWER · ${feedback.answer}`}</small><strong>{mode === "physics" && physicsGrade ? physicsGrade.wordedFeedback || `${physicsGrade.feedback.answer} Expected ${feedback.answer} ${physicsGrade.feedback.method} ${physicsGrade.feedback.units} Expected unit: ${physicsGrade.expectedUnit}.` : feedback.correct ? "Next question" : feedback.strategy}</strong></div></div>}
      <footer className="drill-footer"><span><Command />ESC to exit</span><span><Clock3 />Each answer is timed</span></footer>
    </main>
  );
}

function FlashedQuestion({ prompt, flash, className = "" }: { prompt: string; flash: boolean; className?: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setVisible(false), FLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);

  return (
    <>
      <h1 className={`${className}${visible ? "" : " flash-hidden"}`}>{visible ? prompt : "•••"}</h1>
      {flash && <span className={visible ? "flash-status" : "flash-status hidden"}>{visible ? "Memorise the question" : "Question hidden — answer from memory"}</span>}
    </>
  );
}

function WorkingCanvas({ canvasRef, onDraw }: { canvasRef: React.RefObject<HTMLCanvasElement | null>; onDraw: () => void }) {
  const drawing = useRef(false);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (canvas.width / bounds.width), y: (event.clientY - bounds.top) * (canvas.height / bounds.height) };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const position = point(event);
    const context = canvas?.getContext("2d");
    if (!canvas || !position || !context) return;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(position.x, position.y);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#17211c";
    drawing.current = true;
  }

  function continueDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const position = point(event);
    const context = canvasRef.current?.getContext("2d");
    if (!position || !context) return;
    context.lineTo(position.x, position.y);
    context.stroke();
    onDraw();
  }

  function stopDrawing() {
    drawing.current = false;
  }

  return <canvas ref={canvasRef} className="physics-working-canvas" width={900} height={280} aria-label="Write your physics working here" onPointerDown={startDrawing} onPointerMove={continueDrawing} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} />;
}

function graderUrl(): string {
  return PHYSICS_GRADER_URL.replace(/\/$/, "");
}

function extractExpectedUnit(strategy: string): string {
  const match = strategy.match(/(?:=|to)\s*[-+]?(?:\d[\d,]*(?:\.\d+)?|\.\d+)\s*([A-Za-zµμΩ°%]+(?:[·/][A-Za-z\dµμΩ°²³]+)*)[.!?]?\s*$/u);
  return match?.[1] ?? "";
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
