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
| Tracked lifts (Wave 4 on): a rated incline or RDL top set scales that day's back-offs through reps to failure (±5%); a rated chin-up or dip top set moves its back-offs one 5 lb step | Partly | RTS chart (above) · Rule A/C clamp (above) | Truth part: the rating did nothing although the card said it set the back-offs. %1RM by reps to failure is the RTS chart's RPE-10 column (8 reps at RPE 7.5 = 72.3%), a coaching chart. Added-load lifts move by a step because a percentage of the added weight means nothing. |
| Strength chart: a rated single or top set through the RPE chart, otherwise back-offs through reps to failure at their capped RPE; deload weeks, Red days and light sets left out | Partly | RTS chart (above) | Truth part: deload triples and Red-day 3×3s made the chart crash 25–30% every fourth week, and the chart's own note says a drop is what makes the gate say repeat. |
| Rule D gate cut-offs: at or under the cap = clean, about RPE 8.5 = small, about RPE 9 = repeat, worse = reset | Judgment | v7 gate rule, applied through the RPE chart | It compares the single's e1RM with the e1RM the plan assumed at its cap. |
| **Not adopted:** "clean only if the week-3 single is RPE 7" | Judgment | — | That rule assumes the base equals the e1RM. This program's base is submaximal, and its week-3 single is planned at RPE 8, so the program's own model is the yardstick. |
| Unset future gates assume the small step (+2.5 bench, +5 squat and deadlift per wave) | Partly | Latella 2024, *Sports Med* 54(3):753 · Latella 2020, *J Strength Cond Res* 34(9):2412 | Competitive lifters gain about 7.5–12.5% in their first year, about 10% a year for men on average. The small step is about 13%/yr on bench, at the upper end. It is about 17–22%/yr on squat and deadlift, above the average. That part is a judgment: his squat and deadlift are low for his bench, and the rated gates correct the projection every wave. |
| Tracked lifts move at most one step a wave with their anchor; a calibration moves them zero | Judgment | — | A re-measured anchor says nothing about the tracked lift's own strength. |
| Chin-up anchored to bench, not deadlift | Judgment | — | An upper-body pull follows the upper-body gate. |
| Test attempts .91 / .955 / target | Evidence | Travis 2021, *Percept Mot Skills* 128(1):507 · Howells 2022, *J Sports Med Phys Fitness* 62(4):476 | Elite lifters opened at about 91% of their third attempt and took their second at about 96%. Openers averaged 92% of the day's best. A third attempt of 100% of target comes from coaching practice. |
| Meet attempts shown in kilograms, 2.5 kg steps; opener rounded down | Truth | USPA Technical Rules 2025v1, rules 6.1.1 and 6.3.3 (checked 2026-10-07 at uspa.net/rulebook) | Attempts are declared and announced in kilograms; the bar is always a multiple of 2.5 kg and attempts rise by at least 2.5 kg (records excepted). Rounding the opener down is a judgment: it has to go on a bad day. |
| Default test target = the estimated max × 1.02; the estimate comes from the peak wave's latest rated single (the plan's own week-2 e1RM if none is rated); a typed target always wins | Judgment | RTS chart (above) · Travis 2021 (above) | The old default (base × 1.04) disagreed with the app's own model: on-plan peak singles put the e1RM at about 0.98–0.99 × base, so the third asked for a ~5% PR and the opener sat near RPE 9. The 2% is a taper allowance, not a measured number. |
| Week-3 peak single = the kilogram opener he will hand in, loaded at or under it in pounds | Truth | — | The old "opener practice" was 10–20 lb under the real opener, and the deadlift opener was heavier than any pull in the peak. |
| Post-test base = 96% of the best lift made | Judgment | — | The next build starts about 4% under the made max, from submaximal work. A target never sets a base; only a made lift on or after test day does. |
| Competition commands practised from Wave 4: squat SQUAT / RACK, bench START / PRESS / RACK, deadlift DOWN, on the Specificity and Peak singles, the paused bench and the test card | Truth | USPA Technical Rules 2025v1, rules 4.1.5, 4.1.8, 4.3.7, 4.3.10, 4.3.11, 4.5.5 | Moving before a command is a red light (4.4.1, 4.6.7). The program said "competition-strict singles" but never practised the calls. |
| A Yellow single shows the load that is RPE 7 (load × %1RM at 7 ÷ %1RM at the cap) and its rating is read at cap 7 | Partly | RTS chart (above) | Truth part: a Hard rating on a cap-7 Yellow single was read against the Green cap (as RPE 9), which turned an on-plan day into a "repeat" gate, and Rule A then stacked on Yellow's −5%. The load conversion uses the coaching chart. |
| Red-day sets and the deload's paused squat, paused bench and OHP never move the next load | Truth | — | A 60% triple rated Easy raised the next week's back-offs 5%; an Easy week-3 rating raised the deload. |
| Wednesday's no-pause squat growth sets: 72.3% of the week's planned e1RM (8 reps at about RPE 7.5) from Wave 4 | Partly | RTS chart (above) | They used the paused bar and ran near RPE 6 under a 7.5–8 label. |
| Deload warm-ups stop under the light triple (no indicator or bridge single) from Wave 4 | Truth | — | The deload warmed up to singles at 78–81% of base before a 65% triple. |
| Peak taper: volume near zero, intensity held, last heavy touch 4 days out, then rest | Evidence | Travis 2020, *Sports* 8(9):125 | Cut volume 30–70% (30–50% looks best) and keep intensity at 85% or more over a 1–2 week step taper. The review does not fix the day of the last heavy session, so 4 days out is a judgment. |

