// ── Road to 3/4/5 · progression engine ─────────────────────────────
// Implements Powerlifting + Juicy Arms v7. Waves 1–4 mains are the
// published notes verbatim; waves 5–19 are generated from the v7 rules
// and re-computed from logged gate results.

const R5 = (x) => Math.round(x / 5) * 5;
const R25 = (x) => Math.round(x / 2.5) * 2.5;

const START = { bn: 225, sq: 315, dl: 405 };
const WAVE1_MONDAY = Date.UTC(2026, 6, 20); // 2026-07-20
const MS_DAY = 86400000;
const LIFTS = ["sq", "bn", "dl"];
const LIFT_NAME = { sq: "Squat", bn: "Bench", dl: "Deadlift" };

// gate result → CB delta
function gateDelta(lift, result, prevCB) {
  if (result === "small") return lift === "bn" ? 2.5 : 5;
  if (result === "repeat") return 0;
  if (result === "reset") return R5(prevCB * 0.95) - prevCB;
  return lift === "bn" ? 5 : 10; // clean (default)
}

// gates: {2:{sq:'clean'|'small'|'repeat'|'reset',...}, ...} keyed by the wave the gate FEEDS INTO
function cbFor(wave, gates = {}) {
  const cb = { ...START };
  for (let w = 2; w <= wave; w++) {
    const g = gates[w] || {};
    for (const L of LIFTS) {
      if (g.cb && Number.isFinite(g.cb[L])) cb[L] = g.cb[L]; // explicit CB (e.g. set from a test day)
      else cb[L] = cb[L] + gateDelta(L, g[L] || "clean", cb[L]);
    }
  }
  return cb;
}

const cycleOf = (wave) => ((wave - 1) % 6) + 1;
const macroOf = (wave) => Math.floor((wave - 1) / 6) + 1;
const CYCLE_NAME = ["", "Calibration", "Build", "Accumulate", "Specificity", "Intensification", "Peak"];

// ── schedule ────────────────────────────────────────────────────────
function waveStartUTC(wave, offsetWeeks = 0) {
  return WAVE1_MONDAY + ((wave - 1) * 28 + offsetWeeks * 7) * MS_DAY;
}
// date (ms UTC midnight) → {wave, week, day} · day 1–5 = Mon–Fri, 0 = weekend
function whereIs(utcMid, offsetWeeks = 0) {
  const d = Math.floor((utcMid - WAVE1_MONDAY) / MS_DAY) - offsetWeeks * 7;
  if (d < 0) return { wave: 0, week: 0, day: 0, pre: true };
  const wave = Math.floor(d / 28) + 1;
  const week = Math.floor((d % 28) / 7) + 1;
  const dow = d % 7; // 0=Mon … 6=Sun
  return { wave, week, day: dow + 1, dow }; // 7-day week: 1=Mon Squat … 6=Sat Spec, 7=Sun optional
}

// ── explicit waves 1–4 (the published notes, verbatim) ──────────────
// singles[wk1,wk2,wk3] · back-offs [[w,reps,sets]×3] · wk4 light triple
const NOTES = {
  1: {
    sq: { s: [265, 275, 285], b: [[225, 5, 4], [235, 4, 5], [250, 3, 5]], l: 205 },
    bn: { s: [190, 195, 200], b: [[160, 5, 5], [170, 4, 5], [180, 3, 6]], l: 145 },
    dl: { s: [340, 355, 365], b: [[285, 5, 3], [300, 4, 4], [320, 3, 4]], l: 265 },
    ps: [195, 205, 220, 175], pb: [145, 155, 165, 125],
    ohp: [[95, 6, 3], [95, 7, 3], [95, 8, 2], [75, 6, 2]],
    yellow: [[215, 150, 185, 140, 270], [225, 160, 195, 145, 285], [240, 170, 210, 155, 305]],
    red: [190, 135, 245], deload: { m: [175, 125, 225], ps: 165, pb: 115 }, bridge: null,
  },
  2: {
    sq: { s: [275, 285, 295], b: [[235, 5, 4], [245, 4, 5], [260, 3, 5]], l: 210 },
    bn: { s: [195, 200, 205], b: [[165, 5, 5], [175, 4, 5], [185, 3, 6]], l: 150 },
    dl: { s: [350, 365, 375], b: [[295, 5, 3], [310, 4, 4], [330, 3, 4]], l: 270 },
    ps: [205, 215, 230, 185], pb: [150, 160, 170, 130],
    ohp: [[95, 8, 3], [100, 6, 3], [100, 7, 2], [80, 6, 2]],
    yellow: [[225, 155, 195, 145, 280], [235, 165, 205, 150, 295], [245, 175, 220, 160, 315]],
    red: [195, 140, 250], deload: { m: [180, 125, 230], ps: 170, pb: 120 }, bridge: null,
  },
  3: {
    sq: { s: [285, 295, 305], b: [[245, 5, 4], [255, 4, 5], [270, 3, 5]], l: 220 },
    bn: { s: [200, 205, 210], b: [[170, 5, 5], [180, 4, 5], [190, 3, 6]], l: 155 },
    dl: { s: [360, 375, 385], b: [[305, 5, 3], [320, 4, 4], [340, 3, 4]], l: 275 },
    ps: [215, 225, 240, 195], pb: [155, 165, 175, 135],
    ohp: [[100, 7, 3], [100, 8, 3], [105, 6, 2], [80, 6, 2]],
    yellow: [[235, 160, 205, 145, 290], [240, 170, 215, 155, 305], [255, 180, 230, 165, 325]],
    red: [200, 140, 255], deload: { m: [185, 130, 235], ps: 175, pb: 120 }, bridge: { sq: 255, bn: 185, dl: 345 },
  },
  4: {
    sq: { s: [290, 300, 310], b: [[255, 5, 4], [265, 4, 5], [275, 3, 5]], l: 225 },
    bn: { s: [205, 210, 215], b: [[175, 5, 5], [185, 4, 5], [195, 3, 6]], l: 155 },
    dl: { s: [370, 380, 395], b: [[310, 5, 3], [330, 4, 4], [345, 3, 4]], l: 285 },
    ps: [225, 235, 245, 200], pb: [160, 170, 180, 140],
    ohp: [[105, 6, 3], [105, 7, 3], [105, 8, 2], [85, 6, 2]],
    yellow: [[240, 165, 215, 150, 295], [250, 175, 225, 160, 315], [260, 185, 235, 170, 330]],
    red: [205, 145, 260], deload: { m: [190, 130, 240], ps: 180, pb: 120 }, bridge: { sq: 265, bn: 185, dl: 350 },
  },
};

// ── generated mains, waves 5+ ───────────────────────────────────────
const PCT = {
  singles: { // cycles 1–3
    sq: [0.848, 0.878, 0.908], bn: [0.849, 0.871, 0.893], dl: [0.843, 0.879, 0.905],
  },
  singlesC4: { sq: [0.84, 0.87, 0.899], bn: [0.849, 0.871, 0.893], dl: [0.849, 0.874, 0.906] },
  singlesC5: { sq: [0.87, 0.895, 0.915], bn: [0.87, 0.895, 0.915], dl: [0.87, 0.895, 0.915] },
  back: { sq: [0.725, 0.76, 0.80], bn: [0.72, 0.762, 0.806], dl: [0.71, 0.748, 0.795] },
  backC5: {
    sq: [[0.775, 4, 4], [0.805, 3, 5], [0.84, 2, 4]],
    bn: [[0.775, 4, 5], [0.805, 3, 5], [0.84, 2, 5]],
    dl: [[0.765, 4, 3], [0.795, 3, 4], [0.83, 2, 3]],
  },
  scheme: { sq: [[5, 4], [4, 5], [3, 5]], bn: [[5, 5], [4, 5], [3, 6]], dl: [[5, 3], [4, 4], [3, 4]] },
  ps: [0.635, 0.665, 0.71], pb: [0.655, 0.695, 0.74],
  bridge: { sq: 0.76, bn: 0.79, dl: 0.81 },
};
// ── incline bench: a tracked secondary press ramping to a 225 goal ──────
// Starts at 180 (≈0.80× his 225 bench CB, the usual flat:incline ratio) and
// gains in lockstep with the bench gate — one gate decision, two lifts. Reaches
// 225 when the bench CB reaches 270, i.e. wave 10 on a clean chain.
// Did the lifter clear a standard for this exercise during a given wave?
// null = no data (caller falls back to the schedule) · true = advance · false = hold.
function clearedInWave(pkey, wave, minW, minReps, minSets) {
  const ctx = HISTCTX;
  if (!ctx || !ctx.index) return null;
  const hist = ctx.index[pkey];
  if (!hist || !hist.length) return null;
  const from = waveStartUTC(wave, ctx.offsetWeeks || 0), to = from + 28 * MS_DAY;
  const inWave = hist.filter((e) => e.t >= from && e.t < to);
  if (!inWave.length) return null;
  return inWave.filter((e) => e.w >= minW - 0.01 && e.r >= minReps).length >= minSets;
}

