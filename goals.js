// goals.js — Model 2 goal tracking. Pure data + functions, no DOM.
// Spliced into app-shell at /*==GOALS==*/ and unit-tested from test.js.
//
// Every goal gets four things, the way an experiment would:
//   a metric and a measuring protocol   (what exactly is measured, and how)
//   a target and a deadline             (Phase 1 ends at Wave 45)
//   the pace it needs                   (target minus now, over the months left)
//   the pace he actually has            (a least-squares trend through his readings)
// A verdict is only called when the gap is bigger than the measurement noise:
// a tape moves about a quarter inch between honest readings, so two readings a
// month apart cannot tell 0.1"/month from zero. Until the data can, it says so.

const HEIGHT_IN = 68.5; // 5'8.5"
const TARGETS = { bw: 200, bf: 15, lean: 170, arm: 16, ratio: 1.5, bfPhase2: 11 };
// Noise per reading (one standard deviation). Tape circumferences: Judgment (a quarter
// inch for the arm and waist, half an inch for the bigger girths). Body fat: the tape
// equation missed an 8-week DXA change by 2.4 points (SD) in 926 men (Foulis 2023).
const NOISE = { ar: 0.25, wa: 0.25, nk: 0.25, sh: 0.5, ch: 0.5, bf: 2.4 };
const MONTH = 30.44 * 86400000;
const DKRE = /^\d{4}-\d{2}-\d{2}$/;
const ms = (dk) => Date.UTC(+dk.slice(0, 4), +dk.slice(5, 7) - 1, +dk.slice(8, 10));

// US Navy circumference equation for men, inches (Hodgdon & Beckett 1984).
// A field estimate: against DXA it read about 6 points low in Army trainees (Foulis 2023),
// so it is used as a TREND, and one DXA scan recalibrates it (see bfSeries).
function navyBF(waist, neck, height) {
  const h = height || HEIGHT_IN;
  if (!(waist > 0 && neck > 0 && h > 0) || waist - neck <= 0) return null;
  const v = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(h) + 36.76;
  return Number.isFinite(v) && v > 2 && v < 60 ? Math.round(v * 10) / 10 : null;
}

// every reading of one field, oldest first: [{t, dk, v}]
function series(meas, field) {
  return Object.keys(meas || {}).filter((k) => DKRE.test(k) && meas[k] && Number.isFinite(meas[k][field])).sort()
    .map((dk) => ({ t: ms(dk), dk, v: meas[dk][field] }));
}

// Body fat over time. Tape days give the Navy estimate; a DXA reading ("dx") on or within
// 21 days of a tape day sets an offset that corrects every tape estimate (the tape's bias
// is mostly constant for one person, its error in CHANGE is smaller: Foulis 2023).
function bfSeries(meas, height) {
  const tape = Object.keys(meas || {}).filter((k) => DKRE.test(k) && meas[k]).sort()
    .map((dk) => ({ dk, t: ms(dk), v: navyBF(meas[dk].wa, meas[dk].nk, height) })).filter((x) => x.v != null);
  const dxa = series(meas, "dx");
  let offset = 0, calibratedBy = null;
  for (const d of dxa) {
    let best = null;
    for (const x of tape) { const gap = Math.abs(x.t - d.t); if (gap <= 21 * 86400000 && (!best || gap < best.gap)) best = { gap, v: x.v }; }
    if (best) { offset = Math.round((d.v - best.v) * 10) / 10; calibratedBy = d.dk; }
  }
  const out = tape.map((x) => ({ t: x.t, dk: x.dk, v: Math.round((x.v + offset) * 10) / 10, src: calibratedBy ? "tape+dxa" : "tape" }));
  for (const d of dxa) if (!out.some((x) => x.dk === d.dk)) out.push({ t: d.t, dk: d.dk, v: d.v, src: "dxa" });
  out.sort((a, b) => a.t - b.t);
  return { points: out, offset, calibratedBy };
}

