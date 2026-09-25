# Evidence map

Every plan element that rests on a claim, where the claim comes from, and how strong it is.
Sources were cite-checked against PubMed or the journal page on 2026-09-25. The retracted Barbalho volume papers are never used.

**Labels**
- **Evidence**: a study or review supports it directly.
- **Partly**: the source supports the direction, but not the exact number, or the population differs.
- **Judgment**: a programming decision with no study behind the specific number. It is labeled so it can be changed without a citation fight.
- **Truth**: a fix of a wrong number or a bug, not a science claim.

`test.js` checks each rule that the app states. Every `(Author Year)` citation in the app source must appear in this file, and a test enforces that.

---

## Strength: loads, gates, progression

| Plan element | Label | Source | What it supports |
|---|---|---|---|
| Wave 3 bases 255 / 295 / 385 (`CALIBRATION`) | Truth | His own Wave 3 sessions | Bench ran ahead of the printed chain; squat and deadlift ran behind it. |
| RPE is reps in reserve; main lifts stop at RPE 8 | Evidence | Zourdos 2016, *J Strength Cond Res* 30(1):267 · Helms 2016, *Strength Cond J* 38(4):42 | The RIR-based RPE scale is valid for resistance training. |
| Strength chart: estimated max from rated singles (RPE chart), Epley up to 10 reps otherwise; competition sets only | Partly | RTS chart (above) · Epley formula | Epley is a rough estimate and gets worse past about 10 reps, so the chart ignores those sets. Counting only the competition lift is a bug fix: leg press used to count as the squat. |
| %1RM for a single at each RPE (`RPE_PCT_1`: 7 = 89.2%, 8 = 92.2%, 9 = 95.5%, 10 = 100%) | Partly | RTS (Tuchscherer) coaching chart | This is a coaching chart, not a study. It is used because the RIR scale above is validated. |
| Autoregulation (Rules A and C: loads follow how the sets felt) | Evidence | Helms 2018, *Front Physiol* 9:247 · Graham & Cleather 2021, *J Strength Cond Res* 35(9):2451 · Larsen 2021, *PeerJ* 9:e10663 (systematic review) | RPE-based or RIR-based loading matched or beat fixed percentages for strength. Helms 2018 found a small edge that was not significant. |
| Rule A/C clamp at ±5% or one increment | Judgment | — | This stops one bad day, or one good one, from moving a load more than a normal wave step. |
| Rule D gate cut-offs: at or under the cap = clean, about RPE 8.5 = small, about RPE 9 = repeat, worse = reset | Judgment | v7 gate rule, applied through the RPE chart | It compares the single's e1RM with the e1RM the plan assumed at its cap. |
| **Not adopted:** "clean only if the week-3 single is RPE 7" | Judgment | — | That rule assumes the base equals the e1RM. This program's base is submaximal, and its week-3 single is planned at RPE 8, so the program's own model is the yardstick. |
| Unset future gates assume the small step (+2.5 bench, +5 squat and deadlift per wave) | Partly | Latella 2024, *Sports Med* 54(3):753 · Latella 2020, *J Strength Cond Res* 34(9):2412 | Competitive lifters gain about 7.5–12.5% in their first year, about 10% a year for men on average. The small step is about 13%/yr on bench, at the upper end. It is about 17–22%/yr on squat and deadlift, above the average. That part is a judgment: his squat and deadlift are low for his bench, and the rated gates correct the projection every wave. |
| Tracked lifts move at most one step a wave with their anchor; a calibration moves them zero | Judgment | — | A re-measured anchor says nothing about the tracked lift's own strength. |
| Chin-up anchored to bench, not deadlift | Judgment | — | An upper-body pull follows the upper-body gate. |
| Test attempts .91 / .955 / target | Evidence | Travis 2021, *Percept Mot Skills* 128(1):507 · Howells 2022, *J Sports Med Phys Fitness* 62(4):476 | Elite lifters opened at about 91% of their third attempt and took their second at about 96%. Openers averaged 92% of the day's best. A third attempt of 100% of target comes from coaching practice. |
| Meet attempts shown in kilograms, 2.5 kg steps; opener rounded down | Partly | USPA Technical Rules 2025 | USPA meets load in kilograms. The 2.5 kg step is the usual minimum jump outside record attempts; confirm it against the rulebook before meet day. Rounding the opener down is a judgment: it has to go on a bad day. |
| Post-test base = 96% of the best lift made | Judgment | — | This is the inverse of the default target (base × 1.04), so the next build starts from submaximal work. |
| Peak taper: volume near zero, intensity held, last heavy touch 4 days out, then rest | Evidence | Travis 2020, *Sports* 8(9):125 | Cut volume 30–70% (30–50% looks best) and keep intensity at 85% or more over a 1–2 week step taper. The review does not fix the day of the last heavy session, so 4 days out is a judgment. |