// ── TRACKED SECONDARY LIFTS ─────────────────────────────────────────────
// Each has a cycle base, a goal on the card, a weekly ramp, and log-adaptive
// progression. This is what "matters as much as 3/4/5" means structurally:
//   incline → 225 (upper chest) · chin-up → +90 (ARMS) · RDL → 315 (HAMSTRINGS)
const TRACKED = {
  inc: {
    key: "incbb", name: "Incline Bench", start: 180, goal: 225, step: 5, anchor: "bn",
    top:  [[0.78, 5, "7"], [0.82, 4, "7.5"], [0.86, 3, "8"], null],
    back: [[0.70, 8, 3], [0.73, 7, 3], [0.76, 6, 3], [0.62, 6, 3]],
    note: "Ramping to 225. Barbell, 30\u201345\u00b0, touch the upper chest.",
  },
  chin: {
    key: "chin", name: "Weighted Chin-Up", start: 35, goal: 90, step: 5, anchor: "dl", added: true,
    top:  [[0.60, 6, "7"], [0.80, 5, "7.5"], [1.00, 4, "8"], null],
    back: [[0.35, 8, 3], [0.45, 7, 3], [0.55, 6, 3], [0, 8, 2]],
    note: "Ramping to +90. Supinated, dead hang to chin over the bar. THE biceps compound \u2014 nothing else loads elbow flexion this heavy.",
  },
  dip: {
    key: "dip", name: "Weighted Dip", start: 35, goal: 100, step: 5, anchor: "bn", added: true,
    top:  [[0.60, 6, "7"], [0.80, 5, "7.5"], [1.00, 4, "8"], null],
    back: [[0.35, 8, 3], [0.45, 7, 3], [0.55, 6, 3], [0, 8, 2]],
    note: "Ramping to +100. Slight forward lean, sink until the shoulder says stop. THE triceps compound \u2014 the long head loaded at length, which is where it grows.",
  },
  rdl: {
    key: "rdl", name: "RDL", start: 275, goal: 315, step: 5, anchor: "dl",
    top:  [[0.88, 6, "7"], [0.94, 5, "7.5"], [1.00, 4, "8"], null],
    back: [[0.80, 8, 3], [0.83, 7, 3], [0.86, 6, 3], [0.62, 6, 2]],
    note: "Ramping to 315. Hamstring PRIORITY now \u2014 hinge, soft knees, bar drags the thighs. Still stops at 8; it feeds the deadlift, never competes with it.",
  },
};
const INCLINE_START = TRACKED.inc.start, INCLINE_GOAL = TRACKED.inc.goal;
// Arms are the stated calling card. 13" at 182 lb is a genuinely lagging part;
// 15" at 200 lb is +33% cross-sectional area, which is the honest multi-year target.
const ARM_START = 13, ARM_GOAL = 15;

// Log-adaptive base: a past wave advances only if its week-3 top set was cleared.
// Unlogged waves track the anchor lift's gate, so casual use still progresses.
function trackedCB(id, wave, gates) {
  const T = TRACKED[id];
  let cb = T.start;
  for (let w = 1; w < wave; w++) {
    const target = R5(cb * T.top[2][0]);
    const cleared = clearedInWave(T.key + "-top", w, target, T.top[2][1], 1);
    if (cleared === null) {
      const d = cbFor(w + 1, gates)[T.anchor] - cbFor(w, gates)[T.anchor];
      cb += Math.min(d, T.step);
    } else if (cleared) cb += T.step;
  }
  return cb;
}
function trackedFor(id, wave, week, gates) {
  const T = TRACKED[id], cb = trackedCB(id, wave, gates);
  const tp = T.top[week - 1], bk = T.back[week - 1], out = [];
  const label = (v) => (T.added ? "+" + v : v);
  if (tp) out.push({ type: "single", lift: id, name: T.name + " \u2014 top set", w: R5(cb * tp[0]), reps: tp[1], sets: 1,
    rpe: tp[2], moveId: T.key, pkey: T.key + "-top", note: T.note, added: !!T.added, disp: label(R5(cb * tp[0])) });
  out.push({ type: "backoff", lift: id, name: T.name + " \u2014 " + (tp ? "back-offs" : "light"), w: R5(cb * bk[0]),
    reps: bk[1], sets: bk[2], rpe: tp ? "7" + "\u2013" + "8" : "5" + "\u2013" + "6", moveId: T.key,
    pkey: T.key + "-back", light: !tp, added: !!T.added, disp: label(R5(cb * bk[0])) });
  return out;
}
const inclineCB = (wave, gates) => trackedCB("inc", wave, gates);
const inclineFor = (wave, week, gates) => trackedFor("inc", wave, week, gates);

const RPE_CAP = { 1: 7, 2: 7.5, 3: 8 };
const RPE_CAP_C5 = { 1: 7.5, 2: 8, 3: "8–8.5" };

function mainsFor(wave, gates) {
  const cb = cbFor(wave, gates);
  const cyc = cycleOf(wave);
  if (wave <= 4 && !hasNonCleanGate(gates, wave)) return { cb, cyc, notes: NOTES[wave] };
  // generated (also used when gates alter CBs for waves ≤4 re-runs)
  const sPct = cyc === 5 ? PCT.singlesC5 : cyc === 4 ? PCT.singlesC4 : PCT.singles;
  const out = { cb, cyc, notes: null, gen: {} };
  for (const L of LIFTS) {
    const singles = sPct[L].map((p) => R5(cb[L] * p));
    let backs;
    if (cyc === 5) backs = PCT.backC5[L].map(([p, r, s]) => [R5(cb[L] * p), r, s]);
    else backs = PCT.back[L].map((p, i) => [R5(cb[L] * p), PCT.scheme[L][i][0], PCT.scheme[L][i][1]]);
    out.gen[L] = { s: singles, b: backs, l: R5(cb[L] * 0.65) };
  }
  out.gen.ps = [...PCT.ps.map((p) => R5(cb.sq * p)), R5(cb.sq * 0.565)];
  out.gen.pb = [...PCT.pb.map((p) => R5(cb.bn * p)), R5(cb.bn * 0.565)];
  out.gen.ohp = null; // computed in ohpFor
  out.gen.bridge = wave >= 3 ? { sq: R5(cb.sq * PCT.bridge.sq), bn: R5(cb.bn * PCT.bridge.bn), dl: R5(cb.dl * PCT.bridge.dl) } : null;
  out.gen.yellow = [0, 1, 2].map((i) => [
    R5(out.gen.sq.b[i][0] * 0.95), R5(out.gen.bn.b[i][0] * 0.95), R5(out.gen.ps[i] * 0.95),
    R5(out.gen.pb[i] * 0.95), R5(out.gen.dl.b[i][0] * 0.95),
  ]);
  out.gen.red = [R5(cb.sq * 0.6), R5(cb.bn * 0.6), R5(cb.dl * 0.6)];
  out.gen.deload = { m: [R5(cb.sq * 0.55), R5(cb.bn * 0.55), R5(cb.dl * 0.55)], ps: R5(cb.sq * 0.52), pb: R5(cb.bn * 0.51) };
  return out;
}
function hasNonCleanGate(gates, upTo) {
  if (!gates) return false;
  for (let w = 2; w <= upTo; w++) {
    const g = gates[w];
    if (g && LIFTS.some((L) => g[L] && g[L] !== "clean")) return true;
  }
  return false;
}
// unified accessor: mains data for a wave regardless of source
function mainTables(wave, gates) {
  const m = mainsFor(wave, gates);
  if (m.notes) return { cb: m.cb, cyc: m.cyc, t: m.notes, explicit: true };
  return { cb: m.cb, cyc: m.cyc, t: m.gen, explicit: false };
}

