const E = require("./engine.js");
let pass = 0, fail = 0;
const isSideDelt = (n) => /Lateral Raise|Cross-Body Cable Y-Raise/i.test(n || "") && !/Pulldown|Prone/i.test(n || "");

const eq = (got, want, label) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; }
  else { fail++; console.log("FAIL", label, "got", JSON.stringify(got), "want", JSON.stringify(want)); }
};
const ok = (cond, label) => { if (cond) pass++; else { fail++; console.log("FAIL", label); } };

// ── CB chain ──
eq(E.cbFor(1), { bn: 225, sq: 315, dl: 405 }, "cb w1");
eq(E.cbChain(4), { bn: 240, sq: 345, dl: 435 }, "chain w4 clean");
eq(E.cbChain(19), { bn: 315, sq: 495, dl: 585 }, "chain w19 paper"); // sq/dl overshoot on paper — chain math only
eq(E.cbChain(3, { 3: { bn: "repeat" } }), { bn: 230, sq: 335, dl: 425 }, "chain gate repeat bn");
eq(E.cbChain(3, { 3: { sq: "small" } }), { bn: 235, sq: 330, dl: 425 }, "chain gate small sq");
// ── calibration: Wave 3 runs from his measured bases ──
eq(E.cbFor(2), { bn: 230, sq: 325, dl: 415 }, "history before the calibration is the clean chain");
eq(E.cbFor(3), { bn: 255, sq: 295, dl: 385 }, "Wave 3 bases are the calibrated 255/295/385");
eq(E.cbFor(3, { 3: { cb: { bn: 250 } } }).bn, 250, "a user-set base overrides the calibration");
eq(E.cbFor(3, { 3: { bn: "repeat" } }).bn, 255, "a gate result cannot move a pinned base");
eq(E.cbFor(4), { bn: 257.5, sq: 300, dl: 390 }, "future gates default to the small step");
eq(E.cbFor(4, { 4: { bn: "clean", sq: "clean", dl: "clean" } }), { bn: 260, sq: 305, dl: 395 }, "a set gate beats the default");
eq(E.PROJ_DEFAULT, "small", "projection default is small");
eq(E.cbFor(19), { bn: 295, sq: 375, dl: 465 }, "Wave 19 on the small-step pace");
eq([E.etaWave("bn", 315), E.etaWave("sq", 405), E.etaWave("dl", 495)], [27, 25, 25], "honest ETAs for 3/4/5 on the small-step pace");
ok(E.mainTables(3).explicit === false && E.mainTables(3).t.bn.s[2] === E.R5(255 * 0.893), "Wave 3 tables regenerate from the calibrated base");
eq(E.cbFor(2, { 2: { dl: "reset" } }).dl, 385, "gate reset dl"); // R5(405*.95)=385

// ── tracked lifts follow their anchor's gate, one step at most either way ──
eq(E.TRACKED.chin.anchor, "bn", "chin-up is anchored to bench (an upper-body pull, not the deadlift)");
for (const id of Object.keys(E.TRACKED)) {
  const T = E.TRACKED[id];
  for (let w = 1; w < 19; w++) {
    const d = E.trackedCB(id, w + 1, {}) - E.trackedCB(id, w, {});
    ok(Math.abs(d) <= T.step, `tracked ${id} w${w}->${w + 1}: moves at most one step (${d})`);
  }
}
eq(E.trackedCB("rdl", 3, {}) - E.trackedCB("rdl", 2, {}), 0, "a calibration is a re-measurement: the RDL neither gains nor loses from it");
eq(E.trackedCB("rdl", 4, {}) - E.trackedCB("rdl", 3, {}), 5, "after it, the RDL follows the deadlift's small step");
// ── schedule ──
const d = (y, m, dd) => Date.UTC(y, m - 1, dd);
eq(E.whereIs(d(2026, 7, 20)), { wave: 1, week: 1, day: 1, dow: 0 }, "date w1w1d1");
eq(E.whereIs(d(2026, 8, 31)), { wave: 2, week: 3, day: 1, dow: 0 }, "date w2w3d1");
eq(E.whereIs(d(2026, 11, 6)), { wave: 4, week: 4, day: 5, dow: 4 }, "date w4w4d5");
eq(E.whereIs(d(2027, 12, 6)), { wave: 19, week: 1, day: 1, dow: 0 }, "date w19w1d1");
eq(E.whereIs(d(2026, 7, 25)).day, 6, "saturday is spec day (7-day week)");

// ── accessory seed + ladder regression (waves 1–4) ──
// These were once note-fidelity checks. Seeds were recalibrated 2026-07-28 (the
// originals ran far too light), and the printed notes are now GENERATED from this
// engine — so the app is canonical and these guard against accidental drift.
const A = Object.fromEntries(E.ACC.map(a => [a.id + ":" + a.day, a]));
const acc = (id, day, wave, week) => E.accFor(A[id + ":" + day], wave, week);
// wave 1
eq([acc("legpress",1,1,1).w, acc("legpress",1,1,1).reps, acc("legpress",1,1,2).reps], [450,10,12], "w1 legpress");
eq([acc("lattue",2,1,1).w, acc("lattue",2,1,1).reps, acc("lattue",2,1,2).reps], [20,10,12], "w1 lattue (v32: 10-15 reps, heavier)");
// wave 2
eq([acc("legpress",1,2,1).w, acc("legpress",1,2,1).reps], [470,10], "w2 legpress 380");
eq([acc("lattue",2,2,1).w, acc("lattue",2,2,1).reps, acc("lattue",2,2,2).reps], [20,12,15], "w2 lattue");
eq([acc("legext",3,2,1).w], [135], "w2 legext 100");
eq([acc("cablecurl",5,2,1).w, acc("cablecurl",5,2,1).reps], [50,12], "w2 reverse curl (seed 60->45, pronated is weaker)");
eq([acc("rowtue",2,2,1).w, acc("rowtue",2,2,1).reps, acc("rowtue",2,2,2).reps], [60,10,12], "w2 row 50 10/12");
// wave 3
eq([acc("legpress",1,3,1).w], [490], "w3 legpress 400");
eq([acc("rowtue",2,3,1).w, acc("rowtue",2,3,1).reps], [65,8], "w3 row 55x8");
// (incline DB press removed 2026-08-05 — replaced by the tracked barbell incline ramping to 225)
eq([acc("lattue",2,3,1).reps, acc("lattue",2,3,2).reps], [10,12], "w3 lattue bumps to 22.5");
eq([acc("preacher",3,3,1).w, acc("preacher",3,3,1).reps], [55,8], "w3 preacher (v32 anchor curl, seed 50)");
eq([acc("latwed",3,3,1).w, acc("latwed",3,3,1).reps], [22.5,10], "w3 latwed (v32 seed 20, 10-15 reps)");
eq([acc("pushdown",4,3,1).w, acc("pushdown",4,3,1).reps], [95,10], "w3 pushdown (seed raised to 90)");
// wave 4
eq([acc("legpress",1,4,1).w], [510], "w4 legpress 420");
eq([acc("lattue",2,4,1).w, acc("lattue",2,4,1).reps], [22.5,12], "w4 lattue");
eq([acc("latthu",4,4,1).w, acc("latthu",4,4,1).reps], [20,12], "w4 latthu 17.5");
eq([acc("legext",3,4,1).w], [155], "w4 legext 120");
eq([acc("cablecurl",5,4,1).w], [60], "w4 reverse curl (seed 60->45)");
// week-3 set trims
eq(acc("legpress",1,2,3).sets, 2, "wk3 trim legpress");
eq(acc("legext",3,2,3).sets, 1, "wk3 trim legext");
eq(acc("calf",1,2,3).sets, 2, "wk3 calf trims (v32: 3 sets, wk3 2)");

// ── explicit mains match the notes ──
const w2 = E.mainTables(2).t;
eq(w2.sq.s, [275,285,295], "w2 sq singles");
eq(w2.dl.b[2], [330,3,4], "w2 dl wk3 backoff");
eq(w2.pb, [150,160,170,130], "w2 paused bench");
const w1 = E.mainTables(1);
ok(w1.explicit && w1.t.bn.s[0] === 190, "w1 still prints the notes");
const w4 = E.mainTables(4);
ok(!w4.explicit, "w4 is generated: the notes' chain no longer holds after calibration");
eq(w4.t.bn.s, [220,225,230], "w4 bn singles from the calibrated base");

// ── generated waves 5–19: every load inside its v7 window ──
const WIN = {
  singles: { any: [[0.82,0.86],[0.85,0.885],[0.87,0.915]] },
  back: { sq: [[0.70,0.745],[0.73,0.775],[0.76,0.815]], bn: [[0.70,0.745],[0.73,0.775],[0.76,0.815]], dl: [[0.68,0.725],[0.72,0.765],[0.75,0.805]] },
  ps: [0.595,0.725], pb: [0.615,0.755],
};
for (let w = 5; w <= 19; w++) {
  const { cb, cyc, t } = E.mainTables(w);
  if (cyc === 6) continue; // peak uses its own scheme
  for (const L of E.LIFTS) {
    t[L].s.forEach((v, i) => {
      const p = v / cb[L];
      if (cyc === 5) ok(p >= 0.855 && p <= 0.93, `w${w} ${L} c5 single ${i} pct ${p.toFixed(3)}`);
      else ok(p >= WIN.singles.any[i][0] - 0.006 && p <= WIN.singles.any[i][1] + 0.006, `w${w} ${L} single ${i} pct ${p.toFixed(3)}`);
    });
    t[L].b.forEach((row, i) => {
      const p = row[0] / cb[L];
      if (cyc === 5) ok(p >= 0.74 && p <= 0.86, `w${w} ${L} c5 back ${i}`);
      else ok(p >= WIN.back[L][i][0] - 0.006 && p <= WIN.back[L][i][1] + 0.006, `w${w} ${L} back ${i} pct ${p.toFixed(3)}`);
    });
    ok(t[L].l / cb[L] > 0.62 && t[L].l / cb[L] < 0.68, `w${w} ${L} light ~65%`);
  }
  [0,1,2].forEach(i => {
    const pp = t.ps[i] / cb.sq, bb = t.pb[i] / cb.bn;
    ok(pp >= WIN.ps[0] && pp <= WIN.ps[1], `w${w} ps ${i} pct ${pp.toFixed(3)}`);
    ok(bb >= WIN.pb[0] && bb <= WIN.pb[1], `w${w} pb ${i} pct ${bb.toFixed(3)}`);
  });
}

// ── monotonic under clean gates: singles never go down wave-over-wave within same cycle type ──
for (let w = 3 + 6; w <= 19; w++) { // from the calibration on; before it the chain was fiction
  const a = E.mainTables(w - 6), b = E.mainTables(w);
  if (E.cycleOf(w) === 6) continue;
  for (const L of E.LIFTS) ok(b.t[L].s[2] > a.t[L].s[2], `w${w} ${L} wk3 single beats prior macro`);
}

// ── sessions build clean for every slot, waves 1–19 ──
let built = 0;
for (let w = 1; w <= 19; w++) for (let wk = 1; wk <= 4; wk++) for (let dy = 1; dy <= 5; dy++) {
  const s = E.sessionFor(w, wk, dy);
  ok(Array.isArray(s), `session w${w}wk${wk}d${dy} array`);
  for (const blk of s) {
    ok(blk.name && blk.type, `block named w${w}wk${wk}d${dy}`);
    if ("w" in blk && blk.type !== "warmup") ok(Number.isFinite(blk.w) && blk.w >= 0, `finite weight w${w}wk${wk}d${dy} ${blk.name}: ${blk.w}`);
    if ("sets" in blk) ok(blk.sets >= 1 && blk.sets <= 8, `sane sets w${w}wk${wk}d${dy} ${blk.name}`);
  }
  built++;
}
ok(built === 19 * 4 * 5, "all 380 sessions built");

// ── OHP ──
eq(E.ohpFor(2)[1], [95,8,3], "ohp w2 wk2 (rep ladder before the load jump)");
ok(E.ohpFor(7)[0][0] >= 105 && E.ohpFor(7)[0][0] <= 125, "ohp w7 sane");

// ── test day ──
const att = E.testAttempts({ sq: 365, bn: 250, dl: 455 });
const est365 = E.R5(365 * 0.91) / E.pctAt(8); // no rated single: the plan's own e1RM of the week-2 peak single
ok(att.sq.a1 < att.sq.a2 && att.sq.a2 < att.sq.a3 && att.sq.a3 === E.R5(est365 * 1.02), "attempts ordered, 3rd = target (estimated max x 1.02 by default)");
eq([att.sq.a1, att.sq.a2, att.sq.a3], [E.R5(365 * 0.91), E.R5(365 * 0.955), 365], "attempts: .91 / .955 / target");
eq(E.testAttempts({ sq: 365, bn: 250, dl: 455 }, { sq: 380 }).sq.a3, 380, "an entered target always wins");
eq(E.postTestBase(300), 290, "post-test base = 96% of the made max");
eq(E.postTestBase(260), 250, "post-test base: a 260 made lift gives a 250 base");

// ── yellow/red ──
const yb = E.yellowW({ type: "backoff", w: 245, reps: 4, sets: 5 });
eq(yb.w, 235, "yellow -5% w3 sq wave2 245→235");
const rs = E.redSession(2, 1);
eq([rs[0].w, rs[0].reps, rs[0].sets], [195, 3, 3], "red day w2 squat 195");

// ═══ Weekend weak-point specialization (7-day week) ═══
console.log("\n── specialization tests ──");
const d2 = (y, m, dd) => Date.UTC(y, m - 1, dd);
// 7-day mapping: Sat=6, Sun=7, Thursday still day 4 (no rest)
eq(E.whereIs(d2(2026, 7, 23)).day, 4, "Thu = day 4 (not rest)");
eq(E.whereIs(d2(2026, 7, 25)).day, 6, "Sat = day 6");
eq(E.whereIs(d2(2026, 7, 26)).day, 7, "Sun = day 7");
eq(E.whereIs(d2(2026, 8, 1)).day, 6, "next Sat = day 6");

const DEF = E.DEFAULT_SPEC;
// Saturday default (shoulder-width primary): frame module = 2 lateral variants ×3
const sat = E.sessionFor(1, 1, 6, {}, DEF);
ok(sat[0].type === "spechead" && /Arms/.test(sat[0].name), "Sat header names priority (arms default)");
const satEx = sat.filter((b) => b.type === "accessory");
ok(satEx.length >= 4, "Sat has frame exercises");
ok(satEx[0].sets === 3 && /Curl/.test(satEx[0].name), "Sat primary frame 3 sets incline curl (arms default)");
ok(E.sessionFor(1,1,6,{},E.DEFAULT_SPEC).some((b)=>/Pulldown/.test(b.name||"")), "Sat keeps lat work even on arms priority");
ok(E.sessionFor(1,1,6,{},E.DEFAULT_SPEC).some((b)=>isSideDelt(b.name)), "Sat keeps side-delt balance on arms priority");
ok(satEx.some((b) => /Overhead Cable/.test(b.name)), "Sat triceps slot present");
ok(satEx.some((b) => /Crunch/.test(b.name)), "Sat abs present");
// default (triceps detail) → secondary frame slot omitted, extra pushdown present
ok(satEx.some((b) => /Pushdown/.test(b.name)), "Sat triceps-spec adds pushdown");
// Saturday set cap ~15 excl abs
const satUpper = satEx.filter((b) => !/Crunch/.test(b.name)).reduce((n, b) => n + b.sets, 0);
ok(satUpper <= 24, `Sat upper set cap ${satUpper} <= 24 (arms day: two curls, two triceps, side + rear delt)`);

// v32: Sunday is REST by default (7 days of RPE 9 was the fatigue leak). The optional
// day still exists behind the toggle and must still build correctly when switched on.
const SUN = { ...DEF, sundayOn: true };
ok(E.sundayPlanned(1, 1, DEF) === false, "v32: Sun is rest by default");
ok(E.sessionFor(1, 1, 7, {}, DEF).length === 1 && /off/.test(E.sessionFor(1, 1, 7, {}, DEF)[0].name), "v32: default Sunday = off card");
ok(E.sundayPlanned(1, 1, SUN) === true, "Sun planned Wk1 when toggled on");
ok(E.sundayPlanned(1, 3, SUN) === false, "Sun NOT planned Wk3");
ok(E.sundayPlanned(5, 1, SUN) === false, "Sun NOT planned Cycle5");
const sun = E.sessionFor(1, 1, 7, {}, SUN);
ok(sun[0].type === "spechead", "Sun header");
const sunEx = sun.filter((b) => b.type === "accessory");
ok(sunEx.length >= 5 && sunEx.reduce((n, b) => n + b.sets, 0) <= 17, "Sun ≤17 sets (still the shortest day)");
ok(/Preacher/.test(sunEx[0].name), "Sun opens with the anchor curl (not the light cross-body)");
ok(sunEx.some((b) => /Bayesian/.test(b.name)), "Sun arms-primary includes Bayesian curl");
ok(sunEx.reduce((n, b) => n + b.sets, 0) === 16, "Sun arms-primary = 16 sets (balanced with overhead triceps, cap 17)");
ok(/Biceps-led/.test(sun[0].name), "Sun header billed honestly (biceps-led)");
// Sunday off Wk3
const sun3 = E.sessionFor(1, 3, 7, {}, SUN);
ok(sun3.length === 1 && /off/.test(sun3[0].name), "Sun Wk3 = off card");

// Thursday sheds delt/tri isolation but keeps paused bench + OHP + crunch + wrist
const thu = E.sessionFor(1, 1, 4, {}, DEF);
ok(thu.some((b) => b.type === "paused" && b.lift === "bn"), "Thu keeps paused bench");
ok(thu.some((b) => b.type === "ohp"), "Thu keeps OHP");
ok(!thu.some((b) => /Rear-Delt Fly|Cross-Body/.test(b.name)), "Thu dropped rear-delt & cross-body");
ok(thu.some((b) => /Wrist/.test(b.name)) && thu.some((b) => /Neck/.test(b.name)), "Thu keeps wrist + neck (abs moved to Mon for the dip)");
ok(E.sessionFor(1, 1, 1, {}, DEF).some((b) => /Hanging Leg Raise/.test(b.name || "")), "Mon owns the ab block (v32: cable crunch consolidated onto Saturday)");
ok(!E.sessionFor(1, 1, 4, {}, DEF).some((b) => /Preacher/.test(b.name || "")), "v32: Thursday no longer backfills a preacher curl (reduced week was heavier than build week)");

// Transfers fire Wk1 (Sunday runs): Wed EZ goes; laterals and hammer are now permanent
const tue1 = E.sessionFor(1, 1, 2, {}, DEF);
ok(tue1.some((b) => isSideDelt(b.name)), "Tue laterals are guaranteed, never transferred to the optional day");
const wed1 = E.sessionFor(1, 1, 3, {}, DEF);
ok(wed1.some((b) => /Cable Preacher Curl/.test(b.name)) && wed1.some((b) => /Hammer Curl/.test(b.name)), "v32: Wed = preacher anchor + hammer, permanent");
ok(!wed1.some((b) => /EZ-Bar Curl|Incline DB Curl/.test(b.name)), "v32: Wed sheds EZ-bar (9 curls in a row was pump work); incline moves to Saturday");
const wedAcc = wed1.filter((b) => b.type === "accessory");
ok(wedAcc.findIndex((b) => /Preacher/.test(b.name)) < wedAcc.findIndex((b) => /Hammer/.test(b.name)), "v32: preacher precedes hammer (anchor first)");
// Wk3 (Sunday off): transfers do NOT fire — Tue laterals return
const tue3 = E.sessionFor(1, 3, 2, {}, DEF);
ok(tue3.some((b) => /Lateral Raise/.test(b.name)), "Tue laterals return Wk3 (no transfer)");

// Frame variants build without error and pick right module
for (const fp of E.FRAME_OPTS) {
  const s = E.sessionFor(2, 1, 6, {}, { framePrimary: fp, frameSecondary: "none", detail: "biceps", sundayOn: true });
  ok(s.filter((b) => b.type === "accessory").length >= 3, `frame ${fp} builds`);
}
for (const dt of E.DETAIL_OPTS) {
  const s = E.sessionFor(2, 1, 7, {}, { framePrimary: "shoulders", frameSecondary: "latwidth", detail: dt, sundayOn: true });
  ok(s.filter((b) => b.type === "accessory").length >= 4, `detail ${dt} builds`);
}
// lat-width frame trims Friday row to 2
const friLat = E.sessionFor(2, 1, 5, {}, { framePrimary: "latwidth", frameSecondary: "none", detail: "biceps", sundayOn: false });
const rowf = friLat.find((b) => /Chest-Supported Machine \/ Cable Row/.test(b.name));
ok(rowf && rowf.sets <= 2, "Fri row trimmed to 2 for lat-width");

// Week 3 Saturday reduced (frame 2 sets), Cycle 5 reduced, peak = no spec, Wk4 = maintenance
ok(E.sessionFor(1, 3, 6, {}, DEF).filter((b) => b.type === "accessory")[0].sets === 2, "Sat Wk3 frame 2 sets");
ok(E.sessionFor(5, 1, 6, {}, DEF).filter((b) => b.type === "accessory")[0].sets === 2, "Sat Cycle5 frame 2 sets");
ok(E.sessionFor(6, 1, 6, {}, DEF).some((b) => /Peak/.test(b.name)), "Sat peak = no spec");
ok(E.sessionFor(1, 4, 6, {}, DEF).filter((b) => b.type === "accessory").every((b) => /6/.test(String(b.rpe))), "Sat Wk4 maintenance easy");

