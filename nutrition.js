// nutrition.js — the fuel side of the road. Pure data + functions, no DOM.
// Spliced into app-shell at /*==NUTRI==*/ and unit-tested from test.js.
const MODES = {
  gain: { label: "GAIN", kcal: 3050, p: 190, f: 80, c: 415, rate: "+0.25 lb/wk", why: "The default. Slow is what makes it lean." },
  trim: { label: "TRIM", kcal: 2500, p: 200, f: 70, c: 260, rate: "−1 lb/wk (~0.5% of bodyweight)", why: "Only at ~18%. Six weeks at most; ends early once the waist is down 1\" or the 7-day average is down 6 lb. Then straight back to gaining." },
};
// Six weeks is the cap, not the target: the end conditions usually come first.
const TRIM_WEEKS = 6;
const TRIM_DONE = { waist: -1, lb: 6 };

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
  { id: "preT",  mode: "trim", when: "6:10 pre-lift",   name: "Whey + banana",                              kcal: 220,  p: 25, note: "Keep the carbs before a 7 AM lift, even trimming. Cut them elsewhere" },
  { id: "m1",    mode: "gain", when: "8:45 meal 1",     name: "4 eggs + 1 cup oats in milk + berries + honey", kcal: 800, p: 50 },
  { id: "m1T",   mode: "trim", when: "8:45 meal 1",     name: "4 eggs + ½ cup oats + berries",          kcal: 600,  p: 50 },
  { id: "m2",    mode: "gain", when: "12:30 meal 2",    name: "1½ cup rice + 7 oz chicken thigh + veg", kcal: 750,  p: 50 },
  { id: "m2T",   mode: "trim", when: "12:30 meal 2",    name: "1 cup rice + 7 oz chicken thigh + veg",      kcal: 600,  p: 50 },
  { id: "m3",    mode: "gain", when: "4:30 pre-shift",  name: "Greek yogurt + whey + banana",               kcal: 400,  p: 40 },
  { id: "m3T",   mode: "trim", when: "4:30 pre-shift",  name: "Greek yogurt + whey + berries",              kcal: 350,  p: 40 },
  { id: "shake", mode: "any",  when: "emergency",       name: "Emergency shake",                            kcal: 1000, p: 80, note: "Missed a meal or working a double" },
  // Off-shift dinner plates — what he actually cooks. Raw weights; rice is cooked volume.
  // Salmon ~208 kcal / 20P per 100 g raw; NY strip ~200 / 22P; ribeye ~290 / 21P.
  { id: "salmonG", grp: "plate", mode: "gain", when: "off-shift dinner", name: "Salmon plate — 8 oz fillet + 1½ cup rice + veg",   kcal: 850,  p: 50, note: "Counts as the day's omega-3" },
  { id: "salmonT", grp: "plate", mode: "trim", when: "off-shift dinner", name: "Salmon plate — 6 oz fillet + 1 cup rice + veg",    kcal: 600,  p: 40, note: "Counts as the day's omega-3" },
  { id: "stripG",  grp: "plate", mode: "gain", when: "off-shift dinner", name: "NY Strip plate — 10 oz + 1½ cup rice + veg",  kcal: 900,  p: 65 },
  { id: "stripT",  grp: "plate", mode: "trim", when: "off-shift dinner", name: "NY Strip plate — 8 oz + 1 cup rice + veg",         kcal: 700,  p: 55, note: "The trim steak — leanest of the three" },
  { id: "ribeyeG", grp: "plate", mode: "gain", when: "off-shift dinner", name: "Ribeye plate — 10 oz + 1½ cup rice + veg",     kcal: 1150, p: 65, note: "Fattiest cut. Gaining nights only; the strip is the trim steak" },
  // Breakfast alternatives — swap for meal 1 after the 7 AM lift. Every one clears 40P.
  // Eggs ~70 kcal / 6P each; whites ~17 / 3.5P; 0% Greek yogurt 1 cup ~130 / 23P; whey scoop ~120 / 25P.
  { id: "bfSteakG",   grp: "bfast", mode: "gain", when: "8:45 post-lift", name: "Steak & eggs — 5 oz NY strip + 3 eggs + 2 sourdough",         kcal: 700, p: 55, note: "THE PICK. Last night's strip, sliced thin, 60 s in the pan" },
  { id: "bfSteakT",   grp: "bfast", mode: "trim", when: "8:45 post-lift", name: "Steak & eggs — 4 oz NY strip + 3 eggs + 1 sourdough",         kcal: 550, p: 45, note: "THE PICK. Highest satiety on the list" },
  { id: "bfBurritoG", grp: "bfast", mode: "gain", when: "8:45 post-lift", name: "Breakfast burrito — 3 eggs + 3 oz chicken + beans + cheese, 2 tortillas", kcal: 900, p: 60, note: "Fastest high-protein option, 6 minutes" },
  { id: "bfBurritoT", grp: "bfast", mode: "trim", when: "8:45 post-lift", name: "Breakfast burrito — 3 eggs + 3 oz chicken + beans, 1 tortilla, no cheese", kcal: 600, p: 50 },
  { id: "bfOmeletG",  grp: "bfast", mode: "gain", when: "8:45 post-lift", name: "Omelet — 3 whole + 4 whites, spinach, 1 oz cheese, 2 toast",   kcal: 600, p: 42 },
  { id: "bfOmeletT",  grp: "bfast", mode: "trim", when: "8:45 post-lift", name: "Omelet — 2 whole + 5 whites, spinach + salsa, 1 toast, whey on the side", kcal: 450, p: 57 },
  { id: "bfBowlG",    grp: "bfast", mode: "gain", when: "8:45 post-lift", name: "Eggs + Greek yogurt bowl — 3 eggs, 1 cup 0% yogurt, berries, granola", kcal: 600, p: 45, note: "No-thought option" },
  { id: "bfBowlT",    grp: "bfast", mode: "trim", when: "8:45 post-lift", name: "Eggs + Greek yogurt bowl — 3 eggs, 1 cup 0% yogurt, berries",   kcal: 450, p: 42 },
  { id: "bfCakesG",   grp: "bfast", mode: "gain", when: "8:45 post-lift", name: "Oat protein pancakes — 1 cup oats, 2 eggs, 1 scoop whey, banana", kcal: 700, p: 50, note: "Weekend. Blend, cook as three" },
  { id: "bfCakesT",   grp: "bfast", mode: "trim", when: "8:45 post-lift", name: "Oat protein pancakes — ½ cup oats, 2 eggs, 1 scoop whey",  kcal: 450, p: 45 },
  // Bare cuts + cooking fat, so a plate can be composed however it was actually cooked
  { id: "salmon8", grp: "addon", mode: "any", name: "Salmon fillet, 8 oz (alone)",   kcal: 470, p: 45, addon: true },
  { id: "strip10", grp: "addon", mode: "any", name: "NY Strip, 10 oz (alone)",       kcal: 570, p: 62, addon: true },
  { id: "ribeye10", grp: "addon", mode: "any", name: "Ribeye, 10 oz (alone)",        kcal: 800, p: 60, addon: true },
  { id: "rice1",   grp: "addon", mode: "any", name: "Jasmine rice, 1 cup cooked",    kcal: 200, p: 4,  addon: true },
  { id: "fat1",    grp: "addon", mode: "any", name: "Cooking butter / oil, 1 tbsp",  kcal: 100, p: 0,  addon: true, note: "Pan-searing a steak usually means one of these" },
  { id: "egg1",    grp: "addon", mode: "any", name: "Whole egg, 1",                   kcal: 70,  p: 6,  addon: true },
  { id: "toast1",  grp: "addon", mode: "any", name: "Sourdough, 1 slice",             kcal: 90,  p: 3,  addon: true },
];
// The road in phases. Phase 1 is the build. Phase 2 is the reveal: the SAME 170 lb of
// lean mass at ~11% — the 1992 Calvin Klein Wahlberg, carrying ~25 lb more muscle than
// the ad. It is not a multi-year goal; it is a ten-week trim once Phase 1 is real.
const PHASES = [
  { id: "build", name: "Pain & Gain build", target: "200 lb @ 15% \u00b7 170 lb lean \u00b7 315/405/495 \u00b7 15\" arms", by: "~Wave 45 (2030)", mode: "gain",
    note: "Small surplus for years. Trim only when body fat hits 18%." },
  { id: "ck", name: "The CK cut", target: "~190 lb @ 11% \u00b7 same 170 lb lean", short: "~190 @ 11%", by: "10 weeks after Wave 45", mode: "trim", kcal: 2300, weeks: 10, floorBF: 10,
    gate: "Starts only once 200 @ 15% is real on the tape \u2014 waist and weekly average, not a good morning.",
    protein: [215, 230],
    note: "\u22121 lb/wk, protein 215\u2013230 g (Helms 2014: 2.3\u20133.1 g per kg of lean mass), heavy lifting held with back-offs cut ~20%. A refeed day is allowed when hunger bites: it helps you stick to the cut, it does not save muscle (ICECAP). Stop at 10%: that is a floor, not a target. Then three weeks back up to maintenance." },
];
// Ultimate Pump Mode (the date-night primer). Not a training block: a 36-hour fullness + posture protocol.
// A big session the night before flattens you; the pump is a 45-minute thing timed
// before the door, and everything else is water, carbs, sodium and sleep.
const PRIMER = {
  name: "Ultimate Pump Mode",
  why: "What reads through a shirt: shoulders, upper chest, traps, arms, lats, posture. Abs do not. What you have built is 90% of it; this is the other 10% — fullness and posture.",
  eve: { title: "The night before — 25 min, light, optional",
    rule: "No failure, no eccentric emphasis, nothing new. Soreness is the enemy.",
    items: ["Band pull-apart 3×20", "Cable lateral raise 3×20, light, 45 s rest", "Rope pushdown 2×15 + cable curl 2×15", "Wrist curl 2×20",
            "Rice dinner: 2 cups + protein, 1 L water with it, no alcohol", "SLEEP 8 HOURS — the single biggest lever you have"] },
  day: { title: "Date day",
    morning: "Weigh in first. Run today’s session as written but stop everything at RPE 8 — the app has removed the failure set and the partials for today. Worked, not wrecked.",
    fuel: ["Carbs 350–400 g, front-loaded: rice, potatoes, oats, bananas", "Sodium normal, slightly up — never cut salt, it flattens you", "Water 3–4 L, steady, no water-cutting",
           "Avoid: fatty meals, beans, cruciferous veg, dairy if it bloats you, carbonation, alcohol before", "2–3 h before the pump: 1½ cups rice + lean protein"],
    shirt: "Fitted through the shoulders and chest, sleeves ending mid-bicep, heavier fabric that holds shape instead of clinging to the waist. Dark or mid tones." },
  pump: { title: "The pump — 45 min, finish 30–60 min before",
    rule: "12–20 reps, 45–60 s rests, cables and machines, 2–3 reps short of failure. Supersets. No lockouts (keep the muscle under tension so blood stays in), no slow negatives (that is the soreness recipe), nothing new.",
    // load = { from: <block name regex>, pct } resolved against the CURRENT week's sessions,
    // so the pump weights climb as the rungs do. fallback covers a missing match.
    sets: [["A1", "Cable lateral raise",              "3×15–20", "width — the #1 through-a-shirt muscle",     { from: "Cable Lateral Raise",       pct: 0.75, fallback: 15 }],
           ["A2", "Low-to-high cable fly",            "3×15",         "upper chest, fills the shirt",               { from: "Low-to-High Cable Fly",     pct: 0.85, fallback: 30 }],
           ["B1", "Cable fly, mid-height (or pec deck)", "2×15",         "the chest is the biggest through-shirt surface; constant tension swells it", { from: "Low-to-High Cable Fly",     pct: 0.90, fallback: 30 }],
           ["B2", "Face pull",                        "3×20",         "posture + round rear delt",                  { from: "Face Pull",                 pct: 0.85, fallback: 50 }],
           ["C1", "Incline DB curl",                  "3×12–15", "sleeves",                                    { from: "Incline DB Curl",           pct: 0.80, fallback: 30, per: "hand" }],
           ["C2", "Rope pushdown",                    "3×15–20", "sleeves — superset with C1",            { from: "Rope Pushdown",             pct: 0.75, fallback: 70 }],
           ["D1", "Straight-arm cable pulldown",      "2×15",         "lats, the taper",                            { from: "Unilateral Cable Pulldown", pct: 0.50, fallback: 55 }],
           ["D2", "DB shrug, light, 1 s hold",        "2×15",         "traps / neckline",                           { from: "Shrug",                     pct: 0.60, fallback: 100, note: "machine, or 55-lb DBs" }],
           ["E",  "Hammer curl 2×15 + wrist curl 2×20", "",       "only if sleeves are rolled",                 { from: "Hammer Curl",               pct: 0.75, fallback: 30, per: "hand", note: "wrist curl at 30" }],
           ["F",  "Lateral raise drop set",           "×1, three drops", "to a burn, not to failure",               { from: "Cable Lateral Raise",       pct: 0.75, fallback: 15, note: "then 12.5 → 10 → 7.5" }],
           ["G",  "Stomach vacuum, standing",       "3×30 s",       "finisher — pulls the waist IN. An ab wheel pumps the midsection outward and leaves it sore; abs don’t read through a shirt, a tight waist does", 0]],
    finish: "Posture reset, last 3 min: chin tucks ×10 · wall slides ×10 · doorway pec stretch 30 s/side. Stand tall.",
    after: "Banana or rice cakes + 500 ml water with a pinch of salt — extends the pump. Pocket a band: 15 pull-aparts + 5 chin tucks in the car before you walk in — the scapular retractors stay switched on for a while after you fire them.",
    boosters: ["30–50 g fast carbs 30 min before (banana, juice): insulin raises muscle blood flow and pulls water in with the glycogen", "Citrulline malate 6–8 g, 45–60 min before: nitric-oxide precursor, modest but real vasodilation. Certified (NSF for Sport / Informed Sport) only. Skip arginine — poor absorption", "If you own BFR cuffs: on the arm superset only, 30% load, 30/15/15/15 reps, cuffs off after — the strongest acute-swelling tool there is"] },
  next: "Back to the plan. If the day’s weigh-in said TRIM, start it the day after — the date was the one-day exception. Log the day anyway.",
};
// Resolve the pump's loads against a lookup of the current week's working weights.
const roundLoad = (w) => (w >= 50 ? Math.round(w / 5) * 5 : Math.round(w / 2.5) * 2.5);
function primerLoads(findW) {
  return PRIMER.pump.sets.map(([k, name, sr, why, load]) => {
    if (typeof load === "number") return { k, name, sr, why, w: load, disp: load === 0 ? "BW" : String(load) };
    const base = findW ? findW(load.from) : null;
    const w = Number.isFinite(base) && base > 0 ? roundLoad(base * load.pct) : load.fallback;
    const disp = (load.per === "hand" ? `${w}s` : String(w)) + (load.note ? ` · ${load.note}` : "");
    return { k, name, sr, why, w, disp, derived: Number.isFinite(base) && base > 0 };
  });
}
// "eve" the day before, "day" on the date, otherwise null
function primerStage(dateDk, todayDk) {
  if (!dateDk || !/^\d{4}-\d{2}-\d{2}$/.test(dateDk)) return null;
  const days = Math.round((dkMs(dateDk) - dkMs(todayDk)) / 86400000);
  return days === 1 ? "eve" : days === 0 ? "day" : null;
}
// Every product must carry NSF Certified for Sport or Informed Sport: he competes
// USPA drug-tested (its own banned list, urine tests, no exemptions), and 12-58% of
// supplements in contamination studies held undeclared banned substances.
const CERT = "NSF Certified for Sport or Informed Sport";
const SUPPS = [
  { tier: 1, name: "Creatine monohydrate", dose: "5 g a day, any time, forever", why: "The best-supported supplement there is (ISSN, Kreider 2017)." },
  { tier: 1, name: "Whey protein", dose: "1\u20132 scoops a day", why: "Convenience for hitting protein, not magic." },
  { tier: 1, name: "Caffeine", dose: "3 mg/kg (~250 mg) 50\u201360 min before the lift", why: "ISSN: 3\u20136 mg/kg about an hour out. At this dose, nothing within ~13 h of bed (Gardiner 2023: 8.8 h for a coffee, 13.2 h for a pre-workout dose). Sleep is the bottleneck." },
  { tier: 2, name: "Omega-3", dose: "Salmon twice a week, or 2 g EPA+DHA", why: "Food first." },
  { tier: 2, name: "Electrolytes", dose: "Sodium ~500 mg + potassium on sweaty days", why: "Florida shifts and the incline walk." },
  { tier: 3, name: "Vitamin D3", dose: "Only if a blood test says you are low", why: "No clear strength benefit in athletes who are not deficient (Han 2024)." },
  { tier: 3, name: "Magnesium glycinate", dose: "300\u2013400 mg before bed if sleep is under 7.5 h", why: "A sleep aid, not a muscle builder." },
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
// The decision rule. 7-day scale averages, measured against where THIS phase
// started (not a fixed number), plus the waist against its phase-start value,
// plus a sleep gate: a deficit on short sleep takes the loss from muscle
// (Nedeltcheva 2010). Returns a suggestion; the user confirms it, like a gate.
const DK = /^\d{4}-\d{2}-\d{2}$/;
function avgIn(map, fromDk, toDk, min) {
  const v = Object.keys(map || {}).filter((k) => DK.test(k) && k >= fromDk && k <= toDk && Number.isFinite(+map[k])).map((k) => +map[k]);
  return v.length >= (min || 3) ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : null;
}
const addDays = (dk, n) => msDk(dkMs(dk) + n * 86400000);
function decision(bw, meas, opts) {
  const o = Object.assign({ mode: "gain" }, opts || {});
  const bk = Object.keys(bw || {}).filter((k) => DK.test(k) && Number.isFinite(+bw[k])).sort();
  const today = o.today || bk[bk.length - 1];
  const since = o.since && DK.test(o.since) ? o.since : bk[0];
  const out = { mode: null, avg: null, start: null, dW: null, rate: null, weeks: null, sleep: null, gate: null, days: bk.length };
  if (!today || !since) return { ...out, reason: "Log the scale for 3+ days first." };
  out.avg = avgIn(bw, addDays(today, -6), today);
  out.start = avgIn(bw, since, addDays(since, 6));
  out.weeks = +((dkMs(today) - dkMs(since)) / (7 * 86400000)).toFixed(1);
  const mk = Object.keys(meas || {}).filter((k) => DK.test(k) && meas[k] && Number.isFinite(meas[k].wa)).sort();
  const base = [...mk].reverse().find((k) => k <= since) || mk.find((k) => k > since);
  const cur = mk[mk.length - 1];
  out.dW = base && cur && cur !== base ? +(meas[cur].wa - meas[base].wa).toFixed(2) : null;
  out.sleep = avgIn(o.sleep, addDays(today, -6), today);
  const shortSleep = out.sleep != null && out.sleep < 7;
  if (out.avg == null) return { ...out, reason: "Log the scale 3+ mornings this week: the 7-day average is the number." };
  const wTxt = out.dW == null ? "waist not re-measured this phase" : `waist ${out.dW >= 0 ? "+" : ""}${out.dW}" since the phase began`;
  if (out.start != null && out.weeks >= 1) out.rate = +((out.avg - out.start) / out.weeks).toFixed(2);
  if (o.mode === "trim") {
    if (out.weeks >= TRIM_WEEKS) return { ...out, mode: "gain", reason: `Six weeks is the cap. Back to gaining. (${wTxt})` };
    if (out.dW != null && out.dW <= TRIM_DONE.waist) return { ...out, mode: "gain", reason: `${wTxt}: the trim did its job. Back to gaining.` };
    if (out.start != null && out.start - out.avg >= TRIM_DONE.lb) return { ...out, mode: "gain", reason: `7-day average ${out.avg}, down ${(out.start - out.avg).toFixed(1)} from ${out.start}. Done. Back to gaining.` };
    const fast = out.rate != null && -out.rate > out.avg * 0.01;
    return { ...out, mode: "trim", gate: shortSleep ? "sleep" : null,
      reason: `7-day average ${out.avg}${out.start != null ? ` vs ${out.start} at the start` : ""} · ${wTxt}. Keep trimming.${fast ? " Losing faster than 1% a week: add 200 kcal (the slower rate keeps more muscle, Garthe 2011)." : ""}${shortSleep ? ` Sleep is averaging ${out.sleep} h: under 7, the loss comes out of muscle. Fix sleep or end the trim early.` : ""}` };
  }
  // gaining
  if (out.dW != null && out.dW >= 1) {
    if (shortSleep) return { ...out, mode: "gain", gate: "sleep", reason: `${wTxt} says trim, but sleep is averaging ${out.sleep} h. A deficit on short sleep takes the loss from muscle. Get to 7 h+ first, then start the trim.` };
    return { ...out, mode: "trim", reason: `${wTxt}: that is tissue, not water. Six-week trim.` };
  }
  if (out.rate == null) return { ...out, mode: "gain", reason: `7-day average ${out.avg} · ${wTxt}. The rate needs a full week of this phase. Keep gaining.` };
  const adj = out.rate > 0.5 ? " Gaining faster than 0.5 lb a week: drop 150 kcal, that extra is fat." : out.rate < 0.1 ? " Flat: add 150 kcal." : " On pace.";
  return { ...out, mode: "gain", reason: `7-day average ${out.avg}, ${out.rate >= 0 ? "+" : ""}${out.rate} lb/wk since the phase began · ${wTxt}.${adj}` };
}
const trimEnd = (sinceDk, weeks) => msDk(dkMs(sinceDk) + (weeks || TRIM_WEEKS) * 7 * 86400000);
const NUTRI = { CERT, SUPPS, TRIM_DONE, avgIn, MODES, TRIM_WEEKS, PHASES, PRIMER, primerStage, primerLoads, roundLoad, HILLSTONE, SIDES, HOME, byId, targets, dayTotals, weekStats, decision, trimEnd };
if (typeof module !== "undefined") module.exports = NUTRI;
