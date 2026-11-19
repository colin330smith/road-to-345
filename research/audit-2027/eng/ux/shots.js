// Screenshots of every main screen and sheet at 390x844@3x and 320x568@2x, from one seeded state.
//   node shots.js            (all)        node shots.js today      (names containing "today")
const { pw, OUT, open, loadSeed, folds, sheetFolds, fs, path } = require("./lib");
const only = process.argv[2];
const SIZES = [{ tag: "390", width: 390, height: 844, dsf: 3 }, { tag: "320", width: 320, height: 568, dsf: 2 }];
const report = {};

// log today's session up to (but not including) the n-th loggable set, through the app's own handlers
async function logSets(page, n, { rate = "O" } = {}) {
  await page.evaluate(({ n, rate }) => {
    const dk = keyOf(viewDate);
    wuSkip(dk, 99);
    for (let k = 0; k < n; k++) {
      // the Now card decides what is next: press its button, answer its rating prompt, skip its rest
      const rateBtn = document.querySelector(`.card.now .nowrate button.${rate === "E" ? "g" : rate === "O" ? "y" : "r"}`);
      if (rateBtn) { rateBtn.click(); k--; continue; }
      if (document.getElementById("nowring")) { nowSkip(); k--; continue; }
      const cta = document.querySelector(".card.now .nowcta"); if (!cta) break;
      cta.click();
    }
  }, { n, rate });
}

const SCENES = {
  // ── Today ──
  "today-fresh": { time: "2026-11-19T07:02:00", run: async (p) => {} },
  "today-mid-next": { time: "2026-11-19T07:31:00", run: async (p) => { await logSets(p, 7); await p.evaluate(() => { if (document.getElementById("nowring")) nowSkip(); }); } },
  "today-mid-rest": { time: "2026-11-19T07:31:00", run: async (p) => { await logSets(p, 7); await p.evaluate(() => { if (!document.getElementById("nowring")) { const c = document.querySelector(".card.now .nowcta"); if (c) c.click(); } }); await p.clock.runFor(41000); } },
  "today-rate-single": { time: "2026-11-20T07:20:00", run: async (p) => { await p.evaluate(() => { wuSkip(keyOf(viewDate), 99); document.querySelector(".card.now .nowcta").click(); }); } },
  "today-done": { time: "2026-11-19T08:21:00", run: async (p) => { await logSets(p, 60); } },
  "today-deload": { time: "2026-12-01T07:02:00", run: async (p) => {} },
  "today-sunday": { time: "2026-11-22T09:02:00", run: async (p) => {} },
  "today-testday": { time: "2027-01-01T07:02:00", run: async (p) => {} },
  "today-fuel-half": { time: "2026-11-19T14:10:00", run: async (p) => { await logSets(p, 60); await p.evaluate(() => { const dk = keyOf(viewDate); const it = planFor(dk).items; it.slice(0, Math.ceil(it.length / 2)).forEach((x) => planTick(dk, x.slot)); document.querySelector(".srow").scrollIntoView({ block: "start" }); window.scrollBy(0, -110); }); }, noFolds: true },
  // ── tabs ──
  "road": { time: "2026-11-19T12:00:00", run: async (p) => { await p.evaluate(() => { tab = "road"; render(); window.scrollTo(0, 0); }); } },
  "road-landing": { time: "2026-11-19T12:00:00", run: async (p) => { await p.evaluate(() => goTab("road")); await p.waitForTimeout(700); }, noFolds: true },
  "body": { time: "2026-11-19T12:00:00", run: async (p) => { await p.evaluate(() => goTab("moves")); } },
  "trends": { time: "2026-11-19T12:00:00", run: async (p) => { await p.evaluate(() => goTab("trends")); }, max: 9 },
  "more": { time: "2026-11-19T12:00:00", run: async (p) => { await p.evaluate(() => goTab("more")); }, max: 8 },
  // ── sheets ──
  "sheet-gate": { time: "2026-11-19T12:00:00", sheet: true, run: async (p) => { await p.evaluate(() => { goTab("road"); gateSheet(6); }); } },
  "sheet-wave": { time: "2026-11-19T12:00:00", sheet: true, run: async (p) => { await p.evaluate(() => { goTab("road"); waveSheet(5); }); } },
  "sheet-swap": { time: "2026-11-19T07:02:00", sheet: true, run: async (p) => { await p.evaluate(() => { const b = document.querySelector('#view .ibtn[aria-label="Swap exercise"]'); if (b) b.click(); }); } },
  "sheet-editset": { time: "2026-11-19T07:31:00", sheet: true, run: async (p) => { await logSets(p, 3); await p.evaluate(() => { stopTimer(); document.querySelector("#view .chip.hit").click(); }); } },
  "sheet-move": { time: "2026-11-19T07:02:00", sheet: true, run: async (p) => { await p.evaluate(() => { const b = document.querySelector('#view .ibtn[aria-label="How to"]'); if (b) b.click(); }); } },
  "sheet-timer": { time: "2026-11-19T07:02:00", sheet: true, run: async (p) => { await p.click("#timer"); } },
  "sheet-food": { time: "2026-11-19T12:00:00", sheet: true, run: async (p) => { await p.evaluate(() => foodSheet(keyOf(viewDate))); } },
  "sheet-food-swap": { time: "2026-11-19T12:00:00", sheet: true, run: async (p) => { await p.evaluate(() => { const dk = keyOf(viewDate); foodSheet(dk, planFor(dk).items[1].slot); }); } },
  "sheet-recipes": { time: "2026-11-19T12:00:00", sheet: true, run: async (p) => { await p.evaluate(() => recipeSheet()); } },
  "sheet-recipe-detail": { time: "2026-11-19T12:00:00", sheet: true, run: async (p) => { await p.evaluate(() => recipeDetail(NUTRI.RECIPES.find((r) => r.kind === "batch").id)); }, max: 5 },
  "sheet-prep": { time: "2026-11-19T12:00:00", sheet: true, run: async (p) => { await p.evaluate(() => prepSheet(0)); }, max: 6 },
  "sheet-rules": { time: "2026-11-19T12:00:00", sheet: true, run: async (p) => { await p.evaluate(() => rulesSheet()); }, max: 5 },
  "sheet-supps": { time: "2026-11-19T12:00:00", sheet: true, run: async (p) => { await p.evaluate(() => suppSheet()); }, max: 5 },
  "sheet-measure": { time: "2026-11-21T09:00:00", sheet: true, run: async (p) => { await p.evaluate(() => measureSheet()); } },
  "sheet-photo": { time: "2026-11-21T09:00:00", sheet: true, run: async (p) => { await p.evaluate(() => photoSheet()); } },
  "sheet-whatsnew": { time: "2026-11-19T12:00:00", sheet: true, run: async (p) => { await p.evaluate(() => whatsNew()); }, max: 5 },
  "sheet-programrules": { time: "2026-11-19T12:00:00", sheet: true, run: async (p) => { await p.click("#rulesbtn"); }, max: 6 },
  "sheet-spec": { time: "2026-11-21T07:00:00", sheet: true, run: async (p) => { await p.evaluate(() => specSheet()); } },
};

