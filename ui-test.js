// UI smoke tests: drive the built app (road-to-345.html) in headless Chromium with a fake clock.
// Run after `python3 build.py`:  node ui-test.js
// Playwright is not a project dependency. This resolves a global install (npm i -g playwright &&
// npx playwright install chromium) and skips cleanly when there is none.
let pw;
try { pw = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright"); }
catch (e) { console.log("SKIP ui-test.js: Playwright is not installed globally"); process.exit(0); }
const path = require("path");
const URL = "file://" + path.join(__dirname, "road-to-345.html");
let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log("FAIL", label); } };
const eq = (got, want, label) => ok(JSON.stringify(got) === JSON.stringify(want), `${label} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`);
const BASE = { logs: {}, gates: {}, bw: {}, testMax: {}, settings: { offsetWeeks: 0 }, v32: 1, lastBackup: "2026-10-01" };
async function open(browser, { time, state, width = 390, height = 844 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, timezoneId: "America/New_York" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("dialog", async (d) => { errors.push("dialog: " + d.message()); await d.accept(); });
  if (time) await page.clock.install({ time: new Date(time) });
  if (state) await page.addInitScript((s) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("r345.v1", JSON.stringify(s)); sessionStorage.setItem("seeded", "1"); } }, state);
  await page.goto(URL);
  return { ctx, page, errors };
}
const getS = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("r345.v1")));
const T = {}; // test cases: name -> async (browser) => {}

// ── B2 meet day ──
T["meet: Today's TEST card and the Road W6 sheet show the same kg attempts"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2027-01-01T07:05:00", state: { ...BASE, testMax: { 6: { sq: { target: 300 }, bn: { target: 250 }, dl: { target: 385 } } }, lastBackup: "2026-12-30" } });
  const today = await page.$$eval("#view table td b", (els) => els.map((e) => e.textContent));
  await page.evaluate(() => { goTab("road"); waveSheet(6); });
  const road = await page.$$eval("#sheet table td", (els) => els.map((e) => e.innerText).filter((t) => / kg/.test(t)).map((t) => t.split("\n")[0]));
  eq(today, road, "TEST card kg = Road sheet kg");
  eq(today.slice(0, 3), ["122.5 kg", "130 kg", "135 kg"], "TEST card: the 300 lb squat target is 122.5 / 130 / 135 kg");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};
T["meet: a target never moves a base; Made opens on test day"] = async (b) => {
  let { ctx, page } = await open(b, { time: "2026-10-06T07:05:00", state: BASE });
  const before = await page.evaluate(() => E.cbFor(7, GX()).bn);
  await page.evaluate(() => { goTab("road"); waveSheet(6); });
  ok(await page.$eval('#sheet tr:nth-child(3) input[data-f="made"]', (e) => e.disabled), "Made is disabled before the test");
  await page.fill('#sheet tr:nth-child(3) input[data-f="target"]', "260");
  await page.$eval('#sheet tr:nth-child(3) input[data-f="target"]', (e) => e.dispatchEvent(new Event("change")));
  const S1 = await getS(page);
  ok(!S1.gates[7] && S1.testMax[6].bn.target === 260 && (await page.evaluate(() => E.cbFor(7, GX()).bn)) === before, "a 260 target leaves the Wave 7 base alone");
  await ctx.close();
  ({ ctx, page } = await open(b, { time: "2027-01-01T18:00:00", state: { ...BASE, testMax: { 6: { bn: { target: 260 } } } } }));
  await page.evaluate(() => { goTab("road"); waveSheet(6); });
  await page.fill('#sheet tr:nth-child(3) input[data-f="made"]', "260");
  await page.$eval('#sheet tr:nth-child(3) input[data-f="made"]', (e) => e.dispatchEvent(new Event("change")));
  eq(await page.evaluate(() => E.cbFor(7, GX()).bn), 250, "a made 260 on test day sets the Wave 7 bench base to 250");
  ok(/Base set from your made 260/.test(await page.$eval("#sheet", (e) => e.innerText)), "the gate editor names the made lift");
  await page.fill('#sheet tr:nth-child(3) input[data-f="made"]', "");
  await page.$eval('#sheet tr:nth-child(3) input[data-f="made"]', (e) => e.dispatchEvent(new Event("change")));
  ok(!(await getS(page)).gates[7], "clearing Made removes the pin");
  await ctx.close();
};
T["meet: an old pre-test entry is migrated to a target and its pin removed"] = async (b) => {
  const { ctx, page } = await open(b, { time: "2026-10-06T07:05:00", state: { ...BASE, testMax: { 6: { bn: 260 } }, gates: { 7: { cb: { bn: 250 } } } } });
  const S = await getS(page);
  ok(S.testMax[6].bn.target === 260 && !S.gates[7] && S.v62tm === 1, "migrated: " + JSON.stringify({ tm: S.testMax, g: S.gates }));
  await ctx.close();
};
T["Yellow: the single shows its RPE-7 load and logs its cap"] = async (b) => {
  const { ctx, page } = await open(b, { time: "2026-10-26T07:05:00", state: { ...BASE, logs: { "2026-10-26": { r: "Y" } } } });
  const card = await page.$$eval("#view .card.single", (els) => els.map((e) => e.innerText).find((t) => /squat — top single/i.test(t)) || "");
  ok(/260/.test(card) && /cap RPE 7/.test(card), "Yellow W4 wk3 Monday single = 260 @ cap 7: " + card.replace(/\n/g, " | "));
  await page.click("#view .card.single .setrow .chip");
  const st = (await getS(page)).logs["2026-10-26"].sets;
  const set = Object.values(st)[0][0];
  ok(set.w === 260 && set.cap === 7 && set.k === "sq-single", "the logged single stores w 260, cap 7: " + JSON.stringify(set));
  await ctx.close();
};

// ── B3 logging ──
const cardIdx = async (page, re) => (await page.$$eval("#view > *", (els, src) => { const r = new RegExp(src, "i"); return els.findIndex((e) => e.classList.contains("card") && r.test((e.querySelector(".eyebrow") || {}).textContent || "")); }, re.source));
async function chip(page, re, n) { const i = await cardIdx(page, re); return (await page.$$(`#view > :nth-child(${i + 1}) .setrow .chip`))[n]; }
async function chipTexts(page, re) { const i = await cardIdx(page, re); return page.$$eval(`#view > :nth-child(${i + 1}) .setrow .chip`, (els) => els.map((e) => e.textContent.trim())); }
async function rate(page, re, label) { const i = await cardIdx(page, re); await page.click(`#view > :nth-child(${i + 1}) .seg.rate button:text("${label}")`); }
const backW = (page) => page.$$eval("#view > .card", (els) => { const c = els.find((e) => /deadlift — back-offs/i.test((e.querySelector(".eyebrow") || {}).textContent || "")); return c ? +c.querySelector(".rx").textContent.trim().split(" ")[0] : null; });