## Logging

| Plan element | Label | Source | What it supports |
|---|---|---|---|
| Rest timer starts itself after each logged set: 3 min after a main-lift set, 2.5 min after paused, OHP and tracked sets, 90 s after accessories, none after primers and fillers; it beeps at zero and counts the overrun | Judgment | Singer 2024 (below) | Resting more than 60 s helped hypertrophy a little; the longer main-lift rests are a strength-practice judgment. The beep needs a tap-created AudioContext on iOS; vibrate is not implemented in iOS Safari. |
| A swap logs under its own key ("planned~swap"), so it never moves the planned exercise's rung | Judgment | — | The swap list keeps the same muscle and length bias; it is a convenience, not a claim that the swap is equivalent. |

## Data and schedule

| Plan element | Label | Source | What it supports |
|---|---|---|---|
| Schedule shifts are dated segments ("Repeat a week from next Monday"): the week before the segment replays, later dates move, and nothing logged before it changes wave or week; an old number becomes one segment from Wave 1 | Truth | — | The old global "Schedule shift (weeks)" moved every date, history included: a 1-week shift relabelled every logged day, so the gates, the log-driven rungs and History read old sessions as other weeks. |
| A meet date lines up the nearest peak's test Friday by repeating week 2 of the waves before it (one extra week per wave, newest waves first, never a peak wave, never a logged week) | Judgment | — | Week 2 is a loading week, so the extra time is training, not a second deload. Which week repeats is a programming choice with no study behind it. |
| Every stored state and every import is cleaned to the shapes the app reads; an import asks before replacing logged days, keeps an undo copy, and a screen that cannot render shows a recovery card instead of a blank app | Truth | — | A backup with one null day or a non-array set list threw on every render: the app went blank and the only way out was erasing the data. |
| Sets are stored under the exercise key, not the block's position | Truth | — | Changing the weekend focus or a reordered day put past sets on another exercise (position "b3" pointed at a new block), and the log-driven rungs read them. |
| The app page waits 1.5 s for the network, then opens from the cache | Truth | — | A stalled gym connection (connected, no answer) left the page blank until the request timed out, because the page was network-first with no time limit. |
| Force update runs only after the server answers | Truth | — | Offline, it unregistered the worker and deleted the caches, leaving a phone with no app until it was online again. |

## Hypertrophy: exercise selection and dose