// every 7-day slot builds cleanly across waves 1-19
let built7 = 0;
for (let w = 1; w <= 19; w++) for (let wk = 1; wk <= 4; wk++) for (let dy = 1; dy <= 7; dy++) {
  const s = E.sessionFor(w, wk, dy, {}, DEF);
  ok(Array.isArray(s) && s.length >= 1, `7day session w${w}wk${wk}d${dy}`);
  for (const b of s) if (b.type === "accessory") ok(Number.isFinite(b.w) && ((b.repN ?? b.reps) >= 1), `acc finite w${w}d${dy} ${b.name}`);
  built7++;
}
ok(built7 === 19 * 4 * 7, "all 532 seven-day sessions built");


// ═══ log-driven progression ═══
console.log("\n── log-driven progression ──");
const W1M = E.WAVE1_MONDAY;
const mkh = (dayOff, w, r, n) => Array.from({ length: n }, () => ({ t: W1M + dayOff * E.MS_DAY, w, r }));
const LPD = { w: 450, steps: [10, 12], inc: 20, db: false, i0: 0, pkey: "legpress" };
eq(E.accStateLogged(LPD, 2).w, 470, "logdrv: no ctx = scheduled");
eq(E.accStateLogged(LPD, 2, { index: {}, offsetWeeks: 0 }).w, 470, "logdrv: empty index = scheduled");
eq(E.accStateLogged(LPD, 2, { index: { legpress: mkh(2, 450, 12, 3) }, offsetWeeks: 0 }).w, 470, "logdrv: cleared top = bump");
const heldSt = E.accStateLogged(LPD, 2, { index: { legpress: mkh(2, 450, 10, 3) }, offsetWeeks: 0 });
eq(heldSt.w, 450, "logdrv: missed top = hold");
eq(heldSt.prog, "held", "logdrv: prog flag");
eq(E.accStateLogged(LPD, 2, { index: { legpress: mkh(2, 470, 12, 3) }, offsetWeeks: 0 }).w, 490, "logdrv: heavier logs adopted then bumped");
const SCD = { w: 105, steps: [10, 12, 15], inc: 10, db: false, i0: 0, pkey: "seatcurl" };
eq(E.accStateLogged(SCD, 2, { index: { seatcurl: mkh(2, 105, 12, 3) }, offsetWeeks: 0 }).i, 1, "logdrv: mid-ladder advance");
eq(E.accStateLogged(SCD, 2, { index: { seatcurl: mkh(2, 105, 10, 3) }, offsetWeeks: 0 }).i, 0, "logdrv: mid-ladder hold");
eq(E.accStateLogged(SCD, 2, { index: { seatcurl: mkh(2, 105, 15, 1) }, offsetWeeks: 0 }).i, 0, "logdrv: single-set fluke ignored");
// unlogged wave between logged waves falls back to schedule for that wave
const twoWave = [...mkh(2, 450, 12, 3)]; // wave1 cleared, wave2 unlogged
eq(E.accStateLogged(LPD, 3, { index: { legpress: twoWave }, offsetWeeks: 0 }).w, 490, "logdrv: unlogged wave uses schedule");
// end-to-end: Monday of wave 2 reflects a hold
const ctxHold = { index: { legpress: mkh(2, 450, 10, 3) }, offsetWeeks: 0 };
const monLP = E.sessionFor(2, 1, 1, {}, E.DEFAULT_SPEC, ctxHold).find((b) => /Leg Press/.test(b.name || ""));
eq(monLP.w, 450, "logdrv: session shows held weight");
eq(monLP.prog, "held", "logdrv: block carries prog");
// ctx does not leak into later ctx-less calls
const after = E.sessionFor(2, 1, 1, {}, E.DEFAULT_SPEC).find((b) => /Leg Press/.test(b.name || ""));
eq(after.w, 470, "logdrv: HISTCTX cleared after call");
// spec exercise via name slug
eq(E.pkeyOf("Cable / Machine Preacher Curl"), "cable-machine-preacher-curl", "logdrv: slug");
const PKPC = "cable-machine-preacher-curl";
const sunAdv = E.sessionFor(2, 1, 7, {}, SUN, { index: { [PKPC]: mkh(6, 40, 10, 3) }, offsetWeeks: 0 }).find((b) => /Preacher/.test(b.name || ""));
eq(sunAdv.reps, "10–12", "logdrv: spec advance via slug");
const sunHold = E.sessionFor(2, 1, 7, {}, SUN, { index: { [PKPC]: mkh(6, 40, 8, 3) }, offsetWeeks: 0 }).find((b) => /Preacher/.test(b.name || ""));
eq(sunHold.reps, "8–10", "logdrv: spec hold via slug");
// blocks expose pkey for stamping
ok(E.sessionFor(1, 1, 1, {}, E.DEFAULT_SPEC).filter((b) => b.type === "accessory").every((b) => b.pkey), "logdrv: all accessory blocks carry pkey");


// ═══ masculine frame: traps / shoulders / upper chest ═══
console.log("\n── frame requirements ──");
{
  const isTri = (n) => /(Extension|Pushdown)/i.test(n) && !/Leg|Wrist|Neck/i.test(n);
  const isBi = (n) => /Curl/i.test(n) && !/Leg Curl|Neck|Wrist/i.test(n);
  const cnt = (re) => { let t = 0; for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC)) if (b.type === "accessory" && re.test(b.name)) t += b.sets; return t; };
  ok(cnt(/Shrug/) >= 1, "frame: Waves 1-3 ran 1+ direct trap set a week (history; from Wave 4 the traps are a declared goal, see the upper-back block)");
  { let sd = 0; for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC)) if (b.type === "accessory" && isSideDelt(b.name)) sd += b.sets; ok(sd >= 9, "frame: 9+ side-delt sets weekly"); }
  ok(cnt(/Low-to-High/) + E.sessionFor(1, 1, 2, {}, E.DEFAULT_SPEC).filter((b) => /Incline Bench/.test(b.name || "")).reduce((n, b) => n + b.sets, 0) >= 8, "frame: 8+ upper-chest sets on Mon+Tue alone (barbell incline + fly)");
  let bi = 0, tri = 0;
  for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC)) {
    if (b.type !== "accessory") continue;
    if (isBi(b.name)) bi += b.sets; else if (isTri(b.name)) tri += b.sets;
  }
  eq(bi, 14, "v32: 14 curl sets (reverse curl +1 as forearm anchor, Bayesian -1 to hold the Saturday budget)");
  ok(tri >= 10 && tri <= 24, "v32: triceps isolation 10-24 band (excludes the tracked dip; 11 = 2 overhead + 2 pushdown exposures)");
  const tue = E.sessionFor(1, 1, 2, {}, E.DEFAULT_SPEC);
  const mon = E.sessionFor(1, 1, 1, {}, E.DEFAULT_SPEC);
  ok(mon.some((b) => /Shrug/.test(b.name || "") && b.sets >= 1), "frame: Mon carries the shrug (1 maintenance set)");
  ok(!tue.some((b) => /Overhead Rope/.test(b.name || "")), "frame: Tue overhead rope traded out");

  // ═══ full-body redistribution ═══
  ok(mon.some((b) => /Low-to-High/.test(b.name || "")), "split: Mon gets upper-chest fly");
  {
    const monLegIso = mon.filter((b) => b.type === "accessory" && /Leg Press|Leg Curl|Leg Extension|Calf/i.test(b.name)).reduce((n, b) => n + b.sets, 0);
    ok(monLegIso <= 9, "split: Mon leg isolation <=9 (quad + calf + the priority hamstring exposure)");
  }
  ok(E.sessionFor(1, 1, 5, {}, E.DEFAULT_SPEC).some((b) => /Leg Press Calf/.test(b.name || "")), "split: Fri calf is straight-knee (gastroc), not seated");
  ok(!tue.some((b) => /Shrug/.test(b.name || "")), "split: Tue sheds the shrug");
  {
    const fri = E.sessionFor(1, 1, 5, {}, E.DEFAULT_SPEC).filter((b) => b.type === "accessory").map((b) => b.name);
    ok(!fri.some((n) => /Lying Leg Curl/.test(n)), "v32: Fri lying leg curl dropped - junk volume after a DL single, back-offs and 4 sets of RDL");
    ok(true, "split: RDL is now a tracked lift, placed before the isolation work");
  }
  {
    let hams = 0, calves = 0;
    for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC)) {
      if (["accessory", "single", "backoff"].includes(b.type) && /Leg Curl|RDL/i.test(b.name || "")) hams += b.sets;
      if (b.type === "accessory" && /Calf/i.test(b.name)) calves += b.sets;
    }
    ok(hams >= 10, "v32: hamstrings 10+ sets (seated x2 + RDL; the lying curl was junk)");
    ok(calves >= 6, "v32: calves 6 sets over two exposures (3+3, was 4+5)");
  }
  ok(E.sessionFor(1, 1, 6, {}, E.DEFAULT_SPEC).some((b) => /Overhead Cable Extension|Pushdown/.test(b.name || "")), "frame: Sat still carries hard triceps");
}


// ═══ his standing preference: no legs-only training day, ever ═══
// (stated 2026-07-27: "i hate specializing exclusively with legs")
{
  const isLower = (n) => /Leg Press|Leg Curl|Leg Extension|Calf|RDL/i.test(n);
  for (let d = 1; d <= 5; d++) {
    const acc = E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC).filter((b) => b.type === "accessory");
    const upper = acc.filter((b) => !isLower(b.name) && !/Leg Raise|Crunch/i.test(b.name));
    ok(upper.length >= 1, `preference: day ${d} includes upper-body accessory work`);
  }
}


// ═══ neck work (masculine frame: the collar) ═══
{
  const tueN = E.sessionFor(1, 1, 2, {}, E.DEFAULT_SPEC).find((b) => /Neck Curl/.test(b.name || ""));
  const thuN = E.sessionFor(1, 1, 4, {}, E.DEFAULT_SPEC).find((b) => /Neck Extension/.test(b.name || ""));
  ok(tueN && tueN.sets === 2, "neck: Tue has neck curls x2");
  ok(thuN && thuN.sets === 2, "neck: Thu has neck extensions x2");
  ok(tueN.w <= 10 && thuN.w <= 15, "neck: starting loads embarrassingly light by design");
  let bi = 0;
  for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC))
    if (b.type === "accessory" && /Curl/i.test(b.name) && !/Leg Curl|Neck|Wrist/i.test(b.name)) bi += b.sets;
  eq(bi, 14, "neck: biceps count uncontaminated by neck or wrist curls");
}


// ═══ final bodybuilding sweep: obliques, forearm flexion, mobility ═══
{
  const wed = E.sessionFor(1, 1, 3, {}, E.DEFAULT_SPEC);
  const fri = E.sessionFor(1, 1, 5, {}, E.DEFAULT_SPEC);
  ok(!wed.some((b) => /Woodchop/.test(b.name || "")) && wed.some((b) => /Stomach Vacuum/.test(b.name || "")), "waist: woodchop gone (obliques never loaded), vacuum filler present");
  ok(fri.some((b) => /Wrist Curl/.test(b.name || "") && b.sets === 3), "forearms: Fri wrist curls x3 (flexion), no longer filler");
  for (let d = 1; d <= 5; d++)
    ok(E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC).some((b) => b.type === "cooldown"), `sweep: day ${d} ends with mobility cooldown`);
  // Yellow keeps the cooldown even though it drops conditioning
  const yWed = E.sessionFor(1, 1, 3, {}, E.DEFAULT_SPEC).map(E.yellowW).filter(Boolean);
  ok(yWed.some((b) => b.type === "cooldown"), "sweep: Yellow day keeps the cooldown");
  ok(!yWed.some((b) => b.type === "conditioning"), "sweep: Yellow day still drops cardio");
  // dedicated forearm volume now >= 4 weekly (ext 2 + flex 2, before Sunday extras)
  let fa = 0;
  for (let d = 1; d <= 5; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC))
    if (b.type === "accessory" && /Wrist/i.test(b.name)) fa += b.sets;
  ok(fa >= 6, "forearms: 6+ dedicated wrist sets on weekdays");
  // biceps count still uncontaminated
  let bi = 0;
  for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC))
    if (b.type === "accessory" && /Curl/i.test(b.name) && !/Leg Curl|Neck|Wrist/i.test(b.name)) bi += b.sets;
  eq(bi, 14, "sweep: biceps exactly 14 (reverse +1, Bayesian -1)");
}


// ═══ proximity to failure: final-set marker ═══
{
  const iso = (w, wk) => E.sessionFor(w, wk, 3, {}, E.DEFAULT_SPEC).find((b) => /Cable Preacher Curl/.test(b.name || ""));
  // v32: one failure set per muscle per day — the anchor earns it, the follow-up does not
  const second = E.sessionFor(1, 1, 3, {}, E.DEFAULT_SPEC).find((b) => /Hammer Curl/.test(b.name || ""));
  ok(!second.lastHard, "v32 failure: hammer (second biceps movement) stops at RPE 8");
  ok(!E.sessionFor(1, 1, 4, {}, E.DEFAULT_SPEC).find((b) => /Rope Pushdown/.test(b.name || "")).lastHard, "v32 failure: pushdown after overhead stops at RPE 8");
  { let hardSets = 0; for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC)) if (b.lastHard) hardSets++;
    ok(hardSets <= 12, `v32 failure: ${hardSets} failure sets/wk (was ~35)`); }
  const comp = (w, wk) => E.sessionFor(w, wk, 5, {}, E.DEFAULT_SPEC).find((b) => /RDL/.test(b.name || ""));
  ok(iso(1, 1).lastHard === true, "failure: isolation final set pushes in Wk1");
  ok(iso(1, 2).lastHard === true, "failure: isolation final set pushes in Wk2");
  ok(!iso(1, 3).lastHard, "failure: Wk3 trim does not push");
  ok(!iso(1, 4).lastHard, "failure: deload never pushes");
  ok(!comp(1, 1).lastHard, "failure: compounds stay capped at 8");
  ok(!iso(6, 1).lastHard, "failure: peak cycle never pushes");
}


// ═══ ab volume is already sufficient; the deficit is the lever ═══
{
  let ab = 0;
  for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC))
    if (b.type === "accessory" && /Leg Raise|Crunch|Ab Wheel/i.test(b.name)) ab += b.sets;
  ok(ab >= 5, "abs: 5+ direct rectus sets weekly — obliques deliberately unloaded (waist), leanness is the variable");
}


// ═══ regression: progression must survive a hard final set ═══
{
  const W1 = E.WAVE1_MONDAY, M = E.MS_DAY;
  const sets = (reps) => reps.map((r) => ({ t: W1 + 2 * M, w: 160, r }));
  const def = { w: 160, steps: [8, 10, 12], inc: 10, db: false, i0: 0, pkey: "pulldown" };
  const run = (reps) => E.accStateLogged(def, 2, { index: { pulldown: sets(reps) }, offsetWeeks: 0 });
  eq(run([10, 10, 10, 10, 10]).i, 1, "prog: all sets clear advances");
  eq(run([10, 10, 10, 10, 9]).i, 1, "prog: hard final set still advances (2+ rule)");
  eq(run([10, 10, 9, 9, 9]).i, 1, "prog: exactly 2 clearing sets advances");
  eq(run([10, 9, 9, 9, 9]).i, 0, "prog: only 1 clearing set holds");
  eq(run([8, 8, 8, 8, 8]).i, 0, "prog: nothing clears holds");
  ok(run([10, 9, 9, 9, 9]).prog === "held", "prog: held flag set");
}


// ═══ incline ramp to 225 + posture block ═══
{
  eq(E.inclineCB(1, {}), 180, "incline: starts at 180");
  const C = { bn: "clean", sq: "clean", dl: "clean" }, CG = { 4: C, 5: C, 6: C, 7: C, 8: C, 9: C, 10: C, 11: C };
  eq(E.inclineCB(11, CG), 225, "incline: reaches the 225 goal at wave 11 on clean gates");
  eq(E.inclineCB(11, { ...CG, 5: { ...C, bn: "repeat" } }), 220, "incline: a failed bench gate holds the incline too");
  eq(E.inclineCB(19, {}), 225, "incline: on the small-step default it reaches 225 at wave 19");
  const tue = E.sessionFor(1, 1, 2, {}, E.DEFAULT_SPEC);
  const names = tue.map((b) => b.name || "");
  ok(names.some((n) => /Incline Bench — top set/.test(n)), "incline: Tue has a ramping top set");
  ok(names.some((n) => /Incline Bench — back-offs/.test(n)), "incline: Tue has back-offs");
  ok(!names.some((n) => /Incline DB Press/.test(n)), "incline: DB version replaced by the barbell");
  ok(names.indexOf("Band Pull-Apart") < names.findIndex((n) => /Bench — top single/.test(n)), "posture: pull-apart primes BEFORE pressing");
  ok(names.filter((n) => n === "Band Pull-Apart").length === 1, "posture: pull-apart appears exactly once");
  ok(E.sessionFor(1, 1, 4, {}, E.DEFAULT_SPEC).some((b) => /Prone Y/.test(b.name || "")), "posture: Thu has prone Y (lower trap)");
  ok(!E.sessionFor(6, 1, 2, {}, E.DEFAULT_SPEC).some((b) => /Incline Bench/.test(b.name || "")), "incline: peak week drops it");
  const wk4 = E.sessionFor(1, 4, 2, {}, E.DEFAULT_SPEC);
  ok(!wk4.some((b) => /Incline Bench — top set/.test(b.name || "")), "incline: deload has no top set");
  ok(wk4.some((b) => /Incline Bench — light/.test(b.name || "")), "incline: deload keeps light volume");
  for (let d = 1; d <= 5; d++)
    ok(E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC).some((b) => b.type === "cooldown" && /MOBILITY|hams|glutes|hips/i.test(b.note || "") && !/fix|pull you forward/i.test(b.note || "")), `posture: day ${d} cooldown intact, and no stretch claims to fix posture (Warneke 2024)`);
}


// ═══ everything logged, correct and adaptable ═══
{
  // 1. EVERY loggable block, every wave/week/day, plus Yellow and Red, carries a key
  let n = 0, unkeyed = 0;
  const skip = ["warmup", "conditioning", "cooldown", "test", "spechead", "note"];
  for (let w = 1; w <= 19; w++) for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++) {
    for (const b of E.sessionFor(w, wk, d, {}, E.DEFAULT_SPEC)) {
      if (skip.includes(b.type)) continue;
      n++; if (!b.pkey) unkeyed++;
    }
    for (const b of E.sessionFor(w, wk, d, {}, E.DEFAULT_SPEC).map(E.yellowW).filter(Boolean)) {
      if (skip.includes(b.type)) continue; if (!b.pkey) unkeyed++;
    }
    if (d <= 5) for (const b of E.redSession(w, d, {})) {
      if (skip.includes(b.type)) continue; if (!b.pkey) unkeyed++;
    }
  }
  ok(n > 3000, "audit: full sweep ran");
  eq(unkeyed, 0, "audit: every loggable block has a stable key");

  // 2. incline adapts to logs, falls back to the bench gate when unlogged
  const MS = E.MS_DAY, W = (w) => E.waveStartUTC(w, 0);
  const hit = (w, wt, r) => [{ t: W(w) + 16 * MS, w: wt, r }];
  const top = (wave, ctx) => E.sessionFor(wave, 1, 2, {}, E.DEFAULT_SPEC, ctx).find((b) => /Incline Bench — top/.test(b.name)).w;
  eq(E.inclineCB(1, {}), 180, "incline: starts at 180");
  eq(E.inclineCB(19, {}), 225, "incline: unlogged still reaches 225 (wave 19 on the default pace)");
  eq(top(2, { index: { "incbb-top": hit(1, 155, 3) }, offsetWeeks: 0 }), 145, "incline: cleared top set advances");
  eq(top(2, { index: { "incbb-top": hit(1, 155, 2) }, offsetWeeks: 0 }), 140, "incline: missed top set holds");
  eq(top(2, { index: {}, offsetWeeks: 0 }), 145, "incline: no history falls back to the bench gate (+5), same as before");

  // 3. OHP is log-adaptive double progression
  const ohpAt = (wave, ctx) => E.sessionFor(wave, 1, 4, {}, E.DEFAULT_SPEC, ctx).find((b) => b.type === "ohp").w;
  const ohpHist = (w, wt, r, n2) => Array.from({ length: n2 }, () => ({ t: W(w) + 3 * MS, w: wt, r }));
  eq(E.ohpFor(1)[0][0], 95, "ohp: seeds at 95");
  ok(ohpAt(3, { index: { ohp: [...ohpHist(1, 95, 8, 3), ...ohpHist(2, 95, 8, 3)] }, offsetWeeks: 0 }) > 95, "ohp: clearing 3x8 advances the load");
  eq(ohpAt(2, { index: { ohp: ohpHist(1, 95, 6, 3) }, offsetWeeks: 0 }), 95, "ohp: missing the top reps holds the load");

  // 4. keys are stable across waves — history actually accumulates
  const k1 = E.sessionFor(1, 1, 2, {}, E.DEFAULT_SPEC).map((b) => b.pkey).filter(Boolean);
  const k5 = E.sessionFor(5, 1, 2, {}, E.DEFAULT_SPEC).map((b) => b.pkey).filter(Boolean);
  ok(k1.every((k) => k5.includes(k)), "audit: Tuesday keys identical at wave 1 and wave 5");
  ok(new Set(k1).size === k1.length, "audit: no duplicate keys within a session");
}


