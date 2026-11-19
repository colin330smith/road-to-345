// Shared helpers for the UI-domain repro scripts (audit-2027/eng/ui.md).
// Usage: node <script>.js            -> runs against the repo's built road-to-345.html (read-only)
//        APP=/path/to/road-to-345.html node <script>.js   -> runs against a patched build
const path = require("path");
const pw = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright");
const APP = process.env.APP || path.resolve(__dirname, "../../../../road-to-345.html");
const URL = "file://" + APP;
const BASE = { logs: {}, gates: {}, bw: {}, testMax: {}, settings: { offsetWeeks: 0 }, v32: 1, lastBackup: "2026-11-15", seen: { m2: 1, home65: 1 }, nutri: { mode: "maintain", since: "2026-11-01" } };
// open the app at a fake local time (America/New_York) with a seeded state, iPhone-sized
async function open(browser, { time = "2026-11-19T07:05:00", state, width = 390, height = 844, init, acceptDialogs = true, hasTouch = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 3, timezoneId: "America/New_York", hasTouch });
  const page = await ctx.newPage();
  const errors = [], dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("dialog", async (d) => { dialogs.push(d.type() + ": " + d.message()); if (acceptDialogs) await d.accept(); else await d.dismiss(); });
  if (time) await page.clock.install({ time: new Date(time) });
  if (state) await page.addInitScript((s) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("r345.v1", typeof s === "string" ? s : JSON.stringify(s)); sessionStorage.setItem("seeded", "1"); } }, state);
  if (init) await page.addInitScript(init);
  await page.goto(URL);
  return { ctx, page, errors, dialogs };
}
const getS = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("r345.v1")));
let pass = 0, fail = 0;
// "BUG" lines are the defect being demonstrated; the script exits 1 when at least one defect reproduces
const bug = (cond, label) => { if (cond) { fail++; console.log("BUG REPRODUCED:", label); } else { pass++; console.log("ok (not reproduced):", label); } };
const info = (...a) => console.log("   ", ...a);
async function run(fn) {
  const browser = await pw.chromium.launch();
  try { await fn(browser); } finally { await browser.close(); }
  console.log(`\n${fail} defect(s) reproduced, ${pass} check(s) clean  [${APP}]`);
  process.exit(fail ? 1 : 0);
}
module.exports = { pw, open, getS, BASE, bug, info, run, APP };
