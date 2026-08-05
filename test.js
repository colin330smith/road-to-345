const E = require("./engine.js");
let pass = 0, fail = 0;
const eq = (got, want, label) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; }
  else { fail++; console.log("FAIL", label, "got", JSON.stringify(got), "want", JSON.stringify(want)); }
};
const ok = (cond, label) => { if (cond) pass++; else { fail++; console.log("FAIL", label); } };

// ── CB chain ──
eq(E.cbFor(1), { bn: 225, sq: 315, dl: 405 }, "cb w1");
eq(E.cbFor(4), { bn: 240, sq: 345, dl: 435 }, "cb w4 clean");
eq(E.cbFor(19), { bn: 315, sq: 495, dl: 585 }, "cb w19 paper"); // sq/dl overshoot on paper — chain math only
eq(E.cbFor(3, { 3: { bn: "repeat" } }), { bn: 230, sq: 335, dl: 425 }, "gate repeat bn");
eq(E.cbFor(3, { 3: { sq: "small" } }), { bn: 235, sq: 330, dl: 425 }, "gate small sq");
eq(E.cbFor(2, { 2: { dl: "reset" } }).dl, 385, "gate reset dl"); // R5(405*.95)=385

// ── schedule ──
const d = (y, m, dd) => Date.UTC(y, m - 1, dd);
eq(E.whereIs(d(2026, 7, 20)), { wave: 1, week: 1, day: 1, dow: 0 }, "date w1w1d1");
eq(E.whereIs(d(2026, 8, 31)), { wave: 2, week: 3, day: 1, dow: 0 }, "date w2w3d1");
eq(E.whereIs(d(2026, 11, 6)), { wave: 4, week: 4, day: 5, dow: 4 }, "date w4w4d5");
eq(E.whereIs(d(2027, 12, 6)), { wave: 19, week: 1, day: 1, dow: 0 }, "date w19w1d1");
eq(E.whereIs(d(2026, 7, 25)).day, 6, "saturday is spec day (7-day week)");