function ohpFor(wave, gates) {
  // Double progression, log-adaptive: 3x6 -> add reps to 3x8 clean -> +5 lb -> back to 3x6.
  // Advances a rung when 2+ sets cleared the wave's top rep target at the rung weight;
  // unlogged waves follow the schedule, logged-and-missed holds.
  const st = accStateLogged({ w: 95, steps: [6, 7, 8], inc: 5, db: false, i0: 0, pkey: "ohp" }, wave, HISTCTX);
  const lo = st.steps ? st.steps[st.i] : [6, 7, 8][st.i], hi = [6, 7, 8][Math.min(st.i + 1, 2)];
  return [[st.w, lo, 3], [st.w, hi, 3], [st.w, hi, 2], [R5(st.w * 0.78), 6, 2]];
}

// ── accessory double-progression machine ────────────────────────────
// SEED CALIBRATION (2026-07-28): starting loads were originally invented and ran
// far too light for this lifter (leg press 360 for a 315 squatter). Now anchored to
// his cycle bases — leg press 1.43x squat, RDL 0.60x deadlift, pulldown 0.40x
// deadlift, pressing accessories ~0.30x bench. Neck work stays deliberately light.
// These remain FLOORS: log-driven progression adopts whatever he actually lifts.
// steps: rep waypoints; each wave uses (steps[i], steps[i+1]); when the
// second lands on the last step, next wave adds `inc` and resets i.
const ACC = [
  { id: "legpress",  name: "Leg Press",              day: 1, sets: 3, w3: 2, steps: [10, 12],         w: 450,  inc: 20,  db: false, comp: true,  arch: "legpress",  cap: "Final set: technical failure OK Wks 1–2 only, safeties set" },
  { id: "hamMon",    name: "Seated Leg Curl",        day: 1, sets: 2, w3: 2, steps: [12, 15, 20],     w: 120,  inc: 10,  db: false, comp: false, arch: "legcurl",   cap: "Third weekly hamstring exposure \u2014 tree-trunk work" },
  { id: "calf",      name: "Standing Calf Raise",    day: 1, sets: 4, w3: 3, steps: [10, 12, 15],     w: 220,  inc: 10,  db: false, comp: false, arch: "calf",      cap: "Pause the stretch; no bouncing" },
  { id: "hlr",       name: "Hanging Leg Raise",      day: 1, sets: 3, w3: 3, steps: [10, 12, 15],     w: 0,    inc: 0,   db: false, comp: false, arch: "hlr",       cap: "Once you own the top of the rep range, hold a dumbbell between the feet \u2014 bodyweight alone stops progressing. Progress by stricter form, then add a light DB" },
  { id: "lowhigh",   name: "Low-to-High Cable Fly",  day: 1, sets: 3, w3: 2, steps: [12, 15, 20],     w: 30,   inc: 5,   db: false, comp: false, arch: "rearfly",   cap: "Upper-chest shelf — sweep up and in, squeeze the top" },
  { id: "shrug",     name: "Machine / DB Shrug",     day: 1, sets: 3, w3: 2, steps: [10, 12, 15],     w: 160,  inc: 10,  db: false, comp: false, arch: "shrug",     cap: "Hold the top 1s, no rolling. 3 quality sets + your deadlifts = developed, not overdeveloped" },
  { id: "rowtue",    name: "Chest-Supported DB Row", day: 2, sets: 4, w3: 3, steps: [8, 10, 12],      w: 60,   inc: 5,   db: true,  comp: true,  arch: "row",       cap: "Strict, chest stays on pad" },
  { id: "lattue",    name: "Leaning DB Lateral Raise", day: 2, sets: 3, w3: 3, steps: [12, 15, 20], i0: 1, w: 17.5, inc: 2.5, db: true,  comp: false, arch: "lateral",   cap: "LEAN AWAY from a rack, holding it one-handed. A flat DB raise has ZERO tension at the bottom where the delt is stretched \u2014 leaning shifts the whole resistance curve into the stretch. Final set RPE 9\u201310 OK Wks 1\u20132" },
  { id: "revpec",    name: "Reverse Pec Deck",       day: 2, sets: 3, w3: 2, steps: [15, 20, 25],     w: 90,   inc: 10,  db: false, comp: false, arch: "rearfly",   cap: "Light + strict beats heavy + sloppy" },
  { id: "pullapart", name: "Band Pull-Apart",        day: 2, sets: 2, w3: 2, steps: [20, 25, 30],     w: 0,    inc: 0,   db: false, comp: false, arch: "rearfly",   cap: "PRIMER \u2014 do these BEFORE pressing. 60 seconds, opens the chest, sets the shoulders back" },
  { id: "seatcalf",  name: "Seated Calf Raise",      day: 5, sets: 5, w3: 3, steps: [12, 15, 20],     w: 120,   inc: 10,  db: false, comp: false, arch: "calf",      cap: "Soleus — bent knee. Pause the stretch" },
  { id: "neckcurl",  name: "Neck Curl",              day: 2, sets: 2, w3: 2, steps: [12, 15, 20],     w: 5,    inc: 2.5, db: false, comp: false, arch: "neckflex",  cap: "Lying face-up, plate on forehead with a towel. SLOW. Start 2.5–5 lb – the neck grows on embarrassingly little" },
  { id: "seatcurl3", name: "Seated Leg Curl",        day: 3, sets: 4, w3: 3, steps: [10, 12, 15],     w: 135,   inc: 10,  db: false, comp: false, arch: "legcurl",   cap: "HAMSTRING PRIORITY. Seated beats lying \u2014 hip flexed puts the hamstring at length (Maeo 2021: +14% vs +9%)" },
  { id: "legext",    name: "Leg Extension",          day: 3, sets: 2, w3: 1, steps: [12, 15],         w: 125,   inc: 10,  db: false, comp: false, arch: "legext",    cap: "Final set RPE 9–10 OK Wks 1–2" },
  { id: "inccurl",   name: "Incline DB Curl",        day: 3, sets: 3, w3: 3, steps: [10, 12, 15],     w: 32.5,   inc: 5,   db: true,  comp: false, arch: "curl",      cap: "Priority curl — always first, full stretch" },
  { id: "ezcurl",    name: "EZ-Bar Curl",            day: 3, sets: 3, w3: 3, steps: [8, 10, 12],      w: 70,   inc: 5,   db: false, comp: false, arch: "curl",      cap: "No swinging; elbows pinned" },
  { id: "hammer",    name: "Hammer Curl",            day: 3, sets: 3, w3: 2, steps: [10, 12, 15],     w: 35,   inc: 5,   db: true,  comp: false, arch: "curl",      cap: "BRACHIALIS \u2014 sits under the biceps and pushes it up. Adds width from the front. Neutral grip, slow negative" },
  { id: "latwed",    name: "Cable Lateral Raise",     day: 3, sets: 4, w3: 3, steps: [15, 20, 25],     w: 15, inc: 2.5, db: false, comp: false, arch: "lateral",   cap: "Set the cable at HAND HEIGHT, not the floor. Tension peaks where the cable and your arm make 90\u00b0 \u2014 a high cable puts that in the stretched part of the rep instead of the top" },
  { id: "woodchop",  name: "Cable Woodchop",         day: 3, sets: 2, w3: 2, steps: [10, 12, 15],     w: 40,   inc: 5,   db: false, comp: false, arch: "woodchop",  cap: "High-to-low, per side. Rotate through the trunk, arms stay long. Light – obliques brace heavy 5 days a week already" },
  { id: "latthu",    name: "Lateral Raise (Thu)",    day: 4, sets: 4, w3: 3, steps: [12, 15, 18, 20], w: 17.5,   inc: 2.5, db: true,  comp: false, arch: "lateral",   cap: "4 sets — the big side-delt day" },
  { id: "rdf",       name: "Rear-Delt Fly",          day: 4, sets: 3, w3: 3, steps: [15, 20, 25],     w: 17.5, inc: 2.5, db: true,  comp: false, arch: "rearfly",   cap: "Think 'throw, don't lift'" },
  { id: "pushdown",  name: "Rope Pushdown",          day: 4, sets: 3, w3: 3, steps: [10, 12, 15],     w: 90,   inc: 5,   db: false, comp: false, arch: "pushdown",  cap: "May approach RPE 9 if elbows feel normal" },
  { id: "ohthu",     name: "Overhead Cable Extension", day: 4, sets: 3, w3: 2, steps: [10, 12, 15],     w: 70,   inc: 5,   db: false, comp: false, arch: "ohtri",     cap: "LONG HEAD \u2014 two-thirds of your arm. Overhead beats a pushdown roughly 2:1 for this head (Maeo 2023). Elbows in, full stretch behind the head" },
  { id: "crossbody", name: "Cross-Body Extension",   day: 4, sets: 3, w3: 2, steps: [12, 15, 18, 20], w: 30,   inc: 5,   db: false, comp: false, arch: "ohtri",     cap: "Per arm; lock the upper arm still" },
  { id: "facepull",  name: "Face Pull",              day: 4, sets: 3, w3: 2, steps: [15, 20, 25],     w: 55,   inc: 5,   db: false, comp: false, arch: "rearfly",   cap: "Rear delts + posture. Pull to the forehead, elbows high" },
  { id: "proneY",    name: "Prone Y-Raise",          day: 4, sets: 2, w3: 2, steps: [12, 15, 20],     w: 5,    inc: 2.5, db: true,  comp: false, arch: "proneY",    cap: "LOWER traps \u2014 the muscle that actually holds your shoulders back. Thumbs up, arms at 45\u00b0, tiny weight" },
  { id: "crunch",    name: "Cable Crunch",           day: 1, sets: 3, w3: 3, steps: [10, 12, 15],     w: 100,   inc: 10,  db: false, comp: false, arch: "crunch",    cap: "Flex the spine, don't pull with arms" },
  { id: "wrist",     name: "Wrist Extension",        day: 4, sets: 2, w3: 2, steps: [15, 20, 25],     w: 12.5,   inc: 2.5, db: true,  comp: false, arch: "wrist",     cap: "Elbow-health insurance — never skip" },
  { id: "neckext",   name: "Neck Extension",         day: 4, sets: 2, w3: 2, steps: [12, 15, 20],     w: 10,   inc: 2.5, db: false, comp: false, arch: "neckext",   cap: "Prone, plate on the back of the head. Slow, no jerking, NEVER through pain" },
  { id: "seatcurl",  name: "Lying Leg Curl",         day: 5, sets: 3, w3: 2, steps: [10, 12, 15],     w: 110,   inc: 10,  db: false, comp: false, arch: "legcurl",   cap: "Final set RPE 9–10 OK Wks 1–2" },
  { id: "rowfri",    name: "Chest-Supported DB Row", day: 5, sets: 3, w3: 3, steps: [8, 10, 12],      w: 60,   inc: 5,   db: true,  comp: true,  arch: "row",       cap: "No unsupported barbell rows" },
  { id: "cablecurl", name: "Reverse Cable Curl",     day: 5, sets: 2, w3: 2, steps: [12, 15],         w: 45,   inc: 5,   db: false, comp: false, arch: "curl",      cap: "Pronated \u2014 brachialis + brachioradialis. The chin-up already hammered the biceps supinated; this is the other half of the arm" },
  { id: "wristcurl", name: "Cable / DB Wrist Curl",  day: 5, sets: 2, w3: 2, steps: [15, 20, 25],     w: 30,   inc: 5,   db: false, comp: false, arch: "wrist",     cap: "Flexors – the meat of the forearm. Grip is pre-fried from deadlifts: perfect placement" },
];