// 7-day average bodyweight ending on dk (3+ weigh-ins), else the nearest weigh-in within 3 days
function bw7(bw, dk) {
  const t = ms(dk), vals = [];
  let near = null;
  for (const [k, v] of Object.entries(bw || {})) {
    if (!DKRE.test(k) || !Number.isFinite(v)) continue;
    const d = (t - ms(k)) / 86400000;
    if (d >= 0 && d < 7) vals.push(v);
    if (Math.abs(d) <= 3 && (!near || Math.abs(d) < near.d)) near = { d: Math.abs(d), v };
  }
  if (vals.length >= 3) return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  return near ? near.v : null;
}

// lean mass on each body-fat day: 7-day bodyweight x (1 - BF)
function leanSeries(meas, bw, height) {
  const { points, calibratedBy } = bfSeries(meas, height);
  const out = [];
  for (const p of points) { const w = bw7(bw, p.dk); if (w != null) out.push({ t: p.t, dk: p.dk, v: Math.round(w * (1 - p.v / 100) * 10) / 10, bf: p.v, bw: w }); }
  return { points: out, calibratedBy };
}

// Least-squares slope per month through readings within the window.
// Needs 3+ readings over 8+ weeks; otherwise null (two readings are a difference, not a trend).
function trend(points, opts) {
  const o = Object.assign({ minN: 3, minDays: 56, windowDays: 183, now: null }, opts || {});
  if (!points || !points.length) return null;
  const end = o.now != null ? o.now : points[points.length - 1].t;
  const p = points.filter((x) => x.t <= end && x.t >= end - o.windowDays * 86400000);
  if (p.length < o.minN) return null;
  const span = (p[p.length - 1].t - p[0].t) / 86400000;
  if (span < o.minDays) return null;
  const mx = p.reduce((a, x) => a + x.t, 0) / p.length, my = p.reduce((a, x) => a + x.v, 0) / p.length;
  let sxy = 0, sxx = 0;
  for (const x of p) { sxy += (x.t - mx) * (x.v - my); sxx += (x.t - mx) ** 2; }
  if (!sxx) return null;
  return { perMonth: (sxy / sxx) * MONTH, n: p.length, spanMonths: span / 30.44 };
}

// The smallest monthly pace the data can tell from zero: the first and last readings each
// carry the noise, so a change must beat about 2 x sqrt(2) x noise over the span (Judgment:
// a deliberately conservative two-reading band; more readings only make it safer).
const band = (noise, spanMonths) => (2 * Math.SQRT2 * noise) / Math.max(spanMonths, 0.25);

// verdict for one goal
function judge(o) {
  // o: {now, target, monthsLeft, trend, noise, higherIsBetter}
  const up = o.higherIsBetter !== false;
  if (o.now == null) return { status: "nodata", need: null };
  const gap = o.target - o.now;
  if ((up && gap <= 0) || (!up && gap >= 0)) return { status: "reached", need: 0 };
  const need = o.monthsLeft > 0 ? gap / o.monthsLeft : null;
  if (!o.trend || need == null) return { status: "early", need };
  const b = band(o.noise, o.trend.spanMonths), have = o.trend.perMonth;
  const diff = up ? have - need : need - have;
  if (diff > b) return { status: "ahead", need, have, band: b };
  if (diff >= -b) return { status: "ontrack", need, have, band: b };
  return { status: "behind", need, have, band: b };
}

// Process metrics: what the plan prescribes for each declared priority, per week.
// Same predicates the tests use, so the numbers on screen are the numbers under test.
const REGION = {
  curls: (n) => /Curl/i.test(n) && !/Leg Curl|Wrist|Neck|Hammer|Reverse/i.test(n),
  triceps: (n) => /(Extension|Pushdown)/i.test(n) && !/Leg|Wrist|Neck/i.test(n),
  upperChest: (n) => /Incline Bench|Incline DB Press|Low-to-High/i.test(n),
  traps: (n) => /Shrug/.test(n),
  rearDelts: (n) => /Rear-Delt|Reverse Pec|Reverse-Pec|Face Pull/i.test(n),
  sideDelts: (n) => /Lateral Raise|Cross-Body Cable Y-Raise/i.test(n) && !/Pulldown|Prone/i.test(n),
  rows: (n) => /Row\b/.test(n),
};
const REGION_LABEL = { curls: "Curls", triceps: "Triceps", upperChest: "Upper chest", traps: "Traps", rearDelts: "Rear delts", sideDelts: "Side delts", rows: "Rows" };
// blocks: every block of one week (Mon-Sun)
function weekRegions(blocks) {
  const out = {};
  for (const k of Object.keys(REGION)) out[k] = 0;
  for (const b of blocks || []) {
    if (!b || !["accessory", "single", "backoff", "paused"].includes(b.type) || !b.sets) continue;
    for (const [k, f] of Object.entries(REGION)) if (f(b.name || "")) out[k] += b.sets;
  }
  return out;
}