// ── accessory machine reproduces the hand-built notes (waves 1–4) ──
const A = Object.fromEntries(E.ACC.map(a => [a.id + ":" + a.day, a]));
const acc = (id, day, wave, week) => E.accFor(A[id + ":" + day], wave, week);
// wave 1
eq([acc("legpress",1,1,1).w, acc("legpress",1,1,1).reps, acc("legpress",1,1,2).reps], [360,10,12], "w1 legpress");
eq([acc("seatcurl",5,1,1).reps, acc("seatcurl",5,1,2).reps], [10,12], "w1 seatcurl");
eq([acc("lattue",2,1,1).w, acc("lattue",2,1,1).reps, acc("lattue",2,1,2).reps], [15,15,20], "w1 lattue");
eq([acc("rdl",5,1,1).w, acc("rdl",5,1,1).reps, acc("rdl",5,1,2).reps], [225,6,8], "w1 rdl");
// wave 2
eq([acc("legpress",1,2,1).w, acc("legpress",1,2,1).reps], [380,10], "w2 legpress 380");
eq([acc("seatcurl",5,2,1).w, acc("seatcurl",5,2,1).reps, acc("seatcurl",5,2,2).reps], [80,12,15], "w2 seatcurl 80 12/15");
eq([acc("lattue",2,2,1).w, acc("lattue",2,2,1).reps, acc("lattue",2,2,2).reps], [17.5,12,15], "w2 lattue 17.5");
eq([acc("legext",3,2,1).w], [100], "w2 legext 100");
eq([acc("cablecurl",5,2,1).w, acc("cablecurl",5,2,1).reps], [45,12], "w2 cablecurl 45");
eq([acc("rdl",5,2,1).w], [235], "w2 rdl 235");
eq([acc("rowtue",2,2,1).w, acc("rowtue",2,2,1).reps, acc("rowtue",2,2,2).reps], [50,10,12], "w2 row 50 10/12");
eq([acc("crossbody",4,2,1).reps, acc("crossbody",4,2,2).reps], [15,18], "w2 crossbody 15/18");
// wave 3
eq([acc("legpress",1,3,1).w], [400], "w3 legpress 400");
eq([acc("seatcurl",5,3,1).w, acc("seatcurl",5,3,1).reps], [90,10], "w3 seatcurl 90");
eq([acc("rowtue",2,3,1).w, acc("rowtue",2,3,1).reps], [55,8], "w3 row 55x8");
eq([acc("incline",2,3,1).w], [60], "w3 incline 60");
eq([acc("lattue",2,3,1).reps, acc("lattue",2,3,2).reps], [15,20], "w3 lattue 15/20");
eq([acc("inccurl",3,3,1).w, acc("inccurl",3,3,1).reps], [30,10], "w3 inccurl 30");
eq([acc("latwed",3,3,1).w, acc("latwed",3,3,1).reps], [15,15], "w3 latwed 15s");
eq([acc("pushdown",4,3,1).w, acc("pushdown",4,3,1).reps], [55,10], "w3 pushdown 55");
eq([acc("pulldown",5,3,1).w, acc("pulldown",5,3,1).reps], [130,8], "w3 pulldown 130");
eq([acc("rdl",5,3,1).w], [245], "w3 rdl 245");
eq([acc("crossbody",4,3,1).reps, acc("crossbody",4,3,2).reps], [18,20], "w3 crossbody 18/20");
// wave 4
eq([acc("legpress",1,4,1).w], [420], "w4 legpress 420");
eq([acc("seatcurl",5,4,1).reps, acc("seatcurl",5,4,2).reps], [12,15], "w4 seatcurl 12/15");
eq([acc("lattue",2,4,1).w, acc("lattue",2,4,1).reps], [20,12], "w4 lattue 20s");
eq([acc("latthu",4,4,1).w, acc("latthu",4,4,1).reps], [17.5,12], "w4 latthu 17.5");
eq([acc("crossbody",4,4,1).w, acc("crossbody",4,4,1).reps], [25,12], "w4 crossbody 25");
eq([acc("legext",3,4,1).w], [120], "w4 legext 120");
eq([acc("rdl",5,4,1).w], [255], "w4 rdl 255");
eq([acc("cablecurl",5,4,1).w], [55], "w4 cablecurl 55");
eq([acc("ezcurl",3,4,1).w, acc("ezcurl",3,4,1).reps], [55,10], "w4 ez 55 10/12");
// week-3 set trims
eq(acc("legpress",1,2,3).sets, 2, "wk3 trim legpress");
eq(acc("legext",3,2,3).sets, 1, "wk3 trim legext");
eq(acc("calf",1,2,3).sets, 3, "wk3 calf untrimmed");