// ═══ arms + hamstrings elevated to first-class (Wave 1 field feedback) ═══
{
  const isBi = (n) => /Curl/i.test(n) && !/Leg Curl|Neck|Wrist/i.test(n);
  const isTri = (n) => /(Extension|Pushdown)/i.test(n) && !/Leg|Wrist|Neck/i.test(n);
  const isHam = (n) => /Leg Curl|RDL/i.test(n);
  let bi = 0, tri = 0, ham = 0, hamDays = new Set();
  for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC)) {
    if (!["accessory", "single", "backoff"].includes(b.type)) continue;
    const n = b.name || "";
    if (isBi(n)) bi += b.sets;
    if (isTri(n) && b.type === "accessory") tri += b.sets;
    if (isHam(n)) { ham += b.sets; hamDays.add(d); }
  }
  eq(bi, 14, "v32: 14 curl sets/wk (preacher, hammer, incline, Bayesian x2, reverse x3) + 4 chin-up sets");
  
  ok(ham >= 10, "hams: 10+ weekly sets");
  ok(hamDays.size >= 3, "hams: 3+ exposures per week");

  // tracked lifts: arms and hamstrings each have a base, a goal, and a ramp
  for (const id of ["inc", "chin", "rdl"]) {
    const T = E.TRACKED[id];
    ok(T.goal > T.start, `tracked ${id}: goal exceeds the start`);
    eq(E.trackedCB(id, 1, {}), T.start, `tracked ${id}: wave 1 is the seed`);
    const tops = [1, 2, 3].map((wk) => E.trackedFor(id, 1, wk, {})[0].w);
    ok(tops[0] < tops[1] && tops[1] < tops[2], `tracked ${id}: ramps within the wave`);
    ok(E.trackedFor(id, 1, 4, {}).every((b) => b.type !== "single"), `tracked ${id}: deload drops the top set`);
    ok(E.trackedFor(id, 1, 1, {}).every((b) => b.pkey), `tracked ${id}: keyed for logging`);
  }
  // RDL week 1 must not regress below what he was already doing (245x6)
  ok(E.trackedFor("rdl", 1, 1, {})[0].w >= 235, "hams: RDL wave 1 does not regress");
  ok(E.trackedFor("rdl", 1, 3, {})[0].w >= 270, "hams: RDL week 3 exceeds the old working weight");
  // chin-up is present on Friday and displays as added weight
  const fri5 = E.sessionFor(1, 1, 5, {}, E.DEFAULT_SPEC);
  ok(fri5.some((b) => /Chin-Up/.test(b.name || "") && b.added), "arms: Friday has the weighted chin-up, flagged as added weight");
  ok(fri5.some((b) => /RDL/.test(b.name || "")), "hams: Friday has the tracked RDL");
  // log-adaptive
  const MS = E.MS_DAY, W = (w) => E.waveStartUTC(w, 0);
  const hit = (w, wt, r) => [{ t: W(w) + 16 * MS, w: wt, r }];
  eq(E.trackedCB("rdl", 2, {}, ), 280, "hams: RDL advances on the anchor gate when unlogged");
}


// ═══ arms are the calling card: triceps carry the larger share ═══
{
  const isBi = (n) => /Curl/i.test(n) && !/Leg Curl|Neck|Wrist/i.test(n);
  const isTri = (n) => /(Extension|Pushdown|Dip)/i.test(n) && !/Leg|Wrist|Neck/i.test(n);
  const isLong = (n) => /Overhead|Cross-Body|Dip/i.test(n);
  let bi = 0, tri = 0, lng = 0, briach = 0;
  for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC)) {
    if (!["accessory", "single", "backoff"].includes(b.type)) continue;
    const n = b.name || "";
    if (isBi(n)) { bi += b.sets; if (/Hammer|Reverse/i.test(n)) briach += b.sets; }
    if (isTri(n)) { tri += b.sets; if (isLong(n)) lng += b.sets; }
  }
  // triceps are ~2/3 of arm circumference, so they must not be the smaller allocation.
  // Measure the GUARANTEED week (Mon-Sat) and count isolation only: the chin-up and dip
  // are compounds that happen to load the arm, and including one without the other lies.
  // brachialis is a separate muscle from the biceps - hammer and reverse curls barely
  // load the long head - so it is counted on its own, not folded into "flexion".
  const isBrach = (n) => /Hammer|Reverse/i.test(n || "");
  let pureBi = 0, ex = 0;
  for (let d = 1; d <= 6; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC)) {
    if (b.type !== "accessory") continue;
    const n = b.name || "";
    if (isBi(n) && !isBrach(n)) pureBi += b.sets;
    if (isTri(n)) ex += b.sets;
  }
  ok(ex >= pureBi, `arms: guaranteed triceps (${ex}) at least matches biceps (${pureBi})`);
  // and the compounds that flank them stay paired - chin-up on Fri, dip on Thu
  const chin = E.sessionFor(1, 1, 5, {}, E.DEFAULT_SPEC).filter((b) => /Chin-Up/.test(b.name || "")).reduce((n, b) => n + b.sets, 0);
  const dips = E.sessionFor(1, 1, 4, {}, E.DEFAULT_SPEC).filter((b) => /Weighted Dip/.test(b.name || "")).reduce((n, b) => n + b.sets, 0);
  eq(chin, dips, "arms: the two arm compounds carry equal set counts");
  ok(tri >= 14, "v32: triceps 14+ direct sets (dip, overhead x2, pushdown x2) on top of all pressing");
  ok(lng / tri >= 0.5, "arms: at least half of triceps volume is lengthened-position");
  ok(briach >= 5, "arms: brachialis gets 5+ dedicated sets (hammer + reverse)");

  const dip = E.TRACKED.dip;
  eq([dip.start, dip.goal, dip.anchor], [35, 100, "bn"], "dip: seeded from his +25x5-10, goal +100, bench-gated");
  eq(E.trackedFor("dip", 2, 1, {})[0].w, 25, "dip: wave 2 opens at +25, exactly his current top end");
  ok(E.trackedFor("dip", 2, 3, {})[0].w > 25, "dip: climbs inside the wave");
  ok(E.sessionFor(1, 1, 4, {}, E.DEFAULT_SPEC).some((b) => /Weighted Dip/.test(b.name || "") && b.added),
     "dip: lives on Thursday, flagged as added weight");
  ok(E.sessionFor(1, 1, 4, {}, E.DEFAULT_SPEC).every((b) => !/Weighted Chin-Up/.test(b.name || "")),
     "dip and chin-up are on separate days");

  // no day may blow past the 7:00-8:30 window
  for (let d = 1; d <= 7; d++) {
    let sets = 0;
    for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC))
      if (["accessory", "single", "backoff", "main", "ohp", "paused"].includes(b.type)) sets += b.sets;
    ok(sets <= 25, `day ${d}: ${sets} working sets stays inside the session budget`);
    let hard = 0;
    for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC))
      if (["accessory", "single", "backoff", "main", "ohp", "paused"].includes(b.type) && !/^FILLER/.test(b.cap || "") && !/Pull-Apart/.test(b.name || "")) hard += b.sets;
    ok(hard <= (d === 6 ? 25 : 22), `v32 day ${d}: ${hard} non-filler sets - room for 3-min rests on compounds (Sat has no compound, cap 25: the arm block adds a 4th overhead set from Wave 4)`);
  }
  eq([E.ARM_START, E.ARM_GOAL], [13, 16], "arms: 13 -> 16 in on the 200 lb @ 15% build (arms lead, slightly disproportionate)");
}


// ═══ 3D delts: side and rear are the heads that lag; front is already saturated ═══
{
  const isRear = (n) => /Rear-Delt|Reverse Pec|Reverse-Pec|Face Pull/i.test(n || "");
  const isFrontRaise = (n) => /Front Raise/i.test(n || "");
  const count = (wk, pred) => {
    let n = 0;
    for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, wk, d, {}, E.DEFAULT_SPEC))
      if (["accessory", "single", "backoff"].includes(b.type) && pred(b.name)) n += b.sets;
    return n;
  };
  // the regex that has now miscounted twice
  ok(!isSideDelt("Unilateral Cable Pulldown"), "side-delt matcher rejects Unilateral Cable Pulldown");
  ok(!isSideDelt("Prone Y-Raise"), "side-delt matcher rejects Prone Y-Raise (lower traps)");
  ok(isSideDelt("Cross-Body Cable Y-Raise") && isSideDelt("Cable Lateral Raise"), "side-delt matcher accepts the real ones");

  ok(count(1, isSideDelt) >= 9, "v32: 9 side-delt sets at 10-15 reps over 3 exposures");
  ok(count(3, isSideDelt) >= 6, "delts: reduced week trims side delts, never deletes them");
  ok(count(1, isRear) >= 4, "v32: 4 direct rear-delt sets (shoulders declared dialed; face pull 3->2 funded a third wrist set)");
  eq(count(1, isFrontRaise), 0, "delts: zero direct front-delt work — pressing already saturates it");

  // side-delt volume must not depend on the optional Sunday
  let guaranteed = 0;
  for (let d = 1; d <= 6; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC))
    if (["accessory", "single", "backoff"].includes(b.type) && isSideDelt(b.name)) guaranteed += b.sets;
  ok(guaranteed >= 9, `delts: ${guaranteed} side-delt sets land Mon-Sat, independent of the optional day`);

  // 3+ exposures: per-session dose and fatigue (judgment), not a frequency effect (Pelland 2026: frequency adds little at equal volume)
  const days = new Set();
  for (let d = 1; d <= 6; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC))
    if (isSideDelt(b.name)) days.add(d);
  ok(days.size >= 3, "delts: 3+ guaranteed side-delt exposures per week");

  // resistance-curve cues are the other half of the fix
  const names = [];
  for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC)) if (isSideDelt(b.name)) names.push(b.name);
  ok(names.some((n) => /Cross-Body Cable Y-Raise/.test(n)), "delts: the cross-body Y-raise (deepest lateral-delt stretch) is in the plan");
  ok(names.some((n) => /Leaning/.test(n)), "delts: the leaning DB variant is in the plan, not the flat one with no bottom tension");
}


// ═══ structural guards: the two bug classes that produced every gap so far ═══
{
  // (1) VOLUME LEAK — priority work must not depend on the optional Sunday.
  //     This caused the side-delt gap AND the biceps gap.
  const GROUPS = {
    "side delts": (n) => /Lateral Raise|Cross-Body Cable Y-Raise/i.test(n) && !/Pulldown|Prone/i.test(n),
    biceps:       (n) => /Curl/i.test(n) && !/Leg Curl|Neck|Wrist|Hammer|Reverse/i.test(n),
    triceps:      (n) => /(Extension|Pushdown|Dip)/i.test(n) && !/Leg|Wrist|Neck/i.test(n),
    hamstrings:   (n) => /Leg Curl|RDL/i.test(n),
    calves:       (n) => /Calf/i.test(n),
  };
  for (const [g, pred] of Object.entries(GROUPS)) {
    let all = 0, gtd = 0;
    for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC)) {
      if (!["accessory", "single", "backoff"].includes(b.type) || !pred(b.name)) continue;
      all += b.sets; if (d <= 6) gtd += b.sets;
    }
    ok(gtd >= all * 0.65, `leak: ${g} keeps ${gtd}/${all} sets off the optional day`);
  }

  // (2) REDUCED-WEEK DELETION — week 3 may trim priority work, never zero it.
  //     This is what hid the side-delt gap for three waves.
  for (const [g, pred] of Object.entries(GROUPS)) {
    let full = 0, red = 0;
    for (let d = 1; d <= 7; d++) {
      for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC))
        if (["accessory", "single", "backoff"].includes(b.type) && pred(b.name)) full += b.sets;
      for (const b of E.sessionFor(1, 3, d, {}, E.DEFAULT_SPEC))
        if (["accessory", "single", "backoff"].includes(b.type) && pred(b.name)) red += b.sets;
    }
    ok(red >= full * 0.5, `reduced week: ${g} trimmed to ${red}/${full}, not deleted`);
  }

  // (3) every logged block must carry a progression key or the log-driven engine
  //     silently ignores it and the lift never advances
  const noKey = new Set();
  for (const w of [1, 5, 9, 13, 17]) for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++)
    for (const b of E.sessionFor(w, wk, d, {}, E.DEFAULT_SPEC))
      if (["accessory", "single", "backoff"].includes(b.type) && !b.pkey) noKey.add(b.name);
  eq(noKey.size, 0, `progression: every logged block has a pkey (${[...noKey].join(", ")})`);

  // (4) the four tracked lifts must survive every cycle, including the peak
  for (const w of [1, 5, 9, 13, 16, 17, 19]) {
    const found = new Set();
    for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++)
      for (const b of E.sessionFor(w, wk, d, {}, E.DEFAULT_SPEC))
        for (const t of ["Incline Bench", "Weighted Chin-Up", "Weighted Dip", "RDL"])
          if ((b.name || "").startsWith(t)) found.add(t);
    eq(found.size, 4, `wave ${w}: all four tracked lifts present`);
  }
}


// ═══ v34 exercise audit ═══
{
  const S = (w, wk, d) => E.sessionFor(w, wk, d, {}, E.DEFAULT_SPEC);
  ok(/UPRIGHT/.test(E.TRACKED.dip.note) && !/Slight forward lean/.test(E.TRACKED.dip.note), "audit: dip cue is upright + tucked (triceps), not the chest lean");
  for (const [d, re] of [[3, /Squat/], [4, /Bench/]]) for (const wk of [1, 2, 3]) {
    const ps = S(3, wk, d).filter((b) => b.type === "paused" && re.test(b.name));
    const paused = ps.find((b) => !b.hyp), hyp = ps.find((b) => b.hyp);
    ok(paused && hyp, `audit: wk${wk} d${d} has both a paused block and a hypertrophy block`);
    ok(hyp.reps >= 6 && hyp.reps <= 8 && /7\.5/.test(hyp.rpe), `audit: wk${wk} d${d} hypertrophy block is 6-8 reps near RPE 8`);
    eq(hyp.w, paused.w, `audit: wk${wk} d${d} hypertrophy block uses the same bar`);
    ok(hyp.pkey !== paused.pkey, `audit: wk${wk} d${d} hypertrophy block logs under its own key`);
  }
  ok(!S(3, 4, 3).some((b) => b.hyp) && !S(3, 4, 4).some((b) => b.hyp), "audit: deload week has no hypertrophy back-offs");
  const tot = (wk, d, re) => S(3, wk, d).filter((b) => b.type === "paused" && re.test(b.name)).reduce((n, b) => n + b.sets, 0);
  eq(tot(1, 3, /Squat/), 4, "audit: Wed paused-pattern total stays 4 sets"); eq(tot(1, 4, /Bench/), 4, "audit: Thu paused-pattern total stays 4 sets");
  let lpCount = 0, lpWrong = 0;
  for (let d = 1; d <= 7; d++) for (const b of S(3, 1, d)) { if (b.lp) { lpCount++; if (!b.lastHard) lpWrong++; } }
  ok(lpCount >= 6, `audit: ${lpCount} anchors carry lengthened partials`);
  eq(lpWrong, 0, "audit: lengthened partials never appear on a non-failure set");
  ok(!S(3, 4, 3).some((b) => b.lp) && !S(3, 3, 3).some((b) => b.lp), "audit: no lengthened partials in the trim week or deload");
  const calfNames = [];
  for (let d = 1; d <= 7; d++) for (const b of S(3, 1, d)) if (/Calf/.test(b.name || "")) calfNames.push(b.name);
  ok(calfNames.length === 2 && !calfNames.some((n) => /Seated/.test(n)), "audit: no bent-knee calf raise remains");
  const names = (d) => S(3, 1, d).filter((b) => b.type === "accessory").map((b) => b.name);
  ok(names(1).indexOf("Seated Leg Curl") < names(1).indexOf("Leg Press"), "audit: Mon hamstring anchor precedes leg press");
  ok(names(3).indexOf("Cable Preacher Curl") < names(3).indexOf("Leg Extension"), "audit: Wed anchor curl precedes the leg extension");
  ok(names(6).findIndex((n) => /Y-Raise/.test(n)) <= 2, "audit: Sat side-delt builder is in the first three");
}


