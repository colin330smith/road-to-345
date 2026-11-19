# Meet audit — USPA rules, attempts and the day (draft in progress, 2026-11-19)

Status: DRAFT. Rulebook checks are done (USPA Technical Rules 2025v1, dated March 24, 2025, downloaded 2026-11-19 from https://uspa.net/rulebook, which redirects to https://uspa.net/wp-content/uploads/2025/03/USPA-Rulebook-March-24th-2025.pdf; 68 pages). Literature and calendar checks still being added.

## Verified so far (rulebook)

- Latest rulebook in force: "USPA Technical Rules, March 24, 2025" (2025v1). EVIDENCE.md's citation is current.
- Men's classes (1.3.1): 52, 56, 60, 67.5, 75, 82.5, 90, 100, 110, 125, 140, 140+ kg. 90.0 kg = 198.4 lb.
- Weigh-in (5.1.2): an optional early session up to 24 hours before the lifter's session; otherwise the morning of the meet. Scale reads to 0.1 kg (5.1.16). Weighed nude, in undershorts or in the singlet (5.1.6). At a local meet a lifter may change class up or down with the meet director's permission (5.1.10).
- Openers for all three lifts are declared at weigh-in in kg, 2.5 kg steps (6.1.1, 5.1.17). One opener change per lift, up to 5 minutes before the first round of that lift for the first flight (6.1.9). Second and third attempts are handed in within one minute of the previous attempt (6.1.10); a second attempt cannot be changed; a third squat or bench cannot be changed; the third deadlift can be changed twice (6.1.11, 6.1.12). An attempt can never be lower than a missed one (6.1.1.2). Bar is always a multiple of 2.5 kg, at least 2.5 kg between attempts (6.3.3).
- Commands: squat SQUAT / RACK (4.1.5, 4.1.8); bench START / PRESS / RACK (4.3.7, 4.3.10, 4.3.11); deadlift DOWN (4.5.5). One minute to start the lift (4.2.13, 4.4.15, 4.6.11).
- Raw kit (3.14.1): singlet, T-shirt (required for squat and bench, 3.5.1), optional brief-style underwear (3.6.2), socks (knee-length required for the deadlift, 3.8.5), optional belt (10 cm x 13 mm, 3.9.9-3.9.10), shoes, optional wrist wraps (1 m, 3.11.2), knee sleeves (30 cm x 7 mm, 3.11.6) and elbow sleeves (squat and deadlift only, 3.11.19). No knee wraps in Raw.
- Tested division: urine test right after lifting (1.8.11), at least 10% of lifters, top DOTS plus random (1.8.7); leaving before selection counts as a failed test (1.8.13); a failed test is a lifetime ban from tested meets (1.8.16); no therapeutic use exemptions (1.8.19). Banned list: Part 12.
- ID and USPA membership card at weigh-in (1.4.3, 5.1.19); kit inspection at weigh-in (3.15.1, 5.1.7); the lifter checks his own squat and bench rack heights before lifting (5.1.12).

## Arithmetic checked (node, engine.js)

- 315 lb = 142.88 kg, 405 lb = 183.71 kg, 495 lb = 224.53 kg. The first legal loads at or over the goal are 145 / 185 / 225 kg (319.7 / 407.9 / 496.0 lb). `kgNear(315)` gives 142.5 kg (314.2 lb) and `kgNear(405)` gives 182.5 kg (402.3 lb): both under the goal.
- Wave 12 card (plan estimates): squat 142.5 / 150 / 157.5 kg, bench 117.5 / 122.5 / 130 kg, deadlift 175 / 185 / 195 kg. Bench jumps are 5 then 7.5 kg (the second jump is the bigger one).

(Findings follow in the next revision.)
