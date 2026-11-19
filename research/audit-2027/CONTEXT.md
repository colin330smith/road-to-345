# Audit brief — Road to 3/4/5, the 2027 audit (written 2026-11-19)

## The lifter
- 27, male, 5 ft 8.5 in (174 cm), about 191 lb (86.6 kg). Body fat high teens to about 20% (tape read ~18% in Sep 2026; Oct 31 photos look 18–21%). Lean mass about 153–156 lb.
- Runs this program since Mon 2026-07-20 (Wave 1). Lifts 7:00–8:30 AM Monday to Saturday; Sunday off. Commercial gym: barbells, dumbbells, cable stacks, machines (leg press, seated leg curl, leg extension, pec deck / reverse pec deck, chest-supported row), dip and chin stations.
- Works afternoon / evening shifts at a restaurant in Winter Park, Florida (on his feet for hours; closes late some nights), so sleep before a 7 AM lift is at risk.
- Measured training bases, Sep 2026 (Wave 3): bench 255, squat 295, deadlift 385 lb. A "base" is the submaximal training max the percentages run from: top singles are prescribed at about 87–92% of base at RPE 7.5–8.5, so true maxes sit above the base. Current Wave 5 bases: bench 260, squat 305, deadlift 395. His squat and deadlift are low relative to his bench.
- Flexed arm at the start of the program: 13 in. (He logs tape, weight, sleep, sets and food in the app on his phone; this audit cannot see those logs.)
- Competes USPA drug-tested: every supplement must be NSF Certified for Sport or Informed Sport.

## His goals (his words, collected over the project)
1. 315 bench / 405 squat / 495 deadlift at a USPA drug-tested meet. First meet: summer 2027 (90 kg class). The app's own small-step projection puts the 3/4/5 bases at mid-2028.
2. 200 lb at 15% body fat (about 170 lb lean).
3. 16-inch arms, slightly disproportionate on purpose.
4. 3D shoulders, a prominent upper chest, a prominent upper back, a V-taper even while bulking ("I'm looking too boxy").
5. A shredded back later: Phase 2, a ten-week cut to about 11% once Phase 1 is real.
6. "I don't want to look like a meatball": swole, not blocky.

## Where the plan is today
- Today is Thu 2026-11-19 = Wave 5 (Intensification), week 2, day 4. Deload week Nov 30 – Dec 6. Wave 6 (Peak) Dec 7 – Jan 3; max test Fri Jan 1, 2027.
- Wave 7 (Calibration) starts Mon Jan 4, 2027: the first place a program change for 2027 can land. Waves are 4 weeks: weeks 1–3 load, week 4 deload. A macro is 6 waves: Calibration, Build, Accumulate, Specificity, Intensification, Peak.
- The summer-2027 meet slot is Wave 12 week 4, Fri Jun 18, 2027 (Wave 11 Intensification starts Apr 26, Wave 12 Peak May 24).
- Nutrition: MAINTAIN 2,800 kcal (P200 / F80 / C320) since Nov 1 on a strict, weighed, home-cooked plan (zero restaurant food); maintenance is being measured from his logs (provisional number ~Nov 28). On Mon Jan 4 the app decides: a six-week TRIM (500 under maintenance) if the tape reads 18%+ or the waist is up 1 in, otherwise a slow GAIN (125 over). No trims in Cycles 5–6.

## The files
- `research/audit-2027/dossier.md` — the plan as the engine computes it: calendar, every main-lift prescription for Waves 5–12, full sessions for one week of every cycle type, weekly fractional sets per muscle for every week, failure sets, session minutes. Regenerate with `node research/audit-2027/dossier.js`.
- `EVIDENCE.md` — what is already sourced, row by row, with labels (Evidence / Partly / Judgment / Truth), and the list of judgment calls. Read the sections for your domain before proposing anything: do not re-propose what is already there unless it is wrong or out of date.
- `engine.js` (the program: `mainTables`, `ACC`, `TRACKED`, `saturdaySession`, Rules A–D autoregulation, gates, test and taper), `goals.js` (goal tracker, `MUSCLE_RULES`), `nutrition.js` (modes, maintenance estimator, decision rule, recipes), `app-shell.html` (the UI), `test.js` / `ui-test.js` (the test suites), `notes/nutrition.txt`.

## The project's standard (CLAUDE.md)
- Material changes only when backed by science (a checked source, recorded in EVIDENCE.md) or truth (a real bug). Judgment calls are labelled as judgment calls. Never cite the retracted Barbalho volume papers. Never invent a citation, a number or a URL: if you could not open the source, say "unverified".
- Waves 1–3 are history and never change (history-hash tests). New prescriptions are gated by wave. Anything inside the current peak (now → Jan 1) changes only for a real error; program changes land at Wave 7 (Jan 4, 2027) or later.
- Pinned budgets (tests): every weekday session estimates ≤ 75 min and ≤ 27 working sets; Saturday ≤ 85 min and ≤ 37 sets; no back / delt region gets more than 11 fractional sets in one session (Remmert 2025); main lifts stop at RPE 8–8.5; the session slot is 7:00–8:30 AM. Time is the binding constraint: prefer swaps and cuts over additions.
- The test clock: warm-up 8 min, top single 4, main back-off set 3.5, paused / OHP set 3, tracked-lift back-off 2.5, accessory set 1.75 (2 for dumbbells), conditioning 18, cooldown 5; fillers (supersetted into main-lift rests) are free.

## What he asked for (verbatim, 2026-11-19)
"do a jeff nippard/ science based updated 2027 audit of my plan to ensure i am hitting all my marks ... update the app to be industry grade and highly accurate in terms of effeciency, make adjustments where they need to be done, shoot for the stars here, no stone left unturned"