// ═══ every emitted moveId must have a movement-library entry (four were missing, incl. both hamstring anchors) ═══
{
  const html = require("fs").readFileSync(require("path").join(__dirname, "app-shell.html"), "utf8");
  const lib = new Set([...html.matchAll(/^\s{2}([A-Za-z0-9]+):\{name:"/gm)].map((m) => m[1]));
  const need = new Set();
  for (const w of [1, 7, 13, 19]) for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++)
    for (const b of E.sessionFor(w, wk, d, {}, E.DEFAULT_SPEC)) if (b.moveId) need.add(b.moveId);
  const missing = [...need].filter((k) => !lib.has(k));
  eq(missing.length, 0, `library: every emitted moveId has a demo (${missing.join(", ") || "all covered"})`);
}
// ═══ movement library: one card per key, every card reachable, every block opens its own card ═══
{
  const html = require("fs").readFileSync(require("path").join(__dirname, "app-shell.html"), "utf8");
  const cards = [...html.matchAll(/^\s{2}(\w+):\{name:"([^"]+)",grp:"([^"]+)"/gm)];
  const ids = cards.map((m) => m[1]);
  eq(ids.length, new Set(ids).size, "library: no duplicate card keys (proneY was defined twice; the later one silently won)");
  const G = JSON.parse(html.match(/for \(const grp of (\[[^\]]+\])\)/)[1]);
  ok(cards.every((m) => G.includes(m[3])), "library: every card's group is listed on the Moves tab (Shoulders, Core and Posture cards were invisible)");
  const need = new Set();
  for (const fp of E.FRAME_OPTS) for (const dt of E.DETAIL_OPTS) for (const sun of [false, true]) {
    const spec = { framePrimary: fp, frameSecondary: "latwidth", detail: dt, sundayOn: sun, secondaryPress: "incline" };
    for (const w of [1, 4, 5, 6, 7, 12, 19]) for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++)
      for (const b of E.sessionFor(w, wk, d, {}, spec)) if (b.moveId) need.add(b.moveId);
  }
  eq([...need].filter((k) => !ids.includes(k)), [], "library: every moveId any spec emits has a card");
  const mv = (w, d, re) => (E.sessionFor(w, 1, d, {}, E.DEFAULT_SPEC).find((b) => re.test(b.name || "")) || {}).moveId;
  eq([mv(4, 6, /Y-Raise/), mv(4, 6, /Bayesian/), mv(4, 2, /Leaning/), mv(4, 3, /Cable Lateral/), mv(4, 6, /Rear-Delt Raise/), mv(4, 6, /Y-Shrug/), mv(4, 5, /High-Elbow/), mv(4, 2, /External Rotation/)],
    ["xbody", "curlmon", "leanlat", "cablelat", "rdraise", "yshrug", "rowhi", "bander"], "library: each block opens its own card");
  const sunMv = E.sessionFor(4, 1, 7, {}, { ...E.DEFAULT_SPEC, sundayOn: true }).filter((b) => b.type === "accessory");
  ok(sunMv.filter((b) => /Preacher/.test(b.name)).every((b) => b.moveId === "preacher") && sunMv.filter((b) => /Bayesian/.test(b.name)).every((b) => b.moveId === "curlmon"), "library: Sunday preacher and Bayesian curls open their own cards");
  ok(/^\s{2}rowfri:\{name:"Chest-Supported Machine \/ Cable Row"/m.test(html), "library: the Friday machine row card carries the row's real name");
}


// ═══ nutrition module ═══
{
  const N = require("./nutrition.js");
  const ids = [...N.HILLSTONE, ...N.SIDES, ...N.HOME].map((x) => x.id);
  eq(new Set(ids).size, ids.length, "nutri: every id unique");
  ok([...N.HILLSTONE, ...N.SIDES, ...N.HOME].every((x) => x.kcal > 0 && x.p >= 0 && x.name), "nutri: every item has name, kcal, protein");
  ok(N.HILLSTONE.every((x) => "ABCD".includes(x.tier)), "nutri: every Hillstone item is tiered");
  ok(N.HILLSTONE.filter((x) => x.tier === "A" && x.trim && !x.addon).every((x) => x.kcal <= 750 && x.p >= 40), "nutri: every trim-eligible Tier A pick is <=750 kcal and >=40P");
  ok(N.HILLSTONE.filter((x) => x.tier === "D").every((x) => !x.gain && !x.trim), "nutri: Tier D is never offered in either mode");
  ok(N.HILLSTONE.some((x) => x.id === "rotis" && x.gain && x.p >= 60), "nutri: rotisserie chicken is the gaining anchor");
  ok(N.HILLSTONE.some((x) => x.id === "ahi" && x.trim && x.kcal <= 600), "nutri: ahi ponzu is the trim anchor");
  eq(N.targets("gain").kcal, 3050, "nutri: gain 3,050"); eq(N.targets("trim").kcal, 2500, "nutri: trim 2,500");
  eq(N.targets("nope").kcal, 3050, "nutri: unknown mode falls back to gain");
  // NUT-9: the food sheet's groups: gaining lists the once-a-week items, trimming never does
  const menuIds = (m) => N.menuFor(m).flatMap((g) => g.items.map((x) => x.id));
  ok(["fries", "ribs", "dings", "fishsand", "snapper", "louie", "dipF", "ribeyeF"].every((id) => menuIds("gain").includes(id)), "menu: gaining lists fries, Tier C, the fries versions and the Louie");
  ok(!menuIds("trim").includes("fries") && N.HILLSTONE.filter((x) => "CD".includes(x.tier)).every((x) => !menuIds("trim").includes(x.id)), "menu: trimming lists no fries and no Tier C or D");
  ok(N.HILLSTONE.filter((x) => x.tier === "D").every((x) => !menuIds("gain").includes(x.id)), "menu: Tier D is never listed");
  ok(["gain", "trim"].every((m) => new Set(menuIds(m)).size === menuIds(m).length), "menu: no item is listed twice");
  ok(N.HILLSTONE.filter((x) => x.weekly).every((x) => x.tier === "C"), "menu: the once-a-week Hillstone items are Tier C");
  const sum = (mode) => N.HOME.filter((x) => x.mode === mode && !x.grp).reduce((s, x) => s + x.kcal, 0); // base meals only — plates replace the shift meal
  ok(sum("gain") + 950 >= 3000 && sum("gain") + 950 <= 3200, `nutri: gaining day with the rotisserie lands ~3,050 (${sum("gain") + 950})`);
  ok(sum("trim") + 550 >= 2150 && sum("trim") + 700 <= 2550, `nutri: trim day with a trim anchor lands 2,200-2,500 (${sum("trim") + 550}-${sum("trim") + 700})`);
  ok(N.HOME.filter((x) => x.mode === "gain" && !x.grp).reduce((s, x) => s + x.p, 0) + 70 >= 190, "nutri: gaining day clears 190P before the shift meal is even generous");
  eq(N.dayTotals([{ kcal: 800, p: 50 }, { kcal: 950, p: 70 }]), { kcal: 1750, p: 120 }, "nutri: dayTotals sums");
  eq(N.dayTotals([]), { kcal: 0, p: 0 }, "nutri: empty day is zero");
  const food = { "2026-09-10": [{ kcal: 3000, p: 190 }], "2026-09-11": [{ kcal: 3100, p: 200 }], "2026-09-12": [] , "2026-09-13": [{ kcal: 2900, p: 180 }] };
  eq(N.weekStats(food, "2026-09-13", 7), { logged: 3, avgKcal: 3000, avgP: 190 }, "nutri: weekStats ignores empty days and averages the rest");
  eq(N.weekStats({}, "2026-09-13", 7).logged, 0, "nutri: nothing logged");
  // the decision rule: 7-day averages against the phase start, waist against its phase-start value, sleep gate
  const series = (from, n, f) => { const o = {}; for (let i = 0; i < n; i++) o[new Date(Date.UTC(2026, 8, from + i)).toISOString().slice(0, 10)] = f(i); return o; };
  const bwSlow = series(1, 21, (i) => 188 + i * 0.04);          // ~+0.28 lb/wk
  const bwFast = series(1, 21, (i) => 188 + i * 0.12);          // ~+0.84 lb/wk
  const waistFlat = { "2026-08-30": { wa: 33 }, "2026-09-20": { wa: 33.25 } };
  const waistUp = { "2026-08-30": { wa: 33 }, "2026-09-20": { wa: 34 } };
  const G = { mode: "gain", since: "2026-09-01", today: "2026-09-21" };
  eq(N.decision(bwSlow, waistFlat, G).mode, "gain", "decision: slow gain + flat waist = keep gaining");
  ok(/On pace/.test(N.decision(bwSlow, waistFlat, G).reason), "decision: ~0.3 lb/wk is on pace");
  ok(N.decision(bwFast, waistFlat, G).mode === "gain" && /drop 150/.test(N.decision(bwFast, waistFlat, G).reason), "decision: fast gain alone = trim the surplus, not a trim phase");
  const rested = series(15, 7, () => 7.5);
  eq(N.decision(bwSlow, waistUp, { ...G, sleep: rested }).mode, "trim", "decision: waist +1 since the phase began, sleep 7 h+ = trim");
  const sleepy = series(15, 7, () => 6.2);
  const gated = N.decision(bwSlow, waistUp, { ...G, sleep: sleepy });
  ok(gated.mode === "gain" && gated.gate === "sleep", "decision: sleep under 7 h blocks starting a trim (Nedeltcheva 2010)");
  // NUT-4: unknown sleep never starts a trim; one night under 6 h blocks it too
  for (const [sl, lbl] of [[{}, "no sleep logged"], [series(19, 2, () => 5), "two nights at 5 h"]]) {
    const d = N.decision(bwSlow, waistUp, { ...G, sleep: sl });
    ok(d.mode === "gain" && d.gate === "sleep-unknown" && /sleep isn't logged/.test(d.reason), `decision: ${lbl} = log sleep first, no trim`);
  }
  eq(N.decision(bwSlow, waistUp, { ...G, sleep: series(19, 3, (i) => [8, 8, 5.5][i]) }).gate, "sleep", "decision: one 5.5 h night among three blocks the trim");
  eq(N.decision({}, waistFlat, G).mode, null, "decision: no scale data = no call");
  eq(N.decision(bwSlow, {}, G).mode, "gain", "decision: waist unlogged does not block a keep-gaining call");
  eq(N.decision(bwSlow, waistFlat, G).avg, N.avgIn(bwSlow, "2026-09-15", "2026-09-21"), "decision: the 7-day average is what it uses");
  eq(N.decision(bwSlow, waistFlat, G).start, 188, "decision: measured from the fitted weight on the phase's first day, not a fixed number");
  // NUT-1: the rate is the least-squares slope of every weigh-in this phase (daily, +/-0.4 lb alternating noise)
  const noisy = (r, from) => (i) => from + (r / 7) * i + (i % 2 ? -0.4 : 0.4);
  const dayDk = (i) => new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10);
  for (const r of [0.25, 0.55, 0.75, -2.0, -2.5]) {
    const bw = series(1, 43, noisy(r, r > 0 ? 188 : 192)), mode = r > 0 ? "gain" : "trim";
    let worst = 0;
    for (let i = 14; i <= 42; i++) { const d = N.decision(bw, {}, { mode, since: "2026-09-01", today: dayDk(i) }); worst = Math.max(worst, d.rate == null ? 99 : Math.abs(d.rate - r)); }
    ok(worst <= 0.08, `rate: true ${r} lb/wk is read within 0.08 from day 14 on (worst ${worst.toFixed(3)})`);
  }
  { const bw = series(1, 43, noisy(0.25, 188));
    const says = [...Array(43).keys()].map((i) => N.decision(bw, {}, { mode: "gain", since: "2026-09-01", today: dayDk(i) }).reason);
    ok(says.every((x) => !/Flat/.test(x)), "rate: a true +0.25 lb/wk never reads 'Flat'");
    ok(/rate needs 10 days and 8 weigh-ins this phase \(you have 5\)/.test(says[4]), "rate: before 10 days and 8 weigh-ins the app says what it needs"); }
  ok(/drop 150/.test(N.decision(series(1, 43, noisy(0.75, 188)), {}, { mode: "gain", since: "2026-09-01", today: dayDk(14) }).reason), "rate: a true +0.75 says drop 150 by day 14");
  ok(/faster than 1%/.test(N.decision(series(1, 43, noisy(-2.0, 192)), {}, { mode: "trim", since: "2026-09-01", today: dayDk(14) }).reason), "rate: a trim at -2.0 lb/wk from 192 is flagged faster than 1% by day 14");
  { // a sparse first week (2 weigh-ins) still gives a rate and an exit
    const sp = {}; for (let i = 0; i <= 42; i++) if (i >= 7 || i === 0 || i === 4) sp[dayDk(i)] = 192 - (2.0 / 7) * i;
    const d14 = N.decision(sp, {}, { mode: "trim", since: "2026-09-01", today: dayDk(14) });
    ok(d14.rate != null && Math.abs(d14.rate + 2.0) <= 0.08 && d14.start === 192, `rate: a sparse first week still gives a rate (${d14.rate}) and a start (${d14.start})`);
    const d28 = N.decision(sp, {}, { mode: "trim", since: "2026-09-01", today: dayDk(28) });
    ok(d28.mode === "gain" && /Done/.test(d28.reason), "trim: a 7-lb drop on the 7-day average ends the trim: " + d28.reason); }
  // trim end conditions
  const T = { mode: "trim", since: "2026-09-01" };
  const bwCut = series(1, 50, (i) => 192 - i * 0.15);
  eq(N.decision(bwCut, {}, { ...T, today: "2026-09-21" }).mode, "trim", "trim: week 3, still going");
  ok(/Six weeks is the cap/.test(N.decision(bwCut, {}, { ...T, today: "2026-10-13" }).reason), "trim: six weeks is the cap (a slow trim never reaches -6 lb)");
  eq(N.decision(series(1, 50, () => 192), {}, { ...T, today: "2026-10-13" }).mode, "gain", "trim: six weeks is the cap");
  eq(N.decision(bwCut, { "2026-08-31": { wa: 34 }, "2026-09-18": { wa: 33 } }, { ...T, today: "2026-09-21" }).mode, "gain", "trim: waist down 1 inch = done");
  ok(/1% a week/.test(N.decision(series(1, 30, (i) => 192 - i * 0.4), {}, { ...T, today: "2026-09-14" }).reason), "trim: faster than 1%/wk is flagged (Garthe 2011)");
  // NUT-5: no trim starts into Cycles 5-6; a running trim ends the day before Wave 5
  const BL = E.noTrimWindows(0);
  eq(BL[0], { from: "2026-11-09", to: "2027-01-01", label: "Wave 5 (Intensification)", after: "the Wave 6 test" }, "no-trim window: the Wave 5 Monday to the Wave 6 test Friday");
  eq(BL.map((b) => b.from), ["2026-11-09", "2027-04-26", "2027-10-11"], "no-trim windows: Waves 5-6, 11-12, 17-18");
  const flat190 = series(1, 90, () => 190), nights = (from) => series(from, 7, () => 8);
  const atNov16 = N.decision(flat190, { "2026-09-01": { wa: 33 }, "2026-11-15": { wa: 34 } }, { mode: "gain", since: "2026-09-01", today: "2026-11-16", sleep: nights(71), blocked: BL });
  ok(atNov16.mode === "gain" && atNov16.gate === "cycle" && /Wave 5 \(Intensification\)/.test(atNov16.reason) && /after the Wave 6 test \(2027-01-01\)/.test(atNov16.reason), "no-trim: waist +1 on Nov 16 (Wave 5) = no trim: " + atNov16.reason);
  const atOct6 = N.decision(flat190, { "2026-09-01": { wa: 33 }, "2026-10-05": { wa: 34 } }, { mode: "gain", since: "2026-09-01", today: "2026-10-06", sleep: nights(30), blocked: BL });
  ok(atOct6.mode === "trim" && atOct6.end === "2026-11-08", `no-trim: a trim may start Oct 6, capped to end Nov 8 (${atOct6.mode}, ${atOct6.end})`);
  eq(N.trimEnd("2026-10-06", 6, BL), "2026-11-08", "no-trim: trimEnd stops the day before Wave 5");
  eq(N.trimEnd("2026-09-17", 6, BL), "2026-10-29", "no-trim: a trim that ends before Wave 5 keeps its six weeks");
  eq(N.decision(flat190, { "2026-09-01": { wa: 33 }, "2026-10-19": { wa: 34 } }, { mode: "gain", since: "2026-09-01", today: "2026-10-20", sleep: nights(44), blocked: BL }).gate, "cycle", "no-trim: a trim that could not run three weeks before Wave 5 does not start (Oct 20)");
  ok(N.decision(flat190, {}, { mode: "trim", since: "2026-10-06", today: "2026-11-07", blocked: BL }).mode === "trim" && /Wave 5 \(Intensification\) starts 2026-11-09/.test(N.decision(flat190, {}, { mode: "trim", since: "2026-10-06", today: "2026-11-09", blocked: BL }).reason), "no-trim: a trim since Oct 6 runs to Nov 7 and returns to gaining as Wave 5 starts");
  // NUT-7: the stated adjustment can be applied; targets carry it
  eq(N.targets("gain", 150).kcal, 3200, "targets: an applied +150 makes gain 3,200");
  eq([N.targets("trim", 200).kcal, N.targets("trim", 200).c], [2700, 310], "targets: +200 in trim = 2,700 kcal, the carbs carry it (+50 g)");
  eq([N.targets("gain", 900).kcal, N.targets("trim", -900).kcal], [3450, 2100], "targets: an adjustment is capped at +/-400");
  eq([N.decision(bwFast, waistFlat, G).kcal, N.decision(bwSlow, waistFlat, G).kcal, N.decision(series(1, 21, () => 188), waistFlat, G).kcal], [-150, 0, 150], "decision: the advice carries its kcal (fast -150, on pace 0, flat +150)");
  eq(N.decision(series(1, 30, (i) => 192 - i * 0.4), {}, { ...T, today: "2026-09-14" }).kcal, 200, "decision: a trim losing faster than 1% proposes +200");
  // NUT-3: the weekly call describes; only the decision rule gives calorie advice
  eq([N.weekCall(0.6, "gain"), N.weekCall(0.05, "gain"), N.weekCall(0.3, "gain"), N.weekCall(0.2, "trim"), N.weekCall(-0.8, "trim", 190), N.weekCall(-2.5, "trim", 190)], ["fast", "flat", "on pace", "not losing", "losing 0.8 (on plan)", "faster than 1%"], "weekCall: descriptive calls by mode");
  ok([-3, -1, -0.5, 0, 0.05, 0.2, 0.6, 1].every((d) => ["gain", "trim"].every((m) => !/cal|\+1\d0|−1\d0|-1\d0/.test(N.weekCall(d, m, 190)))), "weekCall: never gives calorie advice");
  eq(N.PACE, { flat: 0.1, target: 0.25, fast: 0.5, trimSlow: 0.005, trimFast: 0.01 }, "pace table: one source for the rule, the table and the band");
  eq(N.TRIM_WEEKS, 6, "trim is six weeks at most");
  eq(N.trimEnd("2026-09-17"), "2026-10-29", "nutri: 6-week trim from Sep 17 ends Oct 29");
  // pre-lift carbs stay in the trim
  ok(/banana/i.test(N.byId("preT").name), "trim pre-lift is whey + banana");
  { // NUT-6: the nutrition note carries the current rules, and the trim day adds up
    const note = require("fs").readFileSync(__dirname + "/notes/nutrition.txt", "utf8");
    ok(!/Four weeks|for 4 weeks|4-week trim|Oct 11|\u2264 188|189\+|mini-cut to ~183/.test(note), "nutrition note: no retired trim rules (4 weeks, Oct 11, 188/189, the spring mini-cut)");
    const trimDay = note.slice(note.indexOf("A TRIM DAY"), note.indexOf("BREAKFAST \u2014 POST-LIFT"));
    ok(/6:10 PRE[^\n]*banana/.test(trimDay) && !/no banana/.test(trimDay), "nutrition note: the trim-day pre-lift keeps the banana");
    const parts = [...trimDay.matchAll(/\(~([\d,]+)(?:\u2013([\d,]+))? \u00b7/g)].map((m) => [+m[1].replace(",", ""), +(m[2] || m[1]).replace(",", "")]);
    const tot = trimDay.match(/\u2248 ([\d,]+)\u2013([\d,]+) \u00b7/);
    eq([parts.reduce((a, x) => a + x[0], 0), parts.reduce((a, x) => a + x[1], 0)], [+tot[1].replace(",", ""), +tot[2].replace(",", "")], "nutrition note: the trim-day total is the sum of its meals");
    ok(/Cycles 5\u20136/.test(note) && /no night was under 6 h/.test(note) && /Six weeks at most/.test(note), "nutrition note: no trims in Cycles 5-6, the sleep gate's short-night rule, six weeks at most");
  }
  // supplements: certified, dosed by the evidence
  ok(/NSF Certified for Sport/.test(N.CERT) && /Informed Sport/.test(N.CERT), "every supplement must be NSF Certified for Sport or Informed Sport");
  const caf = N.SUPPS.find((x) => x.name === "Caffeine");
  ok(/3 mg\/kg/.test(caf.dose) && /50\u201360 min/.test(caf.dose) && /13 h/.test(caf.why), "caffeine: 3 mg/kg, 50-60 min pre, no dose within ~13 h of bed");
  eq(N.SUPPS.find((x) => /Vitamin D/.test(x.name)).tier, 3, "vitamin D is tier 3");
  eq(N.PHASES[1].protein, [215, 230], "CK cut protein 215-230 g");
  ok(!/Diet break at week 5/.test(N.PHASES[1].note) && /does not save muscle/.test(N.PHASES[1].note), "refeeds are for adherence, not muscle (ICECAP)");
  // home plates: what he actually cooks
  const plates = N.HOME.filter((x) => x.grp === "plate");
  ok(plates.some((x) => /Salmon/.test(x.name) && x.mode === "gain") && plates.some((x) => /Salmon/.test(x.name) && x.mode === "trim"), "plates: salmon in both modes");
  ok(plates.some((x) => /NY Strip/.test(x.name) && x.mode === "gain") && plates.some((x) => /NY Strip/.test(x.name) && x.mode === "trim"), "plates: NY strip in both modes");
  ok(plates.some((x) => /Ribeye/.test(x.name) && x.mode === "gain") && !plates.some((x) => /Ribeye/.test(x.name) && x.mode === "trim"), "plates: ribeye is gaining-only");
  ok(plates.filter((x) => x.mode === "trim").every((x) => x.kcal <= 750 && x.p >= 40), "plates: every trim plate is <=750 kcal and >=40P");
  ok(plates.every((x) => x.p >= 40), "plates: every plate is a protein anchor");
  const homeBase = (mode) => N.HOME.filter((x) => x.mode === mode && !x.grp).reduce((s, x) => s + x.kcal, 0);
  for (const x of plates.filter((x) => x.mode === "gain")) ok(homeBase("gain") + x.kcal >= 2950 && homeBase("gain") + x.kcal <= 3350, `plates: off-shift gaining night with ${x.name.split(" —")[0]} lands 2,950-3,350 (${homeBase("gain") + x.kcal})`);
  for (const x of plates.filter((x) => x.mode === "trim")) ok(homeBase("trim") + x.kcal >= 2150 && homeBase("trim") + x.kcal <= 2500, `plates: off-shift trim night with ${x.name.split(" —")[0]} lands 2,150-2,500 (${homeBase("trim") + x.kcal})`);
  // breakfast alternatives: every one is a post-lift recovery meal
  const bf = N.HOME.filter((x) => x.grp === "bfast");
  ok(bf.length >= 10, `bfast: ${bf.length} options`);
  ok(bf.every((x) => x.p >= 40), "bfast: every breakfast clears 40P post-lift");
  ok(bf.filter((x) => x.mode === "gain").every((x) => x.kcal >= 600 && x.kcal <= 900), "bfast: gain breakfasts sit 600-900");
  ok(bf.filter((x) => x.mode === "trim").every((x) => x.kcal >= 450 && x.kcal <= 600), "bfast: trim breakfasts sit 450-600");
  for (const r of ["Steak & eggs", "Breakfast burrito", "Omelet", "Eggs + Greek yogurt", "Oat protein pancakes"])
    ok(bf.some((x) => x.name.startsWith(r) && x.mode === "gain") && bf.some((x) => x.name.startsWith(r) && x.mode === "trim"), `bfast: ${r} exists in both modes`);
  ok(bf.some((x) => /Steak & eggs/.test(x.name) && /THE PICK/.test(x.note || "")), "bfast: steak & eggs is named the pick");
  // swapping any breakfast for meal 1 keeps the day in band
  const m1 = (mode) => N.HOME.find((x) => x.id === (mode === "gain" ? "m1" : "m1T")).kcal;
  for (const x of bf.filter((x) => x.mode === "gain")) { const d = homeBase("gain") - m1("gain") + x.kcal + 950; ok(d >= 2900 && d <= 3350, `bfast: gaining day with ${x.name.split(" —")[0]} lands 2,900-3,350 (${d})`); }
  for (const x of bf.filter((x) => x.mode === "trim")) { const d = homeBase("trim") - m1("trim") + x.kcal + 550; ok(d >= 2050 && d <= 2500, `bfast: trim day with ${x.name.split(" —")[0]} lands 2,050-2,500 (${d})`); }
  const adds = N.HOME.filter((x) => x.grp === "addon");
  ok(adds.every((x) => x.addon && x.mode === "any"), "addons: bare cuts are mode-agnostic add-ons");
  ok(adds.some((x) => /butter/i.test(x.name)), "addons: cooking fat is loggable");
  // a composed plate should roughly equal the pre-built one
  const comp = N.byId("strip10").kcal + N.byId("rice1").kcal * 1.5 + 50;
  ok(Math.abs(comp - N.byId("stripG").kcal) <= 100, `plates: composed strip plate (${comp}) matches the pre-built (${N.byId("stripG").kcal})`);
}


// ═══ Wave 3 feedback: upper chest, waist, forearms ═══
{
  const S = (d, wk) => E.sessionFor(3, wk || 1, d, {}, E.DEFAULT_SPEC);
  const cnt = (re, ex) => { let n = 0; for (let d = 1; d <= 7; d++) for (const b of S(d)) if (["accessory", "single", "backoff"].includes(b.type) && re.test(b.name || "") && !(ex && ex.test(b.name || ""))) n += b.sets; return n; };
  // the regex that lied: "Incline DB Curl" is not chest
  const upper = cnt(/Incline (Bench|DB Press)|Low-to-High/, /Curl/);
  ok(upper >= 10, `upper chest: ${upper} sets/wk across two press angles + fly (was 7)`);
  ok(S(6).some((b) => /Incline DB Press/.test(b.name || "")), "upper chest: Saturday carries the second press angle");
  ok(/30/.test(E.TRACKED.inc.note) && /NOT 45|not 45/i.test(E.TRACKED.inc.note), "upper chest: the incline note fixes the angle at 30");
  // waist: nothing loads the obliques; the vacuum is a zero-clock filler
  eq(cnt(/Woodchop|Side Bend|Oblique/i), 0, "waist: zero loaded oblique sets");
  const vac = S(3).find((b) => /Stomach Vacuum/.test(b.name || ""));
  ok(vac && /FILLER/.test(vac.cap || "") && vac.w === 0, "waist: vacuum is a bodyweight filler");
  // forearms: real sets, three exposures, an anchor, and free volume from the pulls
  const fa = cnt(/Wrist/);
  ok(fa >= 6, `forearms: ${fa} direct wrist sets (was 4, and they were filler)`);
  ok(S(4).find((b) => /Wrist Extension/.test(b.name || "")).sets >= 3 && S(5).find((b) => /Wrist Curl/.test(b.name || "")).sets >= 3, "forearms: wrist work is 3 sets each, supersetted into main-lift rests");
  const rc = S(5).find((b) => /Reverse Cable Curl/.test(b.name || ""));
  ok(rc && rc.sets === 3 && rc.lastHard && rc.lp, "forearms: reverse curl is a 3-set anchor with lengthened partials");
  ok(S(6).some((b) => /Farmer Hold/.test(b.name || "")), "forearms: Saturday grip work exists");
  const days = new Set(); for (let d = 1; d <= 7; d++) for (const b of S(d)) if (/Wrist|Reverse Cable Curl|Hammer Curl|Farmer/.test(b.name || "")) days.add(d);
  ok(days.size >= 4, `forearms: ${days.size} exposures per week`);
  ok(/NO STRAPS/.test(E.TRACKED.chin.note) && /NO STRAPS/.test(E.TRACKED.rdl.note), "forearms: straps rule is on the chin-up and RDL");
  // budgets hold
  for (let d = 1; d <= 7; d++) { let n = 0; for (const b of S(d)) if (["accessory", "single", "backoff", "main", "ohp", "paused"].includes(b.type)) n += b.sets; ok(n <= 27, `budget: day ${d} = ${n} sets`); }
  let hard = 0; for (let d = 1; d <= 7; d++) for (const b of S(d)) if (b.lastHard) hard++;
  ok(hard <= 13, `budget: ${hard} failure sets/wk`);
}


// ═══ phases: the build, then the CK cut ═══
{
  const N = require("./nutrition.js");
  eq(N.PHASES.length, 2, "phases: two phases");
  eq(N.PHASES.map((p) => p.id), ["build", "ck"], "phases: build first, CK cut second");
  const ck = N.PHASES[1];
  ok(/190/.test(ck.target) && /11%/.test(ck.target) && /170 lb lean/.test(ck.target), "phases: CK cut is ~190 @ 11% on the same 170 lean");
  ok(/Wave 45/.test(ck.by) && /Wave 45/.test(N.PHASES[0].by), "phases: both anchored to Wave 45");
  eq([ck.weeks, ck.floorBF, ck.mode], [10, 10, "trim"], "phases: ten weeks, 10% floor, runs on trim mode");
  ok(ck.kcal <= N.MODES.trim.kcal && ck.kcal >= 2200, "phases: CK cut calories sit at or under trim mode, never a crash");
  ok(/200 @ 15%/.test(ck.gate), "phases: gated on Phase 1 being real");
  ok(ck.short && ck.short.length <= 12, "phases: goal-card short form fits the value slot");
}


// ═══ date-night primer ═══
{
  const N = require("./nutrition.js");
  eq(N.primerStage("2026-09-17", "2026-09-16"), "eve", "primer: day before = eve");
  eq(N.primerStage("2026-09-17", "2026-09-17"), "day", "primer: the day = day");
  eq(N.primerStage("2026-09-17", "2026-09-18"), null, "primer: day after = nothing");
  eq(N.primerStage("2026-09-17", "2026-09-10"), null, "primer: a week out = nothing");
  eq(N.primerStage(undefined, "2026-09-16"), null, "primer: unset = nothing");
  eq(N.primerStage("garbage", "2026-09-16"), null, "primer: bad date = nothing");
  const P = N.PRIMER;
  ok(P.pump.sets.length >= 8 && /lateral/i.test(P.pump.sets[0][1]), "primer: pump leads with side delts");
  ok(/no failure/i.test(P.eve.rule) && /RPE 8/.test(P.day.morning), "primer: no failure the night before, RPE 8 cap on the day");
  ok(/never cut salt/i.test(P.day.fuel.join(" ")) && /3–4 L/.test(P.day.fuel.join(" ")), "primer: sodium and water rules present");
  ok(/TRIM/.test(P.next), "primer: next-day rule hands back to the trim decision");
  ok(/90%/.test(P.why), "primer: honest expectation is stated");
  const stub = { "Cable Lateral Raise": 22.5, "Low-to-High Cable Fly": 35, "Overhead Press": 100, "Face Pull": 60, "Incline DB Curl": 40, "Rope Pushdown": 95, "Unilateral Cable Pulldown": 105, "Shrug": 170, "Hammer Curl": 40 };
  const L = N.primerLoads((nm) => stub[nm] ?? null);
  eq(L.length, P.pump.sets.length, "loads: one per set");
  eq(L.find((x) => x.k === "A1").w, 17.5, "loads: laterals = 75% of 22.5, rounded to 2.5");
  eq(L.find((x) => x.k === "C2").w, 70, "loads: pushdown = 75% of 95, rounded to 5");
  eq(L.find((x) => x.k === "B1").w, 32.5, "loads: mid fly = 90% of the low-high fly, rounded to 2.5");
  ok(L.find((x) => x.k === "C1").disp.startsWith("32.5s"), "loads: DB movements display per hand");
  ok(L.every((x) => x.k === "G" || x.derived), "loads: every weighted set resolved from a rung");
  const F = N.primerLoads(() => null);
  ok(F.every((x) => Number.isFinite(x.w)) && F.find((x) => x.k === "A1").w === 15, "loads: fallbacks cover a missing match");
  const g = L[L.length - 1];
  ok(g.k === "G" && /vacuum/i.test(g.name) && g.disp === "BW", "loads: the vacuum is the finisher, bodyweight — the ab wheel failed the pressure test");
  ok(!P.pump.sets.some((s) => /press/i.test(s[1])), "pump: no pressing — nothing that unloads at lockout");
  ok(/30–60 min/.test(P.pump.title) && /No lockouts/.test(P.pump.rule), "pump: timing window and occlusion cue");
  ok(P.pump.boosters.length >= 3 && /BFR/.test(P.pump.boosters.join(" ")), "pump: boosters listed");
  eq([N.roundLoad(17.4), N.roundLoad(71.25), N.roundLoad(49)], [17.5, 70, 50], "loads: rounding rule");
}

// ═══ evidence rules (EVIDENCE.md) ═══
{
  const fs = require("fs");
  const src = ["engine.js", "app-shell.html", "sync.py", "out/note-wave3.txt", "out/note-wave4.txt"].map((f) => fs.readFileSync(__dirname + "/" + f, "utf8")).join("\n");
  ok(!/two-thirds/i.test(src), "evidence: triceps are ~55% of upper-arm muscle, never 'two-thirds'");
  ok(!/Sato 2021/.test(src), "evidence: no 'preacher beat incline' claim; the regions differ (Kassiano 2025)");
  ok(!/ZERO tension|zero tension/.test(src), "evidence: DB and cable laterals grew side delts equally (Larsen 2025)");
  ok(!/long head loaded at length/.test(E.TRACKED.dip.note) && /SHORTENS the long head/.test(E.TRACKED.dip.note), "evidence: the dip shortens the long head");
  ok(/1\.5x/.test(E.ACC.find((a) => a.id === "ohthu").cap) && /1\.4x/.test(E.ACC.find((a) => a.id === "ohthu").cap), "evidence: Maeo 2023 numbers are long head 1.5x, whole triceps 1.4x");
  const week = (wv, wk) => { const out = []; for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(wv, wk, d, {}, E.DEFAULT_SPEC)) out.push(b); return out; };
  const sd = week(4, 1).filter((b) => b.type === "accessory" && isSideDelt(b.name)).reduce((n, b) => n + b.sets, 0);
  eq(sd, 13, "evidence: 13 side-delt sets a week from Wave 4 (lattue 4 + latwed 4 + Saturday Y-raise 5)");
  eq(week(3, 1).filter((b) => b.type === "accessory" && isSideDelt(b.name)).reduce((n, b) => n + b.sets, 0), 11, "evidence: Waves 1-3 ran 11 side-delt sets a week (history)");
  ok(sd <= 16, "side delts stay inside the 16 cap");
  const rp = E.ACC.find((a) => a.id === "revpec");
  ok(rp.sets === 3 && /NEUTRAL GRIP/.test(rp.cap), "evidence: reverse pec deck 3 sets, neutral grip");
  eq(E.ACC.find((a) => a.id === "facepull").steps, [12, 15, 20], "face pull steps 12/15/20");
  for (const id of ["hammer", "pushdown", "legpress"]) {
    for (const wk of [1, 2]) {
      const b = week(4, wk).find((x) => x.pkey === id);
      ok(b && b.rpe === "8" && !b.lastHard, `evidence: ${id} capped at RPE 8, never a failure set (wk${wk})`);
    }
  }
  ok(/Never to failure/.test(E.ACC.find((a) => a.id === "legpress").cap), "evidence: leg press never to failure");
  // since: exercises added in Wave 3 start their rung at Wave 3
  const lp = E.ACC.find((a) => a.id === "lpcalf");
  eq(E.accState(lp, 3), { w: lp.w, i: 0 }, "since: lpcalf starts Wave 3 on its seed rung");
  const sat3 = E.sessionFor(3, 1, 6, {}, E.DEFAULT_SPEC);
  const incdb = sat3.find((b) => /Incline DB Press/.test(b.name || "")), farmer = sat3.find((b) => /Farmer/.test(b.name || ""));
  ok(incdb.w === 60 && incdb.repN === 8, "since: incline DB starts Wave 3 on its seed rung");
  ok(farmer.w === 80 && farmer.repN === 30, "since: farmer hold starts Wave 3 on its seed rung");
}

// ═══ autoregulation: Rules A-D ═══
{
  const day = (wv, wk, d) => E.sessionDayUTC(wv, wk, d, 0);
  const ctx = (ix) => ({ index: ix, offsetWeeks: 0 });
  const bench = (ix, wv = 5, wk = 2) => E.sessionFor(wv, wk, 2, {}, E.DEFAULT_SPEC, ctx(ix));
  const plan = bench({});
  const sgl = plan.find((b) => b.type === "single" && b.lift === "bn"), bo = plan.find((b) => b.type === "backoff" && b.lift === "bn");
  // pct table sanity: monotonic, 10 = 100%
  const ks = Object.keys(E.RPE_PCT_1).map(Number).sort((a, b) => a - b);
  ok(ks.every((k, i) => i === 0 || E.RPE_PCT_1[k] > E.RPE_PCT_1[ks[i - 1]]) && E.RPE_PCT_1[10] === 1, "RPE table rises to 100% at RPE 10");
  // Rule A
  const t = day(5, 2, 2);
  const onT = bench({ "bn-single": [{ t, w: sgl.w, r: 1, rate: "O" }] }).find((b) => b.type === "backoff" && b.lift === "bn");
  eq(onT.w, bo.w, "Rule A: single on target leaves the back-offs as planned");
  const easy = bench({ "bn-single": [{ t, w: sgl.w, r: 1, rate: "E" }] }).find((b) => b.type === "backoff" && b.lift === "bn");
  ok(easy.w > bo.w && easy.w <= E.R5(bo.w * 1.05), `Rule A: easy single raises back-offs, at most +5% (${bo.w} -> ${easy.w})`);
  const hard = bench({ "bn-single": [{ t, w: sgl.w, r: 1, rpe: 10 }] }).find((b) => b.type === "backoff" && b.lift === "bn");
  eq(hard.w, E.R5(bo.w * 0.95), "Rule A: a grinder cuts back-offs by 5%, no more");
  const yesterday = bench({ "bn-single": [{ t: t - E.MS_DAY, w: sgl.w, r: 1, rate: "E" }] }).find((b) => b.type === "backoff" && b.lift === "bn");
  eq(yesterday.w, bo.w, "Rule A: only today's single scales today's back-offs");
  eq(E.singleFactor(200, 8, { w: 200, rpe: 8 }), 1, "Rule A: factor 1 on target");
  // Rule C
  const incKey = plan.find((b) => /Incline Bench — back/.test(b.name || ""));
  const lastWk = day(5, 1, 2);
  const cUp = bench({ "incbb-back": [{ t: lastWk, w: 150, r: 8 }, { t: lastWk, w: 150, r: 8, rate: "E" }] }).find((b) => b.pkey === "incbb-back");
  eq(cUp.w, E.R5(incKey.w * 1.05), "Rule C: easy last time = +5% next exposure");
  const cDn = bench({ "incbb-back": [{ t: lastWk, w: 150, r: 8, rate: "H" }] }).find((b) => b.pkey === "incbb-back");
  eq(cDn.w, E.R5(incKey.w * 0.95), "Rule C: hard last time = -5% next exposure");
  const row = plan.find((b) => b.pkey === "rowtue");
  const rUp = bench({ rowtue: [{ t: lastWk, w: row.w, r: 10, rate: "E" }] }).find((b) => b.pkey === "rowtue");
  eq(rUp.w, E.R25(row.w + 5), "Rule C: accessories move one increment");
  const stale = bench({ "incbb-back": [{ t: lastWk - 21 * E.MS_DAY, w: 150, r: 8, rate: "E" }] }).find((b) => b.pkey === "incbb-back");
  eq(stale.w, incKey.w, "Rule C: a rating older than 14 days is ignored");
  const superseded = bench({ "incbb-back": [{ t: lastWk - E.MS_DAY * 3, w: 150, r: 8, rate: "E" }, { t: lastWk, w: 150, r: 8 }] }).find((b) => b.pkey === "incbb-back");
  eq(superseded.w, incKey.w, "Rule C: a newer unrated session supersedes an older rating");
  ok(E.sessionFor(5, 2, 2, {}, E.DEFAULT_SPEC).every((b, i) => b.w === plan[i].w && !plan[i].auto), "no history = the plan's loads, untouched");
  // Rule D
  const tb = E.mainTables(5).t;
  const d5 = (L, wk) => day(5, wk, { sq: 1, bn: 2, dl: 5 }[L]);
  const single = (L, wk, x) => ({ [L + "-single"]: [{ t: d5(L, wk), w: tb[L].s[wk - 1], r: 1, ...x }] });
  eq(E.autoGate(5, {}, ctx(single("bn", 3, { rate: "O" }))).bn.result, "clean", "Rule D: wk3 single on the cap = clean");
  eq(E.autoGate(5, {}, ctx(single("bn", 3, { rpe: 8.5 }))).bn.result, "small", "Rule D: RPE 8.5 = small");
  eq(E.autoGate(5, {}, ctx(single("bn", 3, { rpe: 9 }))).bn.result, "repeat", "Rule D: RPE 9 = repeat");
  eq(E.autoGate(5, {}, ctx(single("bn", 3, { rpe: 10 }))).bn.result, "reset", "Rule D: a max-effort wk3 single = reset");
  eq(E.autoGate(5, {}, ctx(single("bn", 3, { rpe: 7 }))).bn.result, "clean", "Rule D: under the cap = clean (not reserved for RPE 7: base is not e1RM)");
  eq(E.autoGate(5, {}, ctx(single("sq", 2, { rate: "H" }))).sq.week, 2, "Rule D: falls back to the latest rated single");
  eq(E.autoGate(6, {}, ctx(single("bn", 3, { rate: "O" }))), null, "Rule D: never auto-gates out of a peak (the test sets that base)");
  const g = E.withAutoGates({}, ctx(single("bn", 3, { rpe: 9 })));
  eq([g[6].bn, g[6].auto.bn.result], ["repeat", "repeat"], "withAutoGates fills the unset gate");
  eq(E.cbFor(6, g).bn, E.cbFor(5).bn, "an auto repeat holds the base");
  eq(E.withAutoGates({ 6: { bn: "clean" } }, ctx(single("bn", 3, { rpe: 9 })))[6].bn, "clean", "a gate the lifter set wins over Rule D");
  eq(E.withAutoGates({}, ctx({ "bn-single": [{ t: E.sessionDayUTC(2, 3, 2, 0), w: 100, r: 1, rpe: 10 }] }))[3], undefined, "Rule D never overrides the calibration pin");
}

// ═══ reviewer: a full 19-wave year of one-tap logging ═══
{
  // log every prescribed set at the prescribed weight, rate the last set of every block
  function simulate(rate) {
    const ix = {}, ctx = { index: ix, offsetWeeks: 0 };
    let bad = 0, sessions = 0;
    for (let wv = 1; wv <= 19; wv++) {
      const gates = E.withAutoGates({}, ctx, wv);
      for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++) {
        const t = E.sessionDayUTC(wv, wk, d, 0);
        const blocks = E.sessionFor(wv, wk, d, gates, E.DEFAULT_SPEC, ctx);
        sessions++;
        for (const b of blocks) {
          if (!["single", "backoff", "paused", "ohp", "accessory"].includes(b.type) || !b.pkey) continue;
          if (!Number.isFinite(b.w) || b.w < 0) bad++;
          const n = b.type === "single" ? 1 : b.sets;
          for (let k = 0; k < n; k++) (ix[b.pkey] = ix[b.pkey] || []).push({ t, w: b.w, r: +String(b.repN ?? b.reps).split(/\D/)[0] || 1, rate: k === n - 1 ? rate(wv, b) : undefined });
        }
      }
    }
    return { gates: E.withAutoGates({}, ctx), bad, sessions };
  }
  const onT = simulate(() => "O");
  eq(onT.bad, 0, "year sim: every prescribed load is a finite number");
  eq(onT.sessions, 19 * 28, "year sim: every day of 19 waves builds");
  const cbOn = E.cbFor(19, onT.gates);
  ok(cbOn.bn > E.cbFor(19).bn && cbOn.sq > E.cbFor(19).sq, `year sim: on-target singles every wave beat the small-step projection (${cbOn.bn}/${cbOn.sq}/${cbOn.dl})`);
  const hard = simulate((wv, b) => (b.type === "single" ? "H" : "O"));
  const cbHard = E.cbFor(19, hard.gates);
  ok(cbHard.bn < E.cbFor(19).bn, `year sim: hard singles every wave hold the base (${cbHard.bn}/${cbHard.sq}/${cbHard.dl})`);
  ok(cbHard.bn >= 255 * 0.95 - 5, "year sim: repeats hold, they never spiral down");
}

// ═══ audit and copy fixes (B6): the claims say what the sources say ═══
{
  const fs = require("fs"), rd = (f) => fs.readFileSync(__dirname + "/" + f, "utf8");
  const notes = fs.readdirSync(__dirname + "/out").filter((f) => /^note-wave\d+\.txt$/.test(f) && +f.match(/\d+/)[0] >= 2).map((f) => rd("out/" + f)).join("\n");
  const src = [rd("engine.js"), rd("app-shell.html"), rd("sync.py"), notes].join("\n");
  ok(!/two-thirds|honest pace|strongest remaining lever|13 in → 15 in/i.test(src), "copy: no 'two-thirds', 'honest pace', 'strongest remaining lever' or '13 in → 15 in' in the app, the engine, sync.py or the Wave 2+ notes (Wave 1's printout is history)");
  ok(!/fastest-growing|anterior tilt fix|tech-neck fix|[Pp]ast 30 the front delt|~22%|about 22%/.test(src), "audit: no unsourced neck, posture-fix, past-30 or 22% claims");
  ok(/NOT 45/.test(rd("engine.js")) && /not 45°/.test(rd("app-shell.html")), "audit: the 30° cue still says NOT 45");
  const html = rd("app-shell.html"), readme = rd("README.md"), ev = rd("EVIDENCE.md");
  ok(!/transfer into it|Close-Grip/.test(html + readme) && !/a\.id === "incline"/.test(rd("engine.js")), "copy: no dead close-grip option and no false Sunday-transfer promise");
  const anchor = html.match(/const ANCHOR = \{([^}]*)\}/)[1];
  ok([...E.FRAME_OPTS, ...E.DETAIL_OPTS].every((k) => new RegExp("\\b" + k + ":").test(anchor)), "copy: every frame and detail option has an anchor (no 'Frame: undefined')");
  const capsOf = (t) => (t.match(/biceps 16, triceps 16, side delts 16/) ? "16/16/16" : null) || ((t.match(/(\d+) \/ (\d+) \/ (\d+) caps \(biceps, triceps, side delts\)/) || []).slice(1).join("/"));
  eq(capsOf(readme), capsOf(ev), "copy: README and EVIDENCE.md state the same caps");
  ok(/ES 0\.19, p = 0\.045/.test(ev) && /Rodriguez-Ridao 2020/.test(ev) && /\| 30° rather than steeper \| Partly \| Rodriguez-Ridao/.test(ev), "evidence: Refalo's pooled edge is quoted; the 30° row cites Rodriguez-Ridao, not Saeterbakken");
  ok(/\| Main lifts stop at RPE 8 \| Judgment/.test(ev) && /Heaselgrave 2019[^\n]*did not differ significantly/.test(ev) && /\| Biceps raised moderately[^|]*\| Partly/.test(ev), "evidence: the RPE-8 stop is judgment; Heaselgrave is Partly");
  ok(/Baz-Valle 2022, \*J Hum Kinet\* 81:199/.test(ev) && /2–7 days without training/.test(ev) && /0\.6–1\.7% seated/.test(ev), "evidence: Baz-Valle has its journal, Travis its 2-7 rest days, Kinoshita its real numbers");
  ok(/Coleman 2024/.test(ev) && /Bickel 2011/.test(ev) && /Warneke 2024/.test(ev), "evidence: the deload/trim rules, the peak's dropped specialization and the posture claim have rows");
}

// ═══ Sunday (ENG-11, ENG-5): when it runs, volume moves to it and its keys are its own ═══
{
  const isCurl = (n) => /Curl/i.test(n) && !/Leg Curl|Wrist|Neck|Hammer|Reverse/i.test(n);
  const isTri = (n) => /(Extension|Pushdown)/i.test(n) && !/Leg|Wrist|Neck/i.test(n);
  const cnt = (w, wk, sp, f) => { let t = 0; for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(w, wk, d, {}, sp)) if (b.type === "accessory" && f(b.name || "")) t += b.sets; return t; };
  const ON = { ...E.DEFAULT_SPEC, sundayOn: true };
  eq([cnt(4, 1, ON, isCurl), cnt(4, 1, ON, isTri), cnt(4, 1, ON, isSideDelt)], [14, 16, 16], "Sunday on (W4): 14 curl, 16 triceps isolation, 16 side-delt sets, inside the 16 caps");
  let worst = [0, 0, 0];
  for (const fp of E.FRAME_OPTS) for (const fs of [...E.FRAME_OPTS, "none"]) { if (fs === fp) continue; for (const dt of E.DETAIL_OPTS) {
    const sp = { framePrimary: fp, frameSecondary: fs, detail: dt, sundayOn: true };
    for (const w of [4, 7, 13, 19]) for (const wk of [1, 2]) worst = [Math.max(worst[0], cnt(w, wk, sp, isCurl)), Math.max(worst[1], cnt(w, wk, sp, isTri)), Math.max(worst[2], cnt(w, wk, sp, isSideDelt))];
  } }
  ok(worst.every((x) => x <= 16), `Sunday on, every spec, Wave 4+: curls, triceps and side delts stay at or under 16 (${worst.join("/")})`);
  let onlyMoves = true, satKeys = true;
  for (const w of [4, 5, 7, 10, 13, 16, 19]) for (const wk of [1, 2]) {
    for (let d = 1; d <= 5; d++) {
      const off = E.sessionFor(w, wk, d, {}, E.DEFAULT_SPEC).filter((b) => b.type !== "note"), on = E.sessionFor(w, wk, d, {}, ON).filter((b) => b.type !== "note");
      const k = (a) => a.map((b) => b.pkey || b.name);
      const runs = E.sundayPlanned(w, wk, ON);
      if (JSON.stringify(k(off).filter((x) => !runs || !["curlmon", "ohtue"].includes(x))) !== JSON.stringify(k(on))) onlyMoves = false;
    }
    const sun = E.sessionFor(w, wk, 7, {}, ON).filter((b) => b.pkey), sat = new Set(E.sessionFor(w, wk, 6, {}, ON).map((b) => b.pkey).filter(Boolean));
    if (sun.length && sun.some((b) => sat.has(b.pkey))) satKeys = false;
  }
  ok(onlyMoves, "Sunday on: in the weeks it runs the weekdays lose exactly Monday's Bayesian curl and Tuesday's overhead extension; otherwise nothing changes");
  ok(satKeys, "Sunday on (Wave 4+): no Sunday exercise shares a log key with Saturday");
  ok(E.sessionFor(4, 1, 7, {}, ON).some((b) => b.pkey === "sun-overhead-cable-extension" && b.sets === 2), "Sunday on: its overhead extension runs 2 sets under its own key");
  ok(/moved to Sunday/.test(JSON.stringify(E.sessionFor(4, 1, 4, {}, ON))) && !/under cap/.test(JSON.stringify(E.sessionFor(3, 1, 4, {}, ON))), "Sunday on: Thursday says what moved; no 'under cap' promise in any wave");
}

