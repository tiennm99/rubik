---
phase: 3
title: "Regression guard"
status: pending
priority: P2
effort: "30m"
dependencies: [2]
---

# Phase 3: Regression guard

## Overview

Lock the fix in place: keep Phase-1 tests in the suite, add CI hook if missing, document the fix in the changelog.

## Requirements

**Functional**
- Phase-1 tests run on every `npm test`.
- A short journal entry captures what failed and why.
- `docs/development-roadmap.md` (if it tracks bugs) gets a row.

**Non-functional**
- No new CI provider or workflow.
- Test runtime stays under 5s total (fail fast).

## Architecture

No new code. Only:
- Confirm new test files are picked up by Vitest's default glob (`tests/**/*.test.js`).
- Move any temp helpers used in Phase-1 tests into a shared `tests/helpers/` location if they're reused across files. Keep helpers ≤100 LOC.

## Related code files

- **Modify (optional):** `tests/helpers/fake-camera.js` (extract if 2+ test files use the fake projection helper).
- **Modify:** `docs/development-roadmap.md` (changelog entry).
- **Create:** journal entry via `/ck:journal` (handled by skill workflow).

## Implementation steps

1. Confirm `npm test` runs all new tests by default — no config change should be needed (Vitest globs `tests/**`).
2. If Phase-1 tests created duplicated helpers, extract to `tests/helpers/`. Otherwise leave inline.
3. Update `docs/development-roadmap.md` or `docs/project-changelog.md` (whichever exists) with a one-line entry under Recent Fixes: `Fixed edge-orientation bug in drag-gesture path (plan 260509-0932)`.
4. Run `/ck:journal` to capture findings.
5. Commit: `fix(controls): correct drag-gesture rotation direction on edges`.

## Todo list

- [ ] Verify `npm test` includes new test files
- [ ] Extract shared test helpers if duplicated across 2+ files
- [ ] Update changelog/roadmap with one-line entry
- [ ] Run `/ck:journal`
- [ ] Commit with conventional message

## Success criteria

- [ ] `npm test` green and includes Phase-1 tests.
- [ ] Changelog/roadmap entry merged.
- [ ] Journal entry written.
- [ ] Plan archived via `/ck:plan archive` after merge.

## Risk assessment

- **Risk:** Test helpers duplicated; future bug fix copies the duplication.
  **Mitigation:** Extract eagerly when 2nd test file needs the same helper.
- **Risk:** Changelog format inconsistent with prior entries.
  **Mitigation:** Read the existing file first; match the existing style.

## Next steps

→ Archive this plan: `mv plans/260509-0932-fix-edge-orientation-bug plans/archive/`.