// state of an accessory at a given wave (1-indexed): {w, i} where reps = (steps[i], steps[i+1])
function accState(a, wave) {
  let w = a.w, i = a.i0 || 0;
  const last = a.steps.length - 1;
  for (let k = 1; k < wave; k++) {
    if (i + 1 >= last) { // hit the top this wave → bump next wave
      if (a.inc > 0) w = a.db ? R25(w + a.inc) : w + a.inc;
      i = 0;
    } else i++;
  }
  return { w, i };
}
// ── log-driven progression ──────────────────────────────────────────
// Every logged set is stamped with a stable exercise key (`k`). At each wave
// boundary the rung advances ONLY if some session that wave hit the top of the
// rep range on 2+ sets at >= the rung weight. Logged heavier + cleared reps →
// the user's weight is adopted (loads are floors). Unlogged waves fall back to
// the schedule, so casual use degrades gracefully.
const pkeyOf = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let HISTCTX = null; // set per sessionFor call: { index: {pkey: [{t,w,r}]}, offsetWeeks }

function accStateLogged(def, wave, ctx) {
  if (!ctx || !ctx.index) return accState(def, wave);
  const hist = ctx.index[def.pkey];
  if (!hist || !hist.length) { const st = accState(def, wave); return { ...st, prog: null }; }
  let w = def.w, i = def.i0 || 0;
  const last = def.steps.length - 1;
  for (let k = 1; k < wave; k++) {
    const atTop = i + 1 >= last;
    const topReq = def.steps[Math.min(i + 1, last)];
    const from = waveStartUTC(k, ctx.offsetWeeks || 0), to = from + 28 * MS_DAY;
    const inWave = hist.filter((e) => e.t >= from && e.t < to);
    // group into sessions by calendar day
    const byDay = new Map();
    for (const e of inWave) { const d = Math.floor(e.t / MS_DAY); if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(e); }
    let qualified = null;
    for (const sess of byDay.values()) {
      if (sess.length < 2) continue; // one set is a fluke, not a rung clear
      // 2+ sets clearing the top is the documented rule. Requiring EVERY set to
      // clear made progression nearly impossible on 4-5 set exercises, and
      // directly contradicted the "final set to RPE 9-10" cue — which drops reps
      // on the last set by design. Logging honestly must never cost a rung.
      const clears = sess.filter((e) => e.r >= topReq && e.w >= w - 0.01);
      if (clears.length >= 2) { qualified = clears; break; }
    }
    if (qualified) {
      const minW = Math.min(...qualified.map((e) => e.w));
      const base = Math.max(w, def.db ? R25(minW) : R5(minW)); // adopt heavier logged weight
      if (atTop) { w = def.inc > 0 ? (def.db ? R25(base + def.inc) : base + def.inc) : base; i = 0; }
      else { w = base; i = i + 1; }
    } else if (!byDay.size) {
      // nothing logged this wave → scheduled fallback
      if (atTop) { if (def.inc > 0) w = def.db ? R25(w + def.inc) : w + def.inc; i = 0; }
      else i++;
    }
    // logged but failed → hold the rung
  }
  const sched = accState(def, wave);
  const prog = (w === sched.w && i === sched.i) ? "on"
    : (w < sched.w || (w === sched.w && i < sched.i)) ? "held" : "ahead";
  return { w, i, prog };
}

// prescription for accessory a at wave/week (week 1–4), with cycle trims
function accFor(a, wave, week) {
  const st = accStateLogged({ w: a.w, steps: a.steps, inc: a.inc, db: a.db, i0: a.i0, pkey: a.id }, wave, HISTCTX);
  const { w, i } = st;
  const cyc = cycleOf(wave);
  const last = a.steps.length - 1;
  const repLow = a.steps[i], repHigh = a.steps[Math.min(i + 1, last)];
  let sets = week === 3 ? a.w3 : a.sets;
  if (cyc === 5 && a.comp) sets = Math.max(1, sets - 1);
  if (cyc === 6) {
    if (week === 1) sets = Math.max(1, Math.round(sets * 0.7));
    else if (week === 2) sets = Math.max(1, Math.round(sets * 0.5));
    else return null; // wk 3–4 of a peak: no accessory work
  }
  if (week === 4) {
    const lw = a.w === 0 ? 0 : a.db ? R25(w * 0.7) : R5(w * 0.7);
    return { w: lw, reps: repLow, sets: 2, rpe: "6–7", light: true };
  }
  const reps = week === 2 ? repHigh : repLow;
  const topSet = repHigh === a.steps[last] && week === 2;
  // Proximity to failure is the highest-leverage variable left in this program.
  // v7: "safe machine/cable isolations — final set may reach RPE 9-10 in Wks 1-2."
  // Compounds stay capped at 8; week 3 trims; deload and peak never push.
  const lastHard = !a.comp && week <= 2 && cyc <= 4;
  return { w, reps, sets, rpe: week === 3 ? "8" : "8–9", top: topSet, prog: st.prog, lastHard };
}

