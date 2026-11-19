#!/usr/bin/env node
// seed-state.js: a realistic HEAVY state for "Road to 3/4/5" (localStorage key "r345.v1").
//
// What it builds (deterministic: seeded PRNG, no clock, no network):
//   - every training day from 2026-07-20 (Wave 1 Monday) to `today` logged the way the app logs it:
//     the engine's own prescription for that day (sessionFor with the history so far, so Rules A-D,
//     log-driven rungs and auto gates all run), one set object per planned set under the block's
//     exercise key, a rating on the last set of every block, warm-ups ticked, a few Yellow / Red days,
//     a few edited sets, an occasional extra set, swap and session note
//   - a weigh-in and a sleep figure for every calendar day (Sundays included)
//   - tape measurements + photo marks every 4 weeks
//   - nutrition: MAINTAIN since 2026-11-01, every planned portion ticked and the day marked complete
//     for each day since Nov 1 (a few swaps and one manual entry), usual shift nights set
//
// Use from Node (this is how the perf harness uses it):
//   const { heavyState } = require("./seed-state.js");
//   const S = heavyState();                                   // through 2026-11-19, today fully logged
//   const S = heavyState({ session: "none" });                // history complete, today's session not started
//   const S = heavyState({ session: "half" });                // today: warm-ups + the first half of the blocks
//   const S = heavyState({ today: "2028-07-14" });            // two years of use (scaling tests)
// Then seed it exactly as ui-test.js does:
//   await page.addInitScript((s) => localStorage.setItem("r345.v1", JSON.stringify(s)), S);
//   await page.clock.install({ time: new Date("2026-11-19T07:05:00") });
//
// CLI:  node seed-state.js [--today=YYYY-MM-DD] [--session=all|half|none] [--seed=345] [--out=state.json]
//       (prints a summary to stderr; the JSON goes to --out, or to stdout when --out is omitted)
//
// The repo root is three levels up from this file; set R345_ROOT to point it at another checkout.
const path = require("path");
const ROOT = process.env.R345_ROOT || path.join(__dirname, "..", "..", "..");
const E = require(path.join(ROOT, "engine.js"));
const NUTRI = require(path.join(ROOT, "nutrition.js"));

const DK_RE = /^\d{4}-\d{2}-\d{2}$/;
const keyOf = (ms) => new Date(ms).toISOString().slice(0, 10);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const LOGT = ["single", "backoff", "paused", "ohp", "accessory"];

// the app's histIndex(), verbatim (app-shell.html): pkey -> [{t,w,r,rpe,rate,cap}]
function histIndex(S) {
  const ix = {};
  for (const [dk, log] of Object.entries(S.logs)) {
    if (!DK_RE.test(dk) || !log.sets) continue;
    const t = Date.parse(dk);
    for (const arr of Object.values(log.sets)) for (const st of arr) {
      if (!st || !st.k) continue;
      (ix[st.k] = ix[st.k] || []).push({ t, w: +st.w || 0, r: +st.r || 0, rpe: Number.isFinite(st.rpe) ? st.rpe : null, rate: st.rate || null, cap: Number.isFinite(st.cap) ? st.cap : null });
    }
  }
  return ix;
}

