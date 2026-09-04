# GitHub Pages hosting verification

Date: 2026-09-04

## Source and user journeys

The user selected GitHub after seeing the original hosting provider's domain.

- As a learner, I can open the app at a `github.io` repository URL without broken scripts, styles, or icons.
- As a mobile learner, I can install the GitHub Pages version and launch it within the repository subpath.
- As a returning learner, the offline shell and generated assets are cached under that same subpath.
- As the owner, every push runs the complete checks and deploys the validated build through GitHub's official Pages actions.

## RED evidence

Command:

```text
npm test -- --run apps/web/src/lib/pwa-paths.test.ts
```

The suite failed at import resolution because the deployment-path implementation did not exist. This was the intended compile-time RED state. Checkpoint: `93d0c8a test: define GitHub Pages path contract`.

## GREEN evidence

Commands and results:

```text
npm test
Test Files  7 passed (7)
Tests       33 passed (33)

npm run test:coverage
All files: 98.14% statements, 90.30% branches, 100% functions, 98.14% lines

npm run typecheck  # passed
npm run lint       # passed with zero warnings
npm run build      # root-hosted production build passed
VITE_BASE_PATH=/mental-maths-practice/ npm run build  # GitHub subpath build passed
```

The generated GitHub build was inspected to confirm that its document assets, manifest start URL and scope, manifest icons, service-worker scope, shell cache, and hashed JavaScript/CSS paths all use `/mental-maths-practice/`.

## Test specification

| # | What is guaranteed | Evidence | Type | Result |
|---|---|---|---|---|
| 1 | Root and repository base paths normalize consistently | `pwa-paths.test.ts` | Unit | PASS |
| 2 | Public assets retain the repository prefix when joined | `pwa-paths.test.ts` | Unit | PASS |
| 3 | Existing install and offline contracts remain intact | `pwa-assets.test.ts` | Integration | PASS |
| 4 | Existing maths, hexadecimal, timing, and challenge behavior remains operational | complete Vitest suite | Regression | PASS |
| 5 | Both root-hosted and GitHub-subpath bundles compile | two production build variants | Build | PASS |
| 6 | Pushes use GitHub's official build and Pages deployment actions | `.github/workflows/pages.yml` | Deployment configuration | PASS |

## Known gap

The local GitHub CLI session needs fresh authentication before the repository can be created and the first workflow run can be published. This does not affect the verified build output.

## Verification of delegated suggestion

An OmniRoute worker highlighted the base URL, manifest scope, service-worker scope, and automated Pages deployment as the critical migration points. The host verified these against the app and added dynamic build-time rewriting rather than hardcoding the app to one provider or repository. Route: `00MTN2VEOT_FMOVHVHEEUG1A`.