// The physique map: weekly sets per muscle. Direct work counts 1; a compound's secondary
// muscles count half (the fractional counting that fit best in Pelland 2026). First matching rule wins.
// Which muscles a movement trains is anatomy; the half-credit split is a judgment call.
const MUSCLES = {
  upperchest: { n: "Upper chest", goal: "Upper chest", pri: true },
  chest: { n: "Mid chest", goal: "3/4/5" },
  frontdelt: { n: "Front delts", goal: "Support" },
  sidedelt: { n: "Side delts", goal: "3D shoulders", pri: true },
  reardelt: { n: "Rear delts", goal: "3D shoulders", pri: true },
  traps: { n: "Upper traps", goal: "Upper back", pri: true },
  midtraps: { n: "Mid back", goal: "Upper back", pri: true },
  lats: { n: "Lats", goal: "Shredded back", pri: true },
  biceps: { n: "Biceps", goal: "16\" arms", pri: true },
  triceps: { n: "Triceps", goal: "16\" arms", pri: true },
  forearms: { n: "Forearms", goal: "16\" arms", pri: true },
  abs: { n: "Abs", goal: "Support" },
  erectors: { n: "Lower back", goal: "3/4/5" },
  quads: { n: "Quads", goal: "3/4/5" },
  hams: { n: "Hamstrings", goal: "3/4/5" },
  glutes: { n: "Glutes", goal: "3/4/5" },
  calves: { n: "Calves", goal: "Support" },
};
const MUSCLE_RULES = [
  [/Band External Rotation|Band Pull-Apart|Stomach Vacuum|Neck/i, {}],
  [/Calf Raise/i, { calves: 1 }],
  [/^(Paused )?Squat/i, { quads: 1, glutes: 0.5 }],
  [/Leg Press/i, { quads: 1, glutes: 0.5 }],
  [/Leg Extension/i, { quads: 1 }],
  [/Leg Curl/i, { hams: 1 }],
  [/^Deadlift/i, { erectors: 1, hams: 0.5, glutes: 0.5, traps: 0.5, forearms: 0.5 }],
  [/^RDL/i, { hams: 1, glutes: 0.5, erectors: 0.5 }],
  [/Leg Raise|Ab Wheel|Crunch|Plank/i, { abs: 1 }],
  [/Low-to-High|Fly/i, { upperchest: 1, chest: 0.5 }],
  [/Incline (Bench|DB Press)/i, { upperchest: 1, chest: 0.5, frontdelt: 0.5, triceps: 0.5 }],
  [/Bench/i, { chest: 1, upperchest: 0.5, frontdelt: 0.5, triceps: 0.5 }],
  [/Overhead Press/i, { frontdelt: 1, sidedelt: 0.5, triceps: 0.5 }],
  [/Dip/i, { triceps: 1, chest: 0.5, frontdelt: 0.5 }],
  [/Shrug/i, { traps: 1 }],
  [/Farmer/i, { forearms: 1, traps: 0.5 }],
  [/Hammer Curl|Reverse Cable Curl|Reverse Curl/i, { forearms: 1, biceps: 0.5 }],
  [/Wrist/i, { forearms: 1 }],
  [/Curl/i, { biceps: 1 }],
  [/Extension|Pushdown|Triceps/i, { triceps: 1 }],
  [/Prone Y-Raise/i, { midtraps: 1, reardelt: 0.5 }],
  [/Lateral Raise|Y-Raise/i, { sidedelt: 1 }],
  [/Rear-Delt|Reverse[- ]Pec/i, { reardelt: 1 }],
  [/Face Pull/i, { reardelt: 1, midtraps: 0.5 }],
  [/High-Elbow/i, { midtraps: 1, reardelt: 0.5, lats: 0.5, biceps: 0.5 }],
  [/Row/i, { lats: 1, midtraps: 0.5, reardelt: 0.5, biceps: 0.5 }],
  [/Chin-Up|Pull-Up|Pulldown/i, { lats: 1, biceps: 0.5 }],
];
const muscleRule = (name) => { const r = MUSCLE_RULES.find(([re]) => re.test(name || "")); return r ? r[1] : {}; };
// blocks: any list of session blocks (a day or a whole week); unknown names credit nothing
function muscleSets(blocks) {
  const out = {};
  for (const k of Object.keys(MUSCLES)) out[k] = 0;
  for (const b of blocks || []) {
    if (!b || !["accessory", "single", "backoff", "paused", "ohp"].includes(b.type) || !b.sets) continue;
    for (const [m, c] of Object.entries(muscleRule(b.name))) out[m] += b.sets * c;
  }
  return out;
}