T["log: an extra set is visible, editable and deletable"] = async (b) => {
  const { ctx, page } = await open(b, { time: "2026-10-30T07:05:00", state: BASE });
  await (await chip(page, /deadlift — top single/, 0)).click();
  await rate(page, /deadlift — top single/, "On target");
  await (await chip(page, /deadlift — top single/, 1)).click(); // the ＋ chip
  await rate(page, /deadlift — top single/, "Hard");
  const t = await chipTexts(page, /deadlift — top single/);
  eq(t.slice(0, 2), ["355×1", "355×1 · Hard"], "both sets show; the rating label sits on the last one");
  eq(await backW(page), 300, "a Hard extra single takes the back-offs to 300");
  await (await chip(page, /deadlift — top single/, 1)).click();
  ok(/Edit set/.test(await page.$eval("#sheet", (e) => e.textContent)), "the extra set opens the edit sheet");
  await page.click("#sheet .btn.danger");
  eq([await backW(page), (await chipTexts(page, /deadlift — top single/)).length], [310, 2], "deleting it restores 310 and one set chip (+ the add chip)");
  await ctx.close();
};
T["log: an edited weight carries to the next set; steppers use the exercise increment"] = async (b) => {
  let { ctx, page } = await open(b, { time: "2026-10-30T07:05:00", state: BASE });
  await (await chip(page, /deadlift — back-offs/, 0)).click();
  await (await chip(page, /deadlift — back-offs/, 0)).click(); // opens Edit set
  await page.fill("#ew", "320"); await page.click('#sheet .btn:text("Save set")');
  eq((await chipTexts(page, /deadlift — back-offs/))[1], "320×3", "the next chip shows 320×3");
  await (await chip(page, /deadlift — back-offs/, 1)).click();
  const sets = Object.values((await getS(page)).logs["2026-10-30"].sets).find((a) => a[0].k === "dl-back");
  eq(sets.map((x) => x.w), [320, 320], "the second set logs 320");
  await ctx.close();
  ({ ctx, page } = await open(b, { time: "2026-10-27T07:05:00", state: BASE }));
  await (await chip(page, /leaning db lateral/, 0)).click();
  await (await chip(page, /leaning db lateral/, 0)).click();
  await (await (await page.$$("#sheet .editrow"))[0].$(".stepbtn:last-of-type")).click();
  eq(await page.$eval("#ew", (e) => e.value), "25", "one ＋ on a 22.5 lb dumbbell lateral gives 25");
  await ctx.close();
};
T["log: the edit sheet fits 320-430 px and RPE starts at the cap"] = async (b) => {
  for (const width of [320, 375, 390, 430]) {
    const { ctx, page } = await open(b, { time: "2026-10-19T07:05:00", state: BASE, width });
    await (await chip(page, /squat — back-offs/, 0)).click();
    await (await chip(page, /squat — back-offs/, 0)).click();
    const r = await page.evaluate(() => { const sh = document.getElementById("sheet"); return { sw: sh.scrollWidth, cw: sh.clientWidth, rows: [...sh.querySelectorAll(".editrow")].map((row) => { const p = row.querySelector(".stepbtn:last-of-type").getBoundingClientRect(); const hit = document.elementFromPoint(p.left + p.width / 2, p.top + p.height / 2); return { right: p.right, ok: hit === row.querySelector(".stepbtn:last-of-type") }; }) }; });
    ok(r.sw === r.cw && r.rows.every((x) => x.ok && x.right <= r.cw + 1), `edit sheet at ${width}px: ${JSON.stringify(r)}`);
    await (await (await page.$$("#sheet .editrow"))[2].$(".stepbtn:last-of-type")).click();
    eq(await page.$eval("#erpe", (e) => e.value), "7", `RPE ＋ from blank = the block's cap 7 (week-2 back-offs 7–7.5) at ${width}px`);
    await ctx.close();
  }
};
T["log: the rest timer starts on a set, beeps at zero, counts the overrun"] = async (b) => {
  const { ctx, page } = await open(b, { time: "2026-10-30T07:05:00", state: BASE });
  await page.evaluate(() => { window.__osc = 0; class FakeAC { constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; } resume() {} createOscillator() { window.__osc++; return { frequency: {}, connect() {}, start() {}, stop() {} }; } createGain() { return { gain: {}, connect() {} }; } } window.AudioContext = FakeAC; });
  await (await chip(page, /deadlift — back-offs/, 0)).click();
  const t0 = await page.$eval("#timer", (e) => ({ c: e.className, t: e.textContent }));
  ok(/run/.test(t0.c) && /⏱ (3:00|2:59)/.test(t0.t), "a back-off starts 3:00: " + JSON.stringify(t0));
  await page.clock.fastForward(181000);
  const t1 = await page.$eval("#timer", (e) => e.textContent);
  ok(/⏱ \+0:0[0-9]/.test(t1) && (await page.evaluate(() => window.__osc)) >= 2, "at zero it beeps and counts up: " + t1);
  await (await chip(page, /deadlift — back-offs/, 1)).click();
  ok(/⏱ (3:00|2:59)/.test(await page.$eval("#timer", (e) => e.textContent)), "the next set restarts it");
  await page.click("#timer"); await page.click('#sheet .btn.danger');
  await (await chip(page, /wrist curl/, 0)).click();
  ok(!/run/.test(await page.$eval("#timer", (e) => e.className)), "a filler set starts no timer");
  await ctx.close();
};
T["log: no chip hides under the rest pill or the bars"] = async (b) => {
  const { ctx, page } = await open(b, { time: "2026-10-13T07:05:00", state: BASE });
  const bad = await page.evaluate(async () => {
    const out = []; const H = document.querySelector("header").getBoundingClientRect().bottom, N = document.querySelector("nav").getBoundingClientRect().top;
    for (let y = 0; y < document.body.scrollHeight; y += 20) { window.scrollTo(0, y); await new Promise((r) => requestAnimationFrame(r));
      const hb = document.querySelector("header").getBoundingClientRect().bottom;
      for (const c of document.querySelectorAll("#view .setrow .chip")) { const r = c.getBoundingClientRect(); if (r.top < hb || r.bottom > N || r.height === 0) continue;
        const hit = document.elementFromPoint(r.right - 4, r.top + r.height / 2); if (!(hit === c || c.contains(hit))) out.push(c.textContent + "@" + y); } }
    return out; });
  eq(bad, [], "every visible chip is tappable at its right edge");
  await ctx.close();
};
T["log: a PWA resumed the next morning shows today and writes today"] = async (b) => {
  const { ctx, page } = await open(b, { time: "2026-10-30T20:10:00", state: { ...BASE, bw: { "2026-10-30": 190.2 } } });
  await page.clock.fastForward("59:00:00");
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  ok(/mon, nov 2/i.test(await page.$eval(".daynav", (e) => e.textContent)) && /today/i.test(await page.$eval(".daynav", (e) => e.textContent)), "the day rolled to Mon, Nov 2");
  await page.fill(".metrics input", "191.4"); await page.$eval(".metrics input", (e) => e.dispatchEvent(new Event("change")));
  const S = await getS(page);
  eq([S.bw["2026-11-02"], S.bw["2026-10-30"]], [191.4, 190.2], "the weigh-in lands on Nov 2 and Friday's stays");
  await ctx.close();
};
T["log: a swap relabels the card and logs under its own key"] = async (b) => {
  const { ctx, page } = await open(b, { time: "2026-10-30T07:05:00", state: BASE });
  const i = await cardIdx(page, /high-elbow/);
  await page.click(`#view > :nth-child(${i + 1}) button[aria-label="Swap exercise"]`);
  await page.click('#sheet .btn:text("Seated Cable Row (wide grip)")');
  ok((await cardIdx(page, /seated cable row \(wide grip\) \(swap\)/)) > -1, "the card shows the swap");
  await (await chip(page, /\(swap\)/, 0)).click();
  const k = Object.values((await getS(page)).logs["2026-10-30"].sets).flat().map((x) => x.k);
  ok(k.includes("rowhi~seated-cable-row-wide-grip"), "logged under rowhi~seated-cable-row-wide-grip: " + k.join(","));
  await ctx.close();
};
T["log: last sessions in the how-to, history rows open their day, tracked lifts on Trends"] = async (b) => {
  const logs = { "2026-10-16": { sets: { b9: [{ w: 230, r: 8, k: "rdl-back" }, { w: 230, r: 8, k: "rdl-back", rate: "H" }] } }, "2026-10-17": { sets: { b2: [{ w: 40, r: 12, k: "incline-db-curl" }] } }, "2026-10-23": { sets: { b9: [{ w: 235, r: 7, k: "rdl-back" }] } } };
  const { ctx, page } = await open(b, { time: "2026-10-30T07:05:00", state: { ...BASE, logs } });
  const i = await cardIdx(page, /rdl — back-offs/);
  await page.click(`#view > :nth-child(${i + 1}) button[aria-label="How to"]`);
  const txt = await page.$eval("#sheet", (e) => e.innerText);
  ok(/Oct 23 · 235×7/.test(txt) && /Oct 16 · 230×8, 230×8 · Hard/.test(txt), "the RDL how-to lists the last sessions: " + txt.slice(0, 160).replace(/\n/g, " | "));
  await page.evaluate(() => { closeSheet(); goTab("more"); });
  await page.click('#view .linkbtn:text-matches("2026-10-17")');
  ok(/sat, oct 17/i.test(await page.$eval(".daynav", (e) => e.textContent)), "a History row opens its day on Today");
  await page.evaluate(() => goTab("trends"));
  const btns = await page.$$eval("#view .seg button", (els) => els.map((e) => e.textContent));
  ok(["Incline", "Chin-up", "Dip", "RDL"].every((x) => btns.includes(x)), "Trends offers the tracked lifts: " + btns.join(","));
  await ctx.close();
};

