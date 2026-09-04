# Mental Maths Practice

A keyboard-first practice app that measures accuracy and answer speed, saves progress locally, and adjusts difficulty after complete sessions.

## Practice modes

- Addition, subtraction, multiplication, and division
- Fractions, percentages, ratios, powers, estimation, and applied problems
- Hexadecimal conversion as an additional dedicated mode

Normal topic sessions contain 20 questions with a 10-minute limit. Hexadecimal sessions contain exactly 40 unique questions with a 20-minute limit: the first 20 are decimal-to-hexadecimal and the final 20 are hexadecimal-to-decimal.

Every normal session uses a new cryptographically generated seed, so its values and order change. Challenge links intentionally include a seed so a friend receives the same questions.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:4173`. Build the static production version with `npm run build`; the contents of `dist/` can be hosted on any static web host and shared with friends.

## Install on a phone

The hosted website is also an installable Progressive Web App. On Android, open it in Chrome and choose **Install app**. On iPhone or iPad, open it in Safari, tap **Share**, then **Add to Home Screen**. It launches in its own app window and keeps the practice shell available offline after the first successful visit.

## Progress and sharing

- Response time is measured for every answer with a high-resolution clock.
- Accuracy and mean average answer time are saved per session.
- Each topic has its own five-level difficulty estimate.
- A level rises only after a sufficiently complete, accurate, fast session and drops after sustained difficulty.
- Results remain in the browser's IndexedDB and are never uploaded.
- The dashboard can share the deployed app URL; result screens can share a reproducible challenge URL.
- The PWA shell works offline after its first successful load.

## Quality checks

```bash
npm test
npm run test:coverage
npm run typecheck
npm run lint
npm run build
```

Implementation evidence is recorded in [docs/testing/mental-maths-restoration.tdd.md](docs/testing/mental-maths-restoration.tdd.md).
