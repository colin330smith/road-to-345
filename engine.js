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

// CALIBRATION: bases measured from his own sessions, pinned at the wave they took
// effect. Waves 1-2 ran the printed notes; by Wave 3 his real numbers had moved
// (bench ahead of the chain, squat and deadlift behind it), so Wave 3 runs from
// what he actually lifts. A gate with its own `cb` still overrides these.
const CALIBRATION = { 3: { bn: 255, sq: 295, dl: 385 } };
const CAL_LAST = Math.max(...Object.keys(CALIBRATION).map(Number));
// Default for a gate nobody has set yet. History (up to the last calibration)
// assumes clean, since the notes he ran were built that way. The future assumes
// "small": the small step, near Latella's average for bench and above it for squat and deadlift;
// the rated gates correct it every wave (EVIDENCE.md, Latella).
const PROJ_DEFAULT = "small";
function defaultGate(w) { return w <= CAL_LAST ? "clean" : PROJ_DEFAULT; }
// explicit base for wave w, if any: the user's gate cb wins over the calibration
function explicitCB(w, gates, L) {
  const g = (gates || {})[w];
  if (g && g.cb && Number.isFinite(g.cb[L])) return g.cb[L];
  const c = CALIBRATION[w];
  return c && Number.isFinite(c[L]) ? c[L] : null;
}

// gates: {2:{sq:'clean'|'small'|'repeat'|'reset',...}, ...} keyed by the wave the gate FEEDS INTO
function cbFor(wave, gates = {}) {
  const cb = { ...START };
  for (let w = 2; w <= wave; w++) {
    const g = gates[w] || {};
    for (const L of LIFTS) {
      const x = explicitCB(w, gates, L); // explicit CB (calibration, or set from a test day)
      if (x != null) cb[L] = x;
      else cb[L] = cb[L] + gateDelta(L, g[L] || defaultGate(w), cb[L]);
    }
  }
  return cb;
}
// the pure chain, no calibration and all-clean defaults: the arithmetic the notes were built on
function cbChain(wave, gates = {}) {
  const cb = { ...START };
  for (let w = 2; w <= wave; w++) {
    const g = gates[w] || {};
    for (const L of LIFTS) cb[L] = g.cb && Number.isFinite(g.cb[L]) ? g.cb[L] : cb[L] + gateDelta(L, g[L] || "clean", cb[L]);
  }
  return cb;
}
// first wave whose base reaches `goal` for lift L (null if not within `limit` waves)
function etaWave(L, goal, gates, limit = 80) {
  for (let w = 1; w <= limit; w++) if (cbFor(w, gates)[L] >= goal) return w;
  return null;
}

const cycleOf = (wave) => ((wave - 1) % 6) + 1;
const macroOf = (wave) => Math.floor((wave - 1) / 6) + 1;
const CYCLE_NAME = ["", "Calibration", "Build", "Accumulate", "Specificity", "Intensification", "Peak"];

// ── schedule ────────────────────────────────────────────────────────
// `off` is the schedule shift. A number (legacy) moved EVERY date, history included. Dated segments
// [{from: "YYYY-MM-DD", weeks: n}] (DATA-1): from that Monday on, the n weeks before it are repeated and
// everything later moves n weeks; nothing logged before `from` changes wave or week.
const mondayOnOrAfter = (t) => t + ((7 - ((Math.floor((t - WAVE1_MONDAY) / MS_DAY) % 7) + 7) % 7) % 7) * MS_DAY;
function segsOf(off) {
  if (!off) return [];
  if (!Array.isArray(off)) return [{ t: -Infinity, weeks: +off || 0 }];
  return off.map((x) => ({ t: mondayOnOrAfter(Date.parse(x.from)), weeks: Math.max(0, Math.round(+x.weeks || 0)) })).filter((x) => Number.isFinite(x.t) && x.weeks > 0);
}
function offsetAt(t, off) { let n = 0; for (const x of segsOf(off)) if (x.t <= t) n += x.weeks; return n; }
// the date of plan day `d` (days since Wave 1's Monday): the first t with t = plan date + 7 x offsetAt(t).
// A repeated week has two dates; this is the first (the one inside the original wave).
function planDateUTC(d, off) {
  const base = WAVE1_MONDAY + d * MS_DAY;
  let t = base;
  for (let i = 0; i < 64; i++) { const n = base + offsetAt(t, off) * 7 * MS_DAY; if (n === t) break; t = n; }
  return t;
}
function waveStartUTC(wave, off = 0) { return planDateUTC((wave - 1) * 28, off); }
// date (ms UTC midnight) → {wave, week, day} · day 1–5 = Mon–Fri, 0 = weekend
function whereIs(utcMid, off = 0) {
  const d = Math.floor((utcMid - WAVE1_MONDAY) / MS_DAY) - offsetAt(utcMid, off) * 7;
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
// 225 in nine incline steps: wave 11 on clean gates, wave 19 on the small-step default.
// Did the lifter clear a standard for this exercise during a given wave?
// null = no data (caller falls back to the schedule) · true = advance · false = hold.
function clearedInWave(pkey, wave, minW, minReps, minSets, ctx = HISTCTX) {
  if (!ctx || !ctx.index) return null;
  const hist = ctx.index[pkey];
  if (!hist || !hist.length) return null;
  const from = waveStartUTC(wave, SH(ctx)), to = waveStartUTC(wave + 1, SH(ctx));
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
    note: "Ramping to 225. Bench set to 30\u00b0 \u2014 NOT 45\u00b0: from about 45\u00b0 up the front delt takes over and the upper chest stops being the limiter. Elbows ~45\u00b0 from the torso, bar to the upper chest.",
  },
  chin: {
    key: "chin", name: "Weighted Chin-Up", start: 35, goal: 90, step: 5, anchor: "bn", added: true,
    top:  [[0.60, 6, "7"], [0.80, 5, "7.5"], [1.00, 4, "8"], null],
    back: [[0.35, 8, 3], [0.45, 7, 3], [0.55, 6, 3], [0, 8, 2]],
    note: "Ramping to +90. Supinated, dead hang to chin over the bar. THE biceps compound. NO STRAPS on the back-offs \u2014 that is free forearm work; straps on the top set only if grip is the limiter.",
  },
  dip: {
    key: "dip", name: "Weighted Dip", start: 35, goal: 100, step: 5, anchor: "bn", added: true,
    top:  [[0.60, 6, "7"], [0.80, 5, "7.5"], [1.00, 4, "8"], null],
    back: [[0.35, 8, 3], [0.45, 7, 3], [0.55, 6, 3], [0, 8, 2]],
    note: "Ramping to +100. TORSO UPRIGHT, elbows tucked \u2014 lean forward and it turns into a chest exercise. Sink until the shoulder says stop. THE triceps compound for load. A dip SHORTENS the long head (the shoulder is extended), so it is not the stretch work: the overhead extension is.",
  },
  rdl: {
    key: "rdl", name: "RDL", start: 275, goal: 315, step: 5, anchor: "dl",
    top:  [[0.88, 6, "7"], [0.94, 5, "7.5"], [1.00, 4, "8"], null],
    back: [[0.80, 8, 3], [0.83, 7, 3], [0.86, 6, 3], [0.62, 6, 2]],
    note: "Ramping to 315. Hamstring PRIORITY \u2014 hinge, soft knees, bar drags the thighs. Stops at 8; it feeds the deadlift. Back-offs double-overhand, NO STRAPS: the forearms are a declared weak point and this is where they get paid.",
  },
};
const INCLINE_START = TRACKED.inc.start, INCLINE_GOAL = TRACKED.inc.goal;
// Arms are the stated calling card. 13" at 182 lb is a genuinely lagging part;
// The goal is 16" at 200 lb and 15% body fat: arms that lead the build, slightly out of
// proportion on purpose. 13" -> 16" is roughly +50% cross-sectional area, a multi-year target.
const ARM_START = 13, ARM_GOAL = 16;