// adherence: days = [{planned, logged}] for the window; sets logged / sets planned
function adherence(days) {
  let p = 0, l = 0;
  for (const d of days || []) { p += d.planned || 0; l += Math.min(d.logged || 0, d.planned || 0); }
  return p ? Math.round((l / p) * 100) : null;
}

// Monthly photos: same light, same distance, same time (morning, before food), phone at chest height.
const POSES = ["Front relaxed", "Front double biceps", "Side chest, both sides", "Rear relaxed", "Rear lat spread", "Rear double biceps"];
// Measuring protocol, shown next to the inputs
const PROTOCOL = {
  wa: "Waist at the navel, relaxed, after a normal exhale",
  nk: "Neck just below the Adam's apple, tape sloping slightly down to the front",
  ar: "Right arm FLEXED at the peak of the biceps, cold (before training)",
  sh: "Shoulders around the widest point of the delts, arms relaxed",
  ch: "Chest at nipple height, relaxed, after a normal exhale",
  dx: "DXA body fat %, if you get a scan (once or twice a year recalibrates the tape)",
};
const lastDate = (map) => { const k = Object.keys(map || {}).filter((x) => DKRE.test(x)).sort(); return k.length ? k[k.length - 1] : null; };
const daysSince = (dk, todayDk) => (dk ? Math.round((ms(todayDk) - ms(dk)) / 86400000) : null);
// the measure-and-photo day is due every 4 weeks
function due(meas, photos, todayDk) {
  const full = Object.keys(meas || {}).filter((k) => DKRE.test(k) && meas[k] && Number.isFinite(meas[k].wa) && Number.isFinite(meas[k].nk) && Number.isFinite(meas[k].ar)).sort();
  const m = daysSince(full.length ? full[full.length - 1] : null, todayDk), p = daysSince(lastDate(photos), todayDk);
  return { measure: m == null || m >= 28, photos: p == null || p >= 28, measDays: m, photoDays: p };
}

