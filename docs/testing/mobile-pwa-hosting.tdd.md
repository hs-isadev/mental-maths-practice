# Mobile PWA and hosting verification

Date: 2026-09-04

## Source and user journeys

The journeys came directly from the user's request rather than a plan file.

- As a learner, I can use the existing mental maths and hexadecimal practice site from a phone without losing any modes.
- As a learner, I can install the hosted site to my Android or iOS home screen and launch it in a standalone window.
- As a learner, I can reopen the app shell after a successful online visit even when the network is unavailable.
- As a learner, I can send one public website link to friends.

## RED evidence

Command:

```text
npm test -- --run apps/web/src/pwa-assets.test.ts
```

Observed before implementation:

```text
Test Files  1 failed (1)
Tests       3 failed (3)
```

The manifest lacked its explicit scope and PNG/maskable icons, the page lacked iOS install metadata, and the offline shell omitted the phone icon set and navigation fallback. Checkpoint: `6d708a5 test: define mobile install contract`.

## GREEN evidence

The same focused test passed all three checks after implementation. The complete suite then passed:

```text
Test Files  6 passed (6)
Tests       31 passed (31)
```

Coverage:

```text
npm run test:coverage
All files: 98.14% statements, 90.30% branches, 100% functions, 98.14% lines
```

Additional gates:

```text
npm run typecheck  # passed
npm run lint       # passed with zero warnings
npm run build      # passed; hashed JS and CSS were injected into the offline precache
```

GREEN checkpoint: `68595a4 feat: make practice app installable offline`.

## Test specification

| # | What is guaranteed | Evidence | Type | Result |
|---|---|---|---|---|
| 1 | The web manifest launches in standalone mode within the app's root scope | `pwa-assets.test.ts` manifest contract | Integration | PASS |
| 2 | Standard, maskable, and Apple icons exist at their declared pixel dimensions | `pwa-assets.test.ts` PNG checks | Integration | PASS |
| 3 | iOS receives home-screen and full-screen presentation metadata | `pwa-assets.test.ts` document metadata check | Integration | PASS |
| 4 | The service worker retains the app shell, install icons, and navigation fallback | `pwa-assets.test.ts` offline contract | Integration | PASS |
| 5 | Existing maths and hexadecimal journeys remain operational | complete Vitest suite | Regression | PASS |
| 6 | The production bundle compiles and includes versioned offline assets | `npm run build` and generated `dist/sw.js` inspection | Build | PASS |

## Known gaps

Physical-device installation was not automated. Browser installation UI varies by browser: Chrome exposes an install action, while iOS Safari uses Share → Add to Home Screen. The app remains a static PWA, so practice history intentionally stays on each device rather than syncing to a server.

## Verification of delegated suggestion

An OmniRoute worker suggested a PWA manifest, service worker, HTTPS static hosting, and phone installation guidance. The host verified those suggestions against the existing Vite app, reused the existing service-worker architecture, and added build-time hashed asset precaching so first-load offline behavior does not depend on a second visit. Route: `00MTN1DWK3R6DKQUPL5L6VLQ`.
