// Port the research tables (foods.json, costco.json, recipes.js) into nutrition.js's HOME-DATA block.
// Usage, from the repo root: node research/diet/port.js   (rewrites the block in place; then run the tests)
const D = __dirname + '/';
const F = require(D + 'foods.json'), L = Array.isArray(F) ? F : F.foods, byId = Object.fromEntries(L.map((f) => [f.id, f]));
const C = require(D + 'costco.json').products, cby = Object.fromEntries(C.map((c) => [c.id, c]));
const R = require(D + 'recipes.js').RECIPES;
const J = (x) => JSON.stringify(x);
const r1 = (x) => Math.round(x * 10) / 10;

// per-100 values for a food in a state (and alt)
function per(food, state, alt) {
  const f = byId[food]; if (!f) throw new Error('no food ' + food);
  let v, src = f.src;
  if (alt) { if (!f.alt || !f.alt[alt]) throw new Error(`no alt ${food}/${alt}`); v = f.alt[alt].per100; src = f.alt[alt].src || src; }
  else if (!state || state === f.state) v = f.per100;
  else if (state === 'raw' && f.raw) { v = f.raw.per100; src = f.raw.src || src; }
  else if (state === 'dry' && f.dry) { v = f.dry.per100; src = f.dry.src || src; }
  else throw new Error(`${food}: no state ${state}`);
  const fdc = String(src || '').match(/FDC (\d+)/);
  return { v: [v.kcal, v.p, v.f, v.c, v.fib || 0].map(r1), src: fdc ? 'FDC ' + fdc[1] : (/label/i.test(String(src)) ? 'label' : 'see foods table') };
}
const key = (it) => `${it.food}${it.alt ? '/' + it.alt : ''}:${it.state || byId[it.food].state}`;