// ── B4 data safety ──
const SEED11 = (() => { const logs = {}; ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-28"].forEach((dk, i) => { logs[dk] = { sets: { "sq-back": [{ w: 200 + i, r: 5, k: "sq-back" }] } }; }); return logs; })();
T["data: a malformed import changes nothing and never blanks the app"] = async (b) => {
  for (const bad of ['{"logs":{"2026-09-24":null,"2026-09-23":{"sets":{}}}}', '{"logs":{"2026-09-24":{"sets":{"b1":5}}}}', "not json"]) {
    const { ctx, page, errors } = await open(b, { time: "2026-10-06T07:05:00", state: { ...BASE, logs: SEED11 } });
    await page.evaluate(() => { goTab("more"); importSheet(); });
    await page.fill("#imp", bad); await page.click('#sheet .btn:text("Import")');
    const S = await getS(page);
    // a sanitized partial file asks first; the dialog handler accepts, so it may replace: the app must still render
    for (const tab of ["today", "road", "trends", "more"]) { await page.evaluate((t) => goTab(t), tab); ok((await page.$$("#view .card")).length > 0, `after importing ${bad.slice(0, 30)}: ${tab} renders`); }
    ok(!errors.some((e) => /TypeError/.test(e)), "no TypeError: " + errors.join(" | "));
    if (bad === "not json") eq(Object.keys(S.logs).length, 11, "a non-JSON paste keeps all 11 days");
    await ctx.close();
  }
};
T["data: an import asks first and can be undone"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-10-06T07:05:00", state: { ...BASE, logs: SEED11 } });
  await page.evaluate(() => { goTab("more"); importSheet(); });
  await page.fill("#imp", JSON.stringify({ ...BASE, logs: { "2026-09-01": { sets: { "sq-back": [{ w: 190, r: 5, k: "sq-back" }] } } } }));
  await page.click('#sheet .btn:text("Import")');
  ok(errors.some((e) => /Replace 11 logged days with 1/.test(e)), "the import asks before replacing 11 days");
  eq(Object.keys((await getS(page)).logs).length, 1, "after confirming, the file's 1 day is loaded");
  await page.evaluate(() => goTab("more"));
  await Promise.all([page.waitForNavigation(), page.click('#view .btn:text("Undo last import")')]);
  eq(Object.keys((await getS(page)).logs).length, 11, "Undo last import brings the 11 days back");
  await ctx.close();
};
T["data: Repeat a week shifts only the future; the meet date lines up a peak"] = async (b) => {
  const { ctx, page } = await open(b, { time: "2026-10-06T07:05:00", state: { ...BASE, logs: SEED11 } });
  const hist0 = await page.evaluate(() => { goTab("more"); return [...document.querySelectorAll("#view .linkbtn")].map((e) => e.textContent); });
  await page.click('#view .btn:text("Repeat a week from next Monday")');
  const S1 = await getS(page);
  eq(S1.settings.shifts, [{ from: "2026-10-12", weeks: 1 }], "the shift starts next Monday");
  eq(await page.evaluate(() => [...document.querySelectorAll("#view .linkbtn")].map((e) => e.textContent)), hist0, "History labels do not move");
  await page.click('#view .btn:text("Undo last shift")');
  eq((await getS(page)).settings.shifts, [], "Undo last shift removes it");
  await page.fill("#meetdate", "2027-07-10"); await page.$eval("#meetdate", (e) => e.dispatchEvent(new Event("change")));
  const S2 = await getS(page);
  ok(S2.settings.meetDate === "2027-07-10" && S2.settings.shifts.length === 3, "the meet date adds three week-2 repeats: " + JSON.stringify(S2.settings.shifts));
  eq(await page.evaluate(() => new Date(E.sessionDayUTC(12, 4, 5, SHIFT())).toISOString().slice(0, 10)), "2027-07-09", "the Wave 12 test moves to Fri Jul 9");
  await page.evaluate(() => goTab("road"));
  ok(/Peak = the Wave 12 test/.test(await page.$eval("#view", (e) => e.innerText)), "the Road tab shows the meet card");
  await ctx.close();
};
T["data: a spec change never moves a logged set onto another exercise"] = async (b) => {
  const { ctx, page } = await open(b, { time: "2026-10-17T07:05:00", state: BASE });
  for (const k of [0, 1, 2]) await (await chip(page, /incline db curl/, k)).click();
  for (const k of [0, 1]) await (await chip(page, /bayesian cable curl/, k)).click();
  const keys = Object.keys((await getS(page)).logs["2026-10-17"].sets).sort();
  eq(keys, ["bayesian-cable-curl", "incline-db-curl"], "sets are stored under the exercise keys");
  await page.evaluate(() => { setSpec("framePrimary", "shoulders"); closeSheet(); render(); });
  const hits = await page.$$eval("#view .chip.hit", (els) => els.length);
  eq(hits, 0, "after switching to Shoulder width no other exercise shows the curls' sets");
  await ctx.close();
};
T["data: a stalled network still opens the cached app; force update offline changes nothing"] = async (b) => {
  const http = require("http"), fs = require("fs");
  let stall = false; const held = [];
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]); const f = path.join(__dirname, p === "/" ? "index.html" : p);
    if (stall && /\/(index\.html)?$/.test(p)) { held.push(res); return; } // accept, never answer
    if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": /\.js$/.test(f) ? "text/javascript" : /\.html$/.test(f) ? "text/html" : /\.json|webmanifest$/.test(f) ? "application/json" : "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(fs.readFileSync(f));
  });
  await new Promise((r) => srv.listen(0, r));
  const url = `http://localhost:${srv.address().port}/index.html`;
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(url); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await page.waitForSelector("#view .card");
  stall = true;
  const p2 = await ctx.newPage(); const t0 = Date.now();
  await p2.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {});
  const shown = await p2.waitForSelector("#view .card", { timeout: 4000 }).then(() => true, () => false);
  ok(shown && Date.now() - t0 < 4000, `a stalled network shows the cached app in ${Date.now() - t0} ms`);
  stall = false; held.forEach((r) => r.destroy());
  await ctx.setOffline(true);
  const msgs = []; p2.on("dialog", async (d) => { msgs.push(d.message()); await d.accept(); });
  const before = p2.url();
  await p2.evaluate(() => forceUpdate());
  ok(msgs.some((m) => /needs a connection/.test(m)) && p2.url() === before && (await p2.evaluate(async () => (await caches.keys()).length)) > 0, "offline force update keeps the worker and caches: " + msgs.join(" | "));
  await ctx.close(); srv.close();
};

