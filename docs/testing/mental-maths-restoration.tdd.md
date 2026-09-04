# Mental Maths restoration verification

Date: 2026-09-04

## Source and user journeys

This correction came directly from the user rather than a plan file.

- As a learner, I can choose normal mental-maths topics as well as hexadecimal practice.
- As a learner taking a hexadecimal test, I always receive exactly 40 questions: 20 decimal-to-hexadecimal and 20 hexadecimal-to-decimal.
- As a repeat learner, a normal new session produces a freshly randomized question set.
- As a learner, I can compare accuracy and answer speed over time while each topic adapts independently.
- As a friend, I can open a shared challenge link and receive the same seeded questions.
- As a repeat user, I see a direct practice dashboard rather than a marketing-style hero.

## RED evidence

Command:

```text
npm test
```

Observed before implementation:

```text
Test Files  3 failed | 1 passed (4)
Tests       3 failed | 11 passed (14)
```

The UI tests failed because the existing page only offered the hexadecimal trainer and still contained the rejected heading. The new practice-engine and share-link suites failed because their modules did not exist. This was the intended RED state. Checkpoint: `49b66a1 test: restore mental maths modes and randomized hex contract`.

## GREEN evidence

Command:

```text
npm test
```

Result:

```text
Test Files  4 passed (4)
Tests       21 passed (21)
```

Coverage command and result:

```text
npm run test:coverage
All files: 97.44% statements, 86.16% branches, 96.87% functions, 97.44% lines
```

Additional gates:

```text
npm run typecheck  # passed
npm run lint       # passed with zero warnings
npm run build      # passed; static production bundle emitted to dist/
```

## Test specification

| # | Guarantee | Evidence | Type | Result |
|---|---|---|---|---|
| 1 | The dashboard offers ten standard topics and hexadecimal practice | `App.test.tsx` topic-picker test | Integration | PASS |
| 2 | Standard topic selection starts a 20-question session | `App.test.tsx` addition flow | Integration | PASS |
| 3 | Hexadecimal selection starts a 40-question session | `App.test.tsx` hexadecimal flow | Integration | PASS |
| 4 | Every standard topic produces 20 unique, valid questions | `practice-engine.test.ts` all-topic generation test | Unit | PASS |
| 5 | Subtraction stays non-negative and division has exact integer answers | `practice-engine.test.ts` arithmetic constraints | Unit | PASS |
| 6 | Different seeds produce different standard sessions | `practice-engine.test.ts` seed variation test | Unit | PASS |
| 7 | Hex sessions contain exactly 20 questions in each conversion direction | `hex-engine.test.ts` balance test | Unit | PASS |
| 8 | Different hex seeds produce different question sets | `hex-engine.test.ts` fresh-set test | Unit | PASS |
| 9 | Challenge URLs preserve mode, level, and seed and reject malformed data | `share.test.ts` | Unit | PASS |
| 10 | Difficulty changes use complete-session accuracy and median pace | engine adaptation tests | Unit | PASS |

## Browser QA

Chrome was exercised against `http://localhost:4173/` at 1440 × 900 and 375 × 812.

- The straightforward dashboard displayed all eleven topic choices without the rejected copy.
- An addition session accepted a correct keyboard answer, updated accuracy and pace, and advanced from question 1 to question 2.
- Two consecutive normal hexadecimal starts produced different first values (`81` then `157`).
- A seeded hexadecimal challenge reloaded with the same first prompt (`97`) both times.
- Both desktop and mobile layouts had no horizontal overflow.
- Visible controls and inputs had accessible names, and the answer input received focus.
- The browser console contained no application errors or warnings.

Visual-regression status is **inconclusive** because the redesigned dashboard has no approved screenshot baseline. Live desktop and mobile layouts were inspected manually. Full 10- and 20-minute wall-clock waits were not performed in the browser; deadline calculations are covered by engine tests.

## Verification of delegated suggestion

An OmniRoute worker suggested a generic session model, deterministic challenge seeds, and a direct topic picker. The host verified these ideas against the existing React/Vite architecture and intentionally avoided the suggested Redux, React Router, Cypress, and new seed dependency because the current feature-local state, URL parser, Vitest, and existing seeded generators cover the requirements with less complexity. Route: `00MTMQCQP4H0YXHUWND3WGGG`.