// ── explicit mains match the notes ──
const w2 = E.mainTables(2).t;
eq(w2.sq.s, [275,285,295], "w2 sq singles");
eq(w2.dl.b[2], [330,3,4], "w2 dl wk3 backoff");
eq(w2.pb, [150,160,170,130], "w2 paused bench");
const w4 = E.mainTables(4).t;
eq(w4.bn.s, [205,210,215], "w4 bn singles");
eq(w4.sq.b[2], [275,3,5], "w4 sq wk3 backoff");

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
for (let w = 6; w <= 19; w++) {
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
eq(E.ohpFor(2)[1], [100,6,3], "ohp w2 wk2");
ok(E.ohpFor(7)[0][0] >= 105 && E.ohpFor(7)[0][0] <= 125, "ohp w7 sane");

// ── test day ──
const att = E.testAttempts({ sq: 365, bn: 250, dl: 455 });
ok(att.sq.a1 < att.sq.a2 && att.sq.a2 === E.R5(365 * 1.04), "attempts ordered");

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
ok(E.sessionFor(1,1,6,{},E.DEFAULT_SPEC).some((b)=>/Lateral/.test(b.name||"")), "Sat keeps side-delt balance on arms priority");
ok(satEx.some((b) => /Overhead Cable/.test(b.name)), "Sat triceps slot present");
ok(satEx.some((b) => /Crunch/.test(b.name)), "Sat abs present");
// default (triceps detail) → secondary frame slot omitted, extra pushdown present
ok(satEx.some((b) => /Pushdown/.test(b.name)), "Sat triceps-spec adds pushdown");
// Saturday set cap ~15 excl abs
const satUpper = satEx.filter((b) => !/Crunch/.test(b.name)).reduce((n, b) => n + b.sets, 0);
ok(satUpper <= 15, `Sat upper set cap ${satUpper} <= 15`);

// Sunday default runs Wk1-2 of cycles 1-4
ok(E.sundayPlanned(1, 1, DEF) === true, "Sun planned Wk1");
ok(E.sundayPlanned(1, 3, DEF) === false, "Sun NOT planned Wk3");
ok(E.sundayPlanned(5, 1, DEF) === false, "Sun NOT planned Cycle5");
ok(E.sundayPlanned(1, 1, { ...DEF, sundayOn: false }) === false, "Sun off when toggled");
const sun = E.sessionFor(1, 1, 7, {}, DEF);
ok(sun[0].type === "spechead", "Sun header");
const sunEx = sun.filter((b) => b.type === "accessory");
ok(sunEx.length >= 5 && sunEx.reduce((n, b) => n + b.sets, 0) <= 14, "Sun ≤14 sets");
ok(/Preacher/.test(sunEx[0].name), "Sun opens with the anchor curl (not the light cross-body)");
ok(sunEx.some((b) => /Bayesian/.test(b.name)), "Sun arms-primary includes Bayesian curl");
ok(sunEx.reduce((n, b) => n + b.sets, 0) === 13, "Sun arms-primary = 13 sets (12 + frame lateral bump, cap 14)");
ok(/Biceps-led/.test(sun[0].name), "Sun header billed honestly (biceps-led)");
// Sunday off Wk3
const sun3 = E.sessionFor(1, 3, 7, {}, DEF);
ok(sun3.length === 1 && /off/.test(sun3[0].name), "Sun Wk3 = off card");

// Thursday sheds delt/tri isolation but keeps paused bench + OHP + crunch + wrist
const thu = E.sessionFor(1, 1, 4, {}, DEF);
ok(thu.some((b) => b.type === "paused" && b.lift === "bn"), "Thu keeps paused bench");
ok(thu.some((b) => b.type === "ohp"), "Thu keeps OHP");
ok(!thu.some((b) => /Rear-Delt Fly|Cross-Body/.test(b.name)), "Thu dropped rear-delt & cross-body");
ok(thu.some((b) => /Crunch/.test(b.name)) && thu.some((b) => /Wrist/.test(b.name)), "Thu keeps abs + wrist");

// Transfers fire Wk1 (Sunday runs): Tue laterals gone, Wed EZ + hammer gone, incline curl kept
const tue1 = E.sessionFor(1, 1, 2, {}, DEF);
ok(!tue1.some((b) => /Lateral Raise/.test(b.name)), "Tue laterals transferred out Wk1");
const wed1 = E.sessionFor(1, 1, 3, {}, DEF);
ok(!wed1.some((b) => /EZ-Bar Curl/.test(b.name)) && !wed1.some((b) => /Hammer Curl/.test(b.name)), "Wed EZ+hammer transferred out");
ok(wed1.some((b) => /Incline DB Curl/.test(b.name)), "Wed incline curl kept");
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
const rowf = friLat.find((b) => /Chest-Supported DB Row/.test(b.name));
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
const LPD = { w: 360, steps: [10, 12], inc: 20, db: false, i0: 0, pkey: "legpress" };
eq(E.accStateLogged(LPD, 2).w, 380, "logdrv: no ctx = scheduled");
eq(E.accStateLogged(LPD, 2, { index: {}, offsetWeeks: 0 }).w, 380, "logdrv: empty index = scheduled");
eq(E.accStateLogged(LPD, 2, { index: { legpress: mkh(2, 360, 12, 3) }, offsetWeeks: 0 }).w, 380, "logdrv: cleared top = bump");
const heldSt = E.accStateLogged(LPD, 2, { index: { legpress: mkh(2, 360, 10, 3) }, offsetWeeks: 0 });
eq(heldSt.w, 360, "logdrv: missed top = hold");
eq(heldSt.prog, "held", "logdrv: prog flag");
eq(E.accStateLogged(LPD, 2, { index: { legpress: mkh(2, 380, 12, 3) }, offsetWeeks: 0 }).w, 400, "logdrv: heavier logs adopted then bumped");
const SCD = { w: 80, steps: [10, 12, 15], inc: 10, db: false, i0: 0, pkey: "seatcurl" };
eq(E.accStateLogged(SCD, 2, { index: { seatcurl: mkh(2, 80, 12, 3) }, offsetWeeks: 0 }).i, 1, "logdrv: mid-ladder advance");
eq(E.accStateLogged(SCD, 2, { index: { seatcurl: mkh(2, 80, 10, 3) }, offsetWeeks: 0 }).i, 0, "logdrv: mid-ladder hold");
eq(E.accStateLogged(SCD, 2, { index: { seatcurl: mkh(2, 80, 15, 1) }, offsetWeeks: 0 }).i, 0, "logdrv: single-set fluke ignored");
// unlogged wave between logged waves falls back to schedule for that wave
const twoWave = [...mkh(2, 360, 12, 3)]; // wave1 cleared, wave2 unlogged
eq(E.accStateLogged(LPD, 3, { index: { legpress: twoWave }, offsetWeeks: 0 }).w, 400, "logdrv: unlogged wave uses schedule");
// end-to-end: Monday of wave 2 reflects a hold
const ctxHold = { index: { legpress: mkh(2, 360, 10, 3) }, offsetWeeks: 0 };
const monLP = E.sessionFor(2, 1, 1, {}, E.DEFAULT_SPEC, ctxHold).find((b) => /Leg Press/.test(b.name || ""));
eq(monLP.w, 360, "logdrv: session shows held weight");
eq(monLP.prog, "held", "logdrv: block carries prog");
// ctx does not leak into later ctx-less calls
const after = E.sessionFor(2, 1, 1, {}, E.DEFAULT_SPEC).find((b) => /Leg Press/.test(b.name || ""));
eq(after.w, 380, "logdrv: HISTCTX cleared after call");
// spec exercise via name slug
eq(E.pkeyOf("Cable / Machine Preacher Curl"), "cable-machine-preacher-curl", "logdrv: slug");
const PKPC = "cable-machine-preacher-curl";
const sunAdv = E.sessionFor(2, 1, 7, {}, E.DEFAULT_SPEC, { index: { [PKPC]: mkh(6, 40, 10, 3) }, offsetWeeks: 0 }).find((b) => /Preacher/.test(b.name || ""));
eq(sunAdv.reps, "10–12", "logdrv: spec advance via slug");
const sunHold = E.sessionFor(2, 1, 7, {}, E.DEFAULT_SPEC, { index: { [PKPC]: mkh(6, 40, 8, 3) }, offsetWeeks: 0 }).find((b) => /Preacher/.test(b.name || ""));
eq(sunHold.reps, "8–10", "logdrv: spec hold via slug");
// blocks expose pkey for stamping
ok(E.sessionFor(1, 1, 1, {}, E.DEFAULT_SPEC).filter((b) => b.type === "accessory").every((b) => b.pkey), "logdrv: all accessory blocks carry pkey");


// ═══ masculine frame: traps / shoulders / upper chest ═══
console.log("\n── frame requirements ──");
{
  const isTri = (n) => /(Extension|Pushdown)/i.test(n) && !/Leg|Wrist|Neck/i.test(n);
  const isBi = (n) => /Curl/i.test(n) && !/Leg Curl|Neck|Wrist/i.test(n);
  const cnt = (re) => { let t = 0; for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC)) if (b.type === "accessory" && re.test(b.name)) t += b.sets; return t; };
  ok(cnt(/Shrug/) >= 3, "frame: 3+ direct trap sets weekly");
  ok(cnt(/Lateral/) >= 9, "frame: 9+ side-delt sets weekly");
  ok(cnt(/Incline DB Press|Low-to-High/) >= 6, "frame: 6+ upper-chest sets weekly");
  let bi = 0, tri = 0;
  for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC)) {
    if (b.type !== "accessory") continue;
    if (isBi(b.name)) bi += b.sets; else if (isTri(b.name)) tri += b.sets;
  }
  eq(bi, 16, "frame: biceps still at the 16 cap");
  ok(tri >= 8 && tri <= 14, "frame: triceps direct in 8-14 band after shrug trade");
  const tue = E.sessionFor(1, 1, 2, {}, E.DEFAULT_SPEC);
  const mon = E.sessionFor(1, 1, 1, {}, E.DEFAULT_SPEC);
  ok(mon.some((b) => /Shrug/.test(b.name || "") && b.sets === 3), "frame: Mon carries the shrug (full-body split)");
  ok(!tue.some((b) => /Overhead Rope/.test(b.name || "")), "frame: Tue overhead rope traded out");

  // ═══ full-body redistribution ═══
  ok(mon.some((b) => /Low-to-High/.test(b.name || "")), "split: Mon gets upper-chest fly");
  {
    const monLegIso = mon.filter((b) => b.type === "accessory" && /Leg Press|Leg Curl|Leg Extension|Calf/i.test(b.name)).reduce((n, b) => n + b.sets, 0);
    ok(monLegIso <= 6, "split: Mon leg isolation trimmed to <=6 sets");
  }
  ok(tue.some((b) => /Seated Calf/.test(b.name || "")), "split: Tue gets seated calf");
  ok(!tue.some((b) => /Shrug/.test(b.name || "")), "split: Tue sheds the shrug");
  {
    const fri = E.sessionFor(1, 1, 5, {}, E.DEFAULT_SPEC).filter((b) => b.type === "accessory").map((b) => b.name);
    ok(fri.some((n) => /Seated Leg Curl/.test(n)), "split: Fri gets seated leg curl (posterior day)");
    ok(fri.indexOf("RDL") < fri.findIndex((n) => /Seated Leg Curl/.test(n)), "split: RDL stays first on Fri");
  }
  {
    let hams = 0, calves = 0;
    for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC))
      if (b.type === "accessory") { if (/Leg Curl|RDL/i.test(b.name)) hams += b.sets; if (/Calf/i.test(b.name)) calves += b.sets; }
    eq(hams, 8, "split: weekly hams unchanged at 8");
    eq(calves, 6, "split: weekly calves unchanged at 6");
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
  eq(bi, 16, "neck: biceps count uncontaminated by neck or wrist curls");
}