## Hypertrophy: exercise selection and dose

| Plan element | Label | Source | What it supports |
|---|---|---|---|
| Triceps are about 55% of upper-arm muscle, not "two-thirds" | Evidence | Holzbaur 2007, *J Biomech* 40(4):742 | MRI volumes: triceps 372 cm³, biceps 144, brachialis 144 (56% of the three; 51% with the brachioradialis). |
| Overhead extension is the long-head stretch work: about 1.5× long-head and 1.4× whole-triceps growth vs pushdowns | Evidence | Maeo 2023, *Eur J Sport Sci* 23(7):1240 | Long head +28.5% vs +19.6%; whole triceps +19.9% vs +13.9%. Caveat: the participants were untrained. |
| The dip shortens the long head (the shoulder is extended) | Partly | Standard anatomy · McKenzie 2021, *Strength Cond J* 43(1):93 | The long head crosses the shoulder; the dip extends the shoulder. The dip stays as the loaded triceps compound, but not as stretch work. |
| Preacher and incline curls grow different regions; both stay in the week | Evidence | Kassiano 2025, *Int J Sports Med* 46(5):334 | Preacher grew the distal (lower) biceps more; the incline curl grew the proximal (upper) biceps more. Caveat: 63 women over 8 weeks. The old claim "the preacher beat the incline (Sato 2021)" was wrong: Sato compared the two halves of the elbow's range, not the two curls. |
| Dumbbell and cable laterals grew the side delt equally | Evidence | Larsen 2025, *Front Physiol* 16:1611468 | +3.3–4.6% for both, with moderate to extreme support for "no difference". The leaning cue stays for feel, not because it is superior. |
| Side delts 11 sets a week; rear-delt fly 3 sets; caps unchanged | Partly | Schoenfeld 2017, *J Sports Sci* 35(11):1073 · Pelland 2025, *Sports Med* 56(2):481 | More weekly sets produce more growth, with diminishing returns. Neither paper sets a ceiling, so the exact counts and the 16/14/16 caps are judgment. |
| Reverse pec deck with a neutral grip | Judgment | — | A cue for keeping the load on the rear delt. There is no head-to-head study. |
| Face pull rep steps 12 / 15 / 20 | Judgment | — | This keeps the face pull in a loadable range instead of 25-rep sets. |
| Only the anchor isolation takes a set close to failure; leg press, hammer curl and pushdown stop at RPE 8 | Evidence | Refalo 2023, *Sports Med* 53(3):649 · Robinson 2024, *Sports Med* 54(9):2209 | Training to failure adds no reliable growth over stopping just short (ES 0.12, not significant). Growth rises as sets end closer to failure. So the plan uses one near-failure set per muscle and keeps hard compounds away from failure. |
| Seated leg curl over lying | Evidence | Maeo 2021, *Med Sci Sports Exerc* 53(4):825 | Whole hamstrings +14% vs +9%. |
| Leg extension reclined for the rectus femoris | Evidence | Larsen 2025, *J Sports Sci* 43(2):210 | A reclined hip (40°) grew the rectus femoris more than 90°. Earlier text credited this to Maeo; that was wrong. |
| Straight-knee calf work for the gastrocnemius | Evidence | Kinoshita 2023, *Front Physiol* 14:1272106 | Standing raises grew the gastrocnemius +9–12% vs +1–2% seated. The soleus grew similarly either way. |
| Lengthened partials on anchor sets | Evidence | Wolf 2023, *Int J Strength Cond* 3(1) · Pedrosa 2022, *Eur J Sport Sci* 22(8):1250 · Wolf 2025, *PeerJ* 13:e18904 | Partials at long muscle lengths grew muscle as well as full range, or better. |

## Nutrition and recovery

