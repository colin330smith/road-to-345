# Engineering audit — test, build and release (quality.md)

Status: IN PROGRESS (skeleton written first; findings are added as they are confirmed).
Scratch copy: `/tmp/claude-0/-home-user/1ddf1d1e-54cc-5dc0-a5f7-ff690ed2cdeb/scratchpad/eng/quality/repo` (all builds, patches and test runs happen there; nothing under the repo is touched except this folder).

## Baseline (measured in the scratch copy, 2026-11-19)

- `python3 build.py --check`: builds, "syntax OK", 0.08 s. Rebuilt `index.html` / `road-to-345.html` are byte-identical to the committed ones (md5 match), so the built files are in sync with the sources.
- `node test.js`: 16,319 passed, 0 failed, 4.0 s.
- c8 on `node test.js`: engine.js 99.85% lines / 91.8% branches / 107 of 109 functions; goals.js 100% lines / 72.1% branches; nutrition.js 98.4% lines / 87.3% branches / 42 of 44 functions.

## Verdict

(to be written)

## Already solid

(to be written)

## Findings

(to be written)