// ── B5 nutrition ──
const dkSeq = (from, n, f) => { const o = {}; for (let i = 0; i < n; i++) o[new Date(Date.parse(from) + i * 86400000).toISOString().slice(0, 10)] = f(i); return o; };
const TRIMSEED = { ...BASE, nutri: { mode: "trim", since: "2026-09-17" }, bw: dkSeq("2026-08-20", 39, (i) => 189 + (i % 3) * 0.4 - (i > 28 ? (i - 28) * 0.1 : 0)), meas: { "2026-08-20": { wa: 33, sh: 47 }, "2026-09-16": { wa: 34, sh: 47.25 } } };
T["nutri: tapping the active mode changes nothing; ending a phase asks first"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-09-27T07:05:00", state: TRIMSEED });
  await page.evaluate(() => goTab("trends"));
  ok(await page.$eval('#view .btn[aria-pressed="true"]', (e) => e.disabled && /TRIM/.test(e.textContent)), "the active TRIM button is not a button");
  await page.evaluate(() => setNutriMode("trim"));
  const S1 = await getS(page);
  ok(S1.nutri.since === "2026-09-17" && /Trim ends 2026-10-29/.test(await page.$eval("#view", (e) => e.innerText)), "TRIM again keeps the phase: " + JSON.stringify(S1.nutri));
  await page.click('#view .btn.ghost:text-matches("GAIN")');
  ok(errors.some((e) => /End the TRIM phase that started 2026-09-17/.test(e)), "GAIN asks before ending the trim");
  eq((await getS(page)).nutri, { mode: "gain", since: "2026-09-27", adj: 0 }, "after confirming, the gain phase starts today");
  await page.fill("#nsince", "2026-09-20"); await page.$eval("#nsince", (e) => e.dispatchEvent(new Event("change")));
  eq((await getS(page)).nutri.since, "2026-09-20", "the phase start can be corrected");
  await ctx.close();
};
T["nutri: Trends gives one instruction, and the pace band sits on the data"] = async (b) => {
  const { ctx, page } = await open(b, { time: "2026-09-27T07:05:00", state: TRIMSEED });
  await page.evaluate(() => goTab("trends"));
  const txt = await page.$eval("#view", (e) => e.innerText);
  ok(!/\+150|Drop 150|drop 150/.test(txt), "no +150 / Drop 150 on a trim screen: " + (txt.match(/.{0,40}(\+150|[Dd]rop 150).{0,40}/) || [""])[0]);
  const r = await page.evaluate(() => {
    const svg = [...document.querySelectorAll("#view svg")].find((s) => s.querySelector('path[fill="rgba(255,178,36,.10)"]'));
    if (!svg) return null;
    const ys = svg.querySelector('path[fill="rgba(255,178,36,.10)"]').getAttribute("d").match(/,(-?[\d.]+)/g).map((x) => +x.slice(1));
    const dy = [...svg.querySelectorAll("circle:not(.hit)")].map((c) => +c.getAttribute("cy"));
    return { b: [Math.min(...ys), Math.max(...ys)], d: [Math.min(...dy), Math.max(...dy)] };
  });
  ok(r && r.b[0] <= r.d[1] && r.b[1] >= r.d[0], "the band's y-range overlaps the weigh-ins: " + JSON.stringify(r));
  ok(/trim band \(0\.5–1% of bodyweight a week\)/.test(txt), "the legend reads from the pace table");
  await ctx.close();
};
T["nutri: Apply moves the target the advice names"] = async (b) => {
  const food = dkSeq("2026-09-20", 7, () => [{ id: "manual", name: "day", kcal: 2700, p: 200 }]);
  const state = { ...BASE, nutri: { mode: "trim", since: "2026-09-17" }, bw: dkSeq("2026-09-17", 11, (i) => 192 - 0.35 * i), food, fday: dkSeq("2026-09-20", 7, () => ({ done: 1 })) };
  const { ctx, page } = await open(b, { time: "2026-09-27T07:05:00", state });
  await page.evaluate(() => goTab("trends"));
  ok(/overshoot/.test(await page.$eval("#view", (e) => e.innerText)), "2,700 a day against 2,500 is the overshoot");
  await page.click('#view .btn:text("Apply +200 kcal")');
  const t2 = await page.$eval("#view", (e) => e.innerText);
  ok(/✅ On target/.test(t2) && (await getS(page)).nutri.adj === 200, "after Apply +200 the 2,700 average is on target");
  ok(!/Apply \+200/.test(t2) && /give it a week/.test(t2), "Apply waits a week before offering the next change");
  await page.evaluate(() => goTab("today"));
  ok(/\/ 2700/.test(await page.$eval("#view", (e) => e.innerText)), "Today's fuel bar reads / 2700");
  await ctx.close();
};
T["nutri: logging only the arm never re-saves the waist"] = async (b) => {
  const state = { ...TRIMSEED, nutri: { mode: "gain", since: "2026-09-01" } };
  const { ctx, page } = await open(b, { time: "2026-09-27T07:05:00", state });
  await page.evaluate(() => goTab("trends"));
  eq(await page.$eval("#mw", (e) => [e.value, e.placeholder]), ["", "34"], "the waist input is empty, the last waist is its placeholder");
  await page.fill("#ma", "14.75"); await page.click('#view .btn:text("Log")');
  eq((await getS(page)).meas["2026-09-27"], { ar: 14.75 }, "only the arm is stored for today");
  await ctx.close();
};
T["home: the food sheet is home dishes only, at this week's size"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-11-03T07:05:00", state: { ...BASE, nutri: { mode: "maintain", since: "2026-11-01" } } });
  await page.evaluate(() => foodSheet("2026-11-03"));
  const t = await page.$eval("#sheet", (e) => e.innerText);
  ok(/Hawaiian-marinated sirloin/.test(t) && /Center-cut filet/.test(t) && /· maintain/.test(t) && /Certified whey/.test(t), "the sheet lists the recipes at the maintain size");
  ok(!/Hillstone|French fries|Knife & Fork|Tier [ABCD]|grazing/i.test(t.replace(/Zero restaurant food[^]*$/, "")), "no restaurant food anywhere on the sheet");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};