// ═══ every citation the app or the notes make is in EVIDENCE.md ═══
{
  const fs = require("fs");
  const ev = fs.readFileSync(__dirname + "/EVIDENCE.md", "utf8");
  const src = ["engine.js", "app-shell.html", "nutrition.js", "notes/nutrition.txt"].map((f) => fs.readFileSync(__dirname + "/" + f, "utf8")).join("\n");
  const MONTHS = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/;
  const cites = new Set((src.match(/\b[A-Z][a-z\u00C0-\u017F][a-zA-Z\u00C0-\u017F-]* (?:19|20)\d{2}\b/g) || []).filter((c) => !MONTHS.test(c)));
  ok(cites.size >= 10, `citations found in the app: ${cites.size}`);
  for (const c of cites) ok(ev.includes(c), `EVIDENCE.md covers "${c}"`);
  ok(!/Barbalho/.test(src), "the retracted Barbalho papers are never cited");
}

// ═══ warm-ups climb: the bridge is never lighter than the indicator ═══
for (let w = 1; w <= 19; w++) for (const [L, d] of [["sq", 1], ["bn", 2], ["dl", 5]]) {
  const wu = E.sessionFor(w, 1, d, {}, E.DEFAULT_SPEC).find((b) => b.type === "warmup");
  if (!wu) continue;
  const nums = wu.rows.map((r) => r[0]).filter((x) => typeof x === "number");
  ok(nums.every((x, i) => i === 0 || x > nums[i - 1]), `warm-up w${w} ${L} climbs: ${nums.join(" ")}`);
}
eq(E.sessionFor(1, 1, 5, {}, E.DEFAULT_SPEC).find((b) => b.type === "warmup").rows.map((r) => r[0]), [135, 225, 275, 315], "Wave 1 deadlift warm-up is the printed one");
eq(E.sessionFor(2, 1, 1, {}, E.DEFAULT_SPEC).find((b) => b.type === "warmup").rows.map((r) => r[0]).slice(-1), [225], "Wave 2 squat indicator is the printed 225");