| Plan element | Label | Source | What it supports |
|---|---|---|---|
| Trim at about −1 lb/wk (about 0.5% of bodyweight); flag anything faster than 1% a week | Partly | Garthe 2011, *Int J Sport Nutr Exerc Metab* 21(2):97 · Helms 2014, *Int J Sport Nutr Exerc Metab* 24(2):127 | About 0.7% a week kept more lean mass than faster loss. Garthe did not test a 0.5–1.0% band, so the 1% flag is a judgment. |
| Trim lasts six weeks at most; ends early at waist −1" or −6 lb on the 7-day average | Judgment | — | The end conditions match the goal: bring the waist back while losing about 3 points of body fat. |
| Decision on 7-day averages measured from the phase start | Judgment | — | This replaces a fixed 188 lb threshold. Daily water swings wash out over seven days, and a phase-relative rate works at any bodyweight. |
| Sleep gate: no trim starts while sleep averages under 7 h | Evidence | Nedeltcheva 2010, *Ann Intern Med* 153(7):435 | Short sleep during a diet cut fat loss by 55% and raised fat-free-mass loss by 60%. Caveat: 10 overweight non-lifters over 14 days. |
| Trim pre-lift stays whey + banana | Judgment | — | Keeps carbohydrate before a 7 AM heavy session; the deficit comes from later meals. |
| CK cut protein 215–230 g | Evidence | Helms 2014 (above) · Morton 2018, *Br J Sports Med* 52(6):376 | 2.3–3.1 g per kg of lean mass during a cut; 170 lb lean (77 kg) gives 178–240 g. Morton found no further gain above 1.62 g/kg when not dieting. |
| Refeeds allowed for hunger, not claimed to save muscle | Evidence | Campbell 2020, *J Funct Morphol Kinesiol* 5(1):19 · Peos 2021 (ICECAP), *Med Sci Sports Exerc* 53(8):1685 | Campbell found less fat-free-mass loss with refeeds. The larger ICECAP trial found no body-composition difference, only less hunger. The plan follows the larger trial. |
| Caffeine 3 mg/kg, 50–60 min before the lift | Evidence | Guest 2021 (ISSN), *J Int Soc Sports Nutr* 18(1):1 | 3–6 mg/kg, most often about 60 minutes before. |
| No caffeine within about 13 h of bed at that dose | Evidence | Gardiner 2023, *Sleep Med Rev* 69:101764 | A 107 mg coffee needs at least 8.8 h before bed; a 217.5 mg pre-workout dose needs 13.2 h. About 250 mg falls in the second case. |
| Creatine monohydrate 5 g a day | Evidence | Kreider 2017 (ISSN), *J Int Soc Sports Nutr* 14:18 | 3–5 g/day maintenance. |
| Vitamin D is tier 3, only if a blood test is low | Partly | Han 2024, *Front Nutr* 11:1381301 | No significant overall strength effect in athletes, with one positive quadriceps result. That supports "no clear benefit", not "no effect". |
| Every supplement NSF Certified for Sport or Informed Sport | Partly | USPA Technical Rules 2025 (Part 12) · Geyer 2004, *Int J Sports Med* 25(2):124 · Martínez-Sanz 2017, *Nutrients* 9(10):1093 · Duiven 2021, *J Sports Sci Med* 20(2):328 · Mathews 2018, *Sports Health* 10(1):19 | USPA drug-tested runs its own banned list (not WADA's), with urine tests and no exemptions. Supplement contamination: 14.8% (Geyer), 12–58% across studies (Martínez-Sanz), 38% of high-risk products (Duiven). Third-party certification is the standard advice; no study measures how much it cuts the risk. |

---

## Judgment calls, in one list

1. Rule D cut-offs, and the choice of the program's own model over "clean only at RPE 7".
2. Rule A/C ±5% and one-increment clamps; the 14-day window for Rule C.
3. Small-step projection default. It is above Latella's average for squat and deadlift, and gates correct it every wave.
4. Post-test base 96%; default test target base × 1.04; the taper's last heavy touch 4 days out.
5. Tracked-lift clamp; chin-up anchored to bench.
6. Exact weekly set counts and caps; neutral-grip reverse pec deck; face pull rep steps.
7. Six-week trim cap and its end conditions; the 1%/wk flag; phase-relative 7-day decision rule; whey + banana before a trim lift.
