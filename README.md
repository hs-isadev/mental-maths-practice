# HEX//DRILL

A keyboard-first hexadecimal conversion trainer built for timed test practice.

Each session contains exactly 40 unique questions with a balanced 20/20 split between decimal-to-hexadecimal and hexadecimal-to-decimal conversion. The session ends after the fortieth answer or at the hard 20-minute limit.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:4173`. A production bundle can be created with `npm run build` and previewed with `npm run preview`.

## Training model

- Five value ranges, from 8-bit values through 24-bit values.
- Deterministic seeded sessions with no duplicate numeric values.
- Every response is measured with a high-resolution timer.
- Live accuracy, median correct-answer time, pace marks, streaks, and direction splits.
- Difficulty can rise only after at least 30 answers with strong accuracy and pace; it drops when accuracy needs rebuilding.
- Completed sessions and progress history are stored only in the current browser with IndexedDB.
- Installable PWA shell for offline practice after the first successful load.

Hexadecimal answers accept upper- or lowercase letters and an optional `0x` prefix. Invalid symbols are rejected without consuming a question.

## Quality checks

```bash
npm test
npm run test:coverage
npm run typecheck
npm run lint
npm run build
```

The test-first implementation evidence and browser smoke-test notes are recorded in [docs/testing/hex-drill.tdd.md](docs/testing/hex-drill.tdd.md).

## Structure

- `apps/web/src/lib/hex-engine.ts` — conversions, seeded question generation, timing math, scoring, and adaptive rules.
- `apps/web/src/lib/hex-storage.ts` — local session persistence.
- `apps/web/src/components/` — dashboard, live drill, reference panel, and session summary.
- `apps/web/public/` — manifest, app mark, and service worker.