// ── weekend weak-point specialization (Sat = frame overload, Sun = optional detail) ──
const FRAME_OPTS = ["shoulders", "upperchest", "latwidth", "upperback", "traps", "arms"];
const FRAME_LABEL = { shoulders: "Shoulder width", upperchest: "Upper chest", latwidth: "Lat width", upperback: "Upper-back / rear delt", traps: "Traps / upper yoke", arms: "Arms (bi + tri)", none: "None" };
const DETAIL_OPTS = ["triceps", "biceps", "brachialis"];
const DETAIL_LABEL = { triceps: "Triceps", biceps: "Biceps", brachialis: "Brachialis / forearms" };
// secondaryPress: "incline" = hypertrophy default (v7 "Default for size")
//                 "closegrip" = v7 "Lockout/triceps weakness" option. Real arm STRENGTH
//                 transfer lives here, not in heavy curls.
const DEFAULT_SPEC = { framePrimary: "arms", frameSecondary: "latwidth", detail: "triceps", sundayOn: true, secondaryPress: "incline" };

// ex helper — spec exercises run the SAME double-progression machine as weekday
// accessories: `steps` are rep waypoints, weight climbs by `inc` once the top of the
// range is cleared. `wv` (wave) is threaded in, so Wave 19 is not Wave 1.
function sx(name, seed, steps, sets, rpe, arch, moveId, db, cap, inc, wv) {
  const st = accStateLogged({ w: seed, steps, inc: inc == null ? 5 : inc, db: !!db, i0: 0, pkey: pkeyOf(name) }, wv || 1, HISTCTX);
  const last = steps.length - 1;
  const lo = steps[st.i], hi = steps[Math.min(st.i + 1, last)];
  return {
    type: "accessory", name, w: st.w, reps: lo === hi ? String(lo) : lo + "\u2013" + hi,
    sets, rpe, arch, moveId, db: !!db, cap: cap || "", spec: true, repN: lo,
    top: hi === steps[last] && steps.length > 1, pkey: pkeyOf(name), prog: st.prog,
  };
}

// primary frame module: 2 exercises × 3 sets (starting loads are suggestions — drive by double progression)
const FRAME_MODULE = {
  shoulders: (v) => [
    sx("Machine / DB Lateral Raise", 17.5, [10, 12, 15], 3, "8–9", "lateral", "lattue", true, "Lead with the elbow; traps quiet", 2.5, v),
    sx("Cable Lateral Raise", 25, [15, 20, 25], 3, "8–9", "lateral", "latwed", false, "Constant tension; final set 9–10 OK Wks 1–2", 5, v),
  ],
  upperchest: (v) => [
    sx("Low-Incline Press (Smith/Machine/DB)", 65, [6, 8, 10], 3, "7.5–8.5", "incpress", "incline", true, "Low incline so the upper chest works, not the front delt", 5, v),
    sx("Low-to-High Cable Fly", 30, [12, 15, 20], 3, "8–9", "rearfly", "revpec", false, "Sweep up and in; squeeze the top", 5, v),
  ],
  latwidth: (v) => [
    sx("Unilateral Cable / Machine Pulldown", 95, [8, 10, 12], 3, "8", "pulldown", "pulldown", false, "One side at a time; straps welcome", 10, v),
    sx("Machine Pullover / Straight-Arm Pulldown", 90, [12, 15, 20], 3, "8–9", "pulldown", "pulldown", false, "Feel the lat stretch; arms stay long", 10, v),
  ],
  upperback: (v) => [
    sx("Chest-Supported High Row", 110, [8, 10, 12], 3, "8", "row", "rowtue", false, "High-elbow path only if shoulder-friendly", 10, v),
    sx("Reverse-Pec-Deck", 90, [15, 20, 25], 3, "8–9", "rearfly", "revpec", false, "Arms long; throw, don't lift", 10, v),
  ],
  arms: (v) => [
    sx("Incline DB Curl", 35, [10, 12, 15], 3, "8–9", "curl", "inccurl", true, "Arms hang behind you \u2014 full stretch. The priority curl.", 5, v),
    sx("Cable Preacher Curl", 50, [10, 12, 15], 3, "8–9", "curl", "inccurl", false, "Short end of the curve \u2014 the incline curl already owns the stretch. Elbows planted, no leaning back, no swinging out of the bottom", 5, v),
    sx("Overhead Cable Extension", 70, [10, 12, 15], 3, "8–9", "ohtri", "ohrope", false, "Long head \u2014 the biggest triceps head, and only overhead work hits it", 5, v),
  ],
  traps: (v) => [
    sx("Machine / Chest-Supported Shrug", 160, [8, 10, 15], 3, "8", "shrug", "shrug", false, "Brief hold at the top; no rolling", 10, v),
    sx("Chest-Supported Rear-Delt / Upper-Back Row", 95, [10, 12, 15], 3, "8", "row", "rowtue", false, "Stable, supported — deadlifts already load traps", 10, v),
  ],
};
const SECONDARY_SLOT = {
  shoulders: (v) => sx("Cable Lateral Raise", 20, [15, 20, 25], 2, "8–9", "lateral", "latwed", false, "", 5, v),
  upperchest: (v) => sx("Low-to-High Cable Fly", 25, [12, 15, 20], 2, "8–9", "rearfly", "revpec", false, "", 5, v),
  latwidth: (v) => sx("Unilateral Cable Pulldown", 95, [10, 12, 15], 3, "8", "pulldown", "pulldown", false, "Keeps the taper visible while arms take priority", 10, v),
  upperback: (v) => sx("Reverse-Pec-Deck", 70, [15, 20, 25], 2, "8–9", "rearfly", "revpec", false, "", 10, v),
  arms: (v) => sx("Cable Preacher Curl", 60, [10, 12, 15], 2, "8–9", "curl", "inccurl", false, "", 5, v),
  traps: (v) => sx("Machine Shrug", 160, [10, 12, 15], 2, "8", "shrug", "shrug", false, "", 10, v),
  none: () => null,
};
// balance slot: whichever delt area the primary frame is NOT hitting
function balanceSlot(framePrimary, v, reduced) {
  if (framePrimary === "upperback" || framePrimary === "traps" || framePrimary === "arms")
    return [sx("Cross-Body Cable Y-Raise", 20, [15, 20, 25], reduced ? 3 : 5, "8\u20139", "lateral", "latwed", false, "THE side-delt builder. Start with the arm across your body \u2014 that cross-body position is the deepest stretch the lateral delt can get. Light, slow, no swinging", 5, v),
            sx("Reverse-Pec-Deck / Cable Rear-Delt Fly", 90, [15, 20, 25], reduced ? 2 : 3, "8\u20139", "rearfly", "revpec", false, "Rear delt \u2014 this is what rounds the shoulder from behind and keeps the cap from looking flat in profile", 10, v)];
  return reduced ? [] : [sx("Reverse-Pec-Deck / Cable Rear-Delt Fly", 90, [15, 20, 25], 2, "8\u20139", "rearfly", "revpec", false, "Balance: rear delt", 10, v)];
}

