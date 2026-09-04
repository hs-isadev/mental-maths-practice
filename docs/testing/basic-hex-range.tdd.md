# Basic hexadecimal range verification

Date: 2026-09-04

## User journey

- As a learner, I can choose basic hexadecimal practice limited to values from `00` through `FF`.
- A basic session still contains 40 freshly randomized questions and lasts 20 minutes.
- Each session still contains exactly 20 decimal-to-hexadecimal and 20 hexadecimal-to-decimal questions.
- The active session clearly identifies the selected basic range.
- I can choose the adaptive range instead when I want larger values.

## RED evidence

Command: `npm test -- --run`

Observed before implementation: 1 failed and 22 passed. The integration test could not find a hexadecimal range selector. Checkpoint: `0632a58 test: specify basic hexadecimal range option`.

## GREEN evidence

- `npm test -- --run`: 23 tests passed.
- `npm run test:coverage`: 97.44% statements, 86.25% branches, 96.87% functions, and 97.44% lines.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run build`: passed and emitted the production bundle.

## Browser QA

Chrome was exercised against `http://localhost:4173/` at 1440 × 900 and 375 × 812.

- The range control defaults to `Basic · up to 2 digits (00–FF)` and also offers the current adaptive level.
- Starting the basic option opened question 1 of 40 and displayed `Basic range · 00–FF`.
- The desktop and mobile hexadecimal cards had no visible clipping or horizontal overflow.
- All 28 page requests completed with 200 or 304 responses, and the console contained no errors, warnings, or issues after the final reload.
- Lighthouse snapshot scores were 95 accessibility and 100 best practices. The audit still reports four site-level findings; the new range selector is labeled and named, and the earlier field issue was cleared.

Visual-regression status is **inconclusive** because the project has no approved screenshot baseline.

## Delegated suggestion verification

An OmniRoute worker suggested exposing a radio/select range control and enforcing the `0xFF` cap in the generator. The host verified that existing level 1 already enforces this cap, so the implementation reuses that tested level instead of introducing a redundant level. Route: `00MTMRXK9EGKN125V4QO5M2W`.