T["home: one tap logs a planned portion with its macros; the day counts once marked complete"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-11-03T07:05:00", state: { ...BASE, nutri: { mode: "maintain", since: "2026-11-01" }, seen: { m2: 1, home65: 1 } } });
  const plan = await page.evaluate(() => NUTRI.dayPlan("off", 2800, "2026-11-03"));
  const rows = await page.$$eval("#view .plrow", (els) => els.map((e) => e.innerText));
  eq(rows.length, plan.items.length, "Today shows one row per planned slot");
  ok(/French dip/.test(rows.join("\n")) && /Steak & eggs/.test(rows.join("\n")), "Tuesday week 1: steak & eggs and the French dip");
  await page.evaluate(() => planTick("2026-11-03", "lunch"));
  const e1 = (await getS(page)).food["2026-11-03"];
  ok(e1.length === 1 && e1[0].slot === "lunch" && e1[0].id === "frenchDip.maintain" && [e1[0].kcal, e1[0].p, e1[0].f, e1[0].c, e1[0].fib].every(Number.isFinite), "the tap logs the portion with kcal, protein, fat, carbs and fibre: " + JSON.stringify(e1));
  await page.evaluate(() => planTick("2026-11-03", "lunch"));
  ok(!(await getS(page)).food["2026-11-03"], "a second tap takes it back off");
  for (const it of plan.items) await page.evaluate((sl) => planTick("2026-11-03", sl), it.slot);
  ok(/2770 \/ 2800|27\d\d \/ 2800/.test(await page.$eval("#view", (e) => e.innerText)), "all five portions fill the bar to the plan's total");
  await page.click('#view .btn:text("Mark day complete")');
  eq((await getS(page)).fday["2026-11-03"], { done: 1 }, "the day is marked complete");
  ok(/✓ Day complete/.test(await page.$eval("#view", (e) => e.innerText)), "the button says so");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};
T["home: the day type: a shift packs the dinner, a rest day drops the pre-lift; swaps replace the slot"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-11-03T07:05:00", state: { ...BASE, nutri: { mode: "maintain", since: "2026-11-01" }, seen: { m2: 1, home65: 1 } } });
  await page.click('#view .seg button:text("Shift tonight")');
  eq((await getS(page)).fday["2026-11-03"], { type: "shift" }, "the toggle stores the day's type");
  ok(/Shift break · cold bag/.test(await page.$eval("#view", (e) => e.innerText)), "a shift day packs the dinner");
  await page.click('#view .seg button:text("Rest day")');
  const t = await page.$eval("#view", (e) => e.innerText);
  ok(!/Pre-lift/.test(t) && /Evening shake/.test(t), "a rest day has no pre-lift shake; it moves to the evening");
  await page.click('#view .seg button:text("Off tonight")');
  ok(!(await getS(page)).fday["2026-11-03"], "back to the usual type stores nothing");
  await page.evaluate(() => foodSheet("2026-11-03", "dinner"));
  ok(/Swap — Dinner at home/i.test(await page.$eval("#sheet", (e) => e.innerText)), "the swap sheet names the slot");
  await page.evaluate(() => addFood("2026-11-03", "filetPlate.maintain", "dinner"));
  await page.evaluate(() => addFood("2026-11-03", "ahiPonzu.maintain", "dinner"));
  const f = (await getS(page)).food["2026-11-03"];
  ok(f.length === 1 && f[0].id === "ahiPonzu.maintain" && f[0].slot === "dinner", "a second swap replaces the first: " + JSON.stringify(f.map((x) => x.id)));
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};
T["home: Trends measures maintenance and Set moves all three modes"] = async (b) => {
  // 35 complete days at 2,800 with the scale falling 0.3 lb a week: maintenance ~2,950
  const food = dkSeq("2026-11-01", 35, () => [{ id: "manual", name: "day", kcal: 2800, p: 200 }]);
  const state = { ...BASE, nutri: { mode: "maintain", since: "2026-11-01" }, food, fday: dkSeq("2026-11-01", 35, () => ({ done: 1 })), bw: dkSeq("2026-11-01", 36, (i) => +(192 - (0.3 / 7) * i + [0.4, -0.3, 0.1, -0.2, 0.3, -0.4, 0.2][i % 7]).toFixed(1)), seen: { m2: 1, home65: 1 } };
  const { ctx, page, errors } = await open(b, { time: "2026-12-06T07:05:00", state });
  await page.evaluate(() => goTab("trends"));
  const t = await page.$eval("#view", (e) => e.innerText);
  ok(/MAINTAIN · 2800/.test(t) && /TRIM · 2500/.test(t) && /GAIN · 3050/.test(t), "three mode buttons with their starting numbers");
  const m = t.match(/(\d{4}) ± (\d+)/);
  ok(m && Math.abs(+m[1] - 2950) <= 2 * +m[2], "the measured maintenance shows with its band: " + (m && m[0]));
  const btn = await page.$('#view .btn:text-matches("Set maintenance to")');
  ok(!!btn, "past its band and 100 kcal, it offers the new number");
  if (btn) { await btn.click();
    const S2 = await getS(page), mk = S2.nutri.maint && S2.nutri.maint.kcal;
    ok(mk >= 2850 && mk <= 3050 && mk % 50 === 0, "the number is stored, rounded to 50: " + mk);
    const t2 = await page.$eval("#view", (e) => e.innerText);
    ok(new RegExp(`MAINTAIN · ${mk}`).test(t2) && new RegExp(`TRIM · ${mk - 500}`).test(t2) && new RegExp(`GAIN · ${mk + 125}`).test(t2), "all three modes now sit on it");
    await page.evaluate(() => goTab("today"));
    ok(new RegExp(`/ ${mk}`).test(await page.$eval("#view", (e) => e.innerText)), "Today's bar reads the new number"); }
  await page.evaluate(() => goTab("trends"));
  await page.click('#view .seg[aria-label="Usual shift nights"] button:text("Tue")');
  eq((await getS(page)).nutri.shiftDays, [2], "Tuesday is a usual shift night");
  eq(await page.evaluate(() => [planFor("2026-12-08").type, planFor("2026-12-09").type, planFor("2026-12-06").type]), ["shift", "off", "rest"], "so every Tuesday plans a shift (the bag), Wednesday stays off, Sunday rests");
  ok(!(await getS(page)).fday["2026-12-08"], "nothing is stored per day for the usual pattern");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};
