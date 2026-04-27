# Phase 6 — Polish, Build, Deploy

**Priority:** medium
**Status:** pending
**LOC budget:** ~80
**Depends on:** all prior phases

## Tasks

- Verify `npm run build` succeeds with no warnings.
- Add favicon (simple colored cube SVG).
- Add `.github/workflows/deploy.yml` to push `dist/` to `gh-pages` branch on push to `main`.
- README.md: short description, screenshots, dev/build commands, controls reference.
- Manual smoke test: solve cube starting from a 20-move scramble, confirm timer stops, confirm move log is correct.
- Lighthouse pass on deployed page (perf/a11y/best-practices baseline).

## Out of scope

- Unit tests (no test framework yet — match sokoban which has no tests).
- Lint/format toolchain (keep minimal).