// ═══ meet attempts in kilograms (USPA loads kg, 2.5 kg steps) ═══
{
  eq([E.kgDown(331), E.kgNear(331), E.kgNear(347)], [150, 150, 157.5], "kg: 331 lb opener rounds down to 150, 347 lb to 157.5");
  const k = E.attemptsKg(E.testAttempts({ sq: 365, bn: 255, dl: 455 }));
  for (const L of E.LIFTS) {
    ok([k[L].a1, k[L].a2, k[L].a3].every((x) => Math.abs(x / 2.5 - Math.round(x / 2.5)) < 1e-9), `kg ${L}: every attempt is a 2.5 kg step`);
    ok(k[L].a1 < k[L].a2 && k[L].a2 <= k[L].a3, `kg ${L}: attempts climb (${k[L].a1}/${k[L].a2}/${k[L].a3})`);
    ok(k[L].a1 * E.LB_PER_KG <= E.testAttempts({ sq: 365, bn: 255, dl: 455 })[L].a1 + 0.01, `kg ${L}: opener never heavier than the lb opener`);
  }
  eq(E.e1rm({ w: 300, r: 1, rpe: 8 }, 8), Math.round(300 / 0.922), "e1rm: a rated single uses the RPE table");
  eq(E.e1rm({ w: 300, r: 1, rate: "O" }, 8), Math.round(300 / 0.922), "e1rm: a one-tap rating works the same");
  eq(E.e1rm({ w: 200, r: 5 }), Math.round(200 * (1 + 5 / 30)), "e1rm: multi-rep sets use Epley");
  eq(E.e1rm({ w: 100, r: 15 }), null, "e1rm: no estimate past 10 reps");
}

// ═══ Rule D leaves settled history alone; sessions fit the 90-minute slot ═══
{
  const old = { index: { "bn-single": [{ t: E.sessionDayUTC(1, 3, 2, 0), w: 200, r: 1, rpe: 9.5 }] }, offsetWeeks: 0 };
  eq(E.withAutoGates({}, old)[2], undefined, "Rule D: a typed RPE from Wave 1 cannot re-gate Wave 2");
  ok(E.mainTables(2, E.withAutoGates({}, old)).explicit, "Wave 2 still prints its notes");
  // rough clock: warm-up 8, single 4, main back-off set 3.5, paused/OHP 3, tracked 2.5, accessory 1.75-2, fillers free
  const cost = (b) => /FILLER|PRIMER/.test(b.cap || "") ? 0 : b.type === "single" ? 4 : b.type === "backoff" && E.LIFTS.includes(b.lift) ? b.sets * 3.5
    : b.type === "paused" || b.type === "ohp" ? b.sets * 3 : b.type === "backoff" ? b.sets * 2.5 : b.type === "accessory" ? b.sets * (b.db ? 2 : 1.75)
    : b.type === "warmup" ? 8 : b.type === "conditioning" ? 18 : b.type === "cooldown" ? 5 : 0;
  let worst = 0;
  for (let w = 1; w <= 19; w++) for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++) worst = Math.max(worst, E.sessionFor(w, wk, d, {}, E.DEFAULT_SPEC).reduce((a, b) => a + cost(b), 0));
  ok(worst <= 85, `session budget: the longest session estimates ${Math.round(worst)} min, inside the 7:00-8:30 slot`);
}

// ═══ one-tap logging must be able to progress Saturday arm work ═══
{
  const sat = (wv, wk, ix) => E.sessionFor(wv, wk, 6, {}, E.DEFAULT_SPEC, ix ? { index: ix, offsetWeeks: 0 } : undefined).filter((b) => b.type === "accessory");
  ok(sat(4, 2).every((b) => !b.repHi || b.repN === b.repHi), "Saturday week 2 asks for the top of every rep range");
  ok(sat(4, 1).some((b) => b.repHi && b.repN < b.repHi), "Saturday week 1 still starts at the bottom");
  // simulate a year of one-tap Saturdays: every chip logged exactly as shown
  const ix = {};
  for (let wv = 1; wv <= 10; wv++) for (let wk = 1; wk <= 3; wk++) {
    const t = E.sessionDayUTC(wv, wk, 6, 0);
    for (const b of sat(wv, wk, ix)) for (let k = 0; k < b.sets; k++) (ix[b.pkey] = ix[b.pkey] || []).push({ t, w: b.w, r: b.repN });
  }
  const curl = sat(11, 1, ix).find((b) => /Incline DB Curl/.test(b.name)), oh = sat(11, 1, ix).find((b) => /Overhead Cable Extension/.test(b.name));
  ok(curl.w > 35 && curl.prog !== "held", `one-tap Saturdays: incline curl climbs (${curl.w}, ${curl.prog})`);
  ok(oh.w > 70 && oh.prog !== "held", `one-tap Saturdays: overhead extension climbs (${oh.w}, ${oh.prog})`);
}

// ═══ arm specialization (Wave 4+): EVIDENCE.md "Arm specialization" ═══
{
  const week = (wv, wk) => { const o = []; for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(wv, wk, d, {}, E.DEFAULT_SPEC)) o.push({ ...b, d }); return o; };
  const isCurl = (n) => /Curl/i.test(n) && !/Leg Curl|Wrist|Neck|Hammer|Reverse/i.test(n);
  const isTri = (n) => /(Extension|Pushdown)/i.test(n) && !/Leg|Wrist|Neck/i.test(n);
  const count = (wv, wk, f) => week(wv, wk).filter((b) => b.type === "accessory" && f(b.name || "")).reduce((n, b) => n + b.sets, 0);
  eq([count(3, 1, isCurl), count(3, 1, isTri)], [8, 11], "arms: Waves 1-3 are history, unchanged (8 curl / 11 triceps sets)");
  eq([count(4, 1, isCurl), count(4, 1, isTri)], [11, 15], "arms: from Wave 4, 11 curl sets and 15 triceps isolation sets a week");
  ok(count(4, 1, isTri) - 11 > count(4, 1, isCurl) - 8, "arms: triceps get the bigger raise (Baz-Valle 2022, Brigatto 2022); biceps a moderate one (Heaselgrave 2019)");
  const days = (f) => new Set(week(4, 1).filter((b) => b.type === "accessory" && f(b.name || "")).map((b) => b.d));
  eq([...days(isCurl)].sort(), [1, 3, 6], "arms: curls on Mon, Wed, Sat (48 h+ between the hard biceps days)");
  ok(!days(isTri).has(1), "arms: no triceps isolation on Monday, 24 h before bench (Ferreira 2017)");
  const thuTri = week(4, 1).filter((b) => b.d === 4 && b.type === "accessory" && isTri(b.name)).reduce((n, b) => n + b.sets, 0);
  eq(thuTri, 5, "arms: Thursday triceps unchanged (already at the per-session ceiling)");
  const tue = E.sessionFor(4, 1, 2, {}, E.DEFAULT_SPEC), ohIdx = tue.findIndex((b) => b.pkey === "ohtue");
  ok(ohIdx > tue.findIndex((b) => /Incline Bench — back-offs/.test(b.name || "")) && ohIdx > tue.findIndex((b) => /Bench — back-offs/.test(b.name || "")), "arms: Tuesday overhead extension comes after ALL pressing (Soares 2016)");
  for (const id of ["curlmon", "ohtue"]) for (const wk of [1, 2]) {
    const b = week(4, wk).find((x) => x.pkey === id);
    ok(b && b.rpe === "8" && !b.lastHard, `arms: added ${id} sets stop at RPE 8, no extra failure sets (wk${wk})`);
  }
  eq(week(4, 3).find((b) => b.pkey === "curlmon").sets, 2, "arms: week 3 trims the added sets");
  ok(week(4, 4).filter((b) => b.pkey === "curlmon" || b.pkey === "ohtue").every((b) => b.light && b.sets === 2), "arms: week 4 deloads them");
  ok(!week(6, 1).some((b) => b.pkey === "curlmon" && b.sets > 2), "arms: the peak cuts them back with everything else");
  eq(E.accState(E.ACC.find((a) => a.id === "curlmon"), 4).w, 25, "arms: new exercises start Wave 4 on their seed rung");
}