// The full report. in: {meas, bw, photos, today (dk), deadline (ms), height,
//   strength: {now: {bn,sq,dl}, goal: {bn,sq,dl}, eta: {bn:{wave,ms},...}},
//   regions (weekRegions of this week), adherence (percent or null), sleepAvg, bwRatePerWeek}
function report(inp) {
  const today = ms(inp.today), monthsLeft = Math.max(0, (inp.deadline - today) / MONTH);
  const lever = [];
  if (inp.adherence != null && inp.adherence < 85) lever.push(`log the plan first: ${inp.adherence}% of planned sets done in the last 4 weeks`);
  if (inp.sleepAvg != null && inp.sleepAvg < 7) lever.push(`sleep averages ${inp.sleepAvg} h; 7+ is the cheapest growth lever`);
  const gainLever = inp.bwRatePerWeek != null && inp.bwRatePerWeek < 0.1 ? "bodyweight is flat: apply the +150 kcal on Trends" : null;
  const arm = series(inp.meas, "ar"), armNow = arm.length ? arm[arm.length - 1].v : null;
  const armT = trend(arm, { now: today });
  const bf = bfSeries(inp.meas, inp.height), bfNow = bf.points.length ? bf.points[bf.points.length - 1].v : null;
  const lean = leanSeries(inp.meas, inp.bw, inp.height), leanNow = lean.points.length ? lean.points[lean.points.length - 1].v : null;
  // lean mass from tape is noisy: BF noise x bodyweight (about 4.5 lb), so its verdict waits for 6 months or a DXA pair
  const leanT = trend(lean.points, { now: today, minDays: lean.calibratedBy ? 56 : 168, windowDays: 400 });
  const sh = series(inp.meas, "sh"), wa = series(inp.meas, "wa");
  const ratioPts = sh.map((s) => { const w = wa.filter((x) => Math.abs(x.t - s.t) <= 7 * 86400000).pop(); return w ? { t: s.t, dk: s.dk, v: Math.round((s.v / w.v) * 1000) / 1000 } : null; }).filter(Boolean);
  const ratioNow = ratioPts.length ? ratioPts[ratioPts.length - 1].v : null;
  const ratioT = trend(ratioPts, { now: today });
  const bwNow = inp.bw ? bw7(inp.bw, inp.today) : null;
  const goals = [];
  // 1. strength: the engine's own projection against the deadline
  if (inp.strength) {
    const late = Object.entries(inp.strength.eta || {}).filter(([, e]) => !e || e.ms > inp.deadline).map(([L]) => L);
    goals.push({ key: "strength", label: "3/4/5", metric: "Cycle bases (bench/squat/deadlift)",
      now: `${inp.strength.now.bn} / ${inp.strength.now.sq} / ${inp.strength.now.dl}`, target: "315 / 405 / 495",
      status: late.length ? "behind" : "ontrack",
      detail: Object.entries(inp.strength.eta || {}).map(([L, e]) => `${L === "bn" ? "bench" : L === "sq" ? "squat" : "deadlift"} ${e ? "Wave " + e.wave : "beyond Wave 80"}`).join(" · "),
      lever: late.length ? ["rate every single: the gates move you only on rated evidence", ...lever] : [] });
  }
  // 2. lean mass (the 200 @ 15% build is ~170 lb lean)
  const lj = judge({ now: leanNow, target: TARGETS.lean, monthsLeft, trend: leanT, noise: NOISE.bf / 100 * (bwNow || 190) });
  goals.push({ key: "lean", label: "200 lb @ 15%", metric: "Lean mass = 7-day bodyweight x (1 - body fat)",
    now: leanNow != null ? `${leanNow} lb lean · ${bfNow}% fat${bf.calibratedBy ? " (DXA-calibrated)" : " (tape)"} · ${bwNow != null ? bwNow + " lb" : "—"}` : bwNow != null ? `${bwNow} lb · log waist + neck for body fat` : "log weight, waist and neck",
    target: `${TARGETS.lean} lb lean · ${TARGETS.bf}% · ${TARGETS.bw} lb`, ...lj,
    unit: "lb lean/month", lever: lj.status === "behind" ? [gainLever, ...lever].filter(Boolean) : [],
    note: lean.calibratedBy ? null : "Tape body fat reads about 6 points off DXA and misses part of each change; one DXA scan calibrates it, and the verdict waits for 6 months of monthly tapes or a DXA pair." });
  // 3. arms
  const aj = judge({ now: armNow, target: TARGETS.arm, monthsLeft, trend: armT, noise: NOISE.ar });
  goals.push({ key: "arms", label: "16\" arms", metric: "Flexed arm, cold, monthly", now: armNow != null ? `${armNow}"` : "measure flexed", target: `${TARGETS.arm}"`, ...aj,
    unit: "in/month", lever: aj.status === "behind" ? [gainLever, ...lever, "arm rungs held? check the arm cards for ⏸"].filter(Boolean) : [] });
  // 4. 3D shoulders
  const rj = judge({ now: ratioNow, target: TARGETS.ratio, monthsLeft, trend: ratioT, noise: 0.02 });
  goals.push({ key: "shoulders", label: "3D shoulders", metric: "Shoulder ÷ waist + monthly photos (front, side, rear)",
    now: ratioNow != null ? ratioNow.toFixed(2) : "measure shoulders + waist", target: TARGETS.ratio.toFixed(2), ...rj, unit: "/month",
    lever: rj.status === "behind" ? ["side and rear delts: check the lateral and reverse-pec cards for ⏸", ...lever] : [] });
  // 5-7. the photo goals: process metrics + photos, judged by eye at the 4-week check
  const r = inp.regions || {};
  goals.push({ key: "upperchest", label: "Prominent upper chest", metric: "Photos (front, side) + weekly incline-biased sets", now: `${r.upperChest || 0} sets/wk planned`, target: "visible shelf in the side photo", status: "photo" });
  goals.push({ key: "upperback", label: "Prominent upper back", metric: "Photos (rear relaxed, lat spread) + weekly sets", now: `traps ${r.traps || 0} · rear delts ${r.rearDelts || 0} · rows ${r.rows || 0} sets/wk`, target: "thick yoke in the rear photo", status: "photo" });
  goals.push({ key: "back", label: "Shredded back", metric: "Body fat (Phase 2 ~11%) + rear photos", now: bfNow != null ? `${bfNow}% fat` : "log waist + neck", target: `~${TARGETS.bfPhase2}% (Phase 2)`, status: "phase2",
    note: "Detail is a leanness result: back work builds the muscle now, the Phase 2 cut reveals it. Spot work does not remove local fat." });
  return { goals, monthsLeft: Math.round(monthsLeft * 10) / 10 };
}