// Sunday detail templates (optional day)
const DETAIL_TEMPLATE = {
  recommended: (v) => [
    sx("Cable Preacher Curl", 40, [8, 10, 12], 3, "8–9", "curl", "inccurl", false, "Full stretch at the bottom", 5, v),
    sx("Bayesian Cable Curl", 35, [12, 15, 20], 3, "8–9", "curl", "cablecurl", false, "Arm behind the body; constant tension", 5, v),
    sx("Hammer Curl", 35, [10, 12, 15], 2, "8", "curl", "hammer", true, "Neutral grip; slow negative", 5, v),
    sx("Rope Pushdown", 70, [12, 15, 20], 2, "8", "pushdown", "pushdown", false, "Elbows pinned; spread at the bottom", 5, v),
    sx("Reverse Cable Curl", 40, [15, 20, 25], 2, "8", "curl", "cablecurl", false, "Brachialis + forearm", 5, v),
    sx("Cable Lateral / Wrist Curl", 20, [15, 20, 25], 2, "8–9", "lateral", "latwed", false, "Silhouette detail", 2.5, v),
  ],
  biceps: (v) => [
    sx("Cable / Machine Preacher Curl", 60, [8, 10, 12], 3, "8–9", "curl", "inccurl", false, "Final set 9–10 OK Wk2 if elbows fresh", 5, v),
    sx("Bayesian Cable Curl", 25, [12, 15, 20], 3, "8–9", "curl", "cablecurl", false, "Peak stretch; constant tension", 5, v),
    sx("Hammer Curl", 25, [10, 12, 15], 2, "8", "curl", "hammer", true, "Brachialis", 5, v),
    sx("Rope Pushdown", 50, [12, 15, 20], 2, "8", "pushdown", "pushdown", false, "Antagonist", 5, v),
    sx("Frame-Priority Isolation", 25, [15, 20, 25], 2, "8–9", "lateral", "latwed", false, "2 sets for your secondary frame area", 5, v),
  ],
  triceps: (v) => [
    sx("Cable Preacher Curl", 40, [10, 12, 15], 3, "8–9", "curl", "inccurl", false, "ANCHOR — first, fresh", 5, v),
    sx("Hammer Curl", 25, [10, 12, 15], 3, "8", "curl", "hammer", true, "Brachialis", 5, v),
    sx("Single-Arm Cross-Body Extension", 30, [12, 15, 20], 2, "7–8", "ohtri", "crossbody", false, "Light on purpose — the hard triceps work was Saturday", 5, v),
    sx("Cable Lateral Raise", 20, [15, 20, 25], 2, "8–9", "lateral", "latwed", false, "Delt detail", 5, v),
    sx("Reverse Cable Curl", 30, [15, 20, 25], 2, "8", "curl", "cablecurl", false, "Forearm", 5, v),
  ],
  // used when arms is the SATURDAY primary: Saturday already carried the heavy
  // triceps (overhead + pushdown), so Sunday flips biceps-led. Anchor first,
  // antagonist supersets, one hard top set allowed in Week 2.
  armsPrimary: (v) => [
    sx("Cable / Machine Preacher Curl", 40, [8, 10, 12], 3, "8–9", "curl", "inccurl", false, "ANCHOR — first, fresh. Week 2: final set may go RPE 9–10", 5, v),
    sx("Bayesian Cable Curl", 25, [12, 15, 20], 3, "8–9", "curl", "cablecurl", false, "Superset with cross-body — arm behind the body, full stretch", 5, v),
    sx("Single-Arm Cross-Body Extension", 20, [12, 15, 20], 2, "8", "ohtri", "crossbody", false, "Superset partner — the one triceps pattern Saturday didn't use", 5, v),
    sx("Overhead Cable Extension", 60, [12, 15, 20], 3, "8–9", "ohtri", "ohrope", false, "Long head at length \u2014 keeps the optional day from being all curls. Elbows in, full stretch behind the head", 5, v),
    sx("Hammer Curl", 25, [10, 12, 15], 2, "8–9", "curl", "hammer", true, "Superset with laterals — brachialis", 5, v),
    sx("Cable Lateral Raise", 20, [15, 20, 25], 3, "8–9", "lateral", "latwed", false, "Finisher — chase the burn", 5, v),
  ],
  brachialis: (v) => [
    sx("Rope Hammer Curl", 65, [8, 10, 12], 3, "8–9", "curl", "hammer", false, "Brachialis emphasis", 5, v),
    sx("Reverse Cable / EZ-Bar Curl", 50, [12, 15, 20], 3, "8–9", "curl", "cablecurl", false, "Forearm extensors", 5, v),
    sx("Cable Wrist Curl", 30, [15, 20, 25], 2, "8", "wrist", "wrist", false, "Flexors", 5, v),
    sx("Cable Wrist Extension", 20, [15, 20, 25], 2, "8", "wrist", "wrist", false, "Extensors — elbow insurance", 5, v),
    sx("Rope Pushdown", 50, [12, 15, 20], 2, "8", "pushdown", "pushdown", false, "Antagonist", 5, v),
  ],
};

// is Sunday actually planned/running this wave-week? (Wks 1–2 of Cycles 1–4, and enabled)
function sundayPlanned(wave, week, spec) {
  return !!(spec && spec.sundayOn) && cycleOf(wave) <= 4 && week <= 2;
}
// do the weekday volume transfers fire this week? (only when Sunday runs)
function transfersActive(wave, week, spec) { return sundayPlanned(wave, week, spec); }

// Saturday: paused bench is on Thursday, so Saturday = pure frame-isolation overload
function saturdaySession(wave, week, spec) {
  spec = spec || DEFAULT_SPEC;
  const cyc = cycleOf(wave);
  const blocks = [];
  if (cyc === 6) { // peak: no specialization
    blocks.push({ type: "test", name: "Peak week — no specialization", note: "Brief maintenance only if anything. Frame work resumes next macro — the peak exposes strength, it doesn't build the physique." });
    return blocks;
  }
  if (week === 4) { // light week / deload: maintenance only
    blocks.push(sx("Machine / Cable Lateral Raise", 12.5, [12, 15], 2, "6–7", "lateral", "latwed", false, "Light maintenance — deliberately flat", 0, 1));
    blocks.push(sx("Reverse-Pec-Deck", 50, [15], 2, "6–7", "rearfly", "revpec", false, "Light maintenance", 0, 1));
    blocks.push(sx("Cable Triceps", 40, [12, 15], 2, "6–7", "pushdown", "pushdown", false, "Light maintenance", 0, 1));
    blocks.push(sx("Ab Wheel / Cable Crunch", 100, [10, 15], 2, "6–7", "crunch", "crunch", false, "", 0, 1));
    return blocks;
  }
  const reduced = week === 3 || cyc === 5; // Wk3 and Cycle 5: fewer sets
  const frame = FRAME_MODULE[spec.framePrimary](wave);
  frame.forEach((ex) => blocks.push({ ...ex, sets: reduced ? 2 : ex.sets, primary: true }));
  const triSpec = spec.detail === "triceps";
  if (!reduced) {
    // the "omit secondary on triceps weeks" rule assumes a TORSO primary; when arms IS
    // the primary, dropping it would leave the day with zero back work.
    if (!triSpec || spec.framePrimary === "arms") {
      const sec = SECONDARY_SLOT[spec.frameSecondary || "none"](wave);
      if (sec) blocks.push(sec);
    }
  }
  if (triSpec) {
    // when arms IS the priority the module already has overhead work — don't double it
    if (spec.framePrimary !== "arms") blocks.push(sx("Overhead Cable Extension", 50, [10, 12, 15], reduced ? 2 : 3, "8–9", "ohtri", "ohrope", false, "Long-head bias — arms overhead", 5, wave));
    if (!reduced) blocks.push(sx("Rope / Single-Arm Pushdown", 90, [12, 15, 20], 3, "8–9", "pushdown", "pushdown", false, "", 5, wave));
  } else {
    if (spec.framePrimary === "arms") blocks.push(sx("Rope Pushdown", 50, [12, 15, 20], reduced ? 2 : 3, "8–9", "pushdown", "pushdown", false, "Lateral + medial head \u2014 overhead work is already in the module", 5, wave));
    else blocks.push(sx("Overhead Cable Extension", 50, [10, 12, 15], reduced ? 2 : 3, "8–9", "ohtri", "ohrope", false, "Triceps slot", 5, wave));
  }
  for (const b of balanceSlot(spec.framePrimary, wave, reduced)) blocks.push(b);
  blocks.push(sx("Ab Wheel / Cable Crunch", 70, [8, 10, 12, 15], 2, "8–9", "crunch", "crunch", false, "", 10, wave));
  return blocks;
}

// Sunday: optional detail — only Wks 1–2 of Cycles 1–4 and enabled
function sundaySession(wave, week, spec) {
  spec = spec || DEFAULT_SPEC;
  if (!sundayPlanned(wave, week, spec)) return null;
  const tmpl = spec.framePrimary === "arms" ? DETAIL_TEMPLATE.armsPrimary(wave)
    : isDefaultSpec(spec) ? DETAIL_TEMPLATE.recommended(wave)
    : (DETAIL_TEMPLATE[spec.detail] || DETAIL_TEMPLATE.recommended)(wave);
  return tmpl;
}
function isDefaultSpec(spec) {
  return spec && spec.framePrimary === "shoulders" && spec.frameSecondary === "latwidth" && spec.detail === "triceps";
}

// ── warm-ups ────────────────────────────────────────────────────────
function warmups(lift, wave, gates) {
  const { t } = mainTables(wave, gates);
  const br = t.bridge ? t.bridge[lift] : null;
  const base = {
    sq: [["Bar", 10], [95, 5], [135, 5], [185, 3], [225, "1 · indicator — film"]],
    bn: [["Bar", 15], [95, 8], [135, 5], [155, 3], [165, "1 · indicator — film"]],
    dl: [[135, 5], [225, 3], [275, 2], [315, "1 · indicator — film"]],
  }[lift].slice();
  if (br) base.push([br, "1 · bridge"]);
  return base;
}
const WARM_PS = [["Bar", 10], [95, 5], [135, 5], [175, 3]];
const WARM_PB = [["Bar", 15], [95, 8], [115, 5], [135, 3]];

