# Development Roadmap

Tracks upcoming work only. Completed milestones live in git log and `plans/`.

## Near-term

- **Move counter & best-time persistence.** Save best solve time per scramble length to localStorage.
- **Color-blind mode.** Sticker outline / pattern overlay; toggle in the settings panel.
- **Solver Web Worker.** Move the cubejs 4–5 s table init off the main thread so the first-paint stays responsive even on slower devices.

## Mid-term

- **Tutorial mode.** Step-by-step CFOP / beginner-method guidance for new players. Highlights pieces and shows the next move.
- **Algorithm trainer.** Paste an alg ("R U R' U' R' F R F'"), watch it execute slowly, then practice it with hint mode.
- **Mobile UX pass.** Pinch-to-zoom, larger touch targets in the controls panel, landscape layout.

## Speculative

- **Bigger cubes (2x2, 4x4).** Same model architecture should generalize.
- **Replay sharing.** Encode a scramble + solve sequence into a URL.
- **Theme support.** Custom sticker palettes and cube body colors.