// ═══ final bodybuilding sweep: obliques, forearm flexion, mobility ═══
{
  const wed = E.sessionFor(1, 1, 3, {}, E.DEFAULT_SPEC);
  const fri = E.sessionFor(1, 1, 5, {}, E.DEFAULT_SPEC);
  ok(wed.some((b) => /Woodchop/.test(b.name || "") && b.sets === 2), "sweep: Wed has oblique woodchops x2");
  ok(fri.some((b) => /Wrist Curl/.test(b.name || "") && b.sets === 2), "sweep: Fri has wrist curls x2 (flexion)");
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
  ok(fa >= 4, "sweep: 4+ dedicated forearm sets on weekdays");
  // biceps count still uncontaminated
  let bi = 0;
  for (let d = 1; d <= 7; d++) for (const b of E.sessionFor(1, 1, d, {}, E.DEFAULT_SPEC))
    if (b.type === "accessory" && /Curl/i.test(b.name) && !/Leg Curl|Neck|Wrist/i.test(b.name)) bi += b.sets;
  eq(bi, 16, "sweep: biceps still exactly 16");
}


// ═══ proximity to failure: final-set marker ═══
{
  const iso = (w, wk) => E.sessionFor(w, wk, 3, {}, E.DEFAULT_SPEC).find((b) => /Incline DB Curl/.test(b.name || ""));
  const comp = (w, wk) => E.sessionFor(w, wk, 5, {}, E.DEFAULT_SPEC).find((b) => /RDL/.test(b.name || ""));
  ok(iso(1, 1).lastHard === true, "failure: isolation final set pushes in Wk1");
  ok(iso(1, 2).lastHard === true, "failure: isolation final set pushes in Wk2");
  ok(!iso(1, 3).lastHard, "failure: Wk3 trim does not push");
  ok(!iso(1, 4).lastHard, "failure: deload never pushes");
  ok(!comp(1, 1).lastHard, "failure: compounds stay capped at 8");
  ok(!iso(6, 1).lastHard, "failure: peak cycle never pushes");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