// ── session builder ─────────────────────────────────────────────────
// returns ordered blocks for wave/week/day (1=Mon…5=Fri)
function sessionFor(wave, week, day, gates, spec, histCtx) {
  HISTCTX = histCtx || null;
  try { return sessionForInner(wave, week, day, gates, spec); }
  finally { HISTCTX = null; }
}
function sessionForInner(wave, week, day, gates, spec) {
  spec = spec || DEFAULT_SPEC;
  const cycEarly = cycleOf(wave);
  // ── Saturday (day 6): frame-specialization overload ──
  if (day === 6) {
    const label = FRAME_LABEL[spec.framePrimary] || "Frame";
    const head = { type: "spechead", name: "Frame Specialization — " + label + " priority", note: cycEarly === 6 ? "Peak macro — spec paused." : week === 4 ? "Light week — maintenance only." : (week === 3 || cycEarly === 5) ? "Reduced sets this week." : "Overload day. Hit your weak point fresh — quality reps, not a set count.", moveId: null };
    return [head, ...saturdaySession(wave, week, spec)];
  }
  // ── Sunday (day 7): optional detail ──
  if (day === 7) {
    const s = sundaySession(wave, week, spec);
    if (!s) return [{ type: "spechead", name: "Optional detail day — off", note: cycEarly > 4 ? "No weekend specialization in this cycle. Rest or an easy walk + conditioning." : week > 2 ? "Sunday detail runs only Weeks 1–2 of a cycle. Rest today." : (spec && spec.sundayOn) ? "Rest today." : "Sunday is toggled off in Specialize. Rest or an easy walk.", moveId: null }];
    const label = DETAIL_LABEL[spec.detail] || "Detail";
    const head = { type: "spechead", name: "Optional Detail — " + (spec.framePrimary === "arms" ? "Biceps-led (Sat carried the triceps)" : isDefaultSpec(spec) ? "Arms & silhouette" : label), note: "Green only: 7h+ sleep, normal Fri deadlift + Sat, no elbow/shoulder pain, no flat session. Anchor first, then supersets — 35–45 min, 60–90s rest. Printed loads are FLOORS: if a set is easy, jump the weight and log what you did.", moveId: null };
    return [head, ...s];
  }
  const { cb, cyc, t } = mainTables(wave, gates);
  const blocks = [];
  const wk = week - 1; // 0-index for arrays of 3
  const dayLift = { 1: "sq", 2: "bn", 5: "dl" }[day];
  const push = (b) => blocks.push(b);
  const xfer = transfersActive(wave, week, spec); // volume transfers fund Sunday

  if (cyc === 6) return peakSession(wave, week, day, cb, gates);

  if (dayLift) {
    push({ type: "warmup", name: LIFT_NAME[dayLift] + " warm-up", rows: warmups(dayLift, wave, gates) });
    if (day === 2 && cyc !== 6) {   // primer: 60 seconds, before the bar touches your chest
      const pa = ACC.find((x) => x.id === "pullapart"), p = accFor(pa, wave, week);
      if (p) push({ type: "accessory", name: pa.name, w: p.w, reps: p.reps, sets: p.sets, rpe: "7", db: false, moveId: pa.id, cap: pa.cap, pkey: pa.id, prog: p.prog });
    }
    if (week < 4) {
      const cap = cyc === 5 ? RPE_CAP_C5[week] : RPE_CAP[week];
      push({ type: "single", lift: dayLift, name: LIFT_NAME[dayLift] + " — top single", w: t[dayLift].s[wk], reps: 1, sets: 1, rpe: cap, moveId: dayLift, pkey: dayLift + "-single" });
      const [bw, br_, bs] = t[dayLift].b[wk];
      push({ type: "backoff", lift: dayLift, name: LIFT_NAME[dayLift] + " — back-offs", w: bw, reps: br_, sets: bs, rpe: week === 3 ? "7.5–8" : week === 2 ? "7–7.5" : "6.5–7", moveId: dayLift, pkey: dayLift + "-back" });
    } else {
      push({ type: "backoff", lift: dayLift, name: LIFT_NAME[dayLift] + " — light triple", w: t[dayLift].l, reps: 3, sets: 3, rpe: "5–6", light: true, moveId: dayLift, pkey: dayLift + "-light" });
    }
  }
  if (day === 3) {
    push({ type: "warmup", name: "Paused squat warm-up", rows: WARM_PS });
    const scheme = week === 4 ? [5, 2] : [[5, 4], [4, 4], [3, 4]][wk];
    push({ type: "paused", lift: "sq", name: "Paused Squat (2-sec pause)", w: t.ps[wk] ?? t.ps[3], reps: scheme[0], sets: scheme[1], rpe: week === 4 ? "5–6" : ["6", "6.5", "7"][wk], moveId: "ps", pkey: "ps" });
  }
  if (day === 4) {
    push({ type: "warmup", name: "Paused bench warm-up", rows: WARM_PB });
    const scheme = week === 4 ? [5, 3] : [[6, 4], [5, 5], [4, 5]][wk];
    push({ type: "paused", lift: "bn", name: "Paused Bench (1–2 sec pause)", w: t.pb[wk] ?? t.pb[3], reps: scheme[0], sets: scheme[1], rpe: week === 4 ? "5–6" : ["6.5–7", "7", "7–7.5"][wk], moveId: "pb", pkey: "pb" });
    const o = ohpFor(wave, gates)[week - 1];
    push({ type: "ohp", name: "Overhead Press", w: o[0], reps: o[1], sets: o[2], rpe: week === 4 ? "5–6" : "7–8", note: "Add reps to 3×8 clean → +5 lb → back to 3×6", moveId: "ohp", pkey: "ohp" });
  }
  // Thursday sheds its delt/triceps isolation → migrated into Saturday's specialization
  const THU_DROP = new Set(["latthu", "rdf"]); // delt work migrates to Sat; triceps STAYS on Thu
  if (day === 2 && cyc !== 6) for (const b of trackedFor("inc", wave, week, gates)) push(b);
  if (day === 4 && cyc !== 6) for (const b of trackedFor("dip", wave, week, gates)) push(b);
  if (day === 5 && cyc !== 6) {                       // hamstrings + arms, tracked and ramping
    for (const b of trackedFor("rdl", wave, week, gates)) push(b);
    for (const b of trackedFor("chin", wave, week, gates)) push(b);
  }
  for (const a of ACC.filter((x) => x.day === day)) {
    if (day === 4 && THU_DROP.has(a.id)) continue;
    if (a.id === "pullapart") continue;   // already pushed as the pre-press primer
    if (a.id === "incline" && spec.secondaryPress === "closegrip") {
      const cg = mainTables(wave, gates).cb.bn;
      push({ type: "accessory", name: "Close-Grip Bench", w: R5(cg * 0.62), reps: week === 2 ? 8 : 6, sets: week === 3 ? 2 : 3,
        rpe: "7\u20138", db: false, moveId: "bn", spec: false, repN: 6,
        cap: "RPE 8 HARD CAP \u2014 lockout + triceps strength. Never a second bench day." });
      continue;
    }
    if (xfer && a.id === "crossbody") continue;         // transfer: Thu cross-body → Sunday
    const p = accFor(a, wave, week);
    if (!p) continue;
    // frame bias: lat-width / upper-back priority trims the Friday row to 2 sets
    let sets = p.sets;
    if (day === 5 && a.id === "rowfri" && (spec.framePrimary === "latwidth" || spec.framePrimary === "upperback") && week < 4) sets = Math.min(sets, 2);
    push({ type: "accessory", name: a.name, w: p.w, reps: p.reps, sets, rpe: p.rpe, db: a.db, top: p.top, moveId: a.id, cap: a.cap, pkey: a.id, prog: p.prog, lastHard: p.lastHard });
  }
  if (day === 4 && week < 4 && !sundayPlanned(wave, week, spec) && cyc <= 4) {
    push(sx("Cable Preacher Curl", 40, [8, 10, 12], 3, "8" + "\u2013" + "9", "curl", "inccurl", false,
      "Backfill \u2014 covers the biceps volume Sunday would have supplied", 5, wave));
  }
  if (day === 4 && week < 4 && xfer) push({ type: "note", name: "Delt & triceps isolation → Saturday", note: "Your side-delt, rear-delt and pushdown work lives in Saturday's frame day now — keeps weekly volume under cap." });
  if (day === 3 && cyc !== 6) {
    const walk = week === 4 ? "15 min · 2.8 mph · 4%" : ["20 min · 3 mph · 6%", "20 min · 3 mph · 7%", "15 min · 3 mph · 5%"][wk];
    push({ type: "conditioning", name: "Incline Walk", note: walk });
  }
  // 5-min mobility cooldown — flexibility lives inside sessions or it doesn't live at all.
  // Distinct type: Yellow mode drops conditioning but KEEPS the cooldown.
  const COOL = { 1: "POSTURE: couch stretch 2×30s/side (hip flexors = the anterior tilt fix) · ankle rocks 15/side · dead hang 30s", 2: "POSTURE: doorway pec stretch 2×30s (tight pecs pull you forward) · cross-body delt 30s/side · wall slides ×10", 3: "90/90 hips 60s/side · standing hamstring 45s/side", 4: "POSTURE: thoracic extension over bench 45s · lat hang 45s · chin tucks ×10 (the tech-neck fix)", 5: "Hamstring 60s/side · figure-4 glute 45s/side · shake the grip out" };
  if (COOL[day]) push({ type: "cooldown", name: "Cooldown — 5 min", note: COOL[day] + " · easy breathing, no bouncing" });
  return blocks;
}

