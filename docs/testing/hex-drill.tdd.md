# HEX//DRILL verification record

Date: 2026-09-04

## RED — behavior specified before implementation

The first focused test run was intentionally executed before `hex-engine.ts` existed:

```text
npm test -- --run apps/web/src/lib/hex-engine.test.ts apps/web/src/App.test.tsx
```

Observed result: failure during collection because `./hex-engine` could not be resolved. This established that the new conversion engine and its behavior were not already present.

The RED specification covered exact session size, balanced directions, conversion correctness, input normalization, deterministic generation, the hard timer boundary, performance summaries, and guarded difficulty changes. The UI specification required the 40-question/20-minute briefing and start action.

## GREEN — implementation verification

```text
npm test
Test Files  2 passed (2)
Tests       12 passed (12)

npm run test:coverage
hex-engine.ts: 98.47% statements, 88.73% branches, 100% functions, 98.47% lines

npm run typecheck
passed

npm run lint
passed with zero warnings

npm run build
passed; production assets emitted to dist/
```

Property-based conversion tests exercise round trips across the supported range `0..0xFFFFFF`. The timer boundary is tested directly at one millisecond before, exactly at, and after the 20-minute limit.

## Browser smoke test

Chrome was used against the local Vite build at desktop and a `375 × 812` mobile viewport.

- Dashboard content and exact 40-question / 20-minute protocol were visible.
- Starting a session focused the answer field and displayed question 1 of 40.
- Invalid hexadecimal input produced an assertive validation error and did not advance.
- Correct input advanced to the next question and updated live accuracy and timing.
- Incorrect input revealed the expected conversion and explanation.
- Mobile dashboard and drill views had no horizontal overflow.
- Interactive controls and the answer field had accessible names; the answer field retained focus.
- The browser console contained no application errors or warnings.

Visual-regression status is **inconclusive** because this new application has no approved screenshot baseline yet. The live responsive layouts were inspected manually. The complete 20-minute wall-clock duration was not waited out in the browser; its deadline calculation and edge conditions are covered by automated tests.