| Plan element | Label | Source | What it supports |
|---|---|---|---|
| Triceps are about 55% of upper-arm muscle, not "two-thirds" | Evidence | Holzbaur 2007, *J Biomech* 40(4):742 | MRI volumes: triceps 372 cm³, biceps 144, brachialis 144 (56% of the three; 51% with the brachioradialis). |
| Overhead extension is the long-head stretch work: about 1.5× long-head and 1.4× whole-triceps growth vs pushdowns | Evidence | Maeo 2023, *Eur J Sport Sci* 23(7):1240 | Long head +28.5% vs +19.6%; whole triceps +19.9% vs +13.9%. Caveat: the participants were untrained. |
| The dip shortens the long head (the shoulder is extended) | Partly | Standard anatomy · McKenzie 2021, *Strength Cond J* 43(1):93 | The long head crosses the shoulder; the dip extends the shoulder. The dip stays as the loaded triceps compound, but not as stretch work. |
| Preacher and incline curls grow different regions; both stay in the week | Evidence | Kassiano 2025, *Int J Sports Med* 46(5):334 | Preacher grew the distal (lower) biceps more; the incline curl grew the proximal (upper) biceps more. Caveat: 63 women over 8 weeks. The old claim "the preacher beat the incline (Sato 2021)" was wrong: Sato compared the two halves of the elbow's range, not the two curls. |
| Dumbbell and cable laterals grew the side delt equally | Evidence | Larsen 2025, *Front Physiol* 16:1611468 | +3.3–4.6% for both, with moderate to extreme support for "no difference". The leaning cue stays for feel, not because it is superior. |
| Side delts 11 sets a week in Waves 1–3, 13 from Wave 4; caps unchanged | Partly | Schoenfeld 2017, *J Sports Sci* 35(11):1073 · Pelland 2026, *Sports Med* 56(2):481 (online December 2025) | More weekly sets produce more growth, with diminishing returns. Neither paper sets a ceiling, so the exact counts and the 16 / 16 / 16 caps (biceps, triceps, side delts) are judgment. |
| Reverse pec deck with a neutral grip | Partly | Schoenfeld 2013, *J Strength Cond Res* 27(10):2644 | Head to head in 19 trained men, a neutral grip gave more posterior-delt (p = 0.046) and infraspinatus activity than a pronated grip. EMG, not growth. (This row used to say no head-to-head study existed; that was wrong.) |
| Face pull rep steps 12 / 15 / 20 | Judgment | — | This keeps the face pull in a loadable range instead of 25-rep sets. |
| Only the anchor isolation takes a set close to failure; leg press, hammer curl and pushdown stop at RPE 8 | Evidence | Refalo 2023, *Sports Med* 53(3):649 · Robinson 2024, *Sports Med* 54(9):2209 | Training to failure adds no reliable growth over stopping just short (ES 0.12, not significant). Growth rises as sets end closer to failure. So the plan uses one near-failure set per muscle and keeps hard compounds away from failure. |
| Seated leg curl over lying | Evidence | Maeo 2021, *Med Sci Sports Exerc* 53(4):825 | Whole hamstrings +14% vs +9%. |
| Leg extension reclined for the rectus femoris | Evidence | Larsen 2025, *J Sports Sci* 43(2):210 | A reclined hip (40°) grew the rectus femoris more than 90°. Earlier text credited this to Maeo; that was wrong. |
| Straight-knee calf work for the gastrocnemius | Evidence | Kinoshita 2023, *Front Physiol* 14:1272106 | Standing raises grew the gastrocnemius +9–12% vs +1–2% seated. The soleus grew similarly either way. |
| Lengthened partials on anchor sets | Evidence | Wolf 2023, *Int J Strength Cond* 3(1) · Pedrosa 2022, *Eur J Sport Sci* 22(8):1250 · Wolf 2025, *PeerJ* 13:e18904 | Partials at long muscle lengths grew muscle as well as full range, or better. |

## Arm specialization (Wave 4 on)

His stated priority is arms that are slightly disproportionate to the rest of him. From Wave 4 the default plan adds a Monday Bayesian curl (3 sets), a Tuesday overhead cable extension (3 sets) and a 4th Saturday overhead set. Weekly isolation goes from 8 to 11 curl sets and from 11 to 15 triceps sets, plus 6 hammer and reverse-curl sets and the chin-ups and dips. Sources were cite-checked on 2026-10-01.