// Cycle 6 (waves 6, 12, 18): the peak
function peakSession(wave, week, day, cb, gates) {
  const blocks = [];
  const dayLift = { 1: "sq", 2: "bn", 5: "dl" }[day];
  const push = (b) => blocks.push(b);
  if (week === 4) {
    if (day === 1) push({ type: "test", name: "TAPER — brief crisp technique, then rest", note: "Cut volume ≥50%. Last DL exposure ~7 days out, squat ~5–7, bench touch ~3–5. Full rest final 2 days. Test is Friday." });
    if (day === 2) push({ type: "test", name: "TAPER — optional light bench touch", note: "A few crisp triples ~60%, only if it reliably helps you. Otherwise rest. Test is Friday." });
    if (day === 3 || day === 4) push({ type: "test", name: "TAPER — full rest", note: "Walk, eat, sleep. Nothing heavier than a warm-up. Test is Friday." });
    if (day === 5) {
      const att = testAttempts(cb);
      push({ type: "test", name: "TEST DAY — 1st/2nd/3rd attempts", note: "Squat → Bench → Deadlift. Safeties + spotters. No misses.", attempts: att });
    }
    return blocks;
  }
  if (dayLift) {
    push({ type: "warmup", name: LIFT_NAME[dayLift] + " warm-up", rows: warmups(dayLift, wave, gates) });
    const sp = [0.89, 0.91, 0.905][week - 1];
    const cap = ["8", "8–8.5", "8–8.5 · opener practice"][week - 1];
    push({ type: "single", lift: dayLift, name: LIFT_NAME[dayLift] + " — " + (week === 3 ? "opener" : "top single"), w: R5(cb[dayLift] * sp), reps: 1, sets: 1, rpe: cap, moveId: dayLift, pkey: dayLift + "-single" });
    const back = week === 1 ? [R5(cb[dayLift] * 0.77), 3, 3, "7"] : week === 2 ? [R5(cb[dayLift] * 0.79), 2, 3, "7–7.5"] : [R5(cb[dayLift] * 0.70), 2, 2, "easy"];
    push({ type: "backoff", lift: dayLift, name: LIFT_NAME[dayLift] + " — back-offs", w: back[0], reps: back[1], sets: back[2], rpe: back[3], moveId: dayLift, pkey: dayLift + "-back" });
  }
  if (day === 3 && week <= 2) {
    push({ type: "paused", lift: "sq", name: "Paused Squat (easy)", w: R5(cb.sq * (week === 1 ? 0.66 : 0.60)), reps: 5, sets: week === 1 ? 3 : 2, rpe: "6", moveId: "ps", pkey: "ps" });
  }
  if (day === 4 && week <= 2) {
    push({ type: "paused", lift: "bn", name: "Paused Bench (easy)", w: R5(cb.bn * (week === 1 ? 0.68 : 0.60)), reps: 5, sets: week === 1 ? 3 : 2, rpe: "6", moveId: "pb", pkey: "pb" });
  }
  if (week === 3) {
    if (day === 3 || day === 4) push({ type: "test", name: "Opener week — 1–2 easy accessories only", note: "No OHP, no arm work, no conditioning fatigue this week." });
  } else {
    for (const a of ACC.filter((x) => x.day === day)) {
      const p = accFor(a, wave, week);
      if (!p) continue;
      push({ type: "accessory", name: a.name, w: p.w, reps: p.reps, sets: p.sets, rpe: "7 (easy)", db: a.db, moveId: a.id, cap: a.cap, pkey: a.id, prog: p.prog });
    }
  }
  return blocks;
}

function testAttempts(cb, entered = {}) {
  const out = {};
  for (const L of LIFTS) {
    const tm = entered[L] || R5(cb[L] * 1.04);
    out[L] = {
      max: tm,
      a1: R5(tm * 0.91),
      a2: tm,
      a3note: L === "bn" ? "+2.5–5 only if 2nd was clean and ≤RPE 9" : "+5–10 only if 2nd was clean and ≤RPE 9",
    };
  }
  return out;
}

// yellow transform: applied by UI — single cap RPE 7, back-off −5% (or −1 set), 2 sets/accessory, skip cardio
function yellowW(block) {
  if (block.type === "single") return { ...block, rpe: 7, note: "Yellow: cap @ RPE 7" };
  if (block.type === "backoff" || block.type === "paused") return { ...block, w: R5(block.w * 0.95), note: "Yellow: −5% (or keep weight, −1 set)" };
  if (block.type === "accessory" || block.type === "ohp") return { ...block, sets: Math.min(block.sets, 2), rpe: "≤8", note: "Yellow: 2 sets cap" };
  if (block.type === "conditioning") return null;
  return block;
}
function redSession(wave, day, gates) {
  if (day === 6) return [{ type: "spechead", name: "RED — skip specialization", note: "Frame work is optional physique volume (priority 5–6). On a Red day it's the first thing to cut. Rest, eat, sleep." }];
  if (day === 7) return [{ type: "spechead", name: "RED — no optional day", note: "Sunday is skippable at the best of times. Today, skip it. Recover." }];
  const { t } = mainTables(wave, gates);
  const dayLift = { 1: "sq", 2: "bn", 5: "dl" }[day];
  const reds = t.red || [R5(cbFor(wave, gates).sq * 0.6), R5(cbFor(wave, gates).bn * 0.6), R5(cbFor(wave, gates).dl * 0.6)];
  const map = { sq: reds[0], bn: reds[1], dl: reds[2] };
  const blocks = [];
  if (dayLift) blocks.push({ type: "backoff", lift: dayLift, name: LIFT_NAME[dayLift] + " — RED day 3×3", w: map[dayLift], reps: 3, sets: 3, rpe: "≤6", moveId: dayLift, pkey: dayLift + "-back", note: "Skip the single. 1–2 easy accessories. Out in 30–45 min." });
  else blocks.push({ type: "test", name: "RED day — main lift 3×3 @ 60% only", note: "Sq " + map.sq + " · Bn " + map.bn + " · DL " + map.dl + " · pain/illness → rest instead" });
  return blocks;
}

const ENGINE = { TRACKED, trackedCB, trackedFor, ARM_START, ARM_GOAL, clearedInWave, inclineCB, inclineFor, INCLINE_START, INCLINE_GOAL, pkeyOf, accStateLogged, R5, R25, START, LIFTS, LIFT_NAME, gateDelta, cbFor, cycleOf, macroOf, CYCLE_NAME, waveStartUTC, whereIs, NOTES, mainTables, ohpFor, ACC, accState, accFor, sessionFor, testAttempts, yellowW, redSession, WAVE1_MONDAY, MS_DAY,
  FRAME_OPTS, FRAME_LABEL, DETAIL_OPTS, DETAIL_LABEL, DEFAULT_SPEC, isDefaultSpec, saturdaySession, sundaySession, sundayPlanned };
if (typeof module !== "undefined") module.exports = ENGINE;
