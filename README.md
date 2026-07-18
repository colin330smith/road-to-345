# Road to 3/4/5 — PowerBuilding tracker

**📱 Install on iPhone: open https://colin330smith.github.io/road-to-345/ in Safari → Share → Add to Home Screen.**
Runs standalone with its own icon, fully offline after first load (service worker). Logs live on-device in localStorage — export backups from More → Export.

Also published as a Claude Artifact: https://claude.ai/code/artifact/58e2fe75-3f03-4f5e-99fd-2c2197619467
(Note: the two copies do NOT share logs — pick one home, the PWA is the recommended one.)
Companion to the v7 program (wave notes in Apple Notes, sessions in Apple Calendar).

- `road-to-345.html` — the built single-file app (what's published)
- `app-shell.html` — UI shell with `/*==ENGINE==*/` and `/*==FIGS==*/` placeholders
- `engine.js` — progression engine (waves 1–4 = published notes verbatim; 5–19 generated from v7 rules + gate results)
- `fig.js` — IK-rigged movement figures (2-bone IK, per-archetype pose functions, paused-rep timing)
- `figtest.html` — visual grid of every archetype at k=0/0.5/1; open it before shipping figure changes
- `test.js` — run `node test.js` (8,258 assertions; must pass before republishing)

Rebuild: splice engine.js and fig.js into app-shell.html at their placeholders, then republish the artifact.
Data lives in browser localStorage per device — use the app's Export for backups.

## PWA files
- `index.html` — full document (app fragment + manifest/apple meta + SW registration)
- `manifest.webmanifest` · `sw.js` — installability + offline cache (bump the `C` version string in sw.js when redeploying)
- `icon-*.png` — generated barbell icons (see git history for the generator script)

Deploy = commit to `main`; GitHub Pages serves the repo root.