| Plan element | Label | Source | What it supports |
|---|---|---|---|
| More weekly sets for the priority muscle | Evidence | Pelland 2026 (above) · Schoenfeld 2017 (above) | Hypertrophy keeps rising with weekly sets, with diminishing returns. Compound sets count about half (fractional counting fit best). |
| Biceps raised moderately (8 to 11 curl sets, about 17 direct elbow-flexor sets with hammers and reverse curls) | Evidence | Heaselgrave 2019, *Int J Sports Physiol Perform* 14(3):360 | In trained men, 9, 18 and 27 weekly biceps sets gave +4.3%, +9.5% and +5.4% thickness: no extra gain past about 18. |
| Triceps raised more (11 to 15 isolation sets) | Evidence | Baz-Valle 2022 (systematic review of trained lifters, excludes retracted studies) · Brigatto 2022, *J Strength Cond Res* 36(1):22 | Triceps responded to higher weekly volume in trained lifters; biceps did not separate as clearly. |
| The added triceps work is overhead | Evidence | Maeo 2023 (above) · Brandão 2020, *J Strength Cond Res* 34(5):1254 | Overhead beat pushdowns for the long head and the whole triceps. Bench-only training barely grew the long head, so pressing does not replace it. |
| No added triceps on Monday; Tuesday's comes after all pressing | Evidence | Ferreira 2017, *Muscle Nerve* 56(5):963 · Soares 2016, *J Sports Sci Med* 15(1):111 | Triceps work can stay reduced for up to 48 h; a pushdown before bench cut bench volume about 22%. |
| No added triceps on Thursday | Partly | Remmert 2025 (preprint, not peer reviewed) | Past about 11 fractional sets per muscle per session, more sets in that session stop showing a detectable gain. Thursday is already there. |
| Curls 48 h apart (Mon, Wed, Sat) | Partly | Soares 2015, *J Strength Cond Res* 29(9):2594 | Preacher-curl torque was still 8% down at 24 h in trained men. |
| Added sets stop at RPE 8; still one failure set per muscle per day | Evidence | Refalo 2023 (above) · Vasconcelos 2026, *Muscles* 5(3):61 · Hermann 2025, *Med Sci Sports Exerc* 57(9):2021 | In trained lifters, preacher curls to failure grew no more than stopping 1–3 reps short. |
| First two weeks of a new arm exercise at RPE 7 | Judgment | McHugh 2003, *Scand J Med Sci Sports* 13(2):88 | The first exposures to a new exercise cause the most soreness; the protection builds fast. The two-week ramp is a judgment. |
| Nothing else is cut to pay for it | Judgment | — | The block fits the 90-minute slot (the longest session still estimates under 85 min), so the trade is recovery, not time. Waves 1–3 stay as they were run. |

## Upper chest (Wave 4 on)

From Wave 4, Thursday's two touch-and-go "growth" bench sets move to a 30° incline, and Saturday's incline DB press goes from 3 to 4 sets. Incline-biased work goes from 11 to 14 sets a week over four days (Mon fly, Tue incline bench, Thu incline, Sat incline DB). The paused competition bench is untouched.

| Plan element | Label | Source | What it supports |
|---|---|---|---|
| Incline pressing for the upper (clavicular) chest | Partly | Chaves 2020, *Int J Exerc Sci* (Western Kentucky University, open access) | 47 men, 8 weeks: incline-only pressing grew the upper pec clearly more than flat or mixed pressing. Caveat: untrained men, one session a week. |
| 30° rather than steeper | Partly | Saeterbakken 2017, *J Hum Kinet* 57:61 · existing 30° cue | Steeper inclines shift work to the front delt; 30° is the cue the app already uses. The exact angle is partly judgment. |
| Growth sets moved, competition sets kept | Judgment | — | The paused sets carry the meet specificity; the touch-and-go sets were there for size, so they go where the size is wanted. |

## Upper back, traps and 3D shoulders (Wave 4 on)