T["home: recipes, prep, the Costco list and the rules open with the plan's numbers"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-11-03T07:05:00", state: { ...BASE, nutri: { mode: "maintain", since: "2026-11-01" } } });
  await page.evaluate(() => recipeSheet());
  const r = await page.$eval("#sheet", (e) => e.innerText);
  eq((await page.$$("#sheet .frow.tap.nav")).length, 14, "14 recipes listed");
  await page.evaluate(() => recipeDetail("hawaiianSirloin", "gain"));
  const d = await page.$eval("#sheet", (e) => e.innerText);
  ok(/Per portion \(gain\)/i.test(d) && /Weigh out, one portion/i.test(d) && /Method/i.test(d) && /Keeps:/i.test(d) && /165 °F/.test(d), "a recipe card has its weigh-out, method, storage and reheat");
  await page.evaluate(() => prepSheet(0));
  const p = await page.$eval("#sheet", (e) => e.innerText);
  ok(/Sunday cook · covers Mon–Wed/i.test(p) && /Wednesday cook · covers Thu–Sat/i.test(p) && /Costco list/i.test(p) && /\d+(\.\d)? lb/.test(p) && /\d+ eggs/.test(p), "the prep sheet has both cooks and a computed Costco list");
  await page.evaluate(() => rulesSheet());
  ok(/Zero restaurant food/i.test(await page.$eval("#sheet", (e) => e.innerText)), "the rules open with zero restaurant food");
  await page.evaluate(() => suppSheet());
  ok(/Ascent 100% Whey/.test(await page.$eval("#sheet", (e) => e.innerText)), "the supplement sheet names the certified Costco whey");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};
T["home: the intro card starts MAINTAIN, and an old gain phase is ended with a confirm"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-11-01T09:05:00", state: { ...BASE, nutri: { mode: "gain", since: "2026-09-27", adj: 150 }, seen: { m2: 1 } } });
  ok(/The strict home-cooked plan/i.test(await page.$eval("#view", (e) => e.innerText)), "the intro card shows");
  await page.click('#view .btn:text("Start MAINTAIN today")');
  const S1 = await getS(page);
  ok(S1.nutri.mode === "maintain" && S1.nutri.since === "2026-11-01" && S1.nutri.adj === 0 && S1.seen.home65 === 1, "MAINTAIN starts today with no carried adjustment: " + JSON.stringify(S1.nutri));
  ok(errors.some((e) => /End the GAIN phase/.test(e)), "ending the gain phase asked first");
  ok(!/The strict home-cooked plan/i.test(await page.$eval("#view", (e) => e.innerText)), "the card is gone");
  await ctx.close();
};
T["nutri: no trim on unknown sleep or into Cycles 5-6"] = async (b) => {
  const meas = { "2026-09-01": { wa: 33 }, "2026-10-01": { wa: 34 } };
  let { ctx, page } = await open(b, { time: "2026-10-06T07:05:00", state: { ...BASE, nutri: { mode: "gain", since: "2026-09-01" }, bw: dkSeq("2026-09-01", 36, () => 190), meas } });
  await page.evaluate(() => goTab("trends"));
  let t = await page.$eval("#view", (e) => e.innerText);
  ok(/LOG SLEEP FIRST/.test(t) && !/Start the trim/.test(t), "waist +1 with no sleep logged: log sleep first, no Start button");
  await ctx.close();
  ({ ctx, page } = await open(b, { time: "2026-11-16T07:05:00", state: { ...BASE, nutri: { mode: "gain", since: "2026-09-01" }, bw: dkSeq("2026-09-01", 77, () => 190), meas: { ...meas, "2026-11-15": { wa: 34 } }, logs: dkSeq("2026-11-10", 7, () => ({ sleep: 8 })) } }));
  await page.evaluate(() => goTab("trends"));
  t = await page.$eval("#view", (e) => e.innerText);
  ok(/NO TRIM IN CYCLES 5–6/.test(t) && !/Start the trim/.test(t), "waist +1 in Wave 5: no trim, no Start button");
  await ctx.close();
};

// ── B6 copy ──
T["copy: the Specialize sheet names every anchor and promises nothing false"] = async (b) => {
  const { ctx, page } = await open(b, { time: "2026-10-17T07:05:00", state: BASE });
  await page.evaluate(() => specSheet());
  const t = await page.$eval("#sheet", (e) => e.innerText);
  ok(!/undefined/.test(t) && /Incline DB curl \+ overhead cable extension/.test(t), "Specialize: the arms frame has an anchor, no 'undefined'");
  ok(!/Close-Grip|transfer into it/.test(t) && /Monday's Bayesian curl and Tuesday's overhead extension move to it/.test(t), "Specialize: no close-grip option; the Sunday note says what moves");
  await ctx.close();
};

