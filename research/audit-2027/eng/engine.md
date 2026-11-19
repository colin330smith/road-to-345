# Engineering audit — pure modules (engine.js, goals.js, nutrition.js)

Status: IN PROGRESS (skeleton written first; findings are added as each one is confirmed with a repro).

Scope: correctness of the three pure modules. Method: all three read in full, then seeded property / fuzz
tests in node against a private copy (random specs, gates, logged histories, schedule shifts, malformed
state), plus targeted probes of date maths, the base chain, autoregulation, accessories, tracked lifts,
the test / taper, goals and nutrition.

Repro scripts: `research/audit-2027/eng/repro/` (each runs against the repo root, or against a patched
copy with `R345_ROOT=/path/to/copy node <script>`; exit code 1 = the defect reproduces).

## Verdict

(pending)

## Already solid

(pending)

## Findings

(pending)