const FOOD = {};
for (const r of R) for (const it of [...r.portion, ...(r.sauce || [])]) {
  const k = key(it); if (FOOD[k]) continue;
  FOOD[k] = per(it.food, it.state, it.alt);
}
// grocery info per food id (from costco.json via foods.json costcoIds)
const sec = { meat: 'Meat', seafood: 'Seafood', frozen: 'Frozen', produce: 'Produce', dairy: 'Dairy & eggs', pantry: 'Pantry', bakery: 'Bakery' };
const GROC = {};
const used = new Set(); for (const r of R) for (const it of r.batch) used.add(it.food);
for (const id of used) {
  const f = byId[id], ids = f.costcoIds || [], c = ids.map((i) => cby[i]).find(Boolean);
  const short = f.name.split(/ — | \(|, (?=raw|cooked|dry)/)[0];
  const item = c ? c.item : null, pub = /Publix/.test(c ? c.pack + ' ' + (c.alt || '') : '') || /Publix/.test(String(f.costco || ''));
  const conf = c ? c.confidence : null;
  GROC[id] = [short, sec[c ? c.section : f.group === 'protein' ? 'meat' : 'pantry'] || 'Pantry', item && conf !== 'unverified' && !/\(Publix\)/.test(c.pack) ? item : null, c && Number.isFinite(+c.usableG) && +c.usableG > 0 ? +c.usableG : null, c ? c.pack : null];
}
// hand-checked overrides where the catalogue's names or sections do not fit the list
const FIX = {
  wheyAscent: ['Whey (Ascent 100% Whey, Informed Sport)', 'Supplements', 'Ascent 100% Whey, Native Whey Protein Blend, 4.25 lb (Informed Sport: check the bag and the lot)', 1928, '4.25 lb bag'],
  topRound: ['Top round / London broil', 'Meat'], parsley: ['Flat-leaf parsley', 'Produce'], greenBeans: ['Green beans', 'Produce'], apple: ['Apples', 'Produce'],
  granola: ['Granola (Kirkland Ancient Grains)', 'Pantry'], peanuts: ['Peanuts, dry-roasted', 'Pantry'], pineappleJuice: ['Pineapple juice, unsweetened', 'Pantry'],
  water: ['Water', 'Pantry'], mushrooms: ['Mushrooms (cremini; shiitake for the ahi)', 'Produce'], egg: ['Eggs, large', 'Dairy & eggs'],
  potatoYukon: ['Yukon Gold potatoes', 'Produce'], potatoRusset: ['Russet potatoes', 'Produce'], riceWhite: ['Jasmine rice', 'Pantry'],
  tenderloin: ['Beef tenderloin (filet)', 'Meat', 'Kirkland Signature USDA Prime Beef Loin Tenderloin Steak (pre-cut filets; read the grade on the label)', null, 'pre-cut filet steaks, sold by the lb'], ahi: ['Ahi tuna, sushi-grade', 'Seafood'], sockeye: ['Wild sockeye salmon portions', 'Frozen'],
  shrimp: ['Raw shrimp, 21-25s', 'Frozen'], beef93: ['Ground beef 93/7', 'Meat'], chickenBreast: ['Chicken breasts, boneless skinless', 'Meat'], chickenThigh: ['Chicken thighs, boneless skinless', 'Meat'],
};
for (const [id, v] of Object.entries(FIX)) if (GROC[id]) GROC[id] = [v[0], v[1], v[2] !== undefined ? v[2] : GROC[id][2], v[3] !== undefined ? v[3] : GROC[id][3], v[4] !== undefined ? v[4] : GROC[id][4]];
// staples bought rarely: shown as "check stock", not computed into packs
const STAPLE = ['salt', 'blackPepper', 'paprika', 'garlicPowder', 'cinnamon', 'oliveOil', 'avocadoOil', 'sesameOil', 'soySauce', 'fishSauce', 'sriracha', 'dijon', 'honey', 'ponzu', 'horseradish', 'water', 'brownSugar', 'chickenStock', 'peanutButter', 'pickles', 'garlic', 'riceWhite', 'oats', 'wildRice', 'riceNoodles', 'granola', 'wheyAscent', 'pineappleJuice'];

const out = [];
out.push('// ── HOME KITCHEN DATA: generated from the research tables (USDA FoodData Central values, Costco catalogue,');
out.push('// recipe sheets) by research/diet/port.js; regenerate with it rather than hand-edit. FOOD: per 100 g (per 100 ml for stock');
out.push('// and ponzu) in the state it is weighed: [kcal, protein, fat, carbs, fibre, source].');
out.push('const FOOD = {');
for (const [k, x] of Object.entries(FOOD)) out.push(`  ${J(k)}: [${x.v.join(', ')}, ${J(x.src)}],`);
out.push('};');
out.push('// GROCERY: food id -> [name, store section, Costco item (null = buy elsewhere / not verified), usable g per pack, pack]');
out.push('const GROCERY = {');
for (const [k, x] of Object.entries(GROC)) out.push(`  ${k}: ${J(x)},`);
out.push('};');
out.push(`const STAPLES = ${J(STAPLE)};`);
out.push('// RECIPES: portion/sauce lines are [food key, grams (ml for stock and ponzu), flag]; flag 1 = a share of the pan, a string = the cup it goes in.');
out.push('// sizes: grams per portion for TRIM / GAIN (MAINTAIN is the line itself); only starch and added fat change, never protein.');
out.push('// batch: [food id, state, grams for the recipe\'s portions, what it is for]');
out.push('const RECIPES = [');
for (const r of R) {
  const pl = r.portion.map((it) => [key(it), it.g ?? it.ml, ...(it.share ? [1] : [])]);
  const sl = (r.sauce || []).map((it) => [key(it), it.g ?? it.ml, it.cup || '']);
  const bl = r.batch.map((it) => [it.food, it.state || byId[it.food].state, it.g ?? it.ml, it.for || '', ...(it.ml != null ? ['ml'] : [])]);
  out.push('  {');
  out.push(`    id: ${J(r.id)}, kind: ${J(r.kind)}, name: ${J(r.name)}, slots: ${J(r.slots)}, portions: ${r.portions}, prepMin: ${r.prepMin}, activeMin: ${r.activeMin}, ahead: ${J(r.ahead || '')},`);
  out.push(`    style: ${J(r.style)},`);
  out.push(`    portion: ${J(pl)},`);
  out.push(`    sauce: ${J(sl)},`);
  out.push(`    sizes: ${J(r.sizes || {})},`);
  out.push(`    batch: ${J(bl)},`);
  out.push(`    method: ${J(r.method)},`);
  out.push(`    keeps: ${J(r.keeps)},`);
  out.push(`    reheat: ${J(r.reheat)} },`);
}
out.push('];');
out.push(`const KITCHEN = ${J(require(D + 'recipes.js').PROTOCOL)};`);
const fs = require('fs'), NJ = require('path').join(__dirname, '..', '..', 'nutrition.js'), s = fs.readFileSync(NJ, 'utf8');
const a = s.indexOf('// ==HOME-DATA==\n') + '// ==HOME-DATA==\n'.length, b = s.indexOf('// ==/HOME-DATA==');
if (a < 20 || b < a) throw new Error('HOME-DATA markers not found in nutrition.js');
fs.writeFileSync(NJ, s.slice(0, a) + out.join('\n') + '\n' + s.slice(b));
console.log(`nutrition.js: HOME-DATA rewritten (${Object.keys(FOOD).length} foods, ${R.length} recipes)`);
