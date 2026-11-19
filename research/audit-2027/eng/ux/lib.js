// Shared helpers for the UX audit scripts (audit-2027/eng/ux). Nothing here touches the repo:
// APP points at a built road-to-345.html in a scratch copy.
//   APP=/path/to/road-to-345.html node shots.js
const path = require("path");
const fs = require("fs");
const pw = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright");
const APP = process.env.APP || "/tmp/claude-0/-home-user/1ddf1d1e-54cc-5dc0-a5f7-ff690ed2cdeb/scratchpad/eng/ux/repo/road-to-345.html";
const URL = "file://" + APP;
const OUT = process.env.OUT || path.join(__dirname, "..", "shots");
const SEED = path.join(__dirname, "seed.json");

async function open(browser, { time, state, width = 390, height = 844, dsf = 3 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, timezoneId: "America/New_York", hasTouch: true, isMobile: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("dialog", async (d) => { errors.push("dialog: " + d.message()); await d.accept(); });
  if (time) await page.clock.install({ time: new Date(time) });
  if (state) await page.addInitScript((s) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("r345.v1", JSON.stringify(s)); sessionStorage.setItem("seeded", "1"); } }, state);
  await page.goto(URL);
  return { ctx, page, errors };
}

// Build a realistic four-month state by replaying the engine's own prescriptions day by day
// (every planned set logged at the planned load, singles rated, daily weigh-ins, sleep, tape every
// 4 weeks, the home-cooked plan ticked since Nov 1). Runs inside the page so it uses the app's code.
async function buildSeed(browser) {
  const { ctx, page } = await open(browser, { time: "2026-11-19T06:50:00", state: { logs: {}, gates: {}, bw: {}, testMax: {}, settings: {}, v32: 1, lastBackup: "2026-11-15" } });
  const seed = await page.evaluate(() => {
    const st = JSON.parse(JSON.stringify(S));
    st.seen = { m2: 1, home65: 1 }; st.lastBackup = "2026-11-15";
    st.nutri = { mode: "maintain", since: "2026-11-01", adj: 0, shiftDays: [2, 3, 5, 6] };
    st.settings.heightIn = 68.5;
    const DAY = E.MS_DAY, t0 = Date.parse("2026-07-20"), tEnd = Date.parse("2026-11-18");
    let seedN = 7; const rnd = () => { seedN = (seedN * 1103515245 + 12345) % 2147483648; return seedN / 2147483648; };
    const LOGT = ["single", "backoff", "paused", "ohp", "accessory"];
    const index = () => { const ix = {}; for (const [dk, log] of Object.entries(st.logs)) { if (!log.sets) continue; const t = Date.parse(dk); for (const arr of Object.values(log.sets)) for (const s of arr) if (s && s.k) (ix[s.k] = ix[s.k] || []).push({ t, w: +s.w || 0, r: +s.r || 0, rpe: Number.isFinite(s.rpe) ? s.rpe : null, rate: s.rate || null, cap: Number.isFinite(s.cap) ? s.cap : null }); } return ix; };
    for (let t = t0; t <= tEnd; t += DAY) {
      const dk = new Date(t).toISOString().slice(0, 10), loc = E.whereIs(t, []);
      // bodyweight: 187.5 -> 191 over four months, daily noise, a missed morning now and then
      const frac = (t - t0) / (tEnd - t0);
      if (rnd() > 0.08) st.bw[dk] = +(187.5 + 3.6 * frac + (rnd() - 0.5) * 1.6).toFixed(1);
      const log = (st.logs[dk] = st.logs[dk] || {});
      log.sleep = [6.5, 7, 7, 7.5, 7.5, 8, 6][Math.floor(rnd() * 7)];
      if (loc.pre || loc.day === 7) continue;
      const ix = index(), gx = E.withAutoGates(st.gates, { index: ix, shifts: [] });
      const hctx = { index: ix, shifts: [], today: t, testMax: st.testMax, ready: "G" };
      let blocks; try { blocks = E.sessionFor(loc.wave, loc.week, loc.day, gx, st.spec, hctx); } catch (e) { continue; }
      log.sets = {};
      blocks.forEach((b, i) => {
        if (!LOGT.includes(b.type)) return;
        const n = b.type === "single" ? 1 : b.sets, key = b.pkey ? b.pkey : "b" + i, cap = ["single", "backoff", "paused", "ohp"].includes(b.type) ? E.capNum(b.rpe) : null;
        const arr = [];
        for (let k = 0; k < n; k++) { const s = { w: b.w, r: b.repN ?? b.reps, rpe: null }; if (b.pkey) s.k = b.pkey; if (Number.isFinite(cap)) s.cap = cap; arr.push(s); }
        if (b.pkey && b.w > 0 && arr.length) { const q = rnd(); arr[arr.length - 1].rate = q < 0.18 ? "E" : q < 0.86 ? "O" : "H"; }
        log.sets[key] = arr;
      });
      log.wu = 9;
    }
    // tape every 4 weeks (Saturdays), six photos the same day
    st.photos = {};
    [["2026-07-25", 33.5, 15.4, 13.0, 46.5, 40.5], ["2026-08-22", 33.75, 15.5, 13.2, 46.75, 40.75], ["2026-09-19", 34.0, 15.5, 13.4, 47.0, 41.0], ["2026-10-17", 34.0, 15.6, 13.5, 47.25, 41.25], ["2026-11-14", 34.25, 15.7, 13.7, 47.5, 41.5]]
      .forEach(([dk, wa, nk, ar, sh, ch]) => { st.meas[dk] = { wa, nk, ar, sh, ch }; st.photos[dk] = 1; });
    // the home-cooked plan since Nov 1: every planned portion ticked and the day marked complete, bar two days
    const T = NUTRI.targets("maintain", 0, undefined);
    for (let t = Date.parse("2026-11-01"); t <= tEnd; t += DAY) {
      const dk = new Date(t).toISOString().slice(0, 10), type = NUTRI.dayType(dk, null, st.nutri.shiftDays), plan = NUTRI.dayPlan(type, T.kcal, dk);
      const ent = plan.items.map((it) => { const m = it.meal, e = { id: m.id, name: m.name, kcal: m.kcal, p: m.p, f: m.f, c: m.c, fib: m.fib, slot: it.slot }; return e; });
      if (dk === "2026-11-07") { ent.pop(); st.food[dk] = ent; continue; } // a day never marked complete
      if (dk === "2026-11-12") ent.push({ id: "manual", name: "extra 100 g rice", kcal: 130, p: 3 });
      st.food[dk] = ent; st.fday[dk] = { done: 1 };
    }
    return st;
  });
  await ctx.close();
  fs.writeFileSync(SEED, JSON.stringify(seed));
  return seed;
}
const loadSeed = async (browser) => (fs.existsSync(SEED) ? JSON.parse(fs.readFileSync(SEED, "utf8")) : buildSeed(browser));