New goals (2026-10-06): a prominent upper back (traps, rhomboids, rear delts), a detailed back, and all three delt heads. From Wave 4 (Mon 2026-10-12) the default plan changes as follows. Monday's shrug goes from 1 set to 3 and becomes the trap anchor; Monday's hanging leg raise goes from 3 sets to 2 to pay for it. Tuesday's reverse pec deck becomes the rear-delt anchor. A band external-rotation primer runs before pressing on Tuesday and Thursday. Thursday's face pull goes from 2 sets to 3. Friday's tucked machine row is replaced by a high-elbow upper-back row (new key, lighter seed); Tuesday's DB row stays the tucked lat row. Saturday adds a cable Y-shrug (3 sets) and a chest-supported rear-delt raise (3 sets, supersetted with the incline DB press), runs the Y-raise at 5 sets instead of 3, and trims the lat pulldown to 2 sets in reduced weeks instead of deleting it. Waves 1–3 are unchanged: a test pins every Wave 1–3 prescription for every spec. Sources were cite-checked on 2026-10-06 against PubMed, the journal page or the DOI.

Direct sets a week, Weeks 1–2, before → after: upper traps 1 → 6, rear delts 5 → 9, side delts 11 → 13, rows 7 → 7 (Friday's now biased to the upper back), vertical pulls 7 → 7 (6 in reduced weeks, was 4). Fractional (a target set counts 1, a synergist 0.5): upper traps 2 → 7, mid traps and rhomboids 13 → 15, rear delts 10.5 → 14.5, side delts 12.5 → 14.5, lats 10.5 → 10.5 (12.5 if Tuesday's tucked row counts fully, from 14).

