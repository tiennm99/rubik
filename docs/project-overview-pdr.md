# Rubik 3x3 — Project Overview / PDR

## Summary

Browser-based interactive 3x3 Rubik's cube. Three.js rendering, drag-to-rotate face gestures, keyboard notation input, scramble + timer + undo. Static deployable to GitHub Pages.

## Goals

- A faithful, playable simulation of a 3x3 Rubik's cube in any modern desktop or mobile browser.
- Intuitive interaction: drag a sticker to turn that face; drag elsewhere to orbit the camera.
- Standard speedcubing notation (WCA convention) accepted via keyboard.
- Scramble + timer for casual practice.
- Tiny, dependency-light bundle (< 250 KB gzipped).

## Non-Goals (v1)

- Auto-solver (Kociemba). Deferred — see `plans/.../phase-07-solver-deferred.md`.
- Multiplayer / leaderboards.
- Stats persistence beyond the current session.
- Mobile-first multitouch (pinch zoom).
- Tutorials or step-by-step solving guides.

## Users

- Casual players who want a quick virtual cube without installing anything.
- Speedcubers practicing notation/algorithms when they don't have a physical cube.
- Curious devs who want to read a small, self-contained 3D web project.

## Success Criteria

- Build succeeds with no warnings; deployed to GitHub Pages.
- A 20-move scramble is fully reversible by clicking Undo 20 times (or by manual play).
- 60 fps on a mid-range laptop; ≥30 fps on a 2021 phone.
- All core logic files under 200 LOC; the smoke test in `scripts/smoke-test-core.mjs` passes.
