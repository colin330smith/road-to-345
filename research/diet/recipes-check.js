#!/usr/bin/env node
// recipes-check.js — recomputes every recipe in recipes.js from foods.json (and foods-extra.json for saturated
// fat and sodium), prints per-portion kcal / protein / fat / carbs / fibre in each size, and asserts:
//   1. every food, alt and unit exists in foods.json (ml only for the per-100-ml foods);
//   2. batch = portions × (portion + sauce) within 2%, food by food, after converting the batch's weighing state
//      to the portion's state with the foods.json yield (and the kcal agree within 2% the same way);
//   3. sizes change only starch and added fat: never a protein-group food, each key matching exactly one item;
//   4. protein per portion: lunch/dinner 45-60 g in every size, breakfast 40-60 g, snacks 20 g or more.
// Per-portion numbers are batch ÷ portions (the batch method: weigh raw or dry, cook, split the cooked weight by N).
// The "table" column is the fallback a cooked portion would log with USDA's cooked values instead.
// usage: node recipes-check.js [--recipes other.js] [--json recipes-macros.json]   (exit code 1 if any assertion fails)
const fs = require('fs');
const path = require('path');
const here = __dirname;
const FOODS = new Map(JSON.parse(fs.readFileSync(path.join(here, 'foods.json'), 'utf8')).map((f) => [f.id, f]));
const EXTRA = fs.existsSync(path.join(here, 'foods-extra.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'foods-extra.json'), 'utf8')).foods : null;
const COSTCO = JSON.parse(fs.readFileSync(path.join(here, 'costco.json'), 'utf8'));
const CPROD = new Map([...COSTCO.products, ...(COSTCO.supplements.certifiedAtCostco || [])].map((p) => [p.id, p]));
const argAt = process.argv.indexOf('--recipes');
const { RECIPES } = require(argAt > 0 ? path.resolve(process.argv[argAt + 1]) : path.join(here, 'recipes.js'));

const KEYS = ['kcal', 'p', 'f', 'c', 'fib', 'sfa', 'na'];
const fails = [];
const fail = (r, msg) => fails.push(`${r}: ${msg}`);
const fmt = (x, d = 1) => (x == null ? '-' : x.toFixed(d));
const pct = (a, b) => (b === 0 ? (a === 0 ? 0 : Infinity) : (a / b - 1) * 100);
const noSfa = new Set();

function food(id) { const f = FOODS.get(id); if (!f) throw new Error('unknown food ' + id); return f; }
function yieldOf(f) { return f.yield ? (f.yield.cookedOverRaw ?? f.yield.cookedOverDry) : null; }
const amount = (it) => (it.ml != null ? it.ml : it.g);

// values per 1 g (or 1 ml) of a food in a state, straight from the table
function per1(it, state = it.state) {
  const f = food(it.food);
  let v, e;
  const ex = EXTRA && EXTRA[f.id];
  if (it.alt) {
    if (!f.alt || !f.alt[it.alt]) throw new Error(`${f.id} has no alt ${it.alt}`);
    v = f.alt[it.alt].per100; e = ex && ex.alt && ex.alt[it.alt];
  } else if (it.drained && state === 'raw') {
    // ground beef: rendered fat stays in the pan. USDA cooked (drained) values × cooked/raw yield, per raw gram
    const y = f.yield.cookedOverRaw;
    v = Object.fromEntries(Object.entries(f.per100).map(([k, x]) => [k, x == null ? null : x * y]));
    e = ex && ex.per100 && { sfa: ex.per100.sfa == null ? null : ex.per100.sfa * y, na: ex.per100.na == null ? null : ex.per100.na * y };
  } else if (state === f.state) { v = f.per100; e = ex && ex.per100; }
  else if (state === 'raw' && f.raw) { v = f.raw.per100; e = ex && ex.raw; }
  else if (state === 'dry' && f.dry) { v = f.dry.per100; e = ex && ex.dry; }
  else if (state === 'cooked' && f.cooked) { v = f.cooked.per100; e = ex && ex.cooked; }
  else throw new Error(`${f.id}: no values for state "${state}"`);
  const o = {};
  for (const k of ['kcal', 'p', 'f', 'c', 'fib']) o[k] = (v[k] || 0) / 100;
  if (e && e.sfa == null) noSfa.add(f.id);
  o.sfa = e && e.sfa != null ? e.sfa / 100 : 0;
  o.na = e && e.na != null ? e.na / 100 : 0;
  return o;
}
// grams in state `from` → grams in state `to` for a food (yields from foods.json)
function convert(id, from, to, g) {
  if (from === to) return g;
  const f = food(id), y = yieldOf(f);
  if (!y) throw new Error(`${id}: no yield to convert ${from} → ${to}`);
  if (from === 'raw' && to === 'cooked' && f.yield.cookedOverRaw) return g * y;
  if (from === 'dry' && to === 'cooked' && f.yield.cookedOverDry) return g * y;
  if (from === 'cooked' && to === 'raw' && f.yield.cookedOverRaw) return g / y;
  if (from === 'cooked' && to === 'dry' && f.yield.cookedOverDry) return g / y;
  throw new Error(`${id}: cannot convert ${from} → ${to}`);
}
function add(t, v, q) { for (const k of KEYS) t[k] += v[k] * q; }
const zero = () => Object.fromEntries(KEYS.map((k) => [k, 0]));

// state of a food's portion/sauce lines (sauce lines are in the food's own state)
function lines(r) {
  return [...r.portion.map((it) => ({ ...it, _w: 'portion' })), ...r.sauce.map((it) => ({ ...it, state: food(it.food).state, _w: 'sauce' }))];
}
function linesForSize(r, size) {
  const m = (r.sizes && r.sizes[size]) || {};
  return lines(r).map((it) => (m[it.food] != null ? { ...it, [it.ml != null ? 'ml' : 'g']: m[it.food] } : it));
}

function checkRecipe(r) {
  const N = r.portions;
  // 1. foods, alts, units
  for (const it of [...r.batch, ...r.portion, ...r.sauce]) {
    const f = FOODS.get(it.food);
    if (!f) { fail(r.id, `unknown food ${it.food}`); continue; }
    if (it.alt && !(f.alt && f.alt[it.alt])) fail(r.id, `${it.food} has no alt ${it.alt}`);
    const perMl = f.per === '100 ml';
    if (perMl && it.ml == null) fail(r.id, `${it.food} is per 100 ml: give ml`);
    if (!perMl && it.ml != null) fail(r.id, `${it.food} is per 100 g: give g`);
  }
  // 2. mass: batch (converted to the portion state) vs N × (portion + sauce), food by food
  const want = new Map(); // food -> {state, amt}
  for (const it of lines(r)) {
    const w = want.get(it.food) || { state: it.state, amt: 0 };
    if (w.state !== it.state) fail(r.id, `${it.food} appears in two states (${w.state}, ${it.state})`);
    w.amt += amount(it) * N; want.set(it.food, w);
  }
  const have = new Map();
  for (const it of r.batch) {
    const w = want.get(it.food);
    if (!w) { fail(r.id, `batch has ${it.food}, no portion or sauce does`); continue; }
    have.set(it.food, (have.get(it.food) || 0) + convert(it.food, it.state, w.state, amount(it)));
  }
  let worst = { id: null, d: 0 };
  for (const [id, w] of want) {
    const h = have.get(id) || 0, d = pct(h, w.amt);
    if (Math.abs(d) > Math.abs(worst.d)) worst = { id, d };
    if (!(Math.abs(d) <= 2)) fail(r.id, `${id}: batch ${h.toFixed(1)} vs ${N} × portion ${w.amt.toFixed(1)} (${d.toFixed(2)}%)`);
  }
  // sizes: one item per key, never protein
  const sizes = ['trim', 'maintain', 'gain'].filter((s) => s === 'maintain' || (r.sizes && r.sizes[s]));
  for (const s of Object.keys(r.sizes || {})) {
    if (!['trim', 'gain'].includes(s)) fail(r.id, `unknown size ${s}`);
    for (const id of Object.keys(r.sizes[s])) {
      const n = lines(r).filter((it) => it.food === id).length;
      if (n !== 1) fail(r.id, `size key ${id} matches ${n} lines (needs exactly 1)`);
      if (food(id).group === 'protein') fail(r.id, `size ${s} changes a protein food (${id})`);
    }
  }
  // per-portion values for each size: batch_s ÷ N (primary) and the cooked-table fallback
  const rows = {};
  for (const s of sizes) {
    const L = linesForSize(r, s);
    const sumBy = (arr) => { const m = new Map(); for (const it of arr) m.set(it.food, (m.get(it.food) || 0) + amount(it)); return m; };
    const base = sumBy(lines(r)), now = sumBy(L);
    const prim = zero();
    for (const it of r.batch) { const k = now.get(it.food) / base.get(it.food); add(prim, per1(it), amount(it) * k / N); }
    const table = zero();
    for (const it of L) add(table, per1(it), amount(it));
    rows[s] = { prim, table };
  }
  // kcal agreement between batch ÷ N and the portion list valued the batch way (mass check, in calories)
  const m = rows.maintain;
  const viaPortion = zero();
  for (const it of lines(r)) {
    // value each portion line with the batch's own state: convert grams back to the batch state of that food
    const b = r.batch.find((x) => x.food === it.food);
    add(viaPortion, per1({ ...b }), convert(it.food, it.state, b.state, amount(it)));
  }
  const dk = pct(viaPortion.kcal, m.prim.kcal);
  if (!(Math.abs(dk) <= 2)) fail(r.id, `kcal: batch ÷ ${N} = ${m.prim.kcal.toFixed(0)} vs portion list ${viaPortion.kcal.toFixed(0)} (${dk.toFixed(2)}%)`);
  // food-safety rules from food-safety.md: rare ahi is never packed; cooked seafood is eaten the day it is cooked
  // or the next, so a seafood batch is 2 portions at most; a batch recipe makes at least 2
  const foodsIn = new Set(r.batch.map((x) => x.food));
  if (foodsIn.has('ahi') && r.slots.includes('shiftDinner')) fail(r.id, 'seared ahi is never packed: remove shiftDinner');
  if (['sockeye', 'salmonAtlantic', 'shrimp', 'ahi'].some((x) => foodsIn.has(x)) && N > 2) fail(r.id, `seafood batch of ${N}: the seafood rule allows 2 (day cooked + next day)`);
  if (r.kind === 'batch' && N < 2) fail(r.id, 'a batch recipe makes at least 2 portions');
  const SLOTS = ['breakfast', 'lunch', 'shiftDinner', 'homeDinner', 'snack', 'preLift'];
  for (const s of r.slots) if (!SLOTS.includes(s)) fail(r.id, `unknown slot ${s}`);
  // protein ranges
  const isMain = r.slots.some((x) => ['lunch', 'shiftDinner', 'homeDinner'].includes(x));
  const lo = isMain ? 45 : r.slots.includes('breakfast') ? 40 : 20, hi = isMain || r.slots.includes('breakfast') ? 60 : Infinity;
  for (const s of sizes) { const p = rows[s].prim.p; if (p < lo || p > hi) fail(r.id, `${s}: protein ${p.toFixed(1)} g outside ${lo}-${hi === Infinity ? '∞' : hi}`); }
  return { rows, worst, dk, sizes, isMain };
}

function costcoLine(r) {
  const at = [], elsewhere = [];
  const seen = new Set();
  for (const it of r.batch) {
    if (seen.has(it.food)) continue; seen.add(it.food);
    const f = food(it.food);
    if (f.id === 'water') continue;
    const id = it.buy || (f.costcoIds || [])[0];
    const p = id && CPROD.get(id);
    if (p && p.confidence !== 'unverified') at.push(`${it.food}${p.confidence === 'likely' ? ' (likely)' : ''}`);
    else elsewhere.push(`${it.food} → ${p ? (p.alt || 'alt store').split(/[:(]/)[0].trim() : /label present in FDC/.test(f.costco || '') ? 'Kirkland label in FDC, not in the catalog' : /^Not in costco\.json; buy at /.test(f.costco || '') ? f.costco.replace(/^Not in costco\.json; buy at /, '').split(/[(.]/)[0].trim() : 'not in the catalog'}`);
  }
  return { at, elsewhere };
}

// ───────────── run ─────────────
const OUT = [];
const print = (s = '') => OUT.push(s);
const results = {};
print(`recipes-check · ${RECIPES.length} recipes · foods.json ${FOODS.size} foods${EXTRA ? ' · saturated fat and sodium from foods-extra.json' : ''}`);
print('Per portion = batch ÷ portions (weigh the raw/dry batch, cook, split each cooked component by N). "table" = the same portion logged with USDA cooked values instead.');
for (const r of RECIPES) {
  let res;
  try { res = checkRecipe(r); } catch (e) { fail(r.id, e.message); continue; }
  results[r.id] = res;
  print('');
  print(`■ ${r.id} · ${r.name}`);
  print(`  ${r.portions} portion${r.portions > 1 ? 's' : ''} · ${r.slots.join(', ')} · ${r.prepMin} min (${r.activeMin} active${r.ahead ? '; ' + r.ahead : ''})`);
  print(`  size        kcal      P      F      C    fib   satF     Na │ table kcal`);
  for (const s of res.sizes) {
    const { prim: t, table } = res.rows[s];
    print(`  ${s.padEnd(9)} ${fmt(t.kcal, 0).padStart(6)} ${fmt(t.p).padStart(6)} ${fmt(t.f).padStart(6)} ${fmt(t.c).padStart(6)} ${fmt(t.fib).padStart(6)} ${fmt(t.sfa).padStart(6)} ${fmt(t.na, 0).padStart(6)} │ ${fmt(table.kcal, 0).padStart(5)} (${pct(table.kcal, t.kcal) >= 0 ? '+' : ''}${pct(table.kcal, t.kcal).toFixed(1)}%)`);
  }
  const wo = r.portion.filter((x) => !x.share).map((x) => `${x.food}${x.alt ? '/' + x.alt : ''} ${x.g ?? x.ml}${x.ml != null ? ' ml' : ' g'} ${x.state === 'as sold' ? '' : x.state}`.trim());
  const sh = r.portion.filter((x) => x.share).map((x) => `${x.food} ${x.g ?? x.ml}${x.ml != null ? ' ml' : ''}`);
  const cups = {};
  for (const x of r.sauce) { const c = x.cup || 'sauce'; cups[c] = (cups[c] || 0) + amount(x); }
  print(`  weigh-out: ${wo.join(' · ')}${sh.length ? ` | share of the pan: ${sh.join(', ')}` : ''}${r.sauce.length ? ` | cups: ${Object.entries(cups).map(([c, g]) => `${c} ${g.toFixed(1).replace(/\.0$/, '')}`).join(', ')}` : ''}`);
  if (r.sizes) print(`  sizes: ${Object.entries(r.sizes).map(([s, mm]) => `${s} ${Object.entries(mm).map(([k, v]) => `${k} ${v}`).join(', ')}`).join(' · ')}`);
  const bt = r.batch.map((x) => `${x.food}${x.alt ? '/' + x.alt : ''} ${x.state === 'as sold' ? '' : x.state + ' '}${x.g ?? x.ml + ' ml'}`.replace(/  +/g, ' '));
  print(`  batch (maintain): ${bt.join(', ')}`);
  if (r.sizes && r.portions > 1) {
    const bs = [];
    for (const [s, mm] of Object.entries(r.sizes)) {
      const parts = [];
      for (const [id, v] of Object.entries(mm)) {
        const ln = lines(r).find((x) => x.food === id), b = r.batch.find((x) => x.food === id);
        parts.push(`${id} ${b.state === 'as sold' ? '' : b.state + ' '}${Math.round(convert(id, ln.state, b.state, v * r.portions) * 10) / 10}`);
      }
      bs.push(`${s}: ${parts.join(', ')}`);
    }
    print(`  batch by size: ${bs.join(' · ')}`);
  }
  const ps = res.sizes.map((s) => res.rows[s].prim.p);
  print(`  checks: batch = ${r.portions} × portion ${res.worst.id ? `within ${Math.abs(res.worst.d).toFixed(2)}% (worst ${res.worst.id})` : 'exact'} · kcal batch÷N vs portion ${res.dk.toFixed(2)}% · protein ${Math.min(...ps).toFixed(1)}-${Math.max(...ps).toFixed(1)} g · keeps: ${r.keeps.split('.')[0]}`);
  const cl = costcoLine(r);
  print(`  buy: ${cl.at.length} at Costco${cl.elsewhere.length ? ` · not confirmed at Costco: ${cl.elsewhere.join('; ')}` : ''}`);
}

// ───────────── summary and illustrative days ─────────────
print('');
print('SUMMARY (kcal / protein g per portion: trim · maintain · gain)');
for (const r of RECIPES) {
  const res = results[r.id]; if (!res) continue;
  print(`  ${r.id.padEnd(17)} ${r.kind.padEnd(9)} ${res.sizes.map((s) => `${fmt(res.rows[s].prim.kcal, 0).padStart(4)}/${fmt(res.rows[s].prim.p, 0)}`).join('  ')}`);
}
const MODES = { trim: 2500, maintain: 2775, gain: 3050 };
const DAYS = {
  'shift day (packed lunch + shift dinner)': ['wheyShake', 'bircherBowl', 'hawaiianSirloin', 'cottagePineapple', 'thaiSteakNoodle'],
  'off night (home plate)': ['wheyShake', 'steakEggs', 'roastChicken', 'yogurtBerries', 'filetPlate'],
  'Wednesday cook, seafood': ['wheyShake', 'bircherBowl', 'salmonWildRice', 'yogurtBerries', 'frenchDip'],
};
print('');
print('ILLUSTRATIVE DAYS (not the plan, just a fit test: pre-lift shake + breakfast + lunch + snack + dinner, same size all day)');
print('  targets: TRIM 2,500 · MAINTAIN 2,775 (provisional, the GAIN-TRIM midpoint) · GAIN 3,050 · fibre 14 g per 1,000 kcal · sat fat ≤ 10% of kcal · sodium line 2,300 mg');
for (const [label, ids] of Object.entries(DAYS)) {
  for (const [s, target] of Object.entries(MODES)) {
    const t = zero();
    for (const id of ids) { const res = results[id]; if (!res) continue; const row = res.rows[s] || res.rows.maintain; add(t, row.prim, 1); }
    print(`  ${label.padEnd(40)} ${s.padEnd(8)} ${fmt(t.kcal, 0).padStart(5)} kcal (${t.kcal - target >= 0 ? '+' : ''}${(t.kcal - target).toFixed(0)}) · P ${fmt(t.p, 0)} F ${fmt(t.f, 0)} C ${fmt(t.c, 0)} · fib ${fmt(t.fib, 0)}/${(target * 14 / 1000).toFixed(0)} · satF ${fmt(t.sfa, 0)}/${(target * 0.1 / 9).toFixed(0)} · Na ${fmt(t.na, 0)}`);
  }
}
if (noSfa.size) print(`\nnote: no saturated-fat value in FDC for ${[...noSfa].sort().join(', ')} (all under 1 g fat per portion here); counted as 0.`);
// optional: write the computed per-portion table (the numbers a one-tap log would use)
const jsonAt = process.argv.indexOf('--json');
if (jsonAt > 0 && !fails.length) {
  const tbl = {};
  for (const r of RECIPES) {
    const res = results[r.id]; if (!res) continue;
    tbl[r.id] = { name: r.name, kind: r.kind, slots: r.slots, portions: r.portions, perPortion: {} };
    for (const s of res.sizes) {
      const t = res.rows[s].prim;
      tbl[r.id].perPortion[s] = { kcal: Math.round(t.kcal), p: +t.p.toFixed(1), f: +t.f.toFixed(1), c: +t.c.toFixed(1), fib: +t.fib.toFixed(1), sfa: +t.sfa.toFixed(1), na: Math.round(t.na) };
    }
  }
  fs.writeFileSync(path.resolve(process.argv[jsonAt + 1]), JSON.stringify({
    meta: { built: 'node recipes-check.js --json', basis: 'batch ÷ portions from foods.json (saturated fat and sodium from foods-extra.json); sizes absent from a recipe use maintain' },
    recipes: tbl,
  }, null, 2) + '\n');
  print(`wrote ${process.argv[jsonAt + 1]}`);
}
print('');
if (fails.length) { print(`FAILED ${fails.length}:`); for (const f of fails) print('  ✗ ' + f); }
else print(`ALL CHECKS PASSED: ${RECIPES.length} recipes · batch = portions × portion within 2% · sizes never touch protein · protein in range in every size.`);
console.log(OUT.join('\n'));
process.exit(fails.length ? 1 : 0);
