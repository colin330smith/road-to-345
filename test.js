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
eq(E.whereIs(d(2026, 7, 25)).day, 0, "saturday is rest");

// ── accessory machine reproduces the hand-built notes (waves 1–4) ──
const A = Object.fromEntries(E.ACC.map(a => [a.id + ":" + a.day, a]));
const acc = (id, day, wave, week) => E.accFor(A[id + ":" + day], wave, week);
// wave 1
eq([acc("legpress",1,1,1).w, acc("legpress",1,1,1).reps, acc("legpress",1,1,2).reps], [360,10,12], "w1 legpress");
eq([acc("seatcurl",1,1,1).reps, acc("seatcurl",1,1,2).reps], [10,12], "w1 seatcurl");
eq([acc("lattue",2,1,1).w, acc("lattue",2,1,1).reps, acc("lattue",2,1,2).reps], [15,15,20], "w1 lattue");
eq([acc("rdl",5,1,1).w, acc("rdl",5,1,1).reps, acc("rdl",5,1,2).reps], [225,6,8], "w1 rdl");
// wave 2
eq([acc("legpress",1,2,1).w, acc("legpress",1,2,1).reps], [380,10], "w2 legpress 380");
eq([acc("seatcurl",1,2,1).w, acc("seatcurl",1,2,1).reps, acc("seatcurl",1,2,2).reps], [80,12,15], "w2 seatcurl 80 12/15");
eq([acc("lattue",2,2,1).w, acc("lattue",2,2,1).reps, acc("lattue",2,2,2).reps], [17.5,12,15], "w2 lattue 17.5");
eq([acc("legext",3,2,1).w], [100], "w2 legext 100");
eq([acc("cablecurl",5,2,1).w, acc("cablecurl",5,2,1).reps], [45,12], "w2 cablecurl 45");
eq([acc("rdl",5,2,1).w], [235], "w2 rdl 235");
eq([acc("rowtue",2,2,1).w, acc("rowtue",2,2,1).reps, acc("rowtue",2,2,2).reps], [50,10,12], "w2 row 50 10/12");
eq([acc("crossbody",4,2,1).reps, acc("crossbody",4,2,2).reps], [15,18], "w2 crossbody 15/18");
// wave 3
eq([acc("legpress",1,3,1).w], [400], "w3 legpress 400");
eq([acc("seatcurl",1,3,1).w, acc("seatcurl",1,3,1).reps], [90,10], "w3 seatcurl 90");
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
eq([acc("seatcurl",1,4,1).reps, acc("seatcurl",1,4,2).reps], [12,15], "w4 seatcurl 12/15");
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
