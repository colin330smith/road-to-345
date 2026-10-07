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

(async () => {
  const browser = await pw.chromium.launch();
  const only = process.argv[2];
  try { for (const [name, fn] of Object.entries(T)) if (!only || name.includes(only)) { try { await fn(browser); } catch (e) { fail++; console.log("FAIL (threw)", name, String(e).split("\n")[0]); } } }
  finally { await browser.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