function heavyState(opts = {}) {
  const today = opts.today || "2026-11-19", from = opts.from || "2026-07-20", session = opts.session || "all";
  const rnd = mulberry32(opts.seed == null ? 345 : opts.seed), pick = (p) => rnd() < p, r1 = (x) => Math.round(x * 10) / 10;
  const t0 = Date.parse(from), tN = Date.parse(today), shifts = [];
  const S = {
    logs: {}, gates: {}, bw: {}, testMax: {}, meas: {}, food: {}, fday: {}, photos: {}, primer: {}, ledger: {},
    nutri: { mode: "gain", since: from, adj: 0, shiftDays: [2, 3, 5, 6] },
    settings: { shifts }, spec: { ...E.DEFAULT_SPEC }, seen: { m2: 1, home65: 1 },
    v32: 1, v62keys: 1, v62tm: 1, lastBackup: keyOf(tN - 3 * E.MS_DAY),
  };
  const stats = { days: 0, trainingDays: 0, sets: 0, rated: 0, yellow: 0, red: 0, edited: 0, extra: 0, swaps: 0 };

  for (let t = t0, n = 0; t <= tN; t += E.MS_DAY, n++) {
    const dk = keyOf(t), loc = E.whereIs(t, shifts), isToday = t === tN;
    stats.days++;
    // ── bodyweight: 182 -> ~191 over the first 15 weeks, then held; daily noise of about a pound
    const trend = 182 + Math.min(n, 104) * (9 / 104);
    S.bw[dk] = r1(trend + (rnd() - 0.5) * 1.8);
    // ── sleep: late restaurant closes cost a night now and then
    const sleep = Math.round((pick(0.12) ? 5 + rnd() * 1.2 : 6.5 + rnd() * 2) * 2) / 2;
    const log = (S.logs[dk] = { sleep });
    // ── tape + photos every 4 weeks (the Saturday of each deload week), plus a baseline on day 1
    if (n === 0 || (loc.week === 4 && loc.day === 6)) {
      const k = n / 28;
      S.meas[dk] = { wa: Math.round((33.5 + 0.12 * k + (rnd() - 0.5) * 0.25) * 4) / 4, nk: Math.round((15.25 + 0.06 * k) * 4) / 4, ar: Math.round((13 + 0.11 * k) * 4) / 4, sh: Math.round((46.5 + 0.3 * k) * 4) / 4, ch: Math.round((40 + 0.25 * k) * 4) / 4 };
      S.photos[dk] = 1;
    }
    if (loc.pre || loc.wave > 19) continue;
    // ── the session
    const ready = sleep <= 5.5 ? (pick(0.3) ? "R" : "Y") : sleep <= 6 && pick(0.5) ? "Y" : "G";
    if (ready !== "G") log.r = ready;
    const build = () => {
      const index = histIndex(S), gx = E.withAutoGates(S.gates, { index, shifts });
      const hctx = { index, shifts, today: t, testMax: S.testMax, ready, meetDate: S.settings.meetDate };
      return ready === "R" ? E.redSession(loc.wave, loc.day, gx) : E.sessionFor(loc.wave, loc.week, loc.day, gx, S.spec, hctx);
    };
    let blocks = build();
    const nLog = blocks.filter((b) => LOGT.includes(b.type)).length;
    if (!nLog) { if (log.r) delete log.r; continue; }
    if (isToday && session === "none") continue;
    stats.trainingDays++;
    if (ready === "Y") stats.yellow++; else if (ready === "R") stats.red++;
    const wu = blocks.find((b) => b.type === "warmup");
    if (wu) log.wu = wu.rows.length;
    log.sets = {};
    const stopAt = isToday && session === "half" ? Math.ceil(nLog / 2) : Infinity;
    let done = 0;
    for (let i = 0; i < blocks.length; i++) {
      if (!LOGT.includes(blocks[i].type)) continue;
      if (done >= stopAt) break;
      blocks = build(); // the app redraws after every tap: a rated single moves the back-offs (Rule A)
      let b = blocks[i];
      // LOG-7: now and then the machine is taken and he swaps for the day (its own key)
      if (b.type === "accessory" && b.pkey && E.ALT[b.pkey] && pick(0.03)) {
        const name = E.ALT[b.pkey][0];
        (log.swap = log.swap || {})[b.pkey] = name; stats.swaps++;
        b = { ...b, pkey: E.altKey(b.pkey, name) };
      }
      const bkey = b.pkey ? (ready === "R" ? "r:" : "") + b.pkey : (ready === "R" ? "r" : "b") + i;
      const planned = b.type === "single" ? 1 : b.sets, reps = +(b.repN ?? b.reps) || 1;
      const cap = ["single", "backoff", "paused", "ohp"].includes(b.type) ? E.capNum(b.rpe) : null;
      const arr = (log.sets[bkey] = []);
      const nSets = planned + (b.type === "accessory" && pick(0.02) ? 1 : 0);
      if (nSets > planned) stats.extra++;
      for (let s = 0; s < nSets; s++) {
        const st = { w: b.w, r: reps, rpe: null };
        if (b.pkey) st.k = b.pkey;
        if (Number.isFinite(cap)) st.cap = cap;
        // the last set of an accessory sometimes falls a rep or two short and is corrected in the edit sheet
        if (b.type === "accessory" && s === planned - 1 && planned > 1 && reps > 6 && pick(0.08)) { st.r = reps - 1 - (pick(0.3) ? 1 : 0); st.ed = true; stats.edited++; }
        arr.push(st); stats.sets++;
      }
      // Rule B: one tap on the last set (the app offers it for keyed blocks with a load)
      if (b.pkey && b.w > 0 && !(isToday && session === "half" && done === stopAt - 1)) {
        const x = rnd(); arr[arr.length - 1].rate = b.type === "single" ? (x < 0.14 ? "E" : x < 0.86 ? "O" : "H") : (x < 0.12 ? "E" : x < 0.92 ? "O" : "H");
        stats.rated++;
      }
      if (b.type === "single" && E.LIFTS.includes(b.lift) && pick(0.15)) arr[0].rpe = Math.min(9.5, (cap || 8) + (pick(0.5) ? 0 : 0.5)); // a typed RPE now and then
      done++;
    }
    if (pick(0.12)) log.note = ["left elbow a little cranky on the preacher", "bar speed good, filmed the indicator", "closed late, 5.5 h. Kept it honest", "PR on the back-offs", "lower back tight after RDLs, cooldown helped"][Math.floor(rnd() * 5)];
  }

  // ── nutrition: the strict plan since Nov 1 (MAINTAIN), every portion ticked, days marked complete
  const NUT0 = "2026-11-01";
  if (today >= NUT0) {
    S.nutri = { mode: "maintain", since: NUT0, adj: 0, shiftDays: [2, 3, 5, 6] };
    const T = NUTRI.targets("maintain", 0, undefined);
    const entryOf = (m, slot) => { const e = { id: m.id, name: m.name, kcal: m.kcal, p: m.p, f: m.f, c: m.c, fib: m.fib }; if (slot) e.slot = slot; return e; };
    for (let t = Date.parse(NUT0); t <= tN; t += E.MS_DAY) {
      const dk = keyOf(t), isToday = t === tN, fd = {};
      if (pick(0.1)) fd.type = pick(0.5) ? "off" : "shift"; // a swapped shift
      const type = NUTRI.dayType(dk, fd.type, S.nutri.shiftDays);
      if (fd.type === NUTRI.dayType(dk, null, S.nutri.shiftDays)) delete fd.type;
      const plan = NUTRI.dayPlan(type, T.kcal, dk), ent = [];
      plan.items.forEach((it, j) => {
        if (isToday && session !== "all" && j >= 1) return; // 7 AM: only the pre-lift shake is in
        let meal = it.meal;
        if (pick(0.06)) { const alt = NUTRI.menuFor(it.kind, plan.sizes)[0].items; meal = alt[Math.floor(rnd() * alt.length)] || meal; } // swapped a dish
        ent.push(entryOf(meal, it.slot));
      });
      if (!isToday && pick(0.08)) ent.push({ id: "manual", name: "extra 100 g rice", kcal: 130, p: 3 });
      if (ent.length) S.food[dk] = ent;
      if (!isToday || session === "all") fd.done = 1;
      if (Object.keys(fd).length) S.fday[dk] = fd;
    }
  }
  Object.defineProperty(S, "__stats", { value: stats, enumerable: false });
  return S;
}

module.exports = { heavyState, histIndex };

if (require.main === module) {
  const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=")[1] : d; };
  const S = heavyState({ today: arg("today"), session: arg("session"), seed: arg("seed") == null ? undefined : +arg("seed") });
  const json = JSON.stringify(S), st = S.__stats;
  process.stderr.write(`heavy state: ${st.days} days, ${st.trainingDays} sessions, ${st.sets} sets (${st.rated} rated, ${st.edited} edited, ${st.extra} extra), ${st.yellow} Yellow, ${st.red} Red, ${st.swaps} swaps, ` +
    `${Object.keys(S.bw).length} weigh-ins, ${Object.keys(S.meas).length} tape days, ${Object.keys(S.food).length} food days, ${(json.length / 1024).toFixed(1)} KB of JSON\n`);
  const out = arg("out");
  if (out) require("fs").writeFileSync(out, json); else process.stdout.write(json + "\n");
}
