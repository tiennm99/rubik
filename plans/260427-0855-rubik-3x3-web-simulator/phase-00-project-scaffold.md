# Phase 0 — Project Scaffold

**Priority:** blocker
**Status:** pending
**LOC budget:** ~150 across ~10 files

## Goal

Create a buildable empty Vite + Svelte 5 app at `tiennm99/rubik/` mirroring the conventions of `tiennm99/sokoban/`. No cube logic yet — just the shell that builds and serves a "Hello cube" stub.

## Files to Create

| File | Purpose |
|------|---------|
| `package.json` | name=rubik, type=module, scripts dev/dev:codeserver/build, deps three, @tweenjs/tween.js, svelte, vite, @sveltejs/vite-plugin-svelte |
| `vite/config.dev.mjs` | local dev: base `./`, port 8080 |
| `vite/config.codeserver.mjs` | reads `CODESERVER_HOST` from `.env.local`, sets `/absproxy/{port}/` base + HMR over wss |
| `vite/config.prod.mjs` | base `/rubik/` for GH Pages |
| `index.html` | minimal shell, `<div id="app">`, mount `src/main.js` |
| `src/main.js` | mount `App.svelte` to `#app` |
| `src/views/App.svelte` | empty placeholder shell |
| `src/app.css` | reset + fullscreen black background |
| `.env.example` | `CODESERVER_HOST=` |
| `.gitignore` | node_modules, dist, .env.local |
| `README.md` | one-paragraph project description + dev/build commands |
| `.github/workflows/deploy.yml` | GH Pages deploy on push to main |

## Acceptance

- `npm install` resolves without errors (user-run; do not auto-install).
- `npm run build` produces `dist/` with hashed assets.
- `npm run dev` serves `http://localhost:8080/` showing a black page.

## Notes

- Mirror sokoban's vite/* configs verbatim where applicable, change `/sokoban/` → `/rubik/` in prod base.
- `LICENSE` = Apache-2.0 (match other tiennm99 repos).