| Plan element | Label | Source | What it supports |
|---|---|---|---|
| Traps get direct work: Monday shrug 1 → 3 sets, Saturday Y-shrug 3 sets | Partly | Conley 1997, *Eur J Appl Physiol* 75(5):443 · Andersen 2009, *J Appl Physiol* 107(5):1413 | 12 weeks of squats, deadlifts, push presses and rows left neck cross-section unchanged (19.6 → 19.7 cm²); adding direct neck work grew it about 24%. That was measured at the neck, not the upper trapezius alone. Direct shoulder-girdle training grew trapezius type II fibres 20%, in untrained women with neck pain. No trap growth trial in trained men exists. |
| Upper traps 6 direct sets a week over Monday and Saturday | Judgment | Pelland 2026 (above) | Growth rises with weekly sets, with the steepest returns at low volume, so 1 → 6 sets is where a set buys the most. The number is judgment. |
| Shrug for the upper traps; the Saturday shrug with the arms about 30° out | Partly | Ekstrom 2003, *J Orthop Sports Phys Ther* 33(5):247 · Pizzari 2014, *Clin Biomech* 29(2):201 · Castelein 2016, *Man Ther* 21:250 | The shrug gave the highest upper-trap EMG of ten exercises. Arms 30° out raised upper- and lower-trap EMG over a standard shrug. Upper-trap EMG barely differed across shrug variants, so the variant is preference. All EMG. |
| Second trap day on Saturday, 24 h after the deadlift, not Thursday | Judgment | Soares 2015 (above) | Keeps direct trap and grip work out of the 24 h before the deadlift. Soares measured elbow-flexor recovery (single-joint work still 8% down at 24 h), not the traps. |
| Rear delts 5 → 9 direct sets over Tuesday, Thursday and Saturday | Partly | Schoenfeld 2017 (above) · Pelland 2026 (above) · Franke 2015, *J Sports Med Phys Fitness* 55(7-8):714 | No rear-delt growth trial exists. A reverse pec deck beat the seated row and the incline pulldown for posterior-delt EMG in trained men, so rows and chin-ups count only half for the rear delt. The count is judgment. |
| Saturday rear-delt work restored when arms are the priority | Partly | Franke 2015 (above) · Zhu 2025, *Acta Bioeng Biomech* 27(4):135 | The old filter assumed "rear delts already ride rows, chins, face pulls". Rows load the rear delt less than a fly (EMG) or a raise (musculoskeletal model), so the premise was wrong. |
| Tuesday reverse pec deck becomes the rear-delt anchor | Partly | Robinson 2024 (above) · Refalo 2023 (above) | Growth rises as sets end closer to failure; the plan allows one near-failure set per muscle per day. Reading the side and rear delt as separate muscles for that rule (Tuesday also has the side-delt anchor) is judgment: the heads have different actions and the app already counts them separately. If the deltoid is read as one muscle, drop this anchor; it costs nothing. |
| Thumbs-up chest-supported rear-delt raise (Saturday); face pull finishing with the thumbs back (Thursday) | Partly | Reinold 2004, *J Orthop Sports Phys Ther* 34(7):385 · Ekstrom 2003 (above) · Cools 2007, *Am J Sports Med* 35(10):1744 | Prone horizontal abduction near 100° with the arm turned out gave the highest posterior-delt (88% MVIC) and middle-delt (87%) EMG of seven exercises and the top mid-trap EMG, with a low upper-to-lower trap ratio. EMG. |
| Friday becomes the high-elbow upper-back row (new key, seed 100); Tuesday's DB row stays the tucked lat row | Partly | Vasconcelos 2023, *Int J Strength Cond* 3(1) · Padovan 2026, *J Hum Kinet* 91 · Lehman 2004, *Dyn Med* 3(1):4 | Elbows at 60–90° or a wide grip raised upper-, mid- and lower-trap and rear-delt EMG; a narrow, tucked row raised lat EMG and force (trained men in Padovan). Rows gave the most mid-trap and rhomboid activity of the pulls tested. All EMG. The new key and lighter seed keep one-tap progression honest. |
| Shoulder blades reach forward at the bottom of a row | Judgment | Padovan 2025, *J Funct Morphol Kinesiol* 11(1):6 | Fixed versus free shoulder blades changed excitation only slightly; either works. |
| Side delts 11 → 13 direct sets: Saturday Y-raise 3 → 5 sets at RPE 8 | Partly | Larsen 2025, *Front Physiol* (above) · Refalo 2024, *J Sports Sci* 42(1):85 | Trained side delts grew on 5 sets a session (10 a week) taken to failure. Stopping 1–2 reps short grew trained quads as much as failure. The weekly total stays under the 16 cap; the number is judgment. |
| Laterals: thumb level, elbow nearly straight, stop at shoulder height | Partly | Coratella 2020, *Int J Environ Res Public Health* 17(17):6015 · Schoenfeld 2011, *Strength Cond J* 33(5):25 · Larsen 2025, *Front Physiol* (above) | A neutral arm gave the most concentric side-delt EMG in bodybuilders; turning the thumb down shifted work to the rear delt and upper traps. An expert review puts impingement risk at 70–120° of elevation with the arm turned in (written for the upright row; applying it to laterals is judgment). Larsen's trial raised to 90°. |
| "Deepest stretch = THE side-delt builder" wording dropped | Partly | Larsen 2025, *Front Physiol* (above) · Jones 2025 (SportRxiv preprint, not peer reviewed) | Dumbbell and cable laterals, with different resistance curves, grew the side delt equally; in an untrained preprint a long-length bias did not out-grow a short one for the side or rear delt. The cross-body start stays for feel. |
| Band external-rotation primer before pressing (Tuesday, Thursday) | Partly | Andersson 2017, *Br J Sports Med* 51(14):1073 · Siewe 2011, *Int J Sports Med* 32(9):703 · Kolber 2009, *J Strength Cond Res* 23(1):148 | A warm-up programme with external-rotation and shoulder-blade strength work cut shoulder problems 28% (OR 0.72) in 660 elite handball players; it ran 3×/week with more parts, in a throwing sport. The shoulder was the most injured region in 245 competitive powerlifters, and recreational lifters showed rotator strength imbalances. Warm-up effort only: it is insurance, not volume. |
| New Saturday work paired as antagonist supersets | Evidence | Zhang 2025, *Sports Med* 55(4):953 | Supersets matched traditional sets for long-term hypertrophy and strength and saved time. |
| Saturday lat pulldown trimmed to 2 sets in reduced weeks, not deleted | Truth | — | Deleting it removed the only Saturday lat work from every week 3 and all of Cycle 5 (vertical-pull sets 7 → 4). Same bug class as the old side-delt gap. |
| Peak weeks no longer bring back the retired Thursday laterals and rear-delt fly | Truth | — | The peak builder ignored the Thursday drop list and the wave gates (3 lateral and 2 rear-delt sets came back every peak). |
| Accessory progression: a 1-set exercise can clear a rung; peak maintenance neither holds nor advances a rung; deload sets never qualify; the latest qualifying session wins; logged weights are adopted on the exercise's grid, never rounded up | Truth | — | The 2-sets-must-clear rule froze the 1-set shrug from Wave 2; the 1-set peak froze 2-set accessories (face pull, prone Y, leg extension, pushdown) after every peak; a logged 22.5 lb cable lateral was rounded up to 25 every other wave; the 100 lb light-week crunch qualified the 80 lb working rung. Applied to prescriptions from Wave 4; Waves 1–3 display as they were run. |
| No direct front-delt work | Partly | Lanza 2024, *J Bodyw Mov Ther* 40:1417 | Bench-only training grew the anterior delt on MRI, while the medial delt grew least. Pressing gives the front head about 16 fractional sets a week. |
| Not adopted: a wide-grip upright row | Judgment | McAllister 2013, *J Strength Cond Res* 27(1):181 · Schoenfeld 2011 (above) | A wide grip raised side-delt and trap EMG, but it puts the arm turned in near the impingement range on a lifter who benches twice a week and dips. Laterals and shrugs cover the same muscles. |
| Not adopted: a Thursday row or shrug, or a Monday pulldown | Judgment | Soares 2015 (above) | A Thursday row or shrug lands within 24 h of the deadlift and the weighted chin-up; a Monday pulldown would push Monday past 75 minutes. |
| Not adopted: back extensions for the erectors | Judgment | Fisher 2013, *Phys Ther Sport* 14(3):139 | No trial shows erector growth from extensions, deadlifts or RDLs in healthy trained lifters; Fisher measured strength only. The erectors already take 8–9 hinge sets and 9–10 squat sets a week. |
| Rows vs pulldowns for back growth | Judgment | ClinicalTrials.gov NCT07360236 | No published trial compares them; a registered MRI trial was not yet recruiting in January 2026. Recheck in 2027. |
| A "shredded" back is mostly leanness | Partly | Ramirez-Campillo 2022, *Human Movement* 23(3):1 · Bauer 2023, *J Strength Cond Res* 37(3):726 | Local training does not remove local fat. Male bodybuilders sit about 10–16% body fat off-season and 6–11% at a contest, so back detail is a Phase 2 outcome; these sets build the muscle under it. |
| EMG-based choices are labeled Partly at most | Evidence | Vigotsky 2022, *Sports Med* 52(2):193 | Acute EMG amplitude does not validly predict long-term growth. |
| Monday hanging leg raise 3 → 2 sets from Wave 4 | Judgment | — | Pays most of the shrug's 3.5 minutes (Monday's longest week 73 → 71.25 min). The last set stays the abs anchor; abs keep 4 direct sets a week. Abs are not a stated goal, and whether they show is a body-fat question. |
| Wave 4+ budget: weekday estimate 75 min or less, set counts pinned (weekday 27, Saturday 34 non-filler), checked for every spec | Judgment | Singer 2024, *Front Sports Act Living* 6:1429789 | The v32 per-day caps (22 weekday, 25 Saturday) were only ever tested on Wave 1; the arm and upper-chest blocks already passed them (Monday 26, Saturday 26). Resting more than 60 s helped a little, so the clock keeps 15 minutes of the 90-minute slot for rests that run long. The lifter signs off on the new caps. |

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
4. Post-test base 96%; default test target = estimated max × 1.02 (taper allowance); the taper's last heavy touch 4 days out.
5. Tracked-lift clamp; chin-up anchored to bench.
6. Exact weekly set counts and caps, including the arm block's 11 curl and 15 triceps sets and the RPE 7 ramp; the upper-back block's 6 trap, 9 rear-delt and 13 side-delt sets, its seeds, the per-head reading of the one-failure-set rule and the Wave 4+ budget; face pull rep steps.
7. Six-week trim cap and its end conditions; the 1%/wk flag; phase-relative 7-day decision rule; whey + banana before a trim lift.