// ── Model 2: announcement, goal tracker, measurements, photos ──
T["model 2: the announcement is a card, never a blocking sheet, and Dismiss sticks"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-10-07T07:05:00", state: BASE });
  ok(!(await page.$eval("#modal", (e) => e.classList.contains("open"))), "no sheet opens on launch");
  ok(/Model 2 is here/i.test(await page.$eval("#view", (e) => e.innerText)), "Today shows the Model 2 card");
  ok(/Model 2/i.test(await page.$eval("header", (e) => e.innerText)), "the header carries the Model 2 pill");
  await page.click('#m2card button:text("Dismiss")');
  ok(!/Model 2 is here/i.test(await page.$eval("#view", (e) => e.innerText)) && (await getS(page)).seen.m2 === 1, "Dismiss hides the card and is remembered");
  await page.click("header .m2pill");
  const t = await page.$eval("#sheet", (e) => e.innerText);
  ok(/What's new in Model 2/i.test(t) && /Upper back/i.test(t) && /3D shoulders/i.test(t) && /Goal tracking/i.test(t), "the pill reopens What's new");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};
T["model 2: the Road goal tracker lists every goal and the Model 2 weekly plan"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-10-13T07:05:00", state: { ...BASE, seen: { m2: 1 } } });
  await page.evaluate(() => goTab("road"));
  const t = await page.$eval("#view", (e) => e.innerText);
  for (const g of ["3/4/5", "200 lb @ 15%", "16\" arms", "3D shoulders", "Prominent upper chest", "Prominent upper back", "Shredded back"]) ok(t.includes(g), "tracker row: " + g);
  ok(/curls 11 · triceps 15 · upper chest 14 · traps 6 · rear delts 9 · side delts 13/.test(t), "tracker shows the Model 2 weekly plan");
  ok(/Measure day/i.test(t) && /Photo day/i.test(t), "nothing measured yet: measure and photo day are due");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};
T["model 2: logging waist + neck gives a body-fat trend; the photo day stamps"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-10-17T07:05:00", state: { ...BASE, seen: { m2: 1 }, bw: { "2026-10-15": 190, "2026-10-16": 190.4, "2026-10-17": 190.2 } } });
  await page.evaluate(() => goTab("trends"));
  await page.fill("#mw", "34"); await page.fill("#mn", "15.5"); await page.fill("#ma", "13.25");
  await page.evaluate(() => logMeas());
  const t = await page.$eval("#view", (e) => e.innerText);
  ok(/17\.2%/.test(t) && /lean ≈ 157\.5 lb/.test(t), "34/15.5 at 68.5 in = 17.2% and lean 157.5 lb at the 190.2 lb average");
  const s1 = await getS(page);
  eq(s1.meas["2026-10-17"], { wa: 34, ar: 13.25, nk: 15.5 }, "the measurements are stored under today");
  await page.evaluate(() => { photoSheet(); photosDone(); });
  eq((await getS(page)).photos, { "2026-10-17": 1 }, "the photo day is stamped");
  await page.evaluate(() => goTab("road"));
  ok(!/Measure day|Photo day/i.test(await page.$eval("#view", (e) => e.innerText)), "after both, the tracker stops asking");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};

// ── Model 2 app: the Now card, the Body map, the guided measure day ──
T["now: the Now card walks primers, ramp and single; the rating's preview is the back-off the engine prescribes"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-10-13T07:05:00", state: { ...BASE, seen: { m2: 1 } } });
  const nowText = () => page.$eval(".card.now", (e) => e.innerText);
  ok(/Bench day/i.test(await nowText()) && /Band External Rotation/i.test(await nowText()), "Tuesday opens on the day brief and the first primer");
  for (let i = 0; i < 4; i++) await page.click(".nowcta");
  ok(/Warm-up · 1 of 6/i.test(await nowText()), "after the primers, the warm-up ramp");
  for (let i = 0; i < 6; i++) await page.click(".nowcta");
  ok(/220/.test(await nowText()) && /START/.test(await nowText()), "after the ramp, the 220 single with the meet commands");
  await page.click(".nowcta");
  const easy = await page.$eval(".nowrate .g small", (e) => +e.textContent.match(/\d+/)[0]);
  await page.click(".nowrate .g");
  await page.evaluate(() => nowSkip());
  const big = await page.$eval(".card.now .nowbig", (e) => +e.textContent.match(/\d+/)[0]);
  eq(big, easy, "the back-off weight the Easy button promised is the one the engine now prescribes");
  const s = await getS(page), single = s.logs["2026-10-13"].sets["bn-single"];
  ok(single && single[0].w === 220 && single[0].rate === "E", "the single is logged under its exercise key with the rating");
  eq(s.logs["2026-10-13"].wu, 6, "the warm-up rows are counted");
  ok(/Bench — top single/i.test(await page.$eval("#view", (e) => e.innerText)), "the card list below still shows every block");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};
T["now: the weight and rep steppers change the set that gets logged"] = async (b) => {
  // regression: a double-quoted rep value inside the double-quoted onclick cut the attribute, so the steppers did nothing
  const { ctx, page, errors } = await open(b, { time: "2026-10-13T07:05:00", state: { ...BASE, seen: { m2: 1 } } });
  const tap = (label) => page.evaluate((l) => document.querySelector(`.card.now button[aria-label="${l}"]`).click(), label); // the stepper can sit under the fixed tab bar
  await tap("One rep more");
  ok(/Log Band × 16/.test(await page.$eval(".nowcta", (e) => e.textContent)), "rep + turns the band primer into 16 reps");
  await page.click(".nowcta");
  eq((await getS(page)).logs["2026-10-13"].sets["bander"][0].r, 16, "the 16 is what got logged");
  for (let i = 0; i < 3; i++) await page.click(".nowcta");
  for (let i = 0; i < 6; i++) await page.click(".nowcta");
  await tap("More weight");
  ok(/Log 225 × 1/.test(await page.$eval(".nowcta", (e) => e.textContent)), "weight + turns the 220 single into 225");
  await page.click(".nowcta"); await page.click(".nowrate .y");
  ok(!!(await page.$("#nowring")), "after a set with rest, the card opens on the rest ring at once (it used to show the next set first)");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};
T["saturday: the wide-grip pull-up runs at bodyweight with its ladder; a belt logs as +5"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-10-17T07:05:00", state: { ...BASE, seen: { m2: 1 } } });
  for (let i = 0; i < 80; i++) {
    const t = await page.$eval(".card.now", (e) => e.innerText).catch(() => "");
    if (/Wide-Grip Pull-Up/i.test(t) && (await page.$(".nowcta")) && !(await page.$("#nowring"))) break;
    if (await page.$("#nowring")) { await page.evaluate(() => nowSkip()); continue; }
    if (!(await page.$(".nowcta"))) break;
    await page.click(".nowcta");
  }
  const t = await page.$eval(".card.now", (e) => e.innerText);
  ok(/Wide-Grip Pull-Up/i.test(t) && /BW/.test(await page.$eval(".card.now .nowbig", (e) => e.textContent)), "the Now card reaches the pull-up, at bodyweight");
  ok(/2 sets of 12 this wave/.test(t) && /the ladder climbs/.test(t), "its ladder states the engine's rule: 2 sets at the wave's top target");
  ok(/builds/i.test(t) && /Lats/.test(t), "it says what it builds: the lats");
  await page.evaluate(() => document.querySelector('.card.now button[aria-label="More weight"]').click());
  ok(/Log \+5 × 10/.test(await page.$eval(".nowcta", (e) => e.textContent)), "a belt shows as +5, not 5");
  await page.click(".nowcta");
  const set = (await getS(page)).logs["2026-10-17"].sets["wide-grip-pull-up"][0];
  ok(set.w === 5 && set.r === 10 && set.ed, "logged +5 x 10, and the next set carries it");
  await page.evaluate(() => nowSkip());
  ok(/\+5/.test(await page.$eval(".card.now .nowbig", (e) => e.textContent)), "set 2 carries the +5");
  ok((await page.$$eval("#view .chip.hit", (els) => els.map((e) => e.textContent))).some((x) => /^\+5×10/.test(x)), "the logged chip reads +5×10");
  await page.evaluate(() => goTab("moves"));
  ok(/15\.5/.test(await page.$eval("#view", (e) => e.innerText.match(/Lats\s*\n?\s*[\d.]+/) ? e.innerText.match(/Lats\s*\n?\s*[\d.]+/)[0] : "")), "the Body map counts the lats at 15.5 sets this week");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};
T["body: the map is the engine's week; tapping a muscle shows where its sets come from"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-10-13T07:05:00", state: { ...BASE, seen: { m2: 1 } } });
  await page.evaluate(() => goTab("moves"));
  ok((await page.$$("#view .mus[data-m]")).length > 30, "front and back figures with tappable muscles");
  await page.evaluate(() => document.querySelector('.mus[data-m="upperchest"]').dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const want = await page.evaluate(() => { const loc = E.whereIs(todayUTC(), SHIFT()); const wk = []; for (let d = 1; d <= 7; d++) wk.push(...E.sessionFor(loc.wave, loc.week, d, GX(), S.spec)); return GOALS.muscleSets(wk).upperchest; });
  const t = await page.$eval("#view", (e) => e.innerText);
  ok(/Upper chest/i.test(await page.$eval(".mhead h2", (e) => e.textContent)) && t.includes(String(want)), `upper chest selected, ${want} sets this week as goals.js counts them`);
  ok(/Tue · Incline Bench/.test(t), "its sources list Tuesday's incline");
  await page.evaluate(() => { bodyMode = "today"; render(); });
  ok(/Today · Tue/i.test(await page.$eval("#view", (e) => e.innerText)), "the Today view");
  await page.evaluate(() => { bodyView = "moves"; render(); });
  ok((await page.$$("#view .moverow")).length > 10, "Moves is still one tap away");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};
T["measure: the guided measure day saves weight and tape, and Road draws the frame"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-10-17T07:05:00", state: { ...BASE, seen: { m2: 1 } } });
  await page.evaluate(() => goTab("road"));
  ok(/Add waist, shoulders and flexed arm/.test(await page.$eval("#view", (e) => e.innerText)), "no tape yet: the frame card names what it needs");
  await page.evaluate(() => { measureSheet(); for (const v of ["190.2", "34", "15.5", "13.25", "47", "9"]) { for (const k of v) mdKey(k); mdNext(false); } });
  const s = await getS(page);
  eq([s.bw["2026-10-17"], s.meas["2026-10-17"]], [190.2, { wa: 34, nk: 15.5, ar: 13.25, sh: 47 }], "saved under today; a 9-inch chest is rejected as a slipped digit");
  ok(/17\.2%/.test(await page.$eval("#sheet", (e) => e.innerText)), "the read: 17.2% by the Navy equation");
  await page.evaluate(() => closeSheet());
  ok(!!(await page.$("#framecard svg.frame")), "Road now draws the frame");
  await page.evaluate(() => frameSlide(100));
  ok(/16\.00"/.test(await page.$eval("#frametrio", (e) => e.innerText)) && /1\.50/.test(await page.$eval("#frametrio", (e) => e.innerText)), "slid to the goal: 16\" arms and 1.50");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};

// ═══ AUDIT-2027 ═══
T["audit: the Road card gives the test-day range and the 3/4/5 window"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-11-19T07:05:00", state: { ...BASE, seen: { m2: 1 } } });
  await page.evaluate(() => goTab("road"));
  const t = await page.$eval("#view", (e) => e.innerText);
  ok(/Test day, Wave 12 \(Jun 18, 2027\): bench 277\.5–295 · squat 340–375 · deadlift 430–465\./.test(t), "the Wave 12 test day shows the small-step to all-clean range");
  ok(/All three reach 315 · 405 · 495 between Sep 2027 \(every gate clean\) and Jul 2028 \(small steps\)/.test(t), "the 3/4/5 window is stated with both ends");
  await page.evaluate(() => goTab("more"));
  await page.fill("#meetdate", "2027-07-10"); await page.$eval("#meetdate", (e) => e.dispatchEvent(new Event("change")));
  await page.evaluate(() => goTab("road"));
  ok(/Meet day \(Jul 10, 2027\): bench 277\.5–295/.test(await page.$eval("#view", (e) => e.innerText)), "with a meet date the line reads Meet day on that date");
  const errs = errors.filter((e) => !/^dialog: Line the Wave 12 test up/.test(e)); // the meet date asks before it shifts the calendar
  ok(!errs.length, "no page errors " + errs.join(" | "));
  await ctx.close();
};
T["audit: a refused save is said out loud, with a backup button, and clears when saving works"] = async (b) => {
  const { ctx, page, errors } = await open(b, { time: "2026-11-19T07:05:00", state: { ...BASE, seen: { m2: 1 } } });
  ok(!(await page.$('#view [role="alert"]')), "no warning while saves work");
  await page.evaluate(() => { window.__set = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException("full", "QuotaExceededError"); }; });
  await (await page.$("#view .setrow .chip")).click();
  const warn = await page.$eval('#view [role="alert"]', (e) => e.innerText).catch(() => "");
  ok(/not saved/i.test(warn) && /back up now/i.test(warn), "a refused save shows the Not saved card with Back up now: " + warn.slice(0, 60));
  await page.evaluate(() => { Storage.prototype.setItem = window.__set; });
  await (await page.$$("#view .setrow .chip"))[1].click();
  ok(!(await page.$('#view [role="alert"]')), "the warning clears once a save goes through");
  ok(Object.keys((await getS(page)).logs).length === 1, "and the set is stored");
  ok(!errors.length, "no page errors " + errors.join(" | "));
  await ctx.close();
};

(async () => {
  const browser = await pw.chromium.launch();
  const only = process.argv[2];
  try { for (const [name, fn] of Object.entries(T)) if (!only || name.includes(only)) { try { await fn(browser); } catch (e) { fail++; console.log("FAIL (threw)", name, String(e).split("\n")[0]); } } }
  finally { await browser.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