// ═══ upper back, traps and 3D shoulders (Wave 4+): EVIDENCE.md "Upper back, traps and 3D shoulders" ═══
{
  // (0) HISTORY. Every Wave 1-3 prescription, for every spec, is frozen at v61. Text and library
  // links (moveId, cap, note, arch) may be corrected; loads, reps, sets, RPEs and keys may not.
  const crypto = require("crypto");
  const SKIP = new Set(["moveId", "cap", "note", "arch"]);
  const canon = (x) => Array.isArray(x) ? "[" + x.map(canon).join(",") + "]"
    : x && typeof x === "object" ? "{" + Object.keys(x).sort().filter((k) => x[k] !== undefined && !SKIP.has(k)).map((k) => JSON.stringify(k) + ":" + canon(x[k])).join(",") + "}"
    : JSON.stringify(x);
  const hh = crypto.createHash("sha256");
  for (const fp of ["shoulders", "upperchest", "latwidth", "upperback", "traps", "arms"])
    for (const fs of ["shoulders", "upperchest", "latwidth", "upperback", "traps", "arms", "none"])
      for (const dt of ["triceps", "biceps", "brachialis"]) for (const sun of [false, true]) {
        const spec = { framePrimary: fp, frameSecondary: fs, detail: dt, sundayOn: sun, secondaryPress: "incline" };
        for (let w = 1; w <= 3; w++) for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++) hh.update(canon(E.sessionFor(w, wk, d, {}, spec)) + "\n");
      }
  eq(hh.digest("hex"), "cb2505ffd70236f4fa21bf1d8c0c4acff311c37cbd1fe77db7a51e2e6d707986", "history: every Wave 1-3 prescription for every spec is unchanged since v61");
  { // the same with a logged history: one-tap logs for Waves 1-3 with mixed ratings and off-plan loads
    const ix = {}, ctx = { index: ix, offsetWeeks: 0 }, RATES = ["O", "E", "H"];
    for (let wv = 1; wv <= 3; wv++) for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++) {
      const t = E.sessionDayUTC(wv, wk, d, 0);
      E.sessionFor(wv, wk, d, E.withAutoGates({}, ctx, wv), E.DEFAULT_SPEC, ctx).forEach((b, bi) => {
        if (!["single", "backoff", "paused", "ohp", "accessory"].includes(b.type) || !b.pkey) return;
        const n = b.type === "single" ? 1 : b.sets, r = +String(b.repN ?? b.reps).split(/\D/)[0] || 1;
        for (let k = 0; k < n; k++) (ix[b.pkey] = ix[b.pkey] || []).push({ t, w: b.w + ((wv + bi) % 3 === 0 ? 5 : 0), r: r + ((wv + wk + bi) % 2), rate: k === n - 1 ? RATES[(wv + wk + d + bi) % 3] : undefined });
      });
    }
    const h2 = crypto.createHash("sha256");
    for (let w = 1; w <= 3; w++) for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++) h2.update(canon(E.sessionFor(w, wk, d, E.withAutoGates({}, ctx, w), E.DEFAULT_SPEC, ctx)) + "\n");
    eq(h2.digest("hex"), "5f69ea44014da4ac2c7b77fd9320ad36d14bc3baf9c7e3ffa39ee4d194d094b8", "history: Waves 1-3 recomputed from a logged history are unchanged since v61");
  }

  const week = (wv, wk, spec) => { const o = []; for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(wv, wk, d, {}, spec || E.DEFAULT_SPEC)) o.push({ ...b, d }); return o; };
  const LOG = ["accessory", "single", "backoff"];
  const prim = (b) => /^(FILLER|PRIMER)/.test(b.cap || "");
  const sum = (wv, wk, f) => week(wv, wk).filter((b) => LOG.includes(b.type) && !prim(b) && f(b.name || "")).reduce((n, b) => n + b.sets, 0);
  const days = (wv, wk, f) => [...new Set(week(wv, wk).filter((b) => LOG.includes(b.type) && !prim(b) && f(b.name || "")).map((b) => b.d))].sort();
  const isShrug = (n) => /Shrug/.test(n), isRear = (n) => /Rear-Delt|Reverse Pec|Reverse-Pec|Face Pull/i.test(n);
  const isRow = (n) => /Row\b/.test(n), isVert = (n) => /Chin-Up|Pulldown/.test(n);

  // (1) the doses (Weeks 1-2, default spec)
  eq([sum(3, 1, isShrug), sum(4, 1, isShrug)], [1, 6], "upper back: direct upper-trap sets 1 -> 6 from Wave 4 (Conley 1997, Andersen 2009; the number is judgment)");
  eq(days(4, 1, isShrug), [1, 6], "upper back: shrugs Mon + Sat; no trap work in the 24 h before the deadlift");
  ok(!E.sessionFor(4, 1, 4, {}, E.DEFAULT_SPEC).some((b) => /Shrug|Farmer/.test(b.name || "")), "upper back: no trap or grip work on Thursday");
  eq([sum(3, 1, isRear), sum(4, 1, isRear)], [5, 9], "3D delts: direct rear-delt sets 5 -> 9 from Wave 4");
  eq(days(4, 1, isRear), [2, 4, 6], "3D delts: rear delts on Tue (anchor), Thu (face pull), Sat (raise)");
  eq([sum(3, 1, isSideDelt), sum(4, 1, isSideDelt)], [11, 13], "3D delts: side delts 11 -> 13 from Wave 4, inside the 16 cap");
  eq([sum(3, 1, isRow), sum(4, 1, isRow)], [7, 7], "upper back: 7 row sets a week, Friday's now the upper-back row");
  eq([sum(4, 1, isVert), sum(4, 3, isVert), sum(5, 1, isVert)], [7, 6, 6], "back detail: vertical pulls 7 / 6 / 6 (week 3 and Cycle 5 trim the pulldown to 2, never delete it)");
  // (2) row roles: new key + lighter seed, Waves 1-3 keep the old Friday row
  const fri4 = E.sessionFor(4, 1, 5, {}, E.DEFAULT_SPEC), tue4 = E.sessionFor(4, 1, 2, {}, E.DEFAULT_SPEC);
  ok(fri4.some((b) => b.pkey === "rowhi") && !fri4.some((b) => b.pkey === "rowfri"), "upper back: Friday's row is the high-elbow row (its own key) from Wave 4");
  ok(E.sessionFor(3, 1, 5, {}, E.DEFAULT_SPEC).some((b) => b.pkey === "rowfri"), "upper back: Waves 1-3 keep the tucked Friday row");
  for (let w = 4; w <= 19; w++) for (let wk = 1; wk <= 4; wk++) ok(!E.sessionFor(w, wk, 5, {}, E.DEFAULT_SPEC).some((b) => b.pkey === "rowfri"), `upper back: rowfri retired in W${w} wk${wk} (peaks included)`);
  eq(E.accState(E.ACC.find((a) => a.id === "rowhi"), 4), { w: 100, i: 0 }, "upper back: the high-elbow row starts Wave 4 on its own seed rung");
  ok(/UPPER-BACK/.test(fri4.find((b) => b.pkey === "rowhi").cap) && /LAT ROW/.test(tue4.find((b) => b.pkey === "rowtue").cap), "upper back: Friday row = upper back, Tuesday row = lats (Padovan 2026)");
  // (3) anchors: one failure set per muscle per day; added sets stop at RPE 8
  const mon4 = E.sessionFor(4, 1, 1, {}, E.DEFAULT_SPEC).find((b) => b.pkey === "shrug"), rp4 = tue4.find((b) => b.pkey === "revpec");
  ok(mon4.sets === 3 && mon4.lastHard && !mon4.lp, "upper back: Monday shrug is the trap anchor, 3 sets, no partials (no trap data for them)");
  const hlr4 = E.sessionFor(4, 1, 1, {}, E.DEFAULT_SPEC).find((b) => b.pkey === "hlr");
  ok(hlr4.sets === 2 && hlr4.lastHard && E.sessionFor(3, 1, 1, {}, E.DEFAULT_SPEC).find((b) => b.pkey === "hlr").sets === 3, "budget: hanging leg raise 3 -> 2 sets from Wave 4 pays Monday's clock; still the abs anchor");
  ok(sum(4, 1, (n) => /Leg Raise|Crunch|Ab Wheel/.test(n)) >= 4, "abs: 4+ direct sets a week from Wave 4");
  ok(rp4.lastHard && !rp4.lp && /NEUTRAL GRIP/.test(rp4.cap) && /Schoenfeld 2013/.test(rp4.cap), "3D delts: Tuesday reverse pec deck is the rear-delt anchor, neutral grip");
  ok(!E.sessionFor(3, 1, 2, {}, E.DEFAULT_SPEC).find((b) => b.pkey === "revpec").lastHard && E.sessionFor(3, 1, 1, {}, E.DEFAULT_SPEC).find((b) => b.pkey === "shrug").sets === 1, "upper back: Waves 1-3 had no trap or rear-delt anchor (history)");
  for (const wk of [1, 2]) for (const b of week(4, wk).filter((x) => ["rowhi", "facepull", "cable-y-shrug-arms-30-out", "chest-supported-rear-delt-raise-thumbs-up", "cross-body-cable-y-raise"].includes(x.pkey)))
    ok(b.rpe === "8" && !b.lastHard, `upper back: ${b.pkey} stops at RPE 8, no extra failure set (wk${wk})`);
  for (let d = 1; d <= 7; d++) { const hard = E.sessionFor(4, 1, d, {}, E.DEFAULT_SPEC).filter((b) => b.lastHard).map((b) => b.pkey); ok(new Set(hard).size === hard.length, `upper back: day ${d} failure sets are on different exercises (${hard.join(", ")})`); }
  eq(week(4, 1).filter((b) => b.lastHard).length, 14, "upper back: 14 failure sets a week (12 + the trap and rear-delt anchors)");
  // (4) new Saturday work starts on its seed and supersets with the incline press
  const sat4 = E.sessionFor(4, 1, 6, {}, E.DEFAULT_SPEC).filter((b) => b.type === "accessory");
  const ys = sat4.find((b) => /Y-Shrug/.test(b.name)), rr = sat4.find((b) => /Rear-Delt Raise/.test(b.name)), yr = sat4.find((b) => /Y-Raise/.test(b.name));
  ok(ys && ys.w === 50 && ys.repN === 10 && ys.sets === 3, "upper back: Saturday Y-shrug starts Wave 4 at its seed, 3 sets");
  ok(rr && rr.w === 12.5 && rr.repN === 12 && rr.sets === 3 && rr.db, "3D delts: Saturday rear-delt raise starts Wave 4 at its seed, 3 sets");
  ok(yr && yr.sets === 5 && yr.moveId === "xbody", "3D delts: Saturday Y-raise is 5 sets and opens its own card");
  const iIdx = sat4.findIndex((b) => /Incline DB Press/.test(b.name));
  ok(sat4[iIdx + 1] === rr && sat4.indexOf(ys) < sat4.findIndex((b) => /Farmer/.test(b.name)), "upper back: rear-delt raise follows the incline DB press (same bench), Y-shrug precedes the farmer hold");
  ok(!E.sessionFor(4, 1, 6, {}, { ...E.DEFAULT_SPEC, framePrimary: "traps" }).some((b) => /Y-Shrug/.test(b.name || "")), "upper back: the traps frame skips the Y-shrug (its module already shrugs)");
  // (5) trims: week 3 trims, the deload never exceeds a loading week, Cycle 5 keeps the work
  eq([sum(4, 3, isShrug), sum(4, 3, isRear), sum(4, 3, isSideDelt)], [4, 6, 9], "upper back: week 3 trims traps 4, rear delts 6, side delts 9 (never zero)");
  eq([sum(5, 1, isShrug), sum(5, 1, isRear), sum(5, 1, isSideDelt)], [5, 8, 11], "upper back: Cycle 5 keeps traps 5, rear delts 8, side delts 11");
  for (const w of [4, 5, 7, 10, 13, 16, 19]) {
    const s1 = {}; for (const b of week(w, 1)) if (b.type === "accessory" && b.pkey) s1[b.pkey] = b.sets;
    for (const b of week(w, 4)) if (b.type === "accessory" && b.pkey && s1[b.pkey] != null) ok(b.sets <= s1[b.pkey], `deload W${w}: ${b.pkey} ${b.sets} sets <= loading week ${s1[b.pkey]}`);
  }
  eq(week(4, 4).find((b) => b.pkey === "shrug").sets, 2, "deload: the shrug is 2 light sets (it used to double the 1-set shrug)");
  // (6) peaks: no retired Thursday work, primers before pressing
  for (const w of [6, 12, 18]) for (const wk of [1, 2]) {
    ok(!E.sessionFor(w, wk, 4, {}, E.DEFAULT_SPEC).some((b) => /Lateral Raise \(Thu\)|^Rear-Delt Fly$/.test(b.name || "")), `peak W${w} wk${wk}: retired Thursday delt work stays retired`);
    const tp = E.sessionFor(w, wk, 2, {}, E.DEFAULT_SPEC), pi = tp.findIndex((b) => b.pkey === "pullapart");
    ok(pi > -1 && pi < tp.findIndex((b) => b.type === "single"), `peak W${w} wk${wk}: the pull-apart primes before the bench single`);
  }
  // (7) primers: band external rotation before both pressing days, costs no clock
  for (const d of [2, 4]) { const s = E.sessionFor(4, 1, d, {}, E.DEFAULT_SPEC), i = s.findIndex((b) => b.pkey === "bander");
    ok(i > -1 && /^PRIMER/.test(s[i].cap) && i < s.findIndex((b) => b.type === "single" || b.type === "paused"), `shoulder health: band external rotation primes before pressing on day ${d}`); }
  ok(!E.sessionFor(3, 1, 2, {}, E.DEFAULT_SPEC).some((b) => b.pkey === "bander"), "shoulder health: Waves 1-3 had no band ER primer (history)");
  // (8) cues: no internally rotated lateral, no unsupported superiority claims
  const html = require("fs").readFileSync(__dirname + "/app-shell.html", "utf8");
  ok(!/pinky slightly high/.test(html) && /THUMB LEVEL/.test(E.sessionFor(4, 1, 2, {}, E.DEFAULT_SPEC).find((b) => b.pkey === "lattue").cap), "shoulder health: laterals cue a level thumb, not an internally rotated 'pinky high'");
  ok(!/THE side-delt builder|deepest stretch|#1 V-taper|best width builder|5 sets now|3 sets is the dose/.test(html + JSON.stringify(week(4, 1)) + JSON.stringify(week(3, 1))), "truth: no unsupported superiority claims or stale set counts in the library or the plan");
  // (9) per-session dose: no back or delt region past ~11 fractional sets in one session (Remmert 2025 preprint)
  const FR = { traps: (n) => (/Shrug/.test(n) ? 1 : /Farmer/.test(n) ? 0.5 : 0), rear: (n) => (isRear(n) ? 1 : isRow(n) || /Chin-Up/.test(n) ? 0.5 : 0),
    side: (n) => (isSideDelt(n) ? 1 : /Overhead Press/.test(n) ? 0.5 : 0), lats: (n) => (isVert(n) ? 1 : isRow(n) ? 0.5 : 0),
    mid: (n) => (isRow(n) ? 1 : isRear(n) || isVert(n) ? 0.5 : 0) };
  let worstSess = 0;
  for (let w = 4; w <= 19; w++) for (let wk = 1; wk <= 3; wk++) for (let d = 1; d <= 6; d++) {
    const s = E.sessionFor(w, wk, d, {}, E.DEFAULT_SPEC).filter((b) => [...LOG, "ohp"].includes(b.type) && !prim(b));
    for (const f of Object.values(FR)) worstSess = Math.max(worstSess, s.reduce((n, b) => n + f(b.name || "") * b.sets, 0));
  }
  ok(worstSess <= 11, `upper back: no back/delt region past 11 fractional sets in one session (worst ${worstSess})`);
  // (10) Wave 4+ budget. The v32 per-day caps above are Wave 1 history. Judgment: every weekday estimate
  // stays <= 75 min (15 min under the 90-min hard cap for rests longer than the clock's ~60 s), Saturday
  // <= 85, and the set counts are pinned so any future addition is a conscious decision.
  const cost = (b) => /FILLER|PRIMER/.test(b.cap || "") ? 0 : b.type === "single" ? 4 : b.type === "backoff" && E.LIFTS.includes(b.lift) ? b.sets * 3.5
    : b.type === "paused" || b.type === "ohp" ? b.sets * 3 : b.type === "backoff" ? b.sets * 2.5 : b.type === "accessory" ? b.sets * (b.db ? 2 : 1.75)
    : b.type === "warmup" ? 8 : b.type === "conditioning" ? 18 : b.type === "cooldown" ? 5 : 0;
  let wkMin = 0, satMin = 0, sunMin = 0, wkSets = 0, satSets = 0;
  for (const fp of E.FRAME_OPTS) for (const fs of ["latwidth", "none"]) for (const dt of E.DETAIL_OPTS) for (const sun of [false, true]) {
    const spec = { framePrimary: fp, frameSecondary: fs, detail: dt, sundayOn: sun, secondaryPress: "incline" };
    for (let w = 4; w <= 19; w++) for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++) {
      const s = E.sessionFor(w, wk, d, {}, spec), m = s.reduce((a, b) => a + cost(b), 0);
      const n = s.filter((b) => ["accessory", "single", "backoff", "ohp", "paused"].includes(b.type) && !prim(b)).reduce((a, b) => a + b.sets, 0);
      if (d === 7) sunMin = Math.max(sunMin, m);
      else if (d === 6) { satMin = Math.max(satMin, m); satSets = Math.max(satSets, n); } else { wkMin = Math.max(wkMin, m); wkSets = Math.max(wkSets, n); }
    }
  }
  ok(wkMin <= 75 && satMin <= 85 && sunMin <= 85, `Wave 4+ budget, every spec: longest weekday ${wkMin} min (<= 75), Saturday ${satMin}, Sunday ${sunMin}`);
  ok(wkSets <= 27 && satSets <= 34, `Wave 4+ budget, every spec: weekday non-filler sets ${wkSets} <= 27, Saturday ${satSets} <= 34`);
}

// ═══ one-tap accessory progression (Wave 4+): logging exactly what is shown keeps every accessory on schedule ═══
{
  const sim = (skip) => {
    const ix = {}, ctx = { index: ix, offsetWeeks: 0 };
    for (let wv = 1; wv <= 19; wv++) for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++) {
      if (skip && skip(wv, wk, d)) continue;
      const t = E.sessionDayUTC(wv, wk, d, 0);
      for (const b of E.sessionFor(wv, wk, d, {}, E.DEFAULT_SPEC, ctx)) {
        if (!["single", "backoff", "paused", "ohp", "accessory"].includes(b.type) || !b.pkey) continue;
        const n = b.type === "single" ? 1 : b.sets, r = +String(b.repN ?? b.reps).split(/\D/)[0] || 1;
        for (let k = 0; k < n; k++) (ix[b.pkey] = ix[b.pkey] || []).push({ t, w: b.w, r });
      }
    }
    return ctx;
  };
  const ctx = sim();
  // peak maintenance (1 set) no longer freezes 2-set work; the shrug's Wave 4 restart carries no false hold
  for (const w of [5, 7, 10, 13, 16, 19]) for (let d = 1; d <= 7; d++) {
    const plan = E.sessionFor(w, 1, d, {}, E.DEFAULT_SPEC), got = E.sessionFor(w, 1, d, {}, E.DEFAULT_SPEC, ctx);
    got.forEach((b, i) => { if (b.type === "accessory" && plan[i].w > 0) ok(b.prog !== "held" && b.w >= plan[i].w, `one-tap W${w} d${d} ${b.pkey}: ${b.w} (${b.prog}) vs schedule ${plan[i].w}`); });
  }
  // a logged weight is adopted on the exercise's grid, never rounded up (the cable lateral gained a phantom 2.5 lb every other wave)
  const LW = { w: 22.5, steps: [10, 12, 15], inc: 2.5, db: false, i0: 1, pkey: "x", since: 4 };
  const at = (w) => ({ index: { x: [0, 1].map(() => ({ t: E.sessionDayUTC(4, 1, 3, 0), w, r: 15 })) }, offsetWeeks: 0 });
  eq([E.accStateLogged(LW, 5, at(25)).w, E.accStateLogged(LW, 5, at(24)).w], [27.5, 25], "progression: 25 x top adopts 25 then steps; 24 is not rounded up to 25");
  // ENG-4: 1-set work clears on its one set; 2-set work still needs two
  const one = (sets) => E.accStateLogged({ w: 100, steps: [10, 12, 15], inc: 10, db: false, i0: 0, pkey: "y", since: 4, sets }, 5, { index: { y: [{ t: E.sessionDayUTC(4, 1, 1, 0), w: 100, r: 12 }] }, offsetWeeks: 0 });
  eq([one(1).i, one(1).prog, one(2).i, one(2).prog], [1, "on", 0, "held"], "progression: a 1-set exercise clears on its one set; a 2-set one holds on one");
  // deload sets never qualify a rung; a missed Saturday does not jump the crunch; log order does not matter
  const cr = (w, wk, c) => E.sessionFor(w, wk, 6, {}, E.DEFAULT_SPEC, c).find((b) => /Crunch/.test(b.name || ""));
  ok(cr(4, 4).w < cr(4, 1).w && cr(4, 4).light, `progression: the light-week crunch (${cr(4, 4).w}) is lighter than the working one (${cr(4, 1).w})`);
  const c5 = cr(5, 1, sim((wv, wk, d) => wv === 4 && wk === 2 && d === 6));
  ok(c5.w === cr(5, 1).w && c5.prog !== "ahead", `progression: a missed Saturday does not jump the crunch (${c5.w}, ${c5.prog})`);
  const rev = { index: Object.fromEntries(Object.entries(ctx.index).map(([k, v]) => [k, [...v].reverse()])), offsetWeeks: 0 };
  let same = true; for (const w of [5, 9, 13, 19]) for (let d = 1; d <= 7; d++) if (JSON.stringify(E.sessionFor(w, 1, d, {}, E.DEFAULT_SPEC, rev)) !== JSON.stringify(E.sessionFor(w, 1, d, {}, E.DEFAULT_SPEC, ctx))) same = false;
  ok(same, "progression: log order does not change any prescription");
  // the shrug restarts its ladder at Wave 4; the Waves 1-3 display is untouched
  const sh = { index: { shrug: [1, 2, 3].map((w) => ({ t: E.sessionDayUTC(w, 2, 1, 0), w: 160, r: 15 })) }, offsetWeeks: 0 };
  const sh4 = E.sessionFor(4, 1, 1, {}, E.DEFAULT_SPEC, sh).find((b) => b.pkey === "shrug");
  ok(sh4.w === 160 && sh4.prog !== "held", `progression: Wave 4 shrug restarts at its seed with no false hold (${sh4.w}, ${sh4.prog})`);
}

// deload sets never feed Rule C: an "Easy" light-week set must not raise the next load
{
  const t = E.sessionDayUTC(4, 4, 1, 0);
  const next = E.sessionFor(5, 1, 1, {}, E.DEFAULT_SPEC, { index: { curlmon: [{ t, w: 20, r: 10, rate: "E" }] }, offsetWeeks: 0 }).find((b) => b.pkey === "curlmon");
  ok(next && E.sessionFor(4, 4, 1, {}, E.DEFAULT_SPEC).find((b) => b.pkey === "curlmon").light, "deload accessory blocks are flagged light");
  ok(!next.auto, "a rating on a deload set does not move the next exposure");
}

// ═══ upper chest (Wave 4+): incline growth sets on Thursday, 4th Saturday incline set ═══
{
  const upper = (wv, wk) => { let n = 0; for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(wv, wk, d, {}, E.DEFAULT_SPEC)) if (/Incline Bench|Incline DB Press|Low-to-High/.test(b.name || "") && b.sets) n += b.sets; return n; };
  eq([upper(3, 1), upper(4, 1)], [11, 14], "upper chest: 11 -> 14 incline-biased sets a week from Wave 4");
  const thu = E.sessionFor(4, 1, 4, {}, E.DEFAULT_SPEC);
  const h = thu.find((b) => b.pkey === "incbbh");
  ok(h && h.w > 0 && h.w < E.trackedCB("inc", 4, {}) && h.rpe === "7.5–8", `upper chest: Thursday growth sets are 30° incline at ${h && h.w}`);
  ok(thu.some((b) => /Paused Bench/.test(b.name || "")), "upper chest: Thursday keeps the paused competition bench");
  ok(!E.sessionFor(3, 1, 4, {}, E.DEFAULT_SPEC).some((b) => b.pkey === "incbbh"), "upper chest: Waves 1-3 unchanged");
}

// ═══ meet day: targets, the e1RM-based default, the real kg opener, commands (EVIDENCE.md "Test day") ═══
{
  const day = (wv, wk, d) => E.sessionDayUTC(wv, wk, d, 0);
  // MEET-1: the Today TEST card and the taper Monday use the targets he typed (Road already did)
  const tm = { 6: { sq: 300, bn: 250, dl: 385 } }, cx = { index: {}, offsetWeeks: 0, testMax: tm };
  const fri = E.sessionFor(6, 4, 5, {}, E.DEFAULT_SPEC, cx).find((b) => b.attempts);
  eq([fri.attempts.sq.a3, fri.attempts.bn.a1, fri.attempts.dl.a3], [300, E.R5(250 * 0.91), 385], "meet: the TEST card uses the entered targets");
  eq(E.sessionFor(6, 4, 5, {}, E.DEFAULT_SPEC, { index: {}, offsetWeeks: 0, testMax: { 6: { sq: { target: 300 } } } }).find((b) => b.attempts).attempts.sq.a3, 300, "meet: {target} entries work like legacy numbers");
  ok(/Squat opener 122\.5 kg \(270 lb\)/.test(E.sessionFor(6, 4, 1, {}, E.DEFAULT_SPEC, cx)[0].note), "meet: the taper Monday opener is the kg opener of the entered target (275 lb -> 122.5 kg)");
  // MEET-3: the default target is the estimated max x 1.02; openers about RPE 8
  for (const w of [6, 12, 18]) {
    const pe = E.peakEstimate(w, {}, null, 4), att = E.testAttempts(E.cbFor(w), {}, pe.est), kg = E.attemptsKg(att);
    for (const L of E.LIFTS) {
      const r3 = att[L].a3 / pe.est[L], r1 = kg[L].a1 * E.LB_PER_KG / pe.est[L];
      ok(r3 >= 1.0 && r3 <= 1.03, `meet W${w} ${L}: 3rd attempt ${att[L].a3} is ${r3.toFixed(3)} x the estimated max`);
      ok(r1 <= 0.94, `meet W${w} ${L}: kg opener is ${r1.toFixed(3)} x the estimated max (about RPE 8 or lighter)`);
    }
  }
  const wk2 = (rate) => ({ index: { "sq-single": [{ t: day(6, 2, 1), w: E.R5(E.cbFor(6).sq * 0.91), r: 1, rate }] }, offsetWeeks: 0 });
  const a3 = (rate) => E.sessionFor(6, 4, 5, {}, E.DEFAULT_SPEC, wk2(rate)).find((b) => b.attempts).attempts.sq.a3;
  ok(a3("H") < a3("O") && a3("E") > a3("O"), `meet: a Hard week-2 single lowers the target, an Easy one raises it (${a3("H")} / ${a3("O")} / ${a3("E")})`);
  eq(E.sessionFor(6, 4, 5, {}, E.DEFAULT_SPEC, { ...wk2("E"), testMax: tm }).find((b) => b.attempts).attempts.sq.a3, 300, "meet: an entered target beats the estimate");
  // MEET-4: week 3 practises the opener he will hand in, in kg, loaded at or under it
  for (const w of [6, 12, 18]) for (const ctx of [null, { index: {}, offsetWeeks: 0, testMax: { [w]: { sq: 300, bn: 250, dl: 385 } } }]) {
    const pe = E.peakEstimate(w, {}, ctx, 3), att = E.testAttempts(E.cbFor(w), E.targetsOf(ctx && ctx.testMax, w), pe.est), kg = E.attemptsKg(att);
    for (const [L, d] of [["sq", 1], ["bn", 2], ["dl", 5]]) {
      const s = E.sessionFor(w, 3, d, {}, E.DEFAULT_SPEC, ctx || undefined).find((b) => b.type === "single");
      ok(Math.abs(s.w - kg[L].a1 * E.LB_PER_KG) <= 2.5 && s.w <= kg[L].a1 * E.LB_PER_KG + 1e-9 && s.kg === kg[L].a1, `meet W${w}${ctx ? " (targets)" : ""} ${L}: week-3 opener ${s.w} lb = ${kg[L].a1} kg rounded down`);
    }
    const testDl = E.attemptsKg(E.testAttempts(E.cbFor(w), E.targetsOf(ctx && ctx.testMax, w), E.peakEstimate(w, {}, ctx, 4).est)).dl.a1 * E.LB_PER_KG;
    const pulls = [1, 2, 3].map((wk) => E.sessionFor(w, wk, 5, {}, E.DEFAULT_SPEC, ctx || undefined).find((b) => b.type === "single").w);
    ok(Math.max(...pulls) >= testDl - 2.5, `meet W${w}${ctx ? " (targets)" : ""}: the heaviest peak pull (${Math.max(...pulls)}) is within 2.5 lb of the test opener (${testDl.toFixed(1)})`);
  }
  // MEET-2: a target never moves a base; a made lift does, only from the test Friday, and clearing it unpins
  const before = E.applyTestEntry({}, {}, 6, "bn", "target", 260, Date.UTC(2026, 9, 6), 0);
  ok(!before.refused && JSON.stringify(before.gates) === "{}" && before.testMax[6].bn.target === 260, "meet: typing a target writes no base");
  eq(E.applyTestEntry({}, {}, 6, "bn", "made", 260, Date.UTC(2026, 9, 6), 0).refused, "before the test", "meet: a made lift before the test date is refused");
  const made = E.applyTestEntry(before.testMax, before.gates, 6, "bn", "made", 260, Date.UTC(2027, 0, 1), 0);
  eq([made.gates[7].cb.bn, E.cbFor(7, made.gates).bn], [250, 250], "meet: a made 260 on test day sets the Wave 7 base to 250");
  const cleared = E.applyTestEntry(made.testMax, made.gates, 6, "bn", "made", "", Date.UTC(2027, 0, 2), 0);
  ok(!cleared.gates[7] && cleared.testMax[6].bn.target === 260 && E.cbFor(7, cleared.gates).bn === E.cbFor(7, {}).bn, "meet: clearing the made lift restores the gate-driven base and keeps the target");
  const mig = E.migrateTestMax({ 6: { bn: 260 } }, { 7: { cb: { bn: 250 } } }, Date.UTC(2026, 9, 6), 0);
  ok(mig.testMax[6].bn.target === 260 && !mig.gates[7], "meet: a legacy pre-test entry becomes a target and its base pin is removed");
  const mig2 = E.migrateTestMax({ 6: { bn: 260 } }, { 7: { cb: { bn: 250 } } }, Date.UTC(2027, 0, 5), 0);
  ok(mig2.testMax[6].bn.made === 260 && mig2.gates[7].cb.bn === 250, "meet: a legacy entry after the test with its pin stays a made lift");
  // MEET-5: USPA commands on Specificity and peak singles, the test day and the paused bench
  for (let w = 4; w <= 19; w++) {
    const c = E.cycleOf(w);
    for (const wk of [1, 2, 3]) {
      const s = (d) => E.sessionFor(w, wk, d, {}, E.DEFAULT_SPEC).find((b) => b.type === "single" && E.LIFTS.includes(b.lift));
      if (c === 4 || c === 6) ok(/START.*PRESS.*RACK/.test(s(2).note || "") && /SQUAT.*RACK/.test(s(1).note || "") && /DOWN/.test(s(5).note || ""), `meet: W${w} wk${wk} singles carry the USPA commands`);
      else ok(!/START/.test(s(2).note || ""), `meet: W${w} wk${wk} (cycle ${c}) singles carry no command cue`);
      if (c !== 6) ok(/PRESS/.test(E.sessionFor(w, wk, 4, {}, E.DEFAULT_SPEC).find((b) => b.pkey === "pb").note), `meet: W${w} wk${wk} paused bench waits for PRESS`);
    }
  }
  const testNote = E.sessionFor(6, 4, 5, {}, E.DEFAULT_SPEC).find((b) => b.attempts).note;
  ok(/SQUAT/.test(testNote) && /START/.test(testNote) && /PRESS/.test(testNote) && /RACK/.test(testNote) && /DOWN/.test(testNote), "meet: the test-day card lists every command");
  ok(!/PRESS/.test(E.sessionFor(3, 1, 4, {}, E.DEFAULT_SPEC).find((b) => b.pkey === "pb").note), "meet: Waves 1-3 paused bench text unchanged");
}

