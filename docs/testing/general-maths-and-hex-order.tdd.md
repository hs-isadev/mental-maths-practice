# General maths, readable flash mode, and hexadecimal ordering

Date: 2026-09-04

## User journeys

- A General Maths session gives a randomized mixture of every non-hexadecimal topic.
- Each 20-question General Maths session contains exactly two questions from each of the ten categories.
- Fraction practice includes improper, awkward fractions and non-whole answers rounded explicitly to two decimal places.
- At level 5, short calculations flash for 1.5 seconds; sentence-style applied, ratio, and estimation questions remain visible.
- Hexadecimal questions 1–20 are decimal-to-hex, followed by questions 21–40 as hex-to-decimal.

## RED evidence

- `npm test -- --run`: 6 intended failures and 21 passes before mixed mode, awkward fractions, and flash mode were implemented. Checkpoint: `db0d23f`.
- `npm test -- --run apps/web/src/lib/hex-engine.test.ts`: 1 intended ordering failure and 11 passes. Checkpoint: `58e0ff5`.
- `npm test -- --run apps/web/src/components/PracticeSession.test.tsx`: 2 intended failures proving 500 ms was too short and sentences were hidden. Checkpoint: `85d03eb`.

## GREEN evidence

- `npm test -- --run`: 28 tests passed across 5 files.
- `npm run test:coverage`: 98.14% statements, 90.3% branches, 100% functions, and 98.14% lines.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run build`: passed and emitted the production bundle.

## Test specification

| # | Guarantee | Evidence | Type | Result |
|---|---|---|---|---|
| 1 | General Maths includes all ten categories exactly twice | `practice-engine.test.ts` mixed-category test | Unit | PASS |
| 2 | A General Maths seed reproduces the same shuffled set | `practice-engine.test.ts` deterministic mixed assertion | Unit | PASS |
| 3 | Higher-level fraction sets include improper fractions with non-whole answers | `practice-engine.test.ts` awkward-fraction test | Unit | PASS |
| 4 | Short level-5 questions remain visible at 500 ms and hide at 1.5 s | `PracticeSession.test.tsx` short-flash test | Component | PASS |
| 5 | Level-5 sentence questions remain visible after 5 seconds | `PracticeSession.test.tsx` sentence test | Component | PASS |
| 6 | Hex questions are grouped into two ordered 20-question direction blocks | `hex-engine.test.ts` direction-block test | Unit | PASS |
| 7 | General Maths is selectable from the dashboard | `App.test.tsx` General Maths flow | Integration | PASS |

## Browser QA

The dashboard, General Maths card, updated fraction description, and hexadecimal ordering copy were inspected at desktop and 375 px mobile widths. A hexadecimal session began in decimal-to-hex mode. A level-5 applied word problem remained visible, while a level-5 addition prompt hid and left its answer input focused. No browser console errors, warnings, or issues were found, and all requests returned 200 or 304 responses.

Visual-regression status is **inconclusive** because the project has no approved screenshot baseline.

## Delegated suggestion verification

An OmniRoute worker recommended a deterministic mixed-mode generator, broader fraction support, and a timed level-5 prompt. The host reused the existing seeded generator, guaranteed two questions per category, used explicit two-decimal rounding for awkward fractions, and revised the initial 500 ms whole-prompt behavior after user feedback so sentence questions never flash. Route: `00MTN0WA0SEYWUBD7MXBKVPA`.
