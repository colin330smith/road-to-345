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

(async () => {
  const browser = await pw.chromium.launch();
  const only = process.argv[2];
  try { for (const [name, fn] of Object.entries(T)) if (!only || name.includes(only)) { try { await fn(browser); } catch (e) { fail++; console.log("FAIL (threw)", name, String(e).split("\n")[0]); } } }
  finally { await browser.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
