// nutrition.js — the fuel side of the road. Pure data + functions, no DOM.
// Spliced into app-shell at /*==NUTRI==*/ and unit-tested from test.js.
const MODES = {
  gain: { label: "GAIN", kcal: 3050, p: 190, f: 80, c: 415, rate: "+0.25 lb/wk", why: "The default. Slow is what makes it lean." },
  trim: { label: "TRIM", kcal: 2500, p: 200, f: 70, c: 260, rate: "−1 lb/wk", why: "Only at ~18%. Four weeks, stop at 15%, resume gaining." },
};
const TRIM_WEEKS = 4;

// Hillstone Winter Park. ESTIMATES built from the menu's own descriptions and normal
// restaurant portions — Hillstone publishes no nutrition data. Choose by these; the
// weekly scale average is the truth.
const HILLSTONE = [
  { id: "rotis",    tier: "A", name: "Rotisserie Chicken + wild rice salad",         kcal: 950,  p: 70, gain: true,             note: "THE gaining shift meal" },
  { id: "filetL",   tier: "A", name: "Center-Cut Filet + green veg (lunch)",         kcal: 600,  p: 55, gain: true, trim: true },
  { id: "filetD",   tier: "A", name: "Center-Cut Filet + colcannon + green veg",     kcal: 850,  p: 55, gain: true },
  { id: "salmon",   tier: "A", name: "Pan Roasted Salmon + lentils + green veg",     kcal: 700,  p: 45, gain: true, trim: true, note: "Counts as the day's omega-3" },
  { id: "ahi",      tier: "A", name: "Ahi Tuna w/ Shiitake Ponzu + slaw",            kcal: 550,  p: 50, gain: true, trim: true, note: "THE trim shift meal" },
  { id: "ahisal",   tier: "A", name: "Seared Ahi Tuna Salad (lunch)",                kcal: 600,  p: 45, gain: true, trim: true },
  { id: "gcs",      tier: "A", name: "Grilled Chicken Salad, peanut sauce on side",  kcal: 600,  p: 55, gain: true, trim: true, note: "With the sauce ~750" },
  { id: "kale",     tier: "A", name: "Emerald Kale & Chicken Salad",                 kcal: 700,  p: 50, gain: true, trim: true },
  { id: "louie",    tier: "A", name: "Shrimp Louie (lunch)",                         kcal: 550,  p: 40, trim: true },
  { id: "shrimp",   tier: "A", name: "Chilled Jumbo Shrimp (add-on)",                kcal: 250,  p: 40, gain: true, trim: true, addon: true, note: "When a meal is short on protein" },
  { id: "dip",      tier: "B", name: "French Dip + wild rice salad",                 kcal: 1050, p: 60, gain: true, note: "Fries version ~1,300. Once a week" },
  { id: "ribeye",   tier: "B", name: "Hawaiian Ribeye, fries → green veg",      kcal: 1050, p: 70, gain: true, note: "Fries version ~1,400. Once a week" },
  { id: "burger",   tier: "B", name: "Cheeseburger + wild rice",                     kcal: 1050, p: 50, gain: true },
  { id: "noodle",   tier: "B", name: "Pan-Asian Noodle Salad w/ chicken",            kcal: 900,  p: 45, gain: true, note: "BBQ pork ~1,000" },
  { id: "crab",     tier: "B", name: "Jumbo Lump Crab Cakes + slaw",                 kcal: 700,  p: 40, gain: true },
  { id: "trout",    tier: "B", name: "Ruby Red Trout",                               kcal: 850,  p: 50, gain: true },
  { id: "tartare",  tier: "B", name: "Ahi Tuna Tartare",                             kcal: 500,  p: 35, gain: true, trim: true, note: "Starter-sized — pair with shrimp" },
  { id: "ribs",     tier: "C", name: "Knife & Fork Ribs + fries + slaw",             kcal: 1500, p: 60, note: "Once a week, gaining days only" },
  { id: "dings",    tier: "C", name: "Ding's Crispy Chicken Sandwich",               kcal: 1100, p: 45 },
  { id: "fishsand", tier: "C", name: "Gulf Coast Fish Sandwich",                     kcal: 900,  p: 40 },
  { id: "snapper",  tier: "C", name: "Pan-Fried Snapper + slaw",                     kcal: 800,  p: 45 },
  { id: "spindip",  tier: "D", name: "Spinach & Artichoke Dip",                      kcal: 1200, p: 20 },
  { id: "queso",    tier: "D", name: "Jalapeño Queso",                          kcal: 800,  p: 15 },
  { id: "veggie",   tier: "D", name: "House-Made Veggie Burger",                     kcal: 900,  p: 25, note: "All the calories, none of the protein" },
  { id: "proud",    tier: "D", name: "The Proud Vegetarian",                         kcal: 500,  p: 12 },
  { id: "pie",      tier: "D", name: "Key Lime Pie",                                 kcal: 600,  p: 6 },
];
const SIDES = [
  { id: "greenveg",  name: "Seasonal green vegetable",  kcal: 100, p: 3, gain: true, trim: true, note: "Default trim side" },
  { id: "peppers",   name: "Roasted peppers",           kcal: 120, p: 2, gain: true, trim: true },
  { id: "cabbage",   name: "Braised red cabbage",       kcal: 150, p: 2, gain: true, trim: true },
  { id: "deviled",   name: "Deviled eggs",              kcal: 200, p: 10, gain: true, trim: true, addon: true },
  { id: "kalesalad", name: "Kale salad",                kcal: 250, p: 5, gain: true },
  { id: "slaw",      name: "Coleslaw",                  kcal: 250, p: 2, gain: true },
  { id: "focaccia",  name: "Rosemary focaccia",         kcal: 250, p: 6, gain: true },
  { id: "wildrice",  name: "Wild rice salad",           kcal: 300, p: 6, gain: true, note: "Default gaining side" },
  { id: "corn",      name: "Creamed corn",              kcal: 350, p: 5 },
  { id: "colcannon", name: "Potatoes colcannon",        kcal: 350, p: 5, gain: true },
  { id: "sprouts",   name: "Brussels sprouts w/ aioli", kcal: 350, p: 6 },
  { id: "fries",     name: "French fries (beef tallow)", kcal: 500, p: 6, note: "Once a week, squat or deadlift day, never on a trim day" },
];
// The home meals, portioned to the day. Shift meal comes from Hillstone.
const HOME = [
  { id: "pre",   mode: "gain", when: "6:10 pre-lift",   name: "Whey + banana",                              kcal: 220,  p: 25 },
  { id: "preT",  mode: "trim", when: "6:10 pre-lift",   name: "Whey in water",                              kcal: 120,  p: 25 },
  { id: "m1",    mode: "gain", when: "8:45 meal 1",     name: "4 eggs + 1 cup oats in milk + berries + honey", kcal: 800, p: 50 },
  { id: "m1T",   mode: "trim", when: "8:45 meal 1",     name: "4 eggs + ½ cup oats + berries",          kcal: 600,  p: 50 },
  { id: "m2",    mode: "gain", when: "12:30 meal 2",    name: "1½ cup rice + 7 oz chicken thigh + veg", kcal: 750,  p: 50 },
  { id: "m2T",   mode: "trim", when: "12:30 meal 2",    name: "1 cup rice + 7 oz chicken thigh + veg",      kcal: 600,  p: 50 },
  { id: "m3",    mode: "gain", when: "4:30 pre-shift",  name: "Greek yogurt + whey + banana",               kcal: 400,  p: 40 },
  { id: "m3T",   mode: "trim", when: "4:30 pre-shift",  name: "Greek yogurt + whey + berries",              kcal: 350,  p: 40 },
  { id: "shake", mode: "any",  when: "emergency",       name: "Emergency shake",                            kcal: 1000, p: 80, note: "Missed a meal or working a double" },
];
const ALL = () => [...HILLSTONE, ...SIDES, ...HOME];
const byId = (id) => ALL().find((x) => x.id === id) || null;
const targets = (mode) => MODES[mode] || MODES.gain;
function dayTotals(entries) {
  let kcal = 0, p = 0;
  for (const e of entries || []) { kcal += +e.kcal || 0; p += +e.p || 0; }
  return { kcal, p };
}
const dkMs = (dk) => Date.UTC(+dk.slice(0, 4), +dk.slice(5, 7) - 1, +dk.slice(8, 10));
const msDk = (ms) => new Date(ms).toISOString().slice(0, 10);
// Last n days ending at dk. Only days with entries count as logged.
function weekStats(food, dk, n) {
  n = n || 7; const days = [];
  for (let i = 0; i < n; i++) { const ent = (food || {})[msDk(dkMs(dk) - i * 86400000)]; if (ent && ent.length) days.push(dayTotals(ent)); }
  if (!days.length) return { logged: 0, avgKcal: null, avgP: null };
  return { logged: days.length,
    avgKcal: Math.round(days.reduce((s, d) => s + d.kcal, 0) / days.length),
    avgP: Math.round(days.reduce((s, d) => s + d.p, 0) / days.length) };
}
// The day-10 rule, generalised: a 3-day scale average against a threshold, and the
// waist against its baseline. Returns a suggestion; the user confirms it, like a gate.
function decision(bw, meas, opts) {
  const o = Object.assign({ keep: 188, waistUp: 1 }, opts || {});
  const bk = Object.keys(bw || {}).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(+bw[k])).sort();
  const last3 = bk.slice(-3).map((k) => +bw[k]);
  const avg = last3.length ? +(last3.reduce((a, b) => a + b, 0) / last3.length).toFixed(1) : null;
  const mk = Object.keys(meas || {}).filter((k) => meas[k] && Number.isFinite(meas[k].wa)).sort();
  const dW = mk.length > 1 ? +(meas[mk[mk.length - 1]].wa - meas[mk[0]].wa).toFixed(2) : null;
  if (avg == null) return { mode: null, avg, dW, days: bk.length, reason: "Log the scale for 3+ days first." };
  const heavy = avg > o.keep, wide = dW != null && dW >= o.waistUp;
  const wTxt = dW == null ? "waist not logged twice yet" : `waist ${dW >= 0 ? "+" : ""}${dW}"`;
  if (!heavy && !wide) return { mode: "gain", avg, dW, days: bk.length, reason: `3-day avg ${avg} ≤ ${o.keep} · ${wTxt}. Mostly water. Keep gaining.` };
  return { mode: "trim", avg, dW, days: bk.length, reason: `3-day avg ${avg}${heavy ? ` > ${o.keep}` : ""} · ${wTxt}. Real tissue. Four-week trim.` };
}
const trimEnd = (sinceDk, weeks) => msDk(dkMs(sinceDk) + (weeks || TRIM_WEEKS) * 7 * 86400000);
const NUTRI = { MODES, TRIM_WEEKS, HILLSTONE, SIDES, HOME, byId, targets, dayTotals, weekStats, decision, trimEnd };
if (typeof module !== "undefined") module.exports = NUTRI;