// Log-adaptive base: a past wave advances only if its week-3 top set was cleared.
// Unlogged waves track the anchor lift's gate, so casual use still progresses.
function trackedCB(id, wave, gates, ctx = HISTCTX) {
  const T = TRACKED[id];
  let cb = T.start;
  for (let w = 1; w < wave; w++) {
    const target = R5(cb * T.top[2][0]);
    const cleared = clearedInWave(T.key + "-top", w, target, T.top[2][1], 1, ctx);
    if (cleared === null) {
      // follow the anchor's gate, clamped to one step either way. An explicit base
      // (calibration or test) is a re-measurement of the anchor, not progress, so it
      // moves this lift by nothing: a 30 lb deadlift correction says nothing about the RDL.
      const d = explicitCB(w + 1, gates, T.anchor) != null ? 0
        : cbFor(w + 1, gates)[T.anchor] - cbFor(w, gates)[T.anchor];
      cb += Math.max(-T.step, Math.min(d, T.step));
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
    pkey: T.key + "-back", light: !tp, added: !!T.added, disp: label(R5(cb * bk[0])), inc: T.step });
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
// the printed notes are only valid while the chain they were built on holds:
// any non-clean gate or explicit base (calibration included) at or before this wave
// means the tables must be generated from the real base instead.
function hasNonCleanGate(gates, upTo) {
  for (let w = 2; w <= upTo; w++) {
    const g = (gates || {})[w];
    if (g && LIFTS.some((L) => g[L] && g[L] !== "clean")) return true;
    if (LIFTS.some((L) => explicitCB(w, gates, L) != null)) return true;
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
  { id: "hamMon",    name: "Seated Leg Curl",        day: 1, sets: 3, w3: 2, steps: [10, 12, 15],     w: 135,  inc: 10,  db: false, comp: false, anchor: true, lp: true, arch: "legcurl",   cap: "Same rung as Wednesday — one exercise, one progression. Third weekly hamstring exposure" },
  { id: "legpress",  name: "Leg Press",              day: 1, sets: 3, w3: 2, steps: [10, 12],         w: 450,  inc: 20,  db: false, comp: true,  arch: "legpress",  cap: "Stop 1–2 reps short on every set. Never to failure: a hard compound to failure costs recovery for no extra growth. Safeties set" , rpe8: true },
  { id: "calf",      name: "Standing Calf Raise",    day: 1, sets: 3, w3: 2, steps: [10, 12, 15],     w: 220,  inc: 10,  db: false, comp: false, anchor: true, lp: true, arch: "calf",      cap: "Pause the stretch; no bouncing" },
  { id: "hlr",       name: "Hanging Leg Raise",      day: 1, sets: 3, w3: 3, steps: [10, 12, 15],     w: 0,    inc: 0,   db: false, comp: false, anchor: true, arch: "hlr",       cap: "Once you own the top of the rep range, hold a dumbbell between the feet — bodyweight alone stops progressing",
    // Wave 4+: 3 -> 2 sets pays Monday's clock for the shrug (judgment; the last set is still the abs anchor)
    up: { from: 4, sets: 2, w3: 2, cap: "Once you own the top of the rep range, hold a dumbbell between the feet: bodyweight alone stops progressing. 2 sets from Wave 4 (the last is still the abs anchor): the minutes went to the shrug, and visible abs are a body-fat number" } },
  { id: "lowhigh",   name: "Low-to-High Cable Fly",  day: 1, sets: 4, w3: 3, steps: [12, 15, 20],     w: 30,   inc: 5,   db: false, comp: false, anchor: true, arch: "rearfly",   cap: "Upper-chest shelf — sweep up and in, squeeze the top" },
  { id: "shrug",     name: "Machine / DB Shrug",     day: 1, sets: 1, w3: 1, steps: [10, 12, 15],     w: 160,  inc: 10,  db: false, comp: false, arch: "shrug",     cap: "Hold the top 1s, no rolling. 1 quality set + your deadlifts = developed, not overdeveloped",
    // UPPER BACK (Wave 4+): traps are a declared goal. 1 -> 3 sets, and the shrug becomes the trap anchor.
    // since: 4 restarts its ladder at the seed: a 1-set exercise could never clear the 2-set rung rule,
    // so the Waves 1-3 ladder was frozen and must not carry a false "held" into the new block.
    up: { from: 4, since: 4, sets: 3, w3: 2, anchor: true, cap: "TRAP ANCHOR (Wave 4+): 3 sets, the last one to RPE 9–10 in Weeks 1–2. Straps on: grip is not the target. Straight up toward the ears, 1-s hold, full stretch at the bottom; no rolling, chin neutral, stop on any neck pain. Twelve weeks of heavy squats, deadlifts and rows did not grow the neck muscles at all; only added direct neck work did (Conley 1997). Direct sets are the reliable route, so the traps get their own" } },
  // ARM SPECIALIZATION (Wave 4+): arms are the declared priority, so they get the most
  // volume the evidence supports, spread to respect recovery. Biceps get a moderate
  // rise (trained-lifter data level off near 18 weekly sets: Heaselgrave 2019); triceps
  // get more (Baz-Valle 2022, Brigatto 2022), as overhead work (Maeo 2023). No added
  // triceps on Monday (24 h before bench: Ferreira 2017) or Thursday (already at the
  // per-session ceiling). Added sets stop at RPE 8: no extra failure sets.
  { id: "curlmon",   name: "Bayesian Cable Curl (Mon)", day: 1, sets: 3, w3: 2, steps: [10, 12, 15], w: 25, inc: 5, db: false, comp: false, rpe8: true, since: 4, from: 4, arch: "curl", cap: "ARMS PRIORITY \u2014 third biceps day, 48 h before Wednesday's preacher. Arm behind the body, full stretch at the bottom, elbow still. Stop at RPE 8. First two weeks: RPE 7, the elbow needs to get used to it" },
  { id: "rowtue",    name: "Chest-Supported DB Row", day: 2, sets: 4, w3: 3, steps: [8, 10, 12],      w: 60,   inc: 5,   db: true,  comp: true,  arch: "row",       cap: "Strict, chest stays on pad",
    up: { from: 4, cap: "LAT ROW: drive the elbow to the hip, arm close to the body, full stretch at the bottom, chest stays on the pad. A narrow, tucked row biases the lats; Friday's high-elbow row is the upper-back row (Padovan 2026)" } },
  { id: "lattue",    name: "Leaning DB Lateral Raise", day: 2, sets: 4, w3: 3, steps: [10, 12, 15],   w: 20,   inc: 2.5, db: true,  comp: false, anchor: true, lp: true, moveId: "leanlat", arch: "lateral",   cap: "LEAN AWAY from a rack, holding it one-handed. Dumbbell and cable laterals grew the side delt equally head to head (Larsen 2025): the lean is for feel, not magic. 10–15 reps, strict",
    up: { from: 4, cap: "LEAN AWAY from a rack, holding it one-handed. Dumbbell and cable laterals grew the side delt equally head to head (Larsen 2025): the lean is for feel. THUMB LEVEL with the pinky, elbow leads, stop at shoulder height: a neutral arm gave the most side-delt activity on the way up, and turning the thumb down shifted work to the rear delt and upper traps (Coratella 2020). 10–15 reps, strict" } },
  { id: "ohtue",     name: "Overhead Cable Extension (Tue)", day: 2, sets: 3, w3: 2, steps: [10, 12, 15], w: 65, inc: 5, db: false, comp: false, rpe8: true, since: 4, from: 4, arch: "ohtri", cap: "ARMS PRIORITY \u2014 after ALL pressing, never before (pre-fatiguing the triceps cut bench reps in a single-session study: Soares 2016). Long head at length, elbows in. Stop at RPE 8: Thursday's paused bench is 48 h away. First two weeks: RPE 7" },
  { id: "revpec",    name: "Reverse Pec Deck",       day: 2, sets: 3, w3: 2, steps: [12, 15],         w: 100,  inc: 10,  db: false, comp: false, arch: "rearfly",   cap: "NEUTRAL GRIP (palms facing), arms long, sweep out. Light + strict beats heavy + sloppy. Rows and chins hit the rear delt too, but a dedicated fly is what isolates it",
    // 3D SHOULDERS (Wave 4+): the rear delt gets its own anchor. One failure set per muscle per day is read
    // per delt head (Tuesday's lateral anchor is the side delt): a judgment, see EVIDENCE.md.
    up: { from: 4, anchor: true, cap: "REAR-DELT ANCHOR (Wave 4+): last set to RPE 9\u201310 in Weeks 1\u20132. NEUTRAL GRIP (palms facing): more rear-delt activity than palms down (Schoenfeld 2013). Arms long, sweep OUT at shoulder height, 1-s squeeze, no shrug. A dedicated fly worked the rear delt harder than a seated row or a pulldown (Franke 2015)" } },
  { id: "pullapart", name: "Band Pull-Apart",        day: 2, sets: 2, w3: 2, steps: [20, 25, 30],     w: 0,    inc: 0,   db: false, comp: false, primer: true, arch: "rearfly",   cap: "PRIMER \u2014 do these BEFORE pressing. 60 seconds, opens the chest, sets the shoulders back" },
  // SHOULDER HEALTH (Wave 4+): rotator-cuff primer before both pressing days. Warm-up effort, 0 clock.
  { id: "bander",    name: "Band External Rotation", day: 2, sets: 2, w3: 2, steps: [15, 20],         w: 0,    inc: 0,   db: false, comp: false, primer: true, since: 4, from: 4, arch: "rearfly", cap: "PRIMER \u2014 before pressing on Tuesday and Thursday, alongside the pull-apart. Elbow pinned to your side on a rolled towel, light band, rotate the forearm OUT, 2-s return. 15\u201320 per arm at warm-up effort, never to fatigue. Cheap cuff insurance for a heavy-pressing week: a cuff and shoulder-blade warm-up cut shoulder problems in elite handball players (Andersson 2017), a different sport and a bigger programme" },
  { id: "lpcalf",    name: "Leg Press Calf Raise",   day: 5, sets: 3, w3: 2, steps: [10, 12, 15],     w: 250,  inc: 20,  db: false, comp: false, anchor: true, lp: true, since: 3, arch: "calf",      cap: "STRAIGHT KNEE \u2014 bent-knee calf work grows the soleus only; the gastrocnemius is the calf you can see. Two-second pause in the stretch, no bouncing. Final set: after the last full rep, 3\u20135 partials in the bottom half" },
  { id: "neckcurl",  name: "Neck Curl",              day: 2, sets: 2, w3: 2, steps: [12, 15, 20],     w: 5,    inc: 2.5, db: false, comp: false, arch: "neckflex",  cap: "FILLER — superset into main-lift rests, costs no clock. Lying face-up, plate on forehead with a towel. SLOW" },
  { id: "seatcurl3", name: "Seated Leg Curl",        day: 3, sets: 4, w3: 3, steps: [10, 12, 15],     w: 135,  inc: 10,  db: false, comp: false, anchor: true, lp: true, arch: "legcurl",   cap: "HAMSTRING PRIORITY. Seated beats lying — hip flexed puts the hamstring at length (Maeo 2021: +14% vs +9%)" },
  { id: "preacher",  name: "Cable Preacher Curl",    day: 3, sets: 3, w3: 3, steps: [8, 10, 12],      w: 50,   inc: 5,   db: false, comp: false, anchor: true, lp: true, arch: "curl",      cap: "THE ANCHOR CURL — first, fresh. Preacher grew the lower biceps more, the incline curl the upper (Kassiano 2025), which is why Saturday has the incline. Elbows planted, full stretch at the bottom, no leaning back" },
  { id: "hammer",    name: "Hammer Curl",            day: 3, sets: 3, w3: 2, steps: [10, 12, 15],     w: 35,   inc: 5,   db: true,  comp: false, arch: "curl",      cap: "BRACHIALIS — sits under the biceps and pushes it up. Neutral grip, slow negative. Stop at RPE 8: the preacher took the failure set", rpe8: true },
  { id: "legext",    name: "Leg Extension",          day: 3, sets: 2, w3: 1, steps: [12, 15],         w: 125,  inc: 10,  db: false, comp: false, anchor: true, lp: true, arch: "legext",    cap: "Lean back: with the hip reclined the rectus femoris grew more than sitting upright (Larsen 2025)" },
  { id: "latwed",    name: "Cable Lateral Raise",    day: 3, sets: 4, w3: 3, steps: [10, 12, 15],     w: 20,   inc: 2.5, db: false, comp: false, anchor: true, lp: true, moveId: "cablelat", arch: "lateral",   cap: "Cable at HAND HEIGHT, not the floor — tension peaks where cable and arm make 90°. 10–15 reps, heavier than before",
    up: { from: 4, cap: "Cable at HAND HEIGHT, not the floor: tension peaks where cable and arm make 90°. Elbow nearly straight, thumb level, stop at shoulder height (the range the trial used: Larsen 2025). 10–15 reps" } },
  { id: "vacuum",    name: "Stomach Vacuum (seconds)", day: 3, sets: 2, w3: 2, steps: [30, 45, 60],     w: 0,    inc: 0,   db: false, comp: false, arch: "hlr",       cap: "FILLER \u2014 superset into rests, costs no clock. WAIST: exhale fully, pull the navel to the spine, hold. A zero-clock habit, not a proven waist shrinker: no trial shows it narrows the waist (judgment). The obliques stay unloaded by choice (judgment): the waist is a leanness number" },
  { id: "latthu",    name: "Lateral Raise (Thu)",    day: 4, sets: 4, w3: 3, steps: [12, 15, 18, 20], w: 17.5,   inc: 2.5, db: true,  comp: false, arch: "lateral",   cap: "4 sets — the big side-delt day" },
  { id: "rdf",       name: "Rear-Delt Fly",          day: 4, sets: 3, w3: 3, steps: [15, 20, 25],     w: 17.5, inc: 2.5, db: true,  comp: false, arch: "rearfly",   cap: "Think 'throw, don't lift'" },
  { id: "pushdown",  name: "Rope Pushdown",          day: 4, sets: 2, w3: 2, steps: [10, 12, 15],     w: 90,   inc: 5,   db: false, comp: false, arch: "pushdown",  cap: "Second triceps movement — the overhead extension took the failure set. Stop at RPE 8", rpe8: true },
  { id: "ohthu",     name: "Overhead Cable Extension", day: 4, sets: 3, w3: 2, steps: [10, 12, 15],   w: 70,   inc: 5,   db: false, comp: false, anchor: true, lp: true, arch: "ohtri",     cap: "LONG HEAD at length. Triceps are ~55% of upper-arm muscle and the long head is the biggest head. Overhead grew it ~1.5x and the whole triceps ~1.4x more than pushdowns (Maeo 2023). Elbows in, full stretch behind the head" },
  { id: "facepull",  name: "Face Pull",              day: 4, sets: 2, w3: 2, steps: [12, 15, 20],     w: 55,   inc: 5,   db: false, comp: false, arch: "rearfly",   cap: "Rear delts + posture. Pull to the forehead, elbows high",
    up: { from: 4, sets: 3, rpe8: true, cap: "REAR DELTS + MID/LOWER TRAPS + CUFF. Rope at forehead height, elbows up at shoulder level. Pull apart until the hands sit beside the ears with the thumbs pointing back, 1-s squeeze, no leaning back: that externally rotated finish is close to the position that topped rear-delt activity in an EMG study (Reinold 2004). Stop at RPE 8: deadlifts are tomorrow" } },
  { id: "proneY",    name: "Prone Y-Raise",          day: 4, sets: 2, w3: 2, steps: [12, 15, 20],     w: 5,    inc: 2.5, db: true,  comp: false, arch: "proneY",    cap: "FILLER — superset into main-lift rests, costs no clock. LOWER traps — the muscle that holds your shoulders back. Thumbs up, arms at 45°, tiny weight" },
  { id: "wrist",     name: "Wrist Extension",        day: 4, sets: 3, w3: 2, steps: [15, 20, 25],     w: 12.5, inc: 2.5, db: true,  comp: false, arch: "wrist",     cap: "FILLER — superset into main-lift rests, costs no clock. Elbow-health insurance — never skip" },
  { id: "neckext",   name: "Neck Extension",         day: 4, sets: 2, w3: 2, steps: [12, 15, 20],     w: 10,   inc: 2.5, db: false, comp: false, arch: "neckext",   cap: "FILLER — superset into main-lift rests, costs no clock. Prone, plate on the back of the head. Slow, no jerking, NEVER through pain" },
  { id: "rowfri",    name: "Chest-Supported Machine / Cable Row", day: 5, sets: 3, w3: 3, steps: [8, 10, 12], w: 120, inc: 10, db: false, comp: true, until: 3, arch: "row",   cap: "HEAVIER than Tuesday's DB row — a second back stimulus, not a repeat. No unsupported barbell rows" },
  // UPPER BACK (Wave 4+): Friday's row becomes the upper-back row under its own key and seed, so the
  // lighter flared row never logs against the old tucked row's rung (Waves 1-3 keep rowfri).
  { id: "rowhi",     name: "High-Elbow Chest-Supported Row", day: 5, sets: 3, w3: 3, steps: [10, 12, 15], w: 100, inc: 5, db: false, comp: true, rpe8: true, since: 4, from: 4, arch: "row", cap: "UPPER-BACK ROW (replaces the tucked Friday row from Wave 4). Wide NEUTRAL handles (pronated only if the elbows like it), chest on the pad, elbows 45–60° out, pull to the LOWER chest, 1-s squeeze; let the shoulder blades reach forward at the bottom. Elbows stop at the torso line. Lighter than the old row by design: flared elbows and a wide grip shift the work to the traps and rear delts (Vasconcelos 2023, Padovan 2026). Straps if grip fades. RPE 8; first two weeks RPE 7" },
  { id: "cablecurl", name: "Reverse Cable Curl",     day: 5, sets: 3, w3: 2, steps: [12, 15],         w: 45,   inc: 5,   db: false, comp: false, anchor: true, lp: true, arch: "curl",      cap: "FOREARM ANCHOR \u2014 the brachioradialis is the biggest muscle you can see on a forearm. Pronated \u2014 brachialis + brachioradialis. The chin-up already hammered the biceps supinated; this is the other half of the arm" },
  { id: "wristcurl", name: "Cable / DB Wrist Curl",  day: 5, sets: 3, w3: 2, steps: [15, 20, 25],     w: 30,   inc: 5,   db: false, comp: false, arch: "wrist",     cap: "FILLER \u2014 superset into main-lift rests, costs no clock. FOREARMS \u2014 the flexors are the meat of the forearm. Full stretch at the bottom, squeeze at the top. Flexors — the meat of the forearm. Grip is pre-fried from deadlifts: perfect placement" },
];

// state of an accessory at a given wave (1-indexed): {w, i} where reps = (steps[i], steps[i+1])
// `since`: the wave an exercise entered the plan. Waves before it never ran it, so
// they must not advance its rung (lpcalf, incdb and farmer arrived in Wave 3).
function accState(a, wave) {
  let w = a.w, i = a.i0 || 0;
  const last = a.steps.length - 1;
  for (let k = Math.max(1, a.since || 1); k < wave; k++) {
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
  // Corrections for prescriptions from Wave 4 on (Waves 1-3 still display what was run): a peak
  // wave's 1-set maintenance follows the schedule (it neither holds nor adopts), deload sets never
  // qualify, the latest qualifying session wins, and a heavier logged weight is adopted on the
  // exercise's own grid, never rounded up.
  const fixed = wave > CAL_LAST, off = SH(ctx);
  const step = def.inc > 0 ? def.inc : (def.db ? 2.5 : 5);
  const need = fixed ? Math.min(2, def.sets || 2) : 2; // ENG-4: 1-set work clears on its one set
  for (let k = Math.max(1, def.since || 1); k < wave; k++) {
    const atTop = i + 1 >= last;
    const topReq = def.steps[Math.min(i + 1, last)];
    const from = waveStartUTC(k, off), to = waveStartUTC(k + 1, off);
    if (fixed && cycleOf(k) === 6) { // peak: 1-set "easy" maintenance, follow the schedule
      if (atTop) { if (def.inc > 0) w = def.db ? R25(w + def.inc) : w + def.inc; i = 0; } else i++;
      continue;
    }
    const inWave = hist.filter((e) => e.t >= from && e.t < to && !(fixed && whereIs(e.t, off).week === 4));
    // group into sessions by calendar day
    const byDay = new Map();
    for (const e of inWave) { const d = Math.floor(e.t / MS_DAY); if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(e); }
    let qualified = null;
    const days = fixed ? [...byDay.keys()].sort((a, b) => b - a) : [...byDay.keys()];
    for (const dd of days) {
      const sess = byDay.get(dd);
      if (sess.length < need) continue; // one set of 2+-set work is a fluke, not a rung clear
      // 2+ sets clearing the top is the documented rule. Requiring EVERY set to
      // clear made progression nearly impossible on 4-5 set exercises, and
      // directly contradicted the "final set to RPE 9-10" cue — which drops reps
      // on the last set by design. Logging honestly must never cost a rung.
      const clears = sess.filter((e) => e.r >= topReq && e.w >= w - 0.01);
      if (clears.length >= need) { qualified = clears; break; }
    }
    if (qualified) {
      const minW = Math.min(...qualified.map((e) => e.w));
      const base = fixed ? (minW > w + 1e-6 ? w + Math.floor((minW - w) / step + 1e-9) * step : w) // adopt heavier logged weight, on the grid
        : Math.max(w, def.db ? R25(minW) : R5(minW));
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

// An ACC entry as prescribed at a wave. `up` holds the fields that change from up.from on
// (sets, w3, anchor, rpe8, cap; `since` only to restart a ladder at up.from); earlier waves are
// history and print what was run. A different movement gets a new id, never a new w/steps/inc.
const accAt = (a, wave) => (a.up && wave >= a.up.from ? { ...a, ...a.up } : a);
// is the entry in the plan this wave? `from` = first wave it runs, `until` = last
const accLive = (a, wave) => !(a.from && wave < a.from) && !(a.until && wave > a.until);
// Thursday shed its delt isolation to Saturday in v32; the peak builder honours it too
const THU_DROP = new Set(["latthu", "rdf"]);

// prescription for accessory a at wave/week (week 1–4), with cycle trims
function accFor(a0, wave, week) {
  const a = accAt(a0, wave);
  const st = accStateLogged({ w: a.w, steps: a.steps, inc: a.inc, db: a.db, i0: a.i0, pkey: a.id, since: a.since, sets: a.sets }, wave, HISTCTX);
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
    // from Wave 4 a deload never prescribes more sets than a loading week (it doubled the 1-set shrug)
    return { w: lw, reps: repLow, sets: wave >= 4 ? Math.min(2, a.sets) : 2, rpe: "6–7", light: true };
  }
  const reps = week === 2 ? repHigh : repLow;
  const topSet = repHigh === a.steps[last] && week === 2;
  // Proximity to failure is the highest-leverage variable left in this program.
  // v7: "safe machine/cable isolations — final set may reach RPE 9-10 in Wks 1-2."
  // Compounds stay capped at 8; week 3 trims; deload and peak never push.
  // v32: ONE failure set per muscle per day. Only the anchor movement for a muscle
  // earns it; everything after stops at RPE 8. ~35 failure sets/wk was the fatigue leak.
  const lastHard = !!a.anchor && !a.comp && week <= 2 && cyc <= 4;
  return { w, reps, sets, rpe: week === 3 || a.rpe8 ? "8" : "8–9", top: topSet, prog: st.prog, lastHard };
}

// ── weekend weak-point specialization (Sat = frame overload, Sun = optional detail) ──
const FRAME_OPTS = ["shoulders", "upperchest", "latwidth", "upperback", "traps", "arms"];
const FRAME_LABEL = { shoulders: "Shoulder width", upperchest: "Upper chest", latwidth: "Lat width", upperback: "Upper-back / rear delt", traps: "Traps / upper yoke", arms: "Arms (bi + tri)", none: "None" };
const DETAIL_OPTS = ["triceps", "biceps", "brachialis"];
const DETAIL_LABEL = { triceps: "Triceps", biceps: "Biceps", brachialis: "Brachialis / forearms" };
// secondaryPress is kept only so stored specs still read; nothing uses it (the close-grip option never ran).
const DEFAULT_SPEC = { framePrimary: "arms", frameSecondary: "latwidth", detail: "triceps", sundayOn: false, secondaryPress: "incline" };

// ex helper — spec exercises run the SAME double-progression machine as weekday
// accessories: `steps` are rep waypoints, weight climbs by `inc` once the top of the
// range is cleared. `wv` (wave) is threaded in, so Wave 19 is not Wave 1.
// ENG-5: while sundaySession builds a Wave 4+ template, the Saturday keys it must not share
let SX_TAKEN = null;
function sx(name, seed, steps, sets, rpe, arch, moveId, db, cap, inc, wv, since) {
  const key = SX_TAKEN && SX_TAKEN.has(pkeyOf(name)) ? "sun-" + pkeyOf(name) : pkeyOf(name);
  const st = accStateLogged({ w: seed, steps, inc: inc == null ? 5 : inc, db: !!db, i0: 0, pkey: key, since, sets }, wv || 1, HISTCTX);
  const last = steps.length - 1;
  const lo = steps[st.i], hi = steps[Math.min(st.i + 1, last)];
  return {
    type: "accessory", name, w: st.w, reps: lo === hi ? String(lo) : lo + "\u2013" + hi,
    sets, rpe, arch, moveId, db: !!db, cap: cap || "", spec: true, repN: lo, repHi: hi, inc: inc == null ? 5 : inc,
    top: hi === steps[last] && steps.length > 1, pkey: key, prog: st.prog,
  };
}

// primary frame module: 2 exercises × 3 sets (starting loads are suggestions — drive by double progression)
const FRAME_MODULE = {
  shoulders: (v) => [
    sx("Machine / DB Lateral Raise", 17.5, [10, 12, 15], 3, "8–9", "lateral", "lattue", true, "Lead with the elbow; traps quiet", 2.5, v),
    sx("Cable Lateral Raise", 25, [15, 20, 25], 3, "8–9", "lateral", "cablelat", false, "Constant tension; final set 9–10 OK Wks 1–2", 5, v),
  ],
  upperchest: (v) => [
    sx("Low-Incline Press (Smith/Machine/DB)", 65, [6, 8, 10], 3, "7.5–8.5", "incpress", "incline", true, "Low incline so the upper chest works, not the front delt", 5, v),
    sx("Low-to-High Cable Fly", 30, [12, 15, 20], 3, "8–9", "rearfly", "lowhigh", false, "Sweep up and in; squeeze the top", 5, v),
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
    sx("Incline DB Curl", 35, [10, 12, 15], 3, "8\u20139", "curl", "inccurl", true, "Stretch curl \u2014 arms hang behind you. Wednesday's preacher is the anchor; this is the second angle, hit fresh", 5, v),
    sx("Bayesian Cable Curl", 25, [10, 12, 15], 2, "8\u20139", "curl", "curlmon", false, "Arm behind the body, constant tension, biceps at full length. Superset with the overhead extension", 5, v),
    sx("Overhead Cable Extension", 70, [10, 12, 15], v >= 4 ? 4 : 3, "8\u20139", "ohtri", "ohrope", false, "Long head \u2014 the biggest triceps head, and only overhead work loads it at length. 4 sets: the triceps carry the bigger share of the arm block", 5, v),
  ],
  traps: (v) => [
    sx("Machine / Chest-Supported Shrug", 160, [8, 10, 15], 3, "8", "shrug", "shrug", false, "Brief hold at the top; no rolling", 10, v),
    sx("Chest-Supported Rear-Delt / Upper-Back Row", 95, [10, 12, 15], 3, "8", "row", "rowtue", false, "Stable, supported — deadlifts already load traps", 10, v),
  ],
};
const SECONDARY_SLOT = {
  shoulders: (v) => sx("Cable Lateral Raise", 20, [15, 20, 25], 2, "8–9", "lateral", "cablelat", false, "", 5, v),
  upperchest: (v) => sx("Low-to-High Cable Fly", 25, [12, 15, 20], 2, "8–9", "rearfly", "lowhigh", false, "", 5, v),
  latwidth: (v) => sx("Unilateral Cable Pulldown", 95, [10, 12, 15], 3, "8", "pulldown", "pulldown", false, "Keeps the taper visible while arms take priority", 10, v),
  upperback: (v) => sx("Reverse-Pec-Deck", 70, [15, 20, 25], 2, "8–9", "rearfly", "revpec", false, "", 10, v),
  arms: (v) => sx("Cable Preacher Curl", 60, [10, 12, 15], 2, "8–9", "curl", "preacher", false, "", 5, v),
  traps: (v) => sx("Machine Shrug", 160, [10, 12, 15], 2, "8", "shrug", "shrug", false, "", 10, v),
  none: () => null,
};
// balance slot: whichever delt area the primary frame is NOT hitting
function balanceSlot(framePrimary, v, reduced) {
  // 3D SHOULDERS (Wave 4+). Arms priority: the side delt's biggest exposure and the rear delt's third day.
  // The old arms filter dropped the rear-delt work on the premise that rows, chins and face pulls cover
  // it; a dedicated fly beat rows for the rear delt (Franke 2015), so it comes back.
  if (v >= 4 && framePrimary === "arms")
    return [sx("Cross-Body Cable Y-Raise", 20, [10, 12, 15], reduced ? 3 : 5, "8", "lateral", "xbody", false, "SIDE DELT, the week's biggest exposure: 5 sets. Trained side delts grew on 5 sets a session (Larsen 2025, taken to failure); stopping 1–2 reps short grew trained muscle as well (Refalo 2024), so stop at RPE 8. Start with the arm across the body for feel, raise out to shoulder height, elbow nearly straight, thumb level. Light, slow, no swinging", 5, v),
            sx("Chest-Supported Rear-Delt Raise (thumbs up)", 12.5, [12, 15, 20], reduced ? 2 : 3, "8", "rearfly", "rdraise", true, "REAR DELT + MID TRAPS, the third rear-delt day. Same 30° bench as the incline DB press: superset the two. Chest on the pad, arms hanging, THUMBS UP, sweep the arms out until they line up with your body, 1-s squeeze, no shrug. That thumbs-up path topped rear- and middle-delt activity in an EMG study (Reinold 2004). Stop at RPE 8; first two weeks RPE 7", 2.5, v, 4)];
  if (framePrimary === "upperback" || framePrimary === "traps" || framePrimary === "arms")
    return [sx("Cross-Body Cable Y-Raise", 20, [10, 12, 15], reduced ? 2 : 3, "8\u20139", "lateral", "xbody", false, "SIDE DELT. Start with the arm across the body for feel, raise out to shoulder height, elbow nearly straight, thumb level. Light, slow, no swinging", 5, v),
            sx("Reverse-Pec-Deck / Cable Rear-Delt Fly", 90, [15, 20, 25], reduced ? 2 : 3, "8\u20139", "rearfly", "revpec", false, "Rear delt \u2014 this is what rounds the shoulder from behind and keeps the cap from looking flat in profile", 10, v)].filter((b, k) => k === 0 || framePrimary !== "arms"); // arms, Waves 1-3 only: from Wave 4 the branch above restores rear-delt work
  return reduced ? [] : [sx("Reverse-Pec-Deck / Cable Rear-Delt Fly", 90, [15, 20, 25], 2, "8\u20139", "rearfly", "revpec", false, "Balance: rear delt", 10, v)];
}

// Sunday detail templates (optional day)
const DETAIL_TEMPLATE = {
  recommended: (v) => [
    sx("Cable Preacher Curl", 40, [8, 10, 12], 3, "8–9", "curl", "preacher", false, "Full stretch at the bottom", 5, v),
    sx("Bayesian Cable Curl", 35, [12, 15, 20], 3, "8–9", "curl", "curlmon", false, "Arm behind the body; constant tension", 5, v),
    sx("Hammer Curl", 35, [10, 12, 15], 2, "8", "curl", "hammer", true, "Neutral grip; slow negative", 5, v),
    sx("Rope Pushdown", 70, [12, 15, 20], 2, "8", "pushdown", "pushdown", false, "Elbows pinned; spread at the bottom", 5, v),
    sx("Reverse Cable Curl", 40, [15, 20, 25], 2, "8", "curl", "cablecurl", false, "Brachialis + forearm", 5, v),
    sx("Cable Lateral / Wrist Curl", 20, [15, 20, 25], 2, "8–9", "lateral", "cablelat", false, "Silhouette detail", 2.5, v),
  ],
  biceps: (v) => [
    sx("Cable / Machine Preacher Curl", 60, [8, 10, 12], 3, "8–9", "curl", "preacher", false, "Final set 9–10 OK Wk2 if elbows fresh", 5, v),
    sx("Bayesian Cable Curl", 25, [12, 15, 20], 3, "8–9", "curl", "curlmon", false, "Peak stretch; constant tension", 5, v),
    sx("Hammer Curl", 25, [10, 12, 15], 2, "8", "curl", "hammer", true, "Brachialis", 5, v),
    sx("Rope Pushdown", 50, [12, 15, 20], 2, "8", "pushdown", "pushdown", false, "Antagonist", 5, v),
    sx("Frame-Priority Isolation", 25, [15, 20, 25], 2, "8–9", "lateral", "cablelat", false, "2 sets for your secondary frame area", 5, v),
  ],
  triceps: (v) => [
    sx("Cable Preacher Curl", 40, [10, 12, 15], 3, "8–9", "curl", "preacher", false, "ANCHOR — first, fresh", 5, v),
    sx("Hammer Curl", 25, [10, 12, 15], 3, "8", "curl", "hammer", true, "Brachialis", 5, v),
    sx("Single-Arm Cross-Body Extension", 30, [12, 15, 20], 2, "7–8", "ohtri", "crossbody", false, "Light on purpose — the hard triceps work was Saturday", 5, v),
    sx("Cable Lateral Raise", 20, [15, 20, 25], 2, "8–9", "lateral", "cablelat", false, "Delt detail", 5, v),
    sx("Reverse Cable Curl", 30, [15, 20, 25], 2, "8", "curl", "cablecurl", false, "Forearm", 5, v),
  ],
  // used when arms is the SATURDAY primary: Saturday already carried the heavy
  // triceps (overhead + pushdown), so Sunday flips biceps-led. Anchor first,
  // antagonist supersets, one hard top set allowed in Week 2.
  armsPrimary: (v) => [
    sx("Cable / Machine Preacher Curl", 40, [8, 10, 12], 3, "8–9", "curl", "preacher", false, "ANCHOR — first, fresh. Week 2: final set may go RPE 9–10", 5, v),
    sx("Bayesian Cable Curl", 25, [12, 15, 20], 3, "8–9", "curl", "curlmon", false, "Superset with cross-body — arm behind the body, full stretch", 5, v),
    sx("Single-Arm Cross-Body Extension", 20, [12, 15, 20], 2, "8", "ohtri", "crossbody", false, "Superset partner — the one triceps pattern Saturday didn't use", 5, v),
    sx("Overhead Cable Extension", 60, [12, 15, 20], v >= 4 ? 2 : 3, "8–9", "ohtri", "ohrope", false, "Long head at length \u2014 keeps the optional day from being all curls. Elbows in, full stretch behind the head", 5, v),
    sx("Hammer Curl", 25, [10, 12, 15], 2, "8–9", "curl", "hammer", true, "Superset with laterals — brachialis", 5, v),
    sx("Cable Lateral Raise", 20, [15, 20, 25], 3, "8–9", "lateral", "cablelat", false, "Finisher — chase the burn", 5, v),
  ],
  brachialis: (v) => [
    sx("Rope Hammer Curl", 65, [8, 10, 12], 3, "8–9", "curl", "hammer", false, "Brachialis emphasis", 5, v),
    sx("Reverse Cable / EZ-Bar Curl", 50, [12, 15, 20], 3, "8–9", "curl", "cablecurl", false, "Forearm extensors", 5, v),
    sx("Cable Wrist Curl", 30, [15, 20, 25], 2, "8", "wrist", "wristcurl", false, "Flexors", 5, v),
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
// ENG-11: the weekday arm-block sets that move to Sunday when it runs (Wave 4+)
const SUNDAY_MOVES = new Set(["curlmon", "ohtue"]);
// the weekly side-delt cap (README invariants) and what counts toward it
const CAP_SIDE = 16;
const SIDE_DELT = (n) => /Lateral Raise|Cross-Body Cable Y-Raise/i.test(n || "") && !/Pulldown|Prone/i.test(n || "");
function sideDeltSetsMonSat(wave, week, sat) {
  let n = 0;
  for (const a0 of ACC) {
    if (a0.primer || !accLive(a0, wave) || (a0.day === 4 && THU_DROP.has(a0.id))) continue;
    if (!SIDE_DELT(accAt(a0, wave).name)) continue;
    const p = accFor(a0, wave, week); if (p) n += p.sets;
  }
  for (const b of sat || []) if (b && b.type === "accessory" && SIDE_DELT(b.name)) n += b.sets;
  return n;
}

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
    blocks.push(sx("Machine / Cable Lateral Raise", 12.5, [12, 15], 2, "6–7", "lateral", "cablelat", false, "Light maintenance — deliberately flat", 0, 1));
    blocks.push(sx("Reverse-Pec-Deck", 50, [15], 2, "6–7", "rearfly", "revpec", false, "Light maintenance", 0, 1));
    blocks.push(sx("Cable Triceps", 40, [12, 15], 2, "6–7", "pushdown", "pushdown", false, "Light maintenance", 0, 1));
    if (wave >= 4) { // the light-week crunch was heavier (100) than the working one (80): derive it from the working rung
      const cr = sx("Ab Wheel / Cable Crunch", 70, [8, 10, 12, 15], 2, "6–7", "crunch", "crunch", false, "Light maintenance", 10, wave);
      blocks.push({ ...cr, w: R5(cr.w * 0.7), reps: "10", repN: 10, repHi: 10, top: false, light: true });
    } else blocks.push(sx("Ab Wheel / Cable Crunch", 100, [10, 15], 2, "6–7", "crunch", "crunch", false, "", 0, 1));
    return blocks;
  }
  const reduced = week === 3 || cyc === 5; // Wk3 and Cycle 5: fewer sets
  const frame = FRAME_MODULE[spec.framePrimary](wave);
  frame.forEach((ex) => blocks.push({ ...ex, sets: reduced ? 2 : ex.sets, primary: true }));
  // declared weak points (Wave 3 feedback): a second upper-chest press angle and real grip work
  blocks.push(sx("Incline DB Press (30\u00b0)", 60, [8, 10, 12], reduced ? 2 : wave >= 4 ? 4 : 3, "8", "incpress", "incdb", true, "UPPER CHEST \u2014 dumbbells go deeper than the bar, so the clavicular pec is loaded at length. 30\u00b0 bench, elbows ~45\u00b0, stop the descent when the stretch peaks", 5, wave, 3));
  // UPPER TRAPS (Wave 4+): the second shrug day, 24 h AFTER the deadlift and 48 h before Monday's
  // anchor, so no trap or grip work lands in the 24 h before a deadlift. Straps on, before the
  // farmer hold so grip never limits it. The traps frame already shrugs, so it skips this.
  if (wave >= 4 && spec.framePrimary !== "traps") blocks.push(sx("Cable Y-Shrug (arms 30\u00b0 out)", 50, [10, 12, 15], reduced ? 2 : 3, "8", "shrug", "yshrug", false, "UPPER TRAPS, second weekly exposure (Monday's shrug is the anchor). Two low pulleys, hands about 30\u00b0 out from the sides (dumbbells if the pulleys are taken: then always dumbbells, so the log stays one implement). Shrug up and slightly in toward the ears, 1-s hold, full stretch at the bottom. Straps on: the farmer hold after it is the grip work. Arms out raised upper- and lower-trap activity over a standard shrug (Pizzari 2014). Stop at RPE 8; first two weeks RPE 7", 5, wave, 4));
  blocks.push(sx("Heavy Farmer Hold (seconds)", 80, [30, 40, 50], 2, "8\u20139", "shrug", "farmer", true, "FOREARMS \u2014 grip is the forearm's compound. Heaviest dumbbells you can hold for the time, shoulders back, no straps ever", 10, wave, 3));
  const triSpec = spec.detail === "triceps";
  // From Wave 4 a reduced week TRIMS the secondary slot to 2 sets instead of deleting it: deleting
  // it took the only Saturday lat work out of every week 3 and all of Cycle 5.
  if (!reduced || wave >= 4) {
    // the "omit secondary on triceps weeks" rule assumes a TORSO primary; when arms IS
    // the primary, dropping it would leave the day with zero back work.
    if (!triSpec || spec.framePrimary === "arms") {
      const sec = SECONDARY_SLOT[spec.frameSecondary || "none"](wave);
      if (sec) blocks.push(reduced ? { ...sec, sets: Math.min(sec.sets, 2) } : sec);
    }
  }
  if (triSpec) {
    // when arms IS the priority the module already has overhead work — don't double it
    if (spec.framePrimary !== "arms") blocks.push(sx("Overhead Cable Extension", 50, [10, 12, 15], reduced ? 2 : 3, "8–9", "ohtri", "ohrope", false, "Long-head bias — arms overhead", 5, wave));
    if (!reduced) blocks.push(sx("Rope / Single-Arm Pushdown", 90, [10, 12, 15], 3, "8–9", "pushdown", "pushdown", false, "", 5, wave));
  } else {
    if (spec.framePrimary === "arms") blocks.push(sx("Rope Pushdown", 50, [12, 15, 20], reduced ? 2 : 3, "8–9", "pushdown", "pushdown", false, "Lateral + medial head \u2014 overhead work is already in the module", 5, wave));
    else blocks.push(sx("Overhead Cable Extension", 50, [10, 12, 15], reduced ? 2 : 3, "8–9", "ohtri", "ohrope", false, "Triceps slot", 5, wave));
  }
  for (const b of balanceSlot(spec.framePrimary, wave, reduced)) blocks.push(b);
  blocks.push(sx("Ab Wheel / Cable Crunch", 70, [8, 10, 12, 15], 2, "8–9", "crunch", "crunch", false, "", 10, wave));
  // priority isolation goes early: the side-delt builder moves to second, right after the first curl
  const yi = blocks.findIndex((b) => /Y-Raise/.test(b.name || ""));
  if (yi > 2) { const [y] = blocks.splice(yi, 1); blocks.splice(2, 0, y); }
  // Wave 4+: the rear-delt raise sits right after the incline DB press: same bench, antagonist superset (Zhang 2025)
  const ri = blocks.findIndex((b) => b.pkey === "chest-supported-rear-delt-raise-thumbs-up");
  if (ri > -1) { const [r] = blocks.splice(ri, 1); blocks.splice(blocks.findIndex((b) => /Incline DB Press/.test(b.name || "")) + 1, 0, r); }
  return blocks;
}

// Sunday: optional detail — only Wks 1–2 of Cycles 1–4 and enabled
function sundaySession(wave, week, spec) {
  spec = spec || DEFAULT_SPEC;
  if (!sundayPlanned(wave, week, spec)) return null;
  const pick = () => (spec.framePrimary === "arms" ? DETAIL_TEMPLATE.armsPrimary(wave)
    : isDefaultSpec(spec) ? DETAIL_TEMPLATE.recommended(wave)
    : (DETAIL_TEMPLATE[spec.detail] || DETAIL_TEMPLATE.recommended)(wave));
  if (wave < 4) return pick();
  // Wave 4+: a Sunday exercise that shares a name with a Saturday one logs under "sun-<key>", so the two
  // templates (different seeds and rep ranges) never move each other's rung (ENG-5)
  const sat = saturdaySession(wave, week, spec);
  SX_TAKEN = new Set(sat.map((b) => b && b.pkey).filter(Boolean));
  let tmpl;
  try { tmpl = pick(); } finally { SX_TAKEN = null; }
  // ENG-11: the side-delt cap holds with Sunday on: Sunday's laterals take only what Mon-Sat left
  let room = CAP_SIDE - sideDeltSetsMonSat(wave, week, sat);
  return tmpl.map((b) => { if (!SIDE_DELT(b.name)) return b; const n = Math.max(0, Math.min(b.sets, room)); room -= n; return n ? { ...b, sets: n } : null; }).filter(Boolean);
}
function isDefaultSpec(spec) {
  return spec && spec.framePrimary === "shoulders" && spec.frameSecondary === "latwidth" && spec.detail === "triceps";
}

// ── warm-ups ────────────────────────────────────────────────────────
// the printed indicator (225 / 165 / 315), capped by the Wave 1 ratio to the base
// (225/315, 165/225, 315/405) so a calibrated or reset base never puts the bridge under it
const IND_PCT = { sq: 0.714, bn: 0.733, dl: 0.778 }, IND_FIXED = { sq: 225, bn: 165, dl: 315 };
function warmups(lift, wave, gates, week) {
  const { t, cb } = mainTables(wave, gates);
  // Wave 4+ deload: ramp only to the light triple. No indicator or bridge single heavier than the work.
  if (week === 4 && wave >= 4 && t[lift] && t[lift].l)
    return { sq: [["Bar", 10], [95, 5], [135, 5], [185, 3]], bn: [["Bar", 15], [95, 8], [135, 5], [155, 3]], dl: [[135, 5], [225, 3], [275, 2]] }[lift]
      .filter((r) => typeof r[0] !== "number" || r[0] < t[lift].l);
  const br = t.bridge ? t.bridge[lift] : null;
  const ind = Math.min(IND_FIXED[lift], R5(cb[lift] * IND_PCT[lift]));
  const ramp = {
    sq: [["Bar", 10], [95, 5], [135, 5], [185, 3]],
    bn: [["Bar", 15], [95, 8], [135, 5], [155, 3]],
    dl: [[135, 5], [225, 3], [275, 2]],
  }[lift].filter((r) => typeof r[0] !== "number" || r[0] < ind);
  const base = [...ramp, [ind, "1 · indicator — film"]];
  if (br && br > ind) base.push([br, "1 · bridge"]);
  return base;
}
const WARM_PS = [["Bar", 10], [95, 5], [135, 5], [175, 3]];
const WARM_PB = [["Bar", 15], [95, 8], [115, 5], [135, 3]];

// pre-press primers (band work, cap "PRIMER"): warm-up effort, no clock, pushed before the first press
function pushPrimers(push, ids, wave, week) {
  for (const id of ids) {
    const a0 = ACC.find((x) => x.id === id);
    if (!a0 || !accLive(a0, wave)) continue;
    const a = accAt(a0, wave), p = accFor(a0, wave, week);
    if (p) push({ type: "accessory", name: a.name, w: p.w, reps: p.reps, sets: p.sets, rpe: "7", db: false, moveId: a.moveId || a.id, cap: a.cap, pkey: a.id, prog: p.prog });
  }
}

// ── session builder ─────────────────────────────────────────────────
// returns ordered blocks for wave/week/day (1=Mon…5=Fri)
function sessionFor(wave, week, day, gates, spec, histCtx) {
  HISTCTX = histCtx || null;
  try {
    let blocks = sessionForInner(wave, week, day, gates, spec, histCtx);
    // Yellow (histCtx.ready === "Y"). From Wave 4 the day turns Yellow BEFORE autoregulation, so Rule A
    // reads the logged single against the Yellow single it was (cap 7), not the Green one; Waves 1-3
    // keep the order they ran in (autoregulate, then Yellow).
    const yellow = !!(histCtx && histCtx.ready === "Y");
    if (yellow && wave >= 4) blocks = yellowFor(blocks, wave);
    blocks = autoregulate(blocks, wave, week, day, histCtx);
    if (yellow && wave < 4) blocks = yellowFor(blocks, wave);
    return blocks;
  } finally { HISTCTX = null; }
}
// Week 2 targets the TOP of every weekend rep range, as accFor does on weekdays.
// The rung only advances when the top is reached, and one-tap logging records
// exactly what the chip shows, so a bottom-of-range chip could never progress.
function topWeek(blocks, week) {
  if (week !== 2) return blocks;
  return blocks.map((b) => (b && b.spec && b.repHi && b.repHi !== b.repN ? { ...b, repN: b.repHi, reps: String(b.repHi) } : b));
}
function sessionForInner(wave, week, day, gates, spec, opts) {
  spec = spec || DEFAULT_SPEC;
  const cycEarly = cycleOf(wave);
  // ── Saturday (day 6): frame-specialization overload ──
  if (day === 6) {
    const label = FRAME_LABEL[spec.framePrimary] || "Frame";
    const head = { type: "spechead", name: "Frame Specialization — " + label + " priority", note: cycEarly === 6 ? "Peak macro — spec paused." : week === 4 ? "Light week — maintenance only." : (week === 3 || cycEarly === 5) ? "Reduced sets this week." : "Overload day. Hit your weak point fresh — quality reps, not a set count.", moveId: null };
    return [head, ...topWeek(saturdaySession(wave, week, spec), week)];
  }
  // ── Sunday (day 7): optional detail ──
  if (day === 7) {
    const s = sundaySession(wave, week, spec);
    if (!s) return [{ type: "spechead", name: "Optional detail day — off", note: cycEarly > 4 ? "No weekend specialization in this cycle. Rest or an easy walk + conditioning." : week > 2 ? "Sunday detail runs only Weeks 1–2 of a cycle. Rest today." : (spec && spec.sundayOn) ? "Rest today." : "REST. Six hard days need a seventh off \u2014 recovery is where the sets you already did turn into muscle. Easy walk at most. (Optional detail day can be re-enabled in Specialize.)", moveId: null }];
    const label = DETAIL_LABEL[spec.detail] || "Detail";
    const head = { type: "spechead", name: "Optional Detail — " + (spec.framePrimary === "arms" ? "Biceps-led (Sat carried the triceps)" : isDefaultSpec(spec) ? "Arms & silhouette" : label), note: "Green only: 7h+ sleep, normal Fri deadlift + Sat, no elbow/shoulder pain, no flat session. Anchor first, then supersets — 35–45 min, 60–90s rest. Printed loads are FLOORS: if a set is easy, jump the weight and log what you did.", moveId: null };
    return [head, ...topWeek(s, week)];
  }
  const { cb, cyc, t } = mainTables(wave, gates);
  const blocks = [];
  const wk = week - 1; // 0-index for arrays of 3
  const dayLift = { 1: "sq", 2: "bn", 5: "dl" }[day];
  const push = (b) => blocks.push(b);
  const xfer = transfersActive(wave, week, spec); // volume transfers fund Sunday

  if (cyc === 6) return peakSession(wave, week, day, cb, gates, opts);

  if (dayLift) {
    push({ type: "warmup", name: LIFT_NAME[dayLift] + " warm-up", rows: warmups(dayLift, wave, gates, week) });
    if (day === 2 && cyc !== 6) pushPrimers(push, ["bander", "pullapart"], wave, week); // 60-90 s, before the bar touches your chest
    if (week < 4) {
      const cap = cyc === 5 ? RPE_CAP_C5[week] : RPE_CAP[week];
      const single = { type: "single", lift: dayLift, name: LIFT_NAME[dayLift] + " — top single", w: t[dayLift].s[wk], reps: 1, sets: 1, rpe: cap, moveId: dayLift, pkey: dayLift + "-single" };
      if (cyc === 4 && wave >= 4) single.note = COMMANDS[dayLift]; // Specificity: competition-strict singles
      push(single);
      const [bw, br_, bs] = t[dayLift].b[wk];
      push({ type: "backoff", lift: dayLift, name: LIFT_NAME[dayLift] + " — back-offs", w: bw, reps: br_, sets: bs, rpe: week === 3 ? "7.5–8" : week === 2 ? "7–7.5" : "6.5–7", moveId: dayLift, pkey: dayLift + "-back" });
    } else {
      push({ type: "backoff", lift: dayLift, name: LIFT_NAME[dayLift] + " — light triple", w: t[dayLift].l, reps: 3, sets: 3, rpe: "5–6", light: true, moveId: dayLift, pkey: dayLift + "-light" });
    }
  }
  if (day === 3) {
    push({ type: "warmup", name: "Paused squat warm-up", rows: WARM_PS });
    const scheme = week === 4 ? [5, 2] : [[5, 4], [4, 4], [3, 4]][wk];
    const psW = t.ps[wk] ?? t.ps[3];
    if (week === 4) push({ type: "paused", lift: "sq", name: "Paused Squat (2-sec pause)", w: psW, reps: scheme[0], sets: scheme[1], rpe: "5–6", moveId: "ps", pkey: "ps", ...(wave >= 4 ? { light: true } : {}) });
    else {
      const hyp = Math.floor(scheme[1] / 2);
      push({ type: "paused", lift: "sq", name: "Paused Squat (2-sec pause)", w: psW, reps: scheme[0], sets: scheme[1] - hyp, rpe: ["6", "6.5", "7"][wk], moveId: "ps", pkey: "ps", note: "Specificity work: perfect bottom position, nothing heroic" });
      if (wave >= 4) { // 8 reps @ RPE 7.5 = 72.3% of the week's planned e1RM (RTS chart); the paused bar ran ~RPE 6
        const e1 = t.sq.s[wk] / pctAt(capNum(cyc === 5 ? RPE_CAP_C5[week] : RPE_CAP[week]));
        push({ type: "paused", lift: "sq", name: "Squat — hypertrophy back-offs (no pause)", w: R5(e1 * 0.723), reps: 8, sets: hyp, rpe: "7.5–8", moveId: "sq", pkey: "psh", hyp: true, note: "Add weight after the paused sets: 8 reps, about 2 in reserve. This is the growth set the paused work was never doing" });
      } else push({ type: "paused", lift: "sq", name: "Squat — hypertrophy back-offs (no pause)", w: psW, reps: 8, sets: hyp, rpe: "7.5–8", moveId: "sq", pkey: "psh", hyp: true, note: "Same bar, no pause, 6–8 reps. This is the growth set the paused work was never doing" });
    }
  }
  if (day === 4) {
    push({ type: "warmup", name: "Paused bench warm-up", rows: WARM_PB });
    pushPrimers(push, ["bander"], wave, week); // Thursday is the heaviest shoulder day: cuff primer first
    const scheme = week === 4 ? [5, 3] : [[6, 4], [5, 5], [4, 5]][wk];
    const pbW = t.pb[wk] ?? t.pb[3];
    if (week === 4) push({ type: "paused", lift: "bn", name: "Paused Bench (1–2 sec pause)", w: pbW, reps: scheme[0], sets: scheme[1], rpe: "5–6", moveId: "pb", pkey: "pb", ...(wave >= 4 ? { light: true } : {}) });
    else {
      const hyp = Math.floor(scheme[1] / 2);
      push({ type: "paused", lift: "bn", name: "Paused Bench (1–2 sec pause)", w: pbW, reps: scheme[0], sets: scheme[1] - hyp, rpe: ["6.5–7", "7", "7–7.5"][wk], moveId: "pb", pkey: "pb", note: wave >= 4 ? "Specificity work: crisp pause, chest tight. Hold the pause until a partner says PRESS, and have him vary the count (alone: a full second after the bar is still)" : "Specificity work: crisp pause, chest tight" });
      // UPPER CHEST (Wave 4+): the growth sets move to a 30° incline. Incline-only training
      // grew the clavicular pec clearly more than flat (Chaves 2020); the paused sets above
      // keep the competition bench practice.
      if (wave >= 4) push({ type: "paused", lift: "inc", name: "Incline Bench — hypertrophy back-offs (30°)", w: R5(trackedCB("inc", wave, gates) * 0.73), reps: 8, sets: hyp, rpe: "7.5–8", moveId: "incbb", pkey: "incbbh", hyp: true, note: "UPPER CHEST. Same 30° bench as Tuesday, 6–8 reps, bar to the upper chest. The paused sets above are the meet practice; these are the growth sets" });
      else push({ type: "paused", lift: "bn", name: "Bench — hypertrophy back-offs (no pause)", w: pbW, reps: 8, sets: hyp, rpe: "7.5–8", moveId: "bn", pkey: "pbh", hyp: true, note: "Same bar, touch-and-go, 6–8 reps. The chest and triceps growth set" });
    }
    const o = ohpFor(wave, gates)[week - 1];
    push({ type: "ohp", name: "Overhead Press", w: o[0], reps: o[1], sets: o[2], rpe: week === 4 ? "5–6" : "7–8", note: "Add reps to 3×8 clean → +5 lb → back to 3×6", moveId: "ohp", pkey: "ohp", ...(week === 4 && wave >= 4 ? { light: true } : {}) });
  }
  // Thursday sheds its delt/triceps isolation → migrated into Saturday's specialization (THU_DROP)
  if (day === 2 && cyc !== 6) for (const b of trackedFor("inc", wave, week, gates)) push(b);
  if (day === 4 && cyc !== 6) for (const b of trackedFor("dip", wave, week, gates)) push(b);
  if (day === 5 && cyc !== 6) {                       // hamstrings + arms, tracked and ramping
    for (const b of trackedFor("rdl", wave, week, gates)) push(b);
    for (const b of trackedFor("chin", wave, week, gates)) push(b);
  }
  for (const a0 of ACC.filter((x) => x.day === day)) {
    if (day === 4 && THU_DROP.has(a0.id)) continue;
    if (a0.primer) continue;              // already pushed as a pre-press primer
    if (!accLive(a0, wave)) continue;     // not in the plan yet (from), or retired (until)
    if (xfer && wave >= 4 && SUNDAY_MOVES.has(a0.id)) continue; // ENG-11: these sets move to Sunday
    const a = accAt(a0, wave);
    const p = accFor(a0, wave, week);
    if (!p) continue;
    // frame bias: lat-width / upper-back priority trims the Friday row to 2 sets
    let sets = p.sets;
    if (day === 5 && (a.id === "rowfri" || a.id === "rowhi") && (spec.framePrimary === "latwidth" || spec.framePrimary === "upperback") && week < 4) sets = Math.min(sets, 2);
    push({ type: "accessory", name: a.name, w: p.w, reps: p.reps, sets, rpe: p.rpe, db: a.db, top: p.top, moveId: a.moveId || a.id, cap: a.cap, pkey: a.id, prog: p.prog, lastHard: p.lastHard, lp: !!(a.lp && p.lastHard), inc: a.inc, light: !!p.light });
  }
  if (day === 4 && week < 4 && xfer) push(wave >= 4
    ? { type: "note", name: "Sunday runs this week", note: "Monday's Bayesian curl and Tuesday's overhead extension moved to Sunday, so the arm block stays inside the 16-set caps." }
    : { type: "note", name: "Delt & triceps isolation → Saturday", note: "Your side-delt, rear-delt and pushdown work lives in Saturday's frame day now." });
  if (day === 3 && cyc !== 6) {
    const walk = week === 4 ? "15 min · 2.8 mph · 4%" : ["20 min · 3 mph · 6%", "20 min · 3 mph · 7%", "15 min · 3 mph · 5%"][wk];
    push({ type: "conditioning", name: "Incline Walk", note: walk });
  }
  // 5-min mobility cooldown — flexibility lives inside sessions or it doesn't live at all.
  // Distinct type: Yellow mode drops conditioning but KEEPS the cooldown.
  // Stretches are for comfort and range; posture itself is trained by the rows, face pulls and Y-raises
  // (strengthening improved posture, stretching did not: Warneke 2024).
  const COOL = { 1: "MOBILITY: couch stretch 2×30s/side (hip flexors) · ankle rocks 15/side · dead hang 30s", 2: "MOBILITY: doorway pec stretch 2×30s · cross-body delt 30s/side · wall slides ×10", 3: "90/90 hips 60s/side · standing hamstring 45s/side", 4: "MOBILITY: thoracic extension over bench 45s · lat hang 45s · chin tucks ×10", 5: "Hamstring 60s/side · figure-4 glute 45s/side · shake the grip out" };
  if (COOL[day]) push({ type: "cooldown", name: "Cooldown — 5 min", note: COOL[day] + " · easy breathing, no bouncing" });
  return blocks;
}

// Cycle 6 (waves 6, 12, 18): the peak
function peakSession(wave, week, day, cb, gates, opts) {
  const blocks = [];
  const dayLift = { 1: "sq", 2: "bn", 5: "dl" }[day];
  const push = (b) => blocks.push(b);
  const ctx = opts && opts.index ? opts : null, entered = targetsOf((opts || {}).testMax, wave);
  if (week === 4) {
    // Travis 2020: volume down 30-50%+, intensity held (>=85%), last heavy work
    // several days out, then rest. Mon = the last heavy touch (4 days out).
    const pe = peakEstimate(wave, gates, ctx, 4), att = testAttempts(cb, entered, pe.est), kg = attemptsKg(att);
    if (day === 1) push({ type: "test", name: "TAPER \u2014 last heavy touch, then rest", note: `Squat opener ${kg.sq.a1} kg (${lbFloor(kg.sq.a1)} lb) \u00d7 1, then bench opener ${kg.bn.a1} kg (${lbFloor(kg.bn.a1)} lb) \u00d7 1. Crisp, nothing more. Intensity stays up, volume goes to almost nothing. Deadlift's last heavy pull was last Friday. Test is Friday.` });
    if (day === 2) push({ type: "test", name: "TAPER \u2014 optional light bench", note: `2\u20133 crisp doubles at ${R5(cb.bn * 0.75)}, only if it reliably helps you. Otherwise rest. Test is Friday.` });
    if (day === 3 || day === 4) push({ type: "test", name: "TAPER \u2014 full rest", note: "Walk, eat, sleep. Nothing heavier than a warm-up. Test is Friday." });
    if (day === 5) {
      const meet = opts && opts.meetDate ? Date.parse(opts.meetDate) : NaN, fri = sessionDayUTC(wave, 4, 5, SH(opts));
      const isMeet = Number.isFinite(meet) && meet >= fri && meet - fri < 3 * MS_DAY; // the meet is this Friday or that weekend
      push({ type: "test", name: isMeet ? `MEET — ${new Date(meet).toUTCString().slice(0, 11)}: 1st/2nd/3rd attempts` : "TEST DAY — 1st/2nd/3rd attempts", note: (isMeet ? "Hand these in at weigh-in (kg). " : "") + "Squat → Bench → Deadlift. Safeties + spotters. No misses. " + COMMANDS.sq + " " + COMMANDS.bn + " " + COMMANDS.dl, attempts: att, est: pe });
    }
    return blocks;
  }
  if (dayLift) {
    push({ type: "warmup", name: LIFT_NAME[dayLift] + " warm-up", rows: warmups(dayLift, wave, gates, week) });
    if (day === 2) pushPrimers(push, ["bander", "pullapart"], wave, week); // primers go before pressing in a peak too
    if (week === 3) { // opener practice = the opener he will hand in, in kg, loaded at or under it in lb
      const pe = peakEstimate(wave, gates, ctx, 3), kg = attemptsKg(testAttempts(cb, entered, pe.est))[dayLift].a1;
      push({ type: "single", lift: dayLift, name: `${LIFT_NAME[dayLift]} \u2014 opener ${kg} kg`, w: lbFloor(kg), reps: 1, sets: 1, rpe: PEAK_CAP[2], moveId: dayLift, pkey: dayLift + "-single", note: COMMANDS[dayLift], kg });
    } else push({ type: "single", lift: dayLift, name: LIFT_NAME[dayLift] + " \u2014 top single", w: R5(cb[dayLift] * PEAK_SP[week - 1]), reps: 1, sets: 1, rpe: PEAK_CAP[week - 1], moveId: dayLift, pkey: dayLift + "-single", note: COMMANDS[dayLift] });
    const back = week === 1 ? [R5(cb[dayLift] * 0.77), 3, 3, "7"] : week === 2 ? [R5(cb[dayLift] * 0.79), 2, 3, "7–7.5"] : [R5(cb[dayLift] * 0.70), 2, 2, "easy"];
    push({ type: "backoff", lift: dayLift, name: LIFT_NAME[dayLift] + " — back-offs", w: back[0], reps: back[1], sets: back[2], rpe: back[3], moveId: dayLift, pkey: dayLift + "-back" });
  }
  if (day === 3 && week <= 2) {
    push({ type: "paused", lift: "sq", name: "Paused Squat (easy)", w: R5(cb.sq * (week === 1 ? 0.66 : 0.60)), reps: 5, sets: week === 1 ? 3 : 2, rpe: "6", moveId: "ps", pkey: "ps" });
  }
  if (day === 4 && week <= 2) {
    pushPrimers(push, ["bander"], wave, week);
    push({ type: "paused", lift: "bn", name: "Paused Bench (easy)", w: R5(cb.bn * (week === 1 ? 0.68 : 0.60)), reps: 5, sets: week === 1 ? 3 : 2, rpe: "6", moveId: "pb", pkey: "pb" });
  }
  if (week === 3) {
    if (day === 3 || day === 4) push({ type: "test", name: "Opener week — 1–2 easy accessories only", note: "No OHP, no arm work, no conditioning fatigue this week." });
  } else {
    // Truth: the peak used to skip THU_DROP and the from/until gates, so retired Thursday
    // laterals and rear-delt flys came back every peak.
    for (const a0 of ACC.filter((x) => x.day === day)) {
      if (a0.primer || !accLive(a0, wave) || (day === 4 && THU_DROP.has(a0.id))) continue;
      const a = accAt(a0, wave), p = accFor(a0, wave, week);
      if (!p) continue;
      push({ type: "accessory", name: a.name, w: p.w, reps: p.reps, sets: p.sets, rpe: "7 (easy)", db: a.db, moveId: a.moveId || a.id, cap: a.cap, pkey: a.id, prog: p.prog });
    }
  }
  return blocks;
}

// USPA Technical Rules 2025v1: 4.1.5/4.1.8 squat, 4.3.7/4.3.10/4.3.11 bench, 4.5.5 deadlift.
const COMMANDS = {
  sq: "Meet commands: walk out, stand still, wait for SQUAT; hold the lockout until RACK.",
  bn: "Meet commands: arms locked and still, wait for START; bar motionless on the chest until PRESS; hold the lockout until RACK. Never move before the call.",
  dl: "Meet commands: hold the lockout, standing tall, until DOWN; then lower it under control with both hands.",
};
// peak singles: weeks 1-2 of a peak wave (week 3 is the kg opener)
const PEAK_SP = [0.89, 0.91], PEAK_CAP = ["8", "8–8.5", "7–8 · the weight you hand in"];
// a kg load shown in lb, rounded DOWN to a 2.5 lb step so the bar never passes the kg weight
const lbFloor = (kg) => Math.floor(kg * LB_PER_KG / 2.5 + 1e-9) * 2.5;
// the targets the lifter typed for a peak wave: {L: lb}. Takes {target, made} entries and legacy numbers.
function targetsOf(testMax, wave) {
  const row = (testMax || {})[wave] || {}, out = {};
  for (const L of LIFTS) { const v = row[L], n = v && typeof v === "object" ? v.target : v; if (Number.isFinite(+n) && +n > 0) out[L] = +n; }
  return out;
}
// estimated max for a test: the latest rated single of the peak wave before `beforeWeek` (week 3, 2,
// then 1); unrated -> the plan's own e1RM of the week-2 single at its cap (RPE 8).
function peakEstimate(wave, gates, ctx, beforeWeek = 4) {
  const cb = cbFor(wave, gates), est = {}, src = {}, dayOf = { sq: 1, bn: 2, dl: 5 };
  for (const L of LIFTS) {
    for (let wk = Math.min(3, beforeWeek - 1); wk >= 1 && est[L] == null; wk--) {
      const e = ctx && ctx.index ? ratedAt(ctx.index, L + "-single", wave, wk, dayOf[L], SH(ctx)) : null;
      if (!e) continue;
      const cap = capNum(PEAK_CAP[wk - 1]);
      est[L] = e1rm(e, cap); src[L] = { week: wk, w: e.w, rpe: effRPE(e, cap) };
    }
    if (est[L] == null) { est[L] = Math.round(R5(cb[L] * PEAK_SP[1]) / pctAt(8)); src[L] = null; }
  }
  return { est, src };
}
// Attempts off the target: opener ~91% (a weight made on the worst day), second ~95.5%, third =
// the target (Travis 2021). Default target = the estimated max x 1.02, a taper allowance (judgment);
// an entered target always wins. EVIDENCE.md: "Test day".
function testAttempts(cb, entered = {}, est = {}) {
  const out = {};
  for (const L of LIFTS) {
    const e = Number.isFinite(est[L]) ? est[L] : R5(cb[L] * PEAK_SP[1]) / pctAt(8);
    const tm = entered[L] || R5(e * 1.02);
    out[L] = {
      max: tm, est: Math.round(e),
      a1: R5(tm * 0.91),
      a2: R5(tm * 0.955),
      a3: tm,
      a3note: "only if the 2nd moved well: take the target, or adjust ±" + (L === "bn" ? "2.5–5" : "5–10"),
    };
  }
  return out;
}
// the next wave's base after a test: 96% of the best made lift, so the next
// build starts from submaximal work instead of from a peaked max
const postTestBase = (max) => R5(max * 0.96);
// Test-day entries (MEET-2). TARGET drives the attempts only. MADE is accepted from the test Friday on
// and sets the next wave's base at 96% of it. Clearing a field deletes it (and a made lift's pin).
// Pure: returns new objects; a refused entry returns the inputs unchanged with `refused`.
function applyTestEntry(testMax, gates, w, L, field, value, todayMs, off) {
  const v = value === "" || value == null ? null : +value;
  if (v != null && !(Number.isFinite(v) && v > 0)) return { testMax, gates, refused: "not a number" };
  if (field === "made" && v != null && todayMs < sessionDayUTC(w, 4, 5, off || 0)) return { testMax, gates, refused: "before the test" };
  const tm = JSON.parse(JSON.stringify(testMax || {})), g = JSON.parse(JSON.stringify(gates || {}));
  const row = (tm[w] = tm[w] || {});
  let cur = row[L]; cur = cur != null && typeof cur !== "object" ? { target: +cur } : { ...(cur || {}) };
  if (v == null) delete cur[field]; else cur[field] = v;
  if (Object.keys(cur).length) row[L] = cur; else delete row[L];
  if (!Object.keys(row).length) delete tm[w];
  if (field === "made") {
    const gw = (g[w + 1] = g[w + 1] || {});
    gw.cb = gw.cb || {};
    if (v == null) delete gw.cb[L]; else gw.cb[L] = postTestBase(v);
    if (!Object.keys(gw.cb).length) delete gw.cb;
    if (!Object.keys(gw).length) delete g[w + 1];
  }
  return { testMax: tm, gates: g };
}
// MEET-6: line a peak's test Friday up with the meet. The target is the latest peak whose test Friday
// falls on or before the meet; each missing week repeats WEEK 2 of one wave before it (newest waves
// first), so the extra time is loading, not a second deload. Every segment starts after today and the
// last logged day. Returns {weeks, wave, segments} or {warn}. Pure.
function meetAlign(meetDk, shifts, todayMs, lastLoggedMs) {
  const meet = Date.parse(meetDk);
  if (!Number.isFinite(meet)) return { warn: "Not a date." };
  const meetFri = meet - ((((Math.floor((meet - WAVE1_MONDAY) / MS_DAY) % 7) + 7) % 7 + 3) % 7) * MS_DAY; // Friday on or before
  const sh = Array.isArray(shifts) ? shifts.slice() : [], floor = Math.max(todayMs, lastLoggedMs || 0);
  let w = null;
  for (let k = 6; k <= 18; k += 6) if (sessionDayUTC(k, 4, 5, sh) <= meetFri) w = k;
  if (w == null || sessionDayUTC(w, 4, 5, sh) <= floor) return { warn: "The meet comes before the next peak's test day. Pick the peak you will meet from, or move the meet." };
  const weeks = Math.round((meetFri - sessionDayUTC(w, 4, 5, sh)) / (7 * MS_DAY));
  if (weeks === 0) return { weeks: 0, wave: w, segments: [] };
  const waves = [];
  for (let k = w - 1; k >= 1 && waves.length < weeks; k--) if (cycleOf(k) !== 6 && sessionDayUTC(k, 3, 1, sh) > floor) waves.push(k);
  if (waves.length < weeks) return { warn: `Only ${waves.length} wave(s) left before the Wave ${w} peak to take ${weeks} extra week(s).` };
  const segments = [];
  for (const k of waves.reverse()) { // oldest first: each segment is dated on the schedule the earlier ones made
    const seg = { from: new Date(sessionDayUTC(k, 3, 1, [...sh, ...segments])).toISOString().slice(0, 10), weeks: 1, wave: k };
    segments.push(seg);
  }
  return { weeks, wave: w, segments: segments.map(({ from, weeks: n }) => ({ from, weeks: n })) };
}
// NUT-5: the plan's no-trim windows (Cycles 5-6, Intensification and Peak): from the Intensification
// Monday to the peak's test Friday, on the shifted schedule. Pure.
function noTrimWindows(off) {
  const dk = (t) => new Date(t).toISOString().slice(0, 10), out = [];
  for (let w = 5; w <= 19; w += 6) out.push({ from: dk(waveStartUTC(w, off || 0)), to: dk(sessionDayUTC(w + 1, 4, 5, off || 0)), label: `Wave ${w} (${CYCLE_NAME[cycleOf(w)]})`, after: `the Wave ${w + 1} test` });
  return out;
}
// DATA-2: clean a stored state or a backup to the shapes the app reads. Whatever cannot be read is
// dropped and counted, so a malformed file can never blank the app. {ok:false} = not a backup at all.
function sanitizeState(d) {
  const DK = /^\d{4}-\d{2}-\d{2}$/, num = (x) => typeof x === "number" && Number.isFinite(x), obj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
  if (!obj(d) || !obj(d.logs)) return { ok: false, state: null, dropped: 0 };
  let dropped = 0;
  const out = { ...d, logs: {} };
  for (const [k, log] of Object.entries(d.logs)) {
    if (!DK.test(k) || !obj(log)) { dropped++; continue; }
    const L = { ...log };
    if (L.sets != null) {
      if (!obj(L.sets)) { delete L.sets; dropped++; }
      else {
        const sets = {};
        for (const [bk, arr] of Object.entries(L.sets)) {
          if (!Array.isArray(arr)) { dropped++; continue; }
          const good = arr.filter((x) => obj(x) && num(x.w) && num(x.r));
          dropped += arr.length - good.length;
          if (good.length) sets[bk] = good;
        }
        L.sets = sets;
      }
    }
    if (L.sleep != null && !num(L.sleep)) { delete L.sleep; dropped++; }
    if (L.swap != null && !obj(L.swap)) { delete L.swap; dropped++; }
    if (L.wu != null && !(num(L.wu) && L.wu >= 0)) { delete L.wu; dropped++; } // warm-up rows ticked off on the Now card
    out.logs[k] = L;
  }
  const keep = (field, ok) => { if (d[field] == null) return; if (!obj(d[field])) { delete out[field]; dropped++; return; } out[field] = {}; for (const [k, v] of Object.entries(d[field])) { if (ok(k, v)) out[field][k] = v; else dropped++; } };
  keep("bw", (k, v) => DK.test(k) && num(v));
  keep("food", (k, v) => DK.test(k) && Array.isArray(v) && v.every((x) => obj(x) && num(x.kcal)));
  keep("meas", (k, v) => DK.test(k) && obj(v) && Object.values(v).every(num));
  keep("photos", (k, v) => DK.test(k) && (v === 1 || v === true));
  for (const f of ["gates", "testMax", "settings", "spec", "nutri", "ledger", "primer"]) if (d[f] != null && !obj(d[f])) { delete out[f]; dropped++; }
  return { ok: true, state: out, dropped };
}
// DATA-5: move sets stored by block position ("b3", "r0") to the exercise key they carry, so a spec
// change or a reordered day can never put a past set on another exercise. Sets without a key stay put.
function migrateSetKeys(logs) {
  const out = JSON.parse(JSON.stringify(logs || {}));
  for (const log of Object.values(out)) {
    if (!log || !log.sets) continue;
    for (const [bk, arr] of Object.entries(log.sets)) {
      if (!/^[br]\d+$/.test(bk) || !Array.isArray(arr) || !arr.length || !arr.every((x) => x && x.k) || new Set(arr.map((x) => x.k)).size !== 1) continue;
      const nk = (bk[0] === "r" ? "r:" : "") + arr[0].k;
      log.sets[nk] = [...(log.sets[nk] || []), ...arr];
      delete log.sets[bk];
    }
  }
  return out;
}
// one-time migration of the old single "Target / made" box: a number typed before the test date was a
// target, and the base pin it wrote (96% of it) is removed; one typed on or after the test day stays a
// made lift. Pure, like applyTestEntry.
function migrateTestMax(testMax, gates, todayMs, off) {
  const tm = JSON.parse(JSON.stringify(testMax || {})), g = JSON.parse(JSON.stringify(gates || {}));
  for (const w of Object.keys(tm).map(Number)) {
    if (!(w >= 1) || cycleOf(w) !== 6) continue;
    const before = todayMs < sessionDayUTC(w, 4, 5, off || 0);
    for (const L of LIFTS) {
      const v = tm[w][L];
      if (v == null || typeof v === "object") continue;
      const pin = g[w + 1] && g[w + 1].cb ? g[w + 1].cb[L] : null;
      if (before) { tm[w][L] = { target: +v }; if (pin === postTestBase(+v)) delete g[w + 1].cb[L]; }
      else tm[w][L] = pin === postTestBase(+v) ? { made: +v } : { target: +v };
    }
    if (g[w + 1] && g[w + 1].cb && !Object.keys(g[w + 1].cb).length) delete g[w + 1].cb;
    if (g[w + 1] && !Object.keys(g[w + 1]).length) delete g[w + 1];
  }
  return { testMax: tm, gates: g };
}
// USPA meets load in kilograms, in 2.5 kg steps. The opener rounds DOWN (it must
// go on the worst day); the 2nd and 3rd round to the nearest plate.
const LB_PER_KG = 2.20462;
const kgDown = (lb) => Math.floor(lb / LB_PER_KG / 2.5 + 1e-9) * 2.5;
const kgNear = (lb) => Math.round(lb / LB_PER_KG / 2.5) * 2.5;
function attemptsKg(att) {
  const out = {};
  for (const L of Object.keys(att)) out[L] = { a1: kgDown(att[L].a1), a2: kgNear(att[L].a2), a3: kgNear(att[L].a3) };
  return out;
}
// e1RM for the strength chart: a rated single goes through the RPE table; other
// sets use Epley, only up to 10 reps where it stays honest
function e1rm(st, cap) {
  if (!st || !(st.w > 0) || !(st.r >= 1)) return null;
  if (st.r === 1) { const r = effRPE(st, cap); return Math.round(r != null ? st.w / pctAt(r) : st.w * (1 + 1 / 30)); }
  return st.r <= 10 ? Math.round(st.w * (1 + st.r / 30)) : null;
}

// one day of one lift for the strength chart. A rated single (or tracked top set) goes through the RPE
// table; otherwise back-off sets go through reps to failure at their capped RPE (stored cap, else the
// week's plan). Red days, deload weeks and light sets never count.
function dayE1RM(sets, opts = {}) {
  if (opts.red || opts.week === 4) return null;
  const s = (sets || []).filter((x) => x && x.w > 0 && x.r >= 1 && !/-(light|red)$/.test(x.k || ""));
  const isTop = (x) => /-(single|top)$/.test(x.k || ""), capOf = (x, d) => (Number.isFinite(x.cap) ? x.cap : d);
  const top = [...s].reverse().find((x) => isTop(x) && rated(x));
  if (top) return Math.round(top.w / pctReps(top.r, effRPE(top, capOf(top, opts.cap || 8))));
  const backs = s.filter((x) => /-back$/.test(x.k || "") && x.r <= 10);
  const wkRpe = { 1: 6.5, 2: 7, 3: 7.5 }[opts.week] || 7;
  if (backs.length) return Math.round(Math.max(...backs.map((x) => x.w / pctReps(x.r, Number.isFinite(x.rpe) ? x.rpe : capOf(x, wkRpe)))));
  const u = s.find(isTop);
  return u ? Math.round(u.w / pctReps(u.r, capOf(u, opts.cap || 8))) : null;
}
// LOG-7: swaps for a busy gym, same muscle and length bias (judgment). A swapped exercise logs under
// "<pkey>~<slug>", so it never moves the planned exercise's rung.
const ALT = {
  rowhi: ["Seated Cable Row (wide grip)", "T-Bar Row (chest pad, wide grip)"],
  rowtue: ["Seated Cable Row (close grip)", "Single-Arm DB Row"],
  legpress: ["Hack Squat", "Pendulum Squat"],
  hamMon: ["Lying Leg Curl"], seatcurl3: ["Lying Leg Curl"],
  preacher: ["DB Preacher Curl"],
  ohtue: ["DB Overhead Extension"], ohthu: ["DB Overhead Extension"],
  latwed: ["DB Lateral Raise"], lattue: ["Cable Lateral Raise"],
  lowhigh: ["Incline DB Fly"],
  revpec: ["Cable Rear-Delt Fly"], facepull: ["Band Face Pull"],
};
const altKey = (pkey, name) => pkey + "~" + pkeyOf(name);
// yellow transform: single cap RPE 7, back-off −5% (or −1 set), 2 sets/accessory with nothing past
// RPE 8 (no failure set, no partials), skip cardio. sessionFor applies it when histCtx.ready === "Y".
function yellowW(block) {
  if (block.type === "single") return { ...block, rpe: 7, note: "Yellow: cap @ RPE 7" };
  if (block.type === "backoff" || block.type === "paused") return { ...block, w: R5(block.w * 0.95), note: "Yellow: −5% (or keep weight, −1 set)" };
  if (block.type === "accessory" || block.type === "ohp") return { ...block, sets: Math.min(block.sets, 2), rpe: "≤8", lastHard: false, lp: false, note: "Yellow: 2 sets cap, nothing past RPE 8" };
  if (block.type === "conditioning") return null;
  return block;
}
// a whole Yellow day. From Wave 4 the main-lift single is also lightened to what the planned load
// would be at RPE 7 (load x %1RM@7 / %1RM@cap), so "cap 7" and the number on the card agree.
function yellowFor(blocks, wave) {
  return blocks.map((b) => {
    const y = yellowW(b);
    if (y && b.type === "single" && wave >= 4 && LIFTS.includes(b.lift)) y.w = R5(b.w * pctAt(7) / pctAt(capNum(b.rpe)));
    return y;
  }).filter(Boolean);
}
function redSession(wave, day, gates) {
  if (day === 6) return [{ type: "spechead", name: "RED — skip specialization", note: "Frame work is optional physique volume (priority 5–6). On a Red day it's the first thing to cut. Rest, eat, sleep." }];
  if (day === 7) return [{ type: "spechead", name: "RED — no optional day", note: "Sunday is skippable at the best of times. Today, skip it. Recover." }];
  const { t } = mainTables(wave, gates);
  const dayLift = { 1: "sq", 2: "bn", 5: "dl" }[day];
  const reds = t.red || [R5(cbFor(wave, gates).sq * 0.6), R5(cbFor(wave, gates).bn * 0.6), R5(cbFor(wave, gates).dl * 0.6)];
  const map = { sq: reds[0], bn: reds[1], dl: reds[2] };
  const blocks = [];
  if (dayLift) blocks.push({ type: "backoff", lift: dayLift, name: LIFT_NAME[dayLift] + " — RED day 3×3", w: map[dayLift], reps: 3, sets: 3, rpe: "≤6", moveId: dayLift, pkey: dayLift + "-red", light: true, note: "Skip the single. 1–2 easy accessories. Out in 30–45 min." });
  else blocks.push({ type: "test", name: "RED day — main lift 3×3 @ 60% only", note: "Sq " + map.sq + " · Bn " + map.bn + " · DL " + map.dl + " · pain/illness → rest instead" });
  return blocks;
}

// ── autoregulation (EVIDENCE.md: Rules A-D) ────────────────────────────
// Loads are planned from the base; how the day's sets actually felt adjusts them.
// %1RM for a single at each RPE (RIR-based RPE, Zourdos 2016 / Helms 2016; the
// Tuchscherer RTS single-rep column).
const RPE_PCT_1 = { 6: 0.863, 6.5: 0.878, 7: 0.892, 7.5: 0.907, 8: 0.922, 8.5: 0.939, 9: 0.955, 9.5: 0.978, 10: 1 };
const pctAt = (rpe) => RPE_PCT_1[Math.max(6, Math.min(10, Math.round(rpe * 2) / 2))];
const capNum = (rpe) => { const m = String(rpe).match(/\d+(\.\d+)?/); return m ? +m[0] : 8; };
// %1RM by reps to failure (reps done + reps in reserve): the RTS chart's RPE-10 column, interpolated.
// 8 reps at RPE 7.5 = 10.5 to failure = 72.3%.
const RTS_N = { 1: 1, 2: 0.955, 3: 0.922, 4: 0.892, 5: 0.863, 6: 0.837, 7: 0.811, 8: 0.786, 9: 0.762, 10: 0.739, 11: 0.707, 12: 0.68 };
function pctReps(r, rpe) {
  const n = Math.max(1, Math.min(12, r + 10 - (Number.isFinite(rpe) ? rpe : 10))), lo = Math.floor(n), hi = Math.ceil(n);
  return lo === hi ? RTS_N[lo] : RTS_N[lo] + (RTS_N[hi] - RTS_N[lo]) * (n - lo);
}
// Rule B: a one-tap rating on the last set. Easy = ~1.5 RPE under the target,
// On target = the target, Hard = ~1 over it.
const RATE = { E: -1.5, O: 0, H: 1 };
const RATE_LABEL = { E: "Easy", O: "On target", H: "Hard" };
function effRPE(e, cap) {
  if (e && Number.isFinite(e.rpe)) return e.rpe;
  // a set logged with its own cap (a Yellow single is cap 7) is rated against that cap, not the plan's
  if (e && RATE[e.rate] != null) return (Number.isFinite(e.cap) ? e.cap : cap) + RATE[e.rate];
  return null;
}
const rated = (e) => !!e && (Number.isFinite(e.rpe) || RATE[e.rate] != null);
function sessionDayUTC(wave, week, day, off) { return planDateUTC((wave - 1) * 28 + (week - 1) * 7 + (day - 1), off || 0); }
// the schedule shift a history context carries: dated `shifts` (DATA-1), else the legacy number
const SH = (ctx) => (ctx ? (ctx.shifts != null ? ctx.shifts : ctx.offsetWeeks || 0) : 0);
// the rated entry of a pkey on a plan day, wherever that day fell (a repeated week has two dates: the latest wins)
function ratedAt(ix, pkey, wave, week, day, off) {
  const ts = [...new Set(((ix && ix[pkey]) || []).map((e) => e.t))].sort((a, b) => b - a);
  for (const t of ts) { const w = whereIs(t, off); if (w.wave === wave && w.week === week && w.day === day) { const e = ratedOn(ix, pkey, t); if (e) return e; } }
  return null;
}
// the rated entry of a pkey on one day (the last set carries the rating)
function ratedOn(ix, pkey, t) {
  const hist = (ix && ix[pkey]) || [];
  const day = hist.filter((e) => e.t === t);
  for (let i = day.length - 1; i >= 0; i--) if (rated(day[i])) return day[i];
  return null;
}
// Rule A: the single sets the back-offs. e1RM from the single vs the e1RM the
// plan assumed, clamped to +/-5%.
function singleFactor(planW, cap, e) {
  const r = effRPE(e, cap);
  if (r == null || !(e.w > 0) || !(planW > 0)) return null;
  const f = (e.w / pctAt(r)) / (planW / pctAt(cap));
  return Math.max(0.95, Math.min(1.05, f));
}
const ROUND = (b, x) => (b.db ? R25(x) : R5(x));
function autoregulate(blocks, wave, week, day, ctx) {
  if (!ctx || !ctx.index || !Array.isArray(blocks)) return blocks;
  // `today` is the real date when the caller knows it (a repeated week has two dates)
  const ix = ctx.index, off = SH(ctx), today = Number.isFinite(ctx.today) ? ctx.today : sessionDayUTC(wave, week, day, off);
  return blocks.map((b) => {
    if (!b || !b.pkey || !(b.w > 0) || b.light || b.type === "single" || b.type === "warmup") return b;
    // Rule A: main-lift back-offs follow today's single
    if (b.type === "backoff" && LIFTS.includes(b.lift)) {
      const sgl = blocks.find((x) => x.type === "single" && x.lift === b.lift);
      const e = sgl ? ratedOn(ix, b.lift + "-single", today) : null;
      const f = e ? singleFactor(sgl.w, capNum(sgl.rpe), e) : null;
      if (f != null) {
        const w = R5(b.w * f);
        if (w === b.w) return { ...b, auto: { rule: "A", f } };
        return { ...b, w, planned: b.w, auto: { rule: "A", f }, note: `Auto: single ${e.w} @ RPE ${effRPE(e, capNum(sgl.rpe))} → back-offs ${w > b.w ? "up" : "down"} to ${w} (plan ${b.w})` };
      }
    }
    // Rule A for the tracked lifts (Wave 4+): today's rated top set scales today's back-offs, clamped
    // to ±5% (incline, RDL: through reps to failure); the chin-up and dip (added load) move one step.
    if (b.type === "backoff" && TRACKED[b.lift] && wave >= 4) {
      const top = blocks.find((x) => x.type === "single" && x.lift === b.lift);
      const e = top ? ratedOn(ix, top.pkey, today) : null;
      if (e) {
        const T = TRACKED[b.lift], cap = capNum(top.rpe), r = effRPE(e, cap);
        const w = T.added ? Math.max(0, b.w + (r <= cap - 1 ? T.step : r >= cap + 1 ? -T.step : 0))
          : R5(b.w * Math.max(0.95, Math.min(1.05, (e.w / pctReps(e.r || top.reps, r)) / (top.w / pctReps(top.reps, cap)))));
        if (w === b.w) return { ...b, auto: { rule: "A" } };
        return { ...b, w, planned: b.w, auto: { rule: "A" }, note: `Auto: top set ${T.added ? "+" : ""}${e.w} × ${e.r} @ RPE ${r} → back-offs ${w > b.w ? "up" : "down"} to ${T.added ? "+" : ""}${w} (plan ${T.added ? "+" : ""}${b.w})` };
      }
    }
    // Rule C: the next exposure follows the last rating (within 14 days)
    // deload-week sets are light on purpose: their ratings say nothing about the working load
    const hist = (ix[b.pkey] || []).filter((e) => e.t < today && e.t >= today - 14 * MS_DAY && RATE[e.rate] != null && e.rate !== "O" && whereIs(e.t, off).week !== 4);
    if (!hist.length) return b;
    const last = hist.reduce((a, e) => (e.t >= a.t ? e : a));
    if (last.t !== Math.max(...(ix[b.pkey] || []).filter((e) => e.t < today).map((e) => e.t))) return b; // a newer unrated session supersedes it
    const up = last.rate === "E";
    let w;
    if (b.type === "accessory" || b.added) w = ROUND(b, b.w + (up ? 1 : -1) * (b.inc || 5));
    else w = R5(b.w * (up ? 1.05 : 0.95));
    if (w <= 0) return b;
    return { ...b, w, planned: b.w, auto: { rule: "C", rate: last.rate }, note: `Auto: last time rated ${RATE_LABEL[last.rate]} → ${w} (plan ${b.w})` };
  });
}
// Rule D: the gate from rated singles. Compares the e1RM of the wave's last rated
// single against the e1RM the program assumed when it planned that single at its
// cap. On or under the cap = clean (the v7 gate), ~RPE 8.5 = small, ~RPE 9 = repeat,
// worse = reset. Judgment call: the reviewer's "clean only at RPE 7" rule assumed
// base = e1RM; this program's base is submaximal, so its own model is the yardstick.
const GATE_CUTS = [[0.99, "clean"], [0.975, "small"], [0.955, "repeat"]];
function autoGate(wave, gates, ctx) {
  if (!ctx || !ctx.index || cycleOf(wave) === 6) return null;
  const { t, cyc } = mainTables(wave, gates);
  const off = SH(ctx), out = {};
  const dayOf = { sq: 1, bn: 2, dl: 5 };
  for (const L of LIFTS) {
    let best = null;
    for (let wk = 3; wk >= 1 && !best; wk--) {
      const e = ratedAt(ctx.index, L + "-single", wave, wk, dayOf[L], off);
      if (!e) continue;
      const cap = capNum(cyc === 5 ? RPE_CAP_C5[wk] : RPE_CAP[wk]);
      const plan = t[L].s[wk - 1];
      const ratio = (e.w / pctAt(effRPE(e, cap))) / (plan / pctAt(cap));
      const result = (GATE_CUTS.find(([c]) => ratio >= c - 1e-9) || [0, "reset"])[1];
      best = { result, ratio: Math.round(ratio * 1000) / 1000, week: wk, w: e.w, rpe: effRPE(e, cap) };
    }
    if (best) out[L] = best;
  }
  return Object.keys(out).length ? out : null;
}
// gates with Rule D filled in wherever the lifter has not set a result or a base
function withAutoGates(gates, ctx, upTo = 19) {
  const g = JSON.parse(JSON.stringify(gates || {}));
  // history up to the calibration is settled: those waves were run from printed
  // numbers, so an old typed RPE must never regenerate them after the fact
  for (let w = CAL_LAST + 1; w <= upTo; w++) {
    const a = autoGate(w - 1, g, ctx);
    if (!a) continue;
    for (const L of LIFTS) {
      if (!a[L] || (g[w] && (g[w][L] || (g[w].cb && g[w].cb[L] != null))) || explicitCB(w, g, L) != null) continue;
      g[w] = g[w] || {};
      g[w][L] = a[L].result;
      (g[w].auto = g[w].auto || {})[L] = a[L];
    }
  }
  return g;
}

// MODEL 2 starts at Wave 4 (Oct 12, 2026): the arm, upper-chest, upper-back and
// 3D-shoulder blocks, the meet-day rebuild and goal tracking. Waves 1-3 are Model 1,
// kept exactly as they were run (history-hash tests).
const MODEL2_FROM = 4;
const modelOf = (wave) => (wave >= MODEL2_FROM ? 2 : 1);

const ENGINE = { MODEL2_FROM, modelOf, kgDown, kgNear, attemptsKg, e1rm, LB_PER_KG, defaultGate, RPE_PCT_1, pctAt, RATE, RATE_LABEL, singleFactor, autoregulate, autoGate, withAutoGates, sessionDayUTC, GATE_CUTS, postTestBase, CALIBRATION, PROJ_DEFAULT, cbChain, etaWave, explicitCB, TRACKED, trackedCB, trackedFor, ARM_START, ARM_GOAL, clearedInWave, inclineCB, inclineFor, INCLINE_START, INCLINE_GOAL, pkeyOf, accStateLogged, R5, R25, START, LIFTS, LIFT_NAME, gateDelta, cbFor, cycleOf, macroOf, CYCLE_NAME, waveStartUTC, whereIs, NOTES, mainTables, ohpFor, ACC, accState, accFor, sessionFor, testAttempts, yellowW, yellowFor, redSession, offsetAt, segsOf, planDateUTC, ratedAt, meetAlign, sanitizeState, migrateSetKeys, noTrimWindows, RTS_N, pctReps, dayE1RM, ALT, altKey, WAVE1_MONDAY, MS_DAY, capNum, effRPE, targetsOf, peakEstimate, applyTestEntry, migrateTestMax, lbFloor, COMMANDS, PEAK_CAP,
  FRAME_OPTS, FRAME_LABEL, DETAIL_OPTS, DETAIL_LABEL, DEFAULT_SPEC, isDefaultSpec, saturdaySession, sundaySession, sundayPlanned };
if (typeof module !== "undefined") module.exports = ENGINE;