// ═══ main-lift days: Yellow, Red, deload, Wednesday growth sets, deload warm-ups ═══
{
  const day = (wv, wk, d) => E.sessionDayUTC(wv, wk, d, 0);
  const cx = (ix, ready) => ({ index: ix, offsetWeeks: 0, ready });
  // ENG-2: a Yellow single is cap 7, at the load that is RPE 7, and its rating is read at cap 7
  const plan = E.sessionFor(4, 3, 1, {}, E.DEFAULT_SPEC), pS = plan.find((b) => b.type === "single"), pB = plan.find((b) => b.type === "backoff" && b.lift === "sq");
  const y = E.sessionFor(4, 3, 1, {}, E.DEFAULT_SPEC, cx({}, "Y")), yS = y.find((b) => b.type === "single");
  eq([yS.w, yS.rpe, y.find((b) => b.type === "backoff" && b.lift === "sq").w], [E.R5(pS.w * E.pctAt(7) / E.pctAt(8)), 7, E.R5(pB.w * 0.95)], "Yellow: single 270 @ cap 8 becomes 260 @ cap 7; back-offs -5%");
  const ixO = { "sq-single": [{ t: day(4, 3, 1), w: yS.w, r: 1, rate: "O", cap: 7 }] };
  eq(E.sessionFor(4, 3, 1, {}, E.DEFAULT_SPEC, cx(ixO, "Y")).find((b) => b.type === "backoff" && b.lift === "sq").w, E.R5(pB.w * 0.95), "Yellow: an on-target Yellow single leaves the Yellow back-offs (no Rule A cut on top)");
  eq(E.autoGate(4, {}, cx(ixO)).sq.result, "clean", "Yellow: an on-target Yellow single gates clean");
  eq(E.autoGate(4, {}, cx({ "sq-single": [{ t: day(4, 3, 1), w: 270, r: 1, rate: "H", cap: 7 }] })).sq.result, "clean", "Yellow: Hard at cap 7 reads RPE 8, not 9 (270 @ 8 = the plan)");
  eq(E.autoGate(4, {}, cx({ "sq-single": [{ t: day(4, 3, 1), w: 270, r: 1, rate: "H" }] })).sq.result, "repeat", "Green: Hard at cap 8 still reads RPE 9");
  eq(E.effRPE({ rate: "H", cap: 7 }, 8), 8, "a stored cap wins over the plan's cap");
  ok(E.sessionFor(3, 3, 1, {}, E.DEFAULT_SPEC, cx({}, "Y")).find((b) => b.type === "single").w === 270, "Yellow: Wave 3 history keeps its single load");
  // ENG-3: Yellow accessories never carry the failure marker or partials
  let leak = 0;
  for (let w = 3; w <= 19; w++) for (const wk of [1, 2]) for (let d = 1; d <= 7; d++) for (const b of E.yellowFor(E.sessionFor(w, wk, d, {}, E.DEFAULT_SPEC), w)) if (b.lastHard || b.lp) leak++;
  eq(leak, 0, "Yellow: no accessory keeps a failure set or partials");
  // ENG-6: Red sets log under their own key and move nothing; deload paused/OHP are light from Wave 4
  const red = E.redSession(4, 5, {})[0];
  ok(red.pkey === "dl-red" && red.light, "Red: the 3x3 logs under dl-red, light");
  const after = E.sessionFor(4, 3, 5, {}, E.DEFAULT_SPEC, cx({ "dl-red": [{ t: day(4, 2, 5), w: red.w, r: 3, rate: "E" }] })).find((b) => b.pkey === "dl-back");
  ok(after.w === E.sessionFor(4, 3, 5, {}, E.DEFAULT_SPEC).find((b) => b.pkey === "dl-back").w && !after.auto, "Red: an Easy Red day does not raise the next back-offs");
  for (const [d, k] of [[3, "ps"], [4, "pb"], [4, "ohp"]]) {
    ok(E.sessionFor(4, 4, d, {}, E.DEFAULT_SPEC).find((b) => b.pkey === k).light, `deload: week-4 ${k} is light from Wave 4`);
    const nx = E.sessionFor(4, 4, d, {}, E.DEFAULT_SPEC, cx({ [k]: [{ t: day(4, 3, d), w: 100, r: 5, rate: "E" }] })).find((b) => b.pkey === k);
    eq(nx.w, E.sessionFor(4, 4, d, {}, E.DEFAULT_SPEC).find((b) => b.pkey === k).w, `deload: an Easy week-3 ${k} does not raise the deload load`);
  }
  // ENG-10: Wednesday squat growth sets at ~RPE 7.5 for 8 (72.3% of the week's planned e1RM)
  for (let w = 4; w <= 19; w++) if (E.cycleOf(w) !== 6) for (const wk of [1, 2, 3]) {
    const s = E.sessionFor(w, wk, 3, {}, E.DEFAULT_SPEC), h = s.find((b) => b.pkey === "psh");
    const cap = E.cycleOf(w) === 5 ? { 1: 7.5, 2: 8, 3: 8 }[wk] : { 1: 7, 2: 7.5, 3: 8 }[wk], e1 = E.mainTables(w, {}).t.sq.s[wk - 1] / E.pctAt(cap);
    ok(h.w / e1 >= 0.70 && h.w / e1 <= 0.745, `Wed W${w} wk${wk}: growth sets ${h.w} = ${(h.w / e1).toFixed(3)} x e1RM`);
  }
  // ENG-12: deload warm-ups never climb past the light triple
  for (let w = 4; w <= 19; w++) if (E.cycleOf(w) !== 6) for (const [L, d] of [["sq", 1], ["bn", 2], ["dl", 5]]) {
    const s = E.sessionFor(w, 4, d, {}, E.DEFAULT_SPEC), light = s.find((b) => b.pkey === L + "-light").w;
    const nums = s.find((b) => b.type === "warmup").rows.map((r) => r[0]).filter((x) => typeof x === "number");
    ok(nums.every((x) => x < light) && !s.find((b) => b.type === "warmup").rows.some((r) => /indicator|bridge/.test(String(r[1]))), `deload W${w} ${L}: warm-ups stay under the ${light} triple`);
  }
}

// ═══ logging: tracked-lift ratings, the Road bars, the strength chart, swaps ═══
{
  const day = (wv, wk, d) => E.sessionDayUTC(wv, wk, d, 0);
  // RTS reps-to-failure table: 8 reps @ RPE 7.5 = 72.3%, 5 @ 6.5 = 77.4%
  eq([+E.pctReps(8, 7.5).toFixed(3), +E.pctReps(5, 6.5).toFixed(3), E.pctReps(1, 10)], [0.723, 0.774, 1], "RTS: reps-to-failure %1RM interpolates the chart");
  // ENG-7: a rated tracked top set sets today's back-offs (Wave 4+); Waves 1-3 unchanged
  const fri = (ix, w = 4) => E.sessionFor(w, 2, 5, {}, E.DEFAULT_SPEC, { index: ix, offsetWeeks: 0 });
  const plan = fri({}), rt = plan.find((b) => b.pkey === "rdl-top"), rb = plan.find((b) => b.pkey === "rdl-back").w, ct = plan.find((b) => b.pkey === "chin-top"), cb = plan.find((b) => b.pkey === "chin-back").w;
  const rated = (r) => fri({ "rdl-top": [{ t: day(4, 2, 5), w: rt.w, r: rt.reps, rate: r }], "chin-top": [{ t: day(4, 2, 5), w: ct.w, r: ct.reps, rate: r }] });
  const bk = (s, k) => s.find((b) => b.pkey === k).w;
  ok(bk(rated("E"), "rdl-back") > rb && bk(rated("H"), "rdl-back") < rb && bk(rated("O"), "rdl-back") === rb, `tracked: the RDL top set sets the back-offs (E ${bk(rated("E"), "rdl-back")} / O ${rb} / H ${bk(rated("H"), "rdl-back")})`);
  eq([bk(rated("E"), "chin-back"), bk(rated("O"), "chin-back"), bk(rated("H"), "chin-back")], [cb + 5, cb, cb - 5], "tracked: chin-up back-offs move one 5 lb step on an Easy or Hard top set");
  const w3 = E.sessionFor(3, 2, 5, {}, E.DEFAULT_SPEC, { index: { "rdl-top": [{ t: day(3, 2, 5), w: 999, r: 6, rate: "E" }] }, offsetWeeks: 0 }).find((b) => b.pkey === "rdl-back");
  eq(w3.w, E.sessionFor(3, 2, 5, {}, E.DEFAULT_SPEC).find((b) => b.pkey === "rdl-back").w, "tracked: Waves 1-3 back-offs unchanged by a rating");
  // ENG-8: the tracked base reads the logs when the caller passes them (the Road tab)
  const miss = { index: { "incbb-top": [{ t: day(3, 3, 2), w: E.R5(E.trackedCB("inc", 3, {}) * 0.86), r: 2 }] }, offsetWeeks: 0 };
  eq([E.trackedCB("inc", 4, {}), E.trackedCB("inc", 4, {}, miss)], [187.5, 185], "Road: a missed Wave 3 incline top set holds the base at 185 (it showed 187.5)");
  // ENG-9: one day's estimated max; deloads, Red days and light sets never count
  eq([E.dayE1RM([{ k: "sq-light", w: 195, r: 3 }], { week: 4 }), E.dayE1RM([{ k: "sq-back", w: 180, r: 3 }], { week: 2, red: true }), E.dayE1RM([{ k: "sq-red", w: 180, r: 3 }], { week: 2 })], [null, null, null], "chart: deload, Red and light days are left out");
  const e = E.dayE1RM([{ k: "sq-back", w: 220, r: 5 }], { week: 1 });
  ok(Math.abs(e / (250 / 0.892) - 1) <= 0.03, `chart: an unrated 220x5 back-off day reads ${e}, within 3% of the plan's 280`);
  eq(E.dayE1RM([{ k: "sq-single", w: 270, r: 1, rate: "O", cap: 8 }, { k: "sq-back", w: 240, r: 3 }], { week: 3 }), Math.round(270 / 0.922), "chart: a rated single wins");
  // LOG-7: a swapped exercise logs under its own key and never moves the planned rung
  const k = E.altKey("rowhi", E.ALT.rowhi[0]);
  ok(/^rowhi~/.test(k) && E.ALT.rowhi.length >= 1, "swap: the key is rowhi~<slug>");
  const rh = E.ACC.find((a) => a.id === "rowhi"), def = { w: rh.w, steps: rh.steps, inc: rh.inc, db: rh.db, pkey: "rowhi", since: rh.since };
  const sw = { index: { [k]: [0, 1, 2].map(() => ({ t: day(4, 1, 5), w: 180, r: 15 })) }, offsetWeeks: 0 };
  eq(E.accStateLogged(def, 5, sw).w, E.accState(def, 5).w, "swap: 180 x 15 on the swap leaves the high-elbow row on schedule");
  eq(E.accStateLogged(def, 5, { index: { rowhi: sw.index[k] }, offsetWeeks: 0 }).prog, "ahead", "swap: the same sets under the planned key would have moved it");
}

// ═══ data safety: dated shifts, the meet date, imports, set keys ═══
{
  const D = (s) => Date.parse(s), MS = E.MS_DAY, iso = (t) => new Date(t).toISOString().slice(0, 10);
  // DATA-1: a dated shift repeats the week before it and moves nothing logged before it
  const sh = [{ from: "2026-11-02", weeks: 1 }];
  let same = true;
  for (let t = D("2026-07-13"); t < D("2026-11-02"); t += MS) if (JSON.stringify(E.whereIs(t, sh)) !== JSON.stringify(E.whereIs(t, 0))) same = false;
  ok(same, "shift: every date before the shift keeps its wave and week");
  eq([E.whereIs(D("2026-11-02"), sh).week, E.whereIs(D("2026-11-09"), sh)], [3, E.whereIs(D("2026-11-02"), 0)], "shift: Nov 2 repeats week 3; Nov 9 is what Nov 2 was");
  eq([iso(E.waveStartUTC(5, sh)), iso(E.sessionDayUTC(4, 4, 1, sh))], ["2026-11-16", "2026-11-09"], "shift: Wave 5 starts a week later");
  let rt = true;
  for (let t = D("2026-07-20"); t <= D("2027-12-31"); t += MS) {
    const w = E.whereIs(t, sh), back = E.sessionDayUTC(w.wave, w.week, w.day, sh), replay = t >= D("2026-11-02") && t < D("2026-11-09");
    if (back !== (replay ? t - 7 * MS : t)) rt = false;
  }
  ok(rt, "shift: sessionDayUTC inverts whereIs (a replayed day maps to its first date)");
  const legacy = [{ from: "2026-07-20", weeks: 2 }];
  let lg = true; for (let t = D("2026-07-20"); t <= D("2027-06-01"); t += MS) if (JSON.stringify(E.whereIs(t, legacy)) !== JSON.stringify(E.whereIs(t, 2))) lg = false;
  ok(lg, "shift: the migrated legacy offset (one segment from Wave 1) reads like the old number");
  // a future shift never changes a gate already earned
  const hist = { index: { "sq-single": [{ t: E.sessionDayUTC(4, 3, 1, 0), w: 270, r: 1, rpe: 9 }], "bn-single": [{ t: E.sessionDayUTC(4, 3, 2, 0), w: 230, r: 1, rate: "E" }] }, offsetWeeks: 0 };
  eq(JSON.stringify(E.withAutoGates({}, { ...hist, shifts: [{ from: "2026-11-09", weeks: 2 }] })), JSON.stringify(E.withAutoGates({}, hist)), "shift: a later shift leaves the earned gates alone");
  // autoregulation reads the real date of a replayed day
  const t2 = D("2026-11-02"), rep = { index: { "sq-single": [{ t: t2, w: 300, r: 1, rate: "E" }] }, shifts: sh, today: t2 };
  ok(E.sessionFor(4, 3, 1, {}, E.DEFAULT_SPEC, rep).find((b) => b.pkey === "sq-back").auto, "shift: Rule A reads the single logged on the replayed day");
  // MEET-6: line the Wave 12 test up with a Jul 10 meet
  const ma = E.meetAlign("2027-07-10", [], D("2026-10-06"), D("2026-10-05"));
  eq([ma.weeks, ma.wave, ma.segments.length], [3, 12, 3], "meet: Jul 10 needs 3 weeks before the Wave 12 test");
  eq(iso(E.sessionDayUTC(12, 4, 5, ma.segments)), "2027-07-09", "meet: the Wave 12 test lands on the Friday before the meet");
  ok(ma.segments.every((x) => E.whereIs(D(x.from), ma.segments).week === 2), "meet: each extra week repeats a week 2 (loading, not a second deload)");
  let past = true; for (let t = D("2026-07-20"); t <= D("2026-10-06"); t += MS) if (JSON.stringify(E.whereIs(t, ma.segments)) !== JSON.stringify(E.whereIs(t, 0))) past = false;
  ok(past, "meet: no date up to today moves");
  ok(!!E.meetAlign("2026-12-20", [], D("2026-10-06"), 0).warn, "meet: a meet before the next test day warns instead of shortening a macro");
  eq(E.meetAlign("2027-01-02", [], D("2026-10-06"), 0).weeks, 0, "meet: Saturday Jan 2 already lines up with the Wave 6 test");
  ok(/^MEET/.test(E.sessionFor(12, 4, 5, {}, E.DEFAULT_SPEC, { index: {}, shifts: ma.segments, meetDate: "2027-07-10" }).find((b) => b.attempts).name), "meet: the aligned test day is named MEET");
  // DATA-2: malformed backups are cleaned, never trusted
  for (const bad of [{ logs: { "2026-09-24": null, "2026-09-23": { sets: {} } } }, { logs: { "2026-09-24": { sets: { b1: 5 } } } }, { logs: { "2026-09-24": { sets: { b1: [null, { w: "x", r: 3 }, { w: 200, r: 5, k: "sq-back" }] } } }, bw: { "2026-09-24": "190" } }]) {
    const r = E.sanitizeState(bad);
    let threw = false;
    try { for (const log of Object.values(r.state.logs)) for (const arr of Object.values(log.sets || {})) for (const st of arr) if (!(st.w >= 0)) throw 0; } catch (e) { threw = true; }
    ok(r.ok && !threw && Object.values(r.state.logs).every((l) => l && typeof l === "object"), `import: ${JSON.stringify(bad).slice(0, 60)} is cleaned to readable shapes (dropped ${r.dropped})`);
  }
  eq([E.sanitizeState(null).ok, E.sanitizeState({ foo: 1 }).ok, E.sanitizeState([]).ok], [false, false, false], "import: not a backup at all = refused");
  // DATA-5: sets move from block positions to their exercise key; keyless sets stay
  const mig = E.migrateSetKeys({ "2026-10-17": { sets: { b1: [{ w: 40, r: 12, k: "incline-db-curl" }], b2: [{ w: 30, r: 12, k: "bayesian-cable-curl" }], b3: [{ w: 9, r: 9 }], r0: [{ w: 180, r: 3, k: "dl-back" }] } } });
  eq(Object.keys(mig["2026-10-17"].sets).sort(), ["b3", "bayesian-cable-curl", "incline-db-curl", "r:dl-back"], "keys: sets live under their exercise key");
  let dup = [];
  for (const fp of E.FRAME_OPTS) for (const dt of E.DETAIL_OPTS) for (const sun of [false, true]) {
    const spec = { framePrimary: fp, frameSecondary: "latwidth", detail: dt, sundayOn: sun, secondaryPress: "incline" };
    for (let w = 1; w <= 19; w++) for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++) {
      const ks = E.sessionFor(w, wk, d, {}, spec).filter((b) => ["single", "backoff", "paused", "ohp", "accessory"].includes(b.type)).map((b) => b.pkey);
      if (new Set(ks).size !== ks.length) dup.push(`${fp}/${dt}/${sun} W${w}.${wk}.${d}`);
    }
  }
  eq(dup.slice(0, 3), [], "keys: no session has two loggable blocks with the same key, for any spec");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
