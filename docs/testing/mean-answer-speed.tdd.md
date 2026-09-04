# Mean answer speed verification

Date: 2026-09-04

## User journeys

- As a learner, I see my arithmetic mean answer speed instead of a median.
- As a learner, I see the same average metric on the dashboard, live drills, session history, and result summaries.
- As a learner, difficulty changes use average speed and accuracy consistently.
- As a returning learner, old saved sessions are recalculated from their stored attempts.

Mean speed is calculated from correct answers only so fast incorrect guesses cannot improve the pace score.

## RED evidence

`npm test -- --run` produced 3 intended failures and 20 passes. Both engines returned no `meanMs` value. Checkpoint: `db8804b test: specify mean average answer speed`.

## GREEN evidence

- `npm test -- --run`: 23 tests passed.
- `npm run test:coverage`: 97.37% statements, 88.23% branches, 96.87% functions, and 97.37% lines.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run build`: passed and emitted the production bundle.
- GREEN checkpoint: `f7852f9 feat: replace median pace with mean speed`.

## Test specification

| # | Guarantee | Evidence | Type | Result |
|---|---|---|---|---|
| 1 | Practice summaries compute the arithmetic mean of correct response times | `practice-engine.test.ts` varied-duration assertion | Unit | PASS |
| 2 | Hex summaries compute overall and per-direction arithmetic means | `hex-engine.test.ts` varied-duration assertions | Unit | PASS |
| 3 | Incorrect-answer times do not alter the speed average | Both varied-duration engine tests | Unit | PASS |
| 4 | Empty sessions report a zero mean | `hex-engine.test.ts` empty-summary assertion | Unit | PASS |
| 5 | Adaptive level logic accepts and uses the mean pace metric | Practice and hex adaptation tests | Unit | PASS |

## Browser QA

The live app at `http://localhost:4173/` displayed `Average speed` on the dashboard and `Average` in a basic hexadecimal drill. After one correct answer, the live average changed from an em dash to a measured time. No `Median` label remained in the app source. All 28 network requests returned 200 responses and the browser console had no errors, warnings, or issues.

Visual-regression status is **inconclusive** because the project has no approved screenshot baseline.

## Delegated suggestion verification

An OmniRoute worker proposed an additive `meanMs` field with a legacy fallback. The host used the compatible part of that suggestion, but recalculates old records from their stored raw attempts rather than displaying their former median as an average. Route: `00MTMSJMW442TAFIUB01DRTA`.