(async () => {
  const browser = await pw.chromium.launch();
  const seed = await loadSeed(browser);
  for (const sz of SIZES) {
    for (const [name, sc] of Object.entries(SCENES)) {
      if (only && !name.includes(only)) continue;
      const { ctx, page, errors } = await open(browser, { time: sc.time, state: seed, width: sz.width, height: sz.height, dsf: sz.dsf });
      const dir = path.join(OUT, sz.tag);
      try {
        await sc.run(page);
        await page.waitForTimeout(120);
        let r;
        if (sc.sheet) {
          const openNow = await page.evaluate(() => document.getElementById("modal").classList.contains("open"));
          if (!openNow) { report[`${sz.tag}/${name}`] = { error: "sheet did not open" }; await ctx.close(); continue; }
          r = await sheetFolds(page, name, { max: sc.max || 3, dir });
          const m = await page.evaluate(() => { const s = document.getElementById("sheet"); return { overflowX: s.scrollWidth - s.clientWidth, words: s.innerText.split(/\s+/).filter(Boolean).length }; });
          Object.assign(r, m);
        } else if (sc.noFolds) {
          fs.mkdirSync(dir, { recursive: true });
          const f = path.join(dir, `${name}-1.png`); await page.screenshot({ path: f }); r = { files: [f] };
        } else {
          r = await folds(page, name, { max: sc.max || 6, dir });
          const m = await page.evaluate(() => ({ overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, words: document.getElementById("view").innerText.split(/\s+/).filter(Boolean).length }));
          Object.assign(r, m);
        }
        r.files = r.files.map((f) => path.relative(OUT, f)); if (errors.length) r.errors = errors;
        report[`${sz.tag}/${name}`] = r;
      } catch (e) { report[`${sz.tag}/${name}`] = { error: String(e).slice(0, 300) }; }
      await ctx.close();
    }
  }
  await browser.close();
  const prev = fs.existsSync(path.join(OUT, "index.json")) ? JSON.parse(fs.readFileSync(path.join(OUT, "index.json"), "utf8")) : {};
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ ...prev, ...report }, null, 1));
  for (const [k, v] of Object.entries(report)) console.log(k, JSON.stringify({ ...v, files: v.files ? v.files.length : 0 }));
})();