// viewport-sized "fold" screenshots down the page: what is on screen at each scroll stop
async function folds(page, name, { max = 6, dir } = {}) {
  const d = dir || OUT; fs.mkdirSync(d, { recursive: true });
  const vp = page.viewportSize();
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  const stops = Math.min(max, Math.max(1, Math.ceil((H - 1) / (vp.height - 120))));
  const files = [];
  for (let i = 0; i < stops; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * (vp.height - 120));
    await page.waitForTimeout(60);
    const f = path.join(d, `${name}-${i + 1}.png`);
    await page.screenshot({ path: f });
    files.push(f);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return { files, pageHeight: H, screens: +(H / vp.height).toFixed(2) };
}
// a sheet is its own scroller: shoot it at each scroll stop
async function sheetFolds(page, name, { max = 4, dir } = {}) {
  const d = dir || OUT; fs.mkdirSync(d, { recursive: true });
  const m = await page.evaluate(() => { const s = document.getElementById("sheet"); return { sh: s.scrollHeight, ch: s.clientHeight }; });
  const stops = Math.min(max, Math.max(1, Math.ceil((m.sh - 1) / Math.max(1, m.ch - 80))));
  const files = [];
  for (let i = 0; i < stops; i++) {
    await page.evaluate((y) => { document.getElementById("sheet").scrollTop = y; }, i * (m.ch - 80));
    await page.waitForTimeout(60);
    const f = path.join(d, `${name}-${i + 1}.png`);
    await page.screenshot({ path: f });
    files.push(f);
  }
  return { files, sheetHeight: m.sh, sheetScreens: +(m.sh / m.ch).toFixed(2) };
}
module.exports = { pw, APP, URL, OUT, open, buildSeed, loadSeed, folds, sheetFolds, fs, path };