// Model 2, in plain words, for the one-time "What's new" sheet.
const MODEL2 = {
  from: 4,
  title: "Model 2",
  starts: "Wave 4 · Monday Oct 12, 2026",
  items: [
    ["Arms (16\")", "11 curl + 15 triceps isolation sets a week, overhead work for the long head, 48 h between hard biceps days."],
    ["Upper chest", "14 incline-biased sets a week: Thursday growth sets moved to a 30° incline; 4 Saturday incline DB sets."],
    ["Upper back & traps", "Shrug becomes the trap anchor (3 sets) + a Saturday cable Y-shrug; Friday becomes a high-elbow upper-back row."],
    ["3D shoulders", "Rear delts 5 → 9 sets with a real anchor, side delts 11 → 13, a band external-rotation primer before pressing."],
    ["Lats & the V-taper", "3 Saturday sets of wide-grip pull-ups (bodyweight, then a belt): lats 12.5 → 15.5 weekly sets, on the one day that costs the meet lifts nothing. The waist stays the guard while you bulk."],
    ["Meet day", "Attempts in kg from your rated singles, the real opener rehearsed in week 3, USPA commands on every heavy single, meet-date alignment."],
    ["Logging", "Extra sets visible, edited weights carry to the next set, rest timer starts itself, swaps and 'last time' per exercise."],
    ["Data safety", "Imports checked before they replace anything, a recovery screen, dated schedule shifts that never move past logs."],
    ["Nutrition", "Accurate weekly rate, no trims in Cycles 5–6, a sleep gate that needs logged sleep, adjustments that move the targets."],
    ["Goal tracking", "Each goal shows the pace it needs vs the pace you have, and the lever to pull when you fall behind."],
    ["Now card", "Today walks you set by set: primers, the warm-up ramp with plates, the single with meet commands, a rating that shows the back-offs it sets, a rest ring, the rep ladder, then what the session built."],
    ["Body map", "A real anatomy map of this week's sets per muscle, your goal muscles in gold; tap one to see every set that feeds it. Road draws your frame inside the goal frame from your tape."],
  ],
};

const GOALS = { HEIGHT_IN, TARGETS, NOISE, MONTH, navyBF, series, bfSeries, bw7, leanSeries, trend, band, judge, REGION, REGION_LABEL, weekRegions, MUSCLES, MUSCLE_RULES, muscleRule, muscleSets, adherence, POSES, PROTOCOL, due, report, MODEL2 };
if (typeof module !== "undefined") module.exports = GOALS;
