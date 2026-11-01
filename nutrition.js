// nutrition.js — the fuel side of the road. Pure data + functions, no DOM.
// Spliced into app-shell at /*==NUTRI==*/ and unit-tested from test.js.
// Carbs are the remainder, so protein, fat and carbs always add up to the calories at 4/9/4 (MAINT-6).
// `off` places a mode against MEASURED maintenance once there is one (MAINT-2): trim is 500 under
// (about 1 lb a week), gain 125 over (about 0.25 lb a week). Until then `kcal` is the starting number.
const MODES = {
  maintain: { label: "MAINTAIN", kcal: 2800, p: 200, f: 80, off: 0, rate: "hold: the 7-day average flat", why: "Strict maintenance on weighed home food through the peak. The starting number is a judgment; your own 28 days of complete logs and weigh-ins replace it." },
  trim: { label: "TRIM", kcal: 2500, p: 200, f: 72, off: -500, rate: "−1 lb/wk (~0.5% of bodyweight)", why: "Only at ~18%. Six weeks at most; ends early once the waist is down 1\" or the 7-day average is down 6 lb. Then straight back to gaining." },
  gain: { label: "GAIN", kcal: 3050, p: 190, f: 78, off: 125, rate: "+0.25 lb/wk", why: "Slow is what makes it lean." },
};
for (const m of Object.values(MODES)) m.c = Math.round((m.kcal - 4 * m.p - 9 * m.f) / 4);
// Six weeks is the cap, not the target: the end conditions usually come first.
const TRIM_WEEKS = 6;
const TRIM_DONE = { waist: -1, lb: 6 };
// One pace table drives the decision rule, the weekly table and the chart band (NUT-3).
// Gain: lb a week. Trim: fraction of bodyweight a week (Helms 2014 JISSN: 0.5-1%; the 1% flag is a judgment).
const PACE = { flat: 0.1, target: 0.25, fast: 0.5, trimSlow: 0.005, trimFast: 0.01 };
// The rate is a least-squares line through every weigh-in of the phase (NUT-1); it needs this much data.
const RATE_MIN = { n: 8, days: 10 };
// Applied calorie adjustments stay within +/-400 of the mode's target (NUT-7, judgment).
const ADJ_CAP = 400;
// A trim shorter than three weeks is not worth starting (NUT-5, judgment).
const TRIM_MIN_DAYS = 21;
// MAINT-1: maintenance is measured, not guessed (Hall 2008): mean intake on COMPLETE days minus the
// energy in the weight trend, over a rolling 28 days (a provisional number from 21). The first 7 days
// after a switch or a mode change are water, glycogen and gut content, so they are left out. 3,500
// kcal/lb converts a sustained small trend; it never forecasts (Hall 2011). Thresholds: judgment.
// The band is the slope's own standard error, never narrower than a floor that assumes 1.0 lb of daily
// scale noise with half of it carried into the next day (ρ 0.5): ±220 at 21 days, ±140 at 28. Turicchi
// 2020 puts typical noise at 0.6% of bodyweight (~1.2 lb), so the floor is lenient, not alarmist.
const EST = { runIn: 7, prov: 21, full: 28, done: 6 / 7, weigh: 5 / 7, kcalLb: 3500, move: 100, noise: 1.0, rho: 0.5 };
// MAINTAIN mode's trim trigger at the end of a peak: tape body fat at or over this (judgment, ±3–4 points)
const BF_TRIM = 18;

// ==HOME-DATA==
// ── HOME KITCHEN DATA: generated from the research tables (USDA FoodData Central values, Costco catalogue,
// recipe sheets) by research/diet/port.js; regenerate with it rather than hand-edit. FOOD: per 100 g (per 100 ml for stock
// and ponzu) in the state it is weighed: [kcal, protein, fat, carbs, fibre, source].
const FOOD = {
  "topSirloin:cooked": [188, 30.3, 6.6, 0, 0, "FDC 168635"],
  "avocadoOil:as sold": [884, 0, 100, 0, 0, "FDC 173573"],
  "egg:raw": [147, 12.4, 10, 1, 0, "FDC 748967"],
  "eggWhites:as sold": [52, 10.9, 0.2, 0.7, 0, "FDC 172183"],
  "butter:as sold": [717, 0.9, 81.1, 0.1, 0, "FDC 173410"],
  "spinach:raw": [23, 2.9, 0.4, 3.6, 2.2, "FDC 168462"],
  "mushrooms/cremini:raw": [22, 2.5, 0.1, 4.3, 0.6, "FDC 168434"],
  "wholeGrainBread:as sold": [267, 11.1, 4.4, 48.9, 11.1, "FDC 2674263"],
  "greenOnion:raw": [32, 1.8, 0.2, 7.3, 2.6, "FDC 170005"],
  "salt:as sold": [0, 0, 0, 0, 0, "FDC 173468"],
  "blackPepper:as sold": [251, 10.4, 3.3, 64, 25.3, "FDC 170931"],
  "sriracha:as sold": [93, 1.9, 0.9, 19.2, 2.2, "FDC 171186"],
  "greekNonfat:as sold": [61, 10.3, 0.4, 3.6, 0, "FDC 330137"],
  "wheyAscent:as sold": [364, 75.8, 3, 9.1, 3, "FDC 2664129"],
  "water:as sold": [0, 0, 0, 0, 0, "FDC 173647"],
  "oats:raw": [379, 13.2, 6.5, 67.7, 10.1, "FDC 173904"],
  "apple:raw": [52, 0.3, 0.2, 13.8, 2.4, "FDC 171688"],
  "cinnamon:as sold": [247, 4, 1.2, 80.6, 53.1, "FDC 171320"],
  "berries:as sold": [56, 0.8, 0, 13.5, 4, "FDC 2460589"],
  "granola:as sold": [455, 9.1, 16.4, 70.9, 10.9, "FDC 2009792"],
  "honey:as sold": [304, 0.3, 0, 82.4, 0.2, "FDC 169640"],
  "riceWhite:cooked": [130, 2.7, 0.3, 28.2, 0.4, "FDC 168878"],
  "broccoli:raw": [34, 2.8, 0.4, 6.6, 2.6, "FDC 170379"],
  "oliveOil:as sold": [884, 0, 100, 0, 0, "FDC 171413"],
  "pineappleJuice:as sold": [53, 0.4, 0.1, 12.9, 0.2, "FDC 169947"],
  "soySauce/lowSodium:as sold": [57, 9.1, 0.3, 5.6, 0.7, "FDC 172473"],
  "brownSugar:as sold": [380, 0.1, 0, 98.1, 0, "FDC 168833"],
  "garlic:raw": [130, 6.6, 0.4, 28.2, 2.7, "FDC 1104647"],
  "ginger:raw": [80, 1.8, 0.8, 17.8, 2, "FDC 169231"],
  "sesameOil:as sold": [884, 0, 100, 0, 0, "FDC 171016"],
  "flank:cooked": [202, 27.6, 9.3, 0, 0, "FDC 169435"],
  "fishSauce:as sold": [35, 5.1, 0, 3.6, 0, "FDC 174531"],
  "limeJuice:raw": [25, 0.4, 0.1, 8.4, 0.4, "FDC 168156"],
  "riceNoodles:cooked": [108, 1.8, 0.2, 24, 1, "FDC 168914"],
  "cabbage:raw": [25, 1.3, 0.1, 5.8, 2.5, "FDC 169975"],
  "cucumber:raw": [15, 0.7, 0.1, 3.6, 0.5, "FDC 168409"],
  "bellPepper:raw": [26, 1, 0.3, 6, 2.1, "FDC 170108"],
  "cilantro:raw": [23, 2.1, 0.5, 3.7, 2.8, "FDC 169997"],
  "mint:raw": [44, 3.3, 0.7, 8.4, 6.8, "FDC 173475"],
  "peanuts:as sold": [587, 24.4, 49.7, 21.3, 8.4, "FDC 174262"],
  "peanutButter:as sold": [589, 24, 49.4, 22.7, 6.3, "FDC 2262072"],
  "sockeye:raw": [136, 22.3, 4.9, 0, 0, "FDC 2684440"],
  "wildRice:cooked": [101, 4, 0.3, 21.3, 1.8, "FDC 168897"],
  "chickenStock:as sold": [4, 0.8, 0, 0, 0, "FDC 2655506"],
  "lemonZest:raw": [47, 1.5, 0.3, 16, 10.6, "FDC 167749"],
  "lemonJuice:raw": [22, 0.4, 0.2, 6.9, 0.3, "FDC 167747"],
  "parsley:raw": [36, 3, 0.8, 6.3, 3.3, "FDC 170416"],
  "greenBeans:raw": [31, 1.8, 0.2, 7, 2.7, "FDC 169961"],
  "chickenBreast:cooked": [151, 30.5, 3.2, 0, 0, "FDC 171534"],
  "chickenThigh:cooked": [199, 24.8, 10.6, 0, 0, "FDC 2646171"],
  "paprika:as sold": [282, 14.1, 12.9, 54, 34.9, "FDC 171329"],
  "garlicPowder:as sold": [331, 16.6, 0.7, 72.7, 9, "FDC 171325"],
  "potatoYukon:cooked": [92, 2.1, 0.2, 21.1, 2.1, "FDC 170434"],
  "kale:raw": [35, 2.9, 1.5, 4.4, 4.1, "FDC 323505"],
  "parmesan:as sold": [392, 35.8, 25, 3.2, 0, "FDC 170848"],
  "sourdough:as sold": [272, 10.8, 2.4, 51.9, 2.2, "FDC 172675"],
  "topRound:cooked": [204, 30.7, 9, 0, 0, "FDC 169531"],
  "romaine:raw": [17, 1.2, 0.3, 3.2, 1.8, "FDC 746769"],
  "onion:raw": [36, 0.8, 0.1, 8.6, 1.9, "FDC 790646"],
  "horseradish:as sold": [48, 1.2, 0.7, 11.3, 3.3, "FDC 173472"],
  "dijon:as sold": [200, 0, 10, 20, 0, "FDC 2566098"],
  "beef93:cooked": [209, 28.9, 9.5, 0, 0, "FDC 174755"],
  "cheddar:as sold": [393, 25, 32.1, 3.6, 0, "FDC 2429357"],
  "potatoRusset:cooked": [95, 2.6, 0.1, 21.4, 2.3, "FDC 170030"],
  "tomatoes:raw": [27, 0.8, 0.6, 5.5, 2.1, "FDC 321360"],
  "pickles:as sold": [12, 0.5, 0.3, 2.4, 1, "FDC 168558"],
  "shrimp:cooked": [99, 24, 0.3, 0.2, 0, "FDC 175180"],
  "avocado:raw": [167, 2, 15.4, 8.6, 6.8, "FDC 171706"],
  "tenderloin:raw": [149, 21.1, 6.5, 0.2, 0, "FDC 2727573"],
  "potatoRusset:raw": [79, 2.1, 0.1, 18.1, 1.3, "FDC 170027"],
  "asparagus:raw": [20, 2.2, 0.1, 3.9, 2.1, "FDC 168389"],
  "ahi:raw": [109, 24.4, 0.5, 0, 0, "FDC 175159"],
  "mushrooms/shiitake:raw": [34, 2.2, 0.5, 6.8, 2.5, "FDC 169242"],
  "ponzu:as sold": [67, 6.7, 0, 13.3, 0, "FDC 2633370"],
  "cottage:as sold": [84, 11, 2.3, 4.3, 0, "FDC 328841"],
  "pineapple:raw": [54, 0.5, 0.2, 14.1, 0.9, "FDC 2346398"],
  "banana:raw": [88, 0.7, 0.3, 23, 1.7, "FDC 1105314"],
};
// GROCERY: food id -> [name, store section, Costco item (null = buy elsewhere / not verified), usable g per pack, pack]
const GROCERY = {
  topSirloin: ["Top sirloin steak, trimmed","Meat","Kirkland Signature USDA Prime Beef Loin Top Sirloin Steak Boneless Cap Off",null,"random-weight package, sold by the lb"],
  avocadoOil: ["Avocado oil","Pantry","Chosen Foods, 100% Pure Avocado Oil, 2 L",null,"2 L bottle"],
  egg: ["Eggs, large","Dairy & eggs","Kirkland Signature Eggs, Large, 24-count",null,"24 large, cage-free (count item)"],
  eggWhites: ["Liquid egg whites, carton","Dairy & eggs","Kirkland Signature Cage Free Egg Whites 6/16 oz",2722,"6 x 16 oz cartons"],
  butter: ["Butter, salted","Dairy & eggs","Kirkland Signature Unsalted Sweet Cream Butter, 16 oz, 4-count",1814,"4 x 1 lb (quarters)"],
  spinach: ["Spinach","Produce","Earthbound Farm Organic Baby Spinach, 16 oz",454,"16 oz clamshell"],
  mushrooms: ["Mushrooms (cremini; shiitake for the ahi)","Produce","Highline Mushrooms Organic Mini Bella Mushrooms, 24 oz",680,"24 oz"],
  wholeGrainBread: ["Whole-grain bread","Bakery","Dave's Killer Bread Organic Bread, 21 Whole Grains and Seeds",1531,"2 x 27 oz loaves"],
  greenOnion: ["Green onions / scallions","Produce",null,null,"not checked"],
  salt: ["Salt","Pantry",null,null,"not checked"],
  blackPepper: ["Black pepper, ground","Pantry","Kirkland Signature, Black Pepper with Grinder, 6.3 oz, 2-Count",357,"2 x 6.3 oz"],
  sriracha: ["Sriracha","Pantry","Underwood Ranches Sriracha, 17 oz, 2-count",964,"2 x 17 oz (per search index)"],
  greekNonfat: ["Greek yogurt, plain, nonfat","Dairy & eggs","Kirkland Signature Organic Greek Yogurt, 48 oz",1361,"48 oz tub (Item 1048072)"],
  wheyAscent: ["Whey (Ascent 100% Whey, Informed Sport)","Supplements","Ascent 100% Whey, Native Whey Protein Blend, 4.25 lb (Informed Sport: check the bag and the lot)",1928,"4.25 lb bag"],
  water: ["Water","Pantry",null,null,null],
  oats: ["Rolled oats, old-fashioned","Pantry","Kirkland Signature Whole Grain Rolled Oats, 10 LBS",4536,"10 lb resealable bag (Item 1736339)"],
  apple: ["Apples","Produce",null,null,null],
  cinnamon: ["Cinnamon, ground","Pantry","Kirkland Signature Organic Ground Saigon Cinnamon, 10.7 oz., 2-count",607,"2 x 10.7 oz"],
  berries: ["Berries","Frozen","Kirkland Signature Three Berry Blend, 4 lbs",1814,"4 lb bag (raspberries, blueberries, blackberries; IQF)"],
  granola: ["Granola (Kirkland Ancient Grains)","Pantry",null,null,null],
  honey: ["Honey","Pantry","Kirkland Signature Organic Raw Honey, 24 oz, 3-count",2041,"3 x 24 oz"],
  riceWhite: ["Jasmine rice","Pantry","Kirkland Signature, Thai Hom Mali Jasmine Rice, 25 lbs",11340,"25 lb bag (Item 841930)"],
  broccoli: ["Broccoli","Produce","Broccoli Florets, 3 lbs",1361,"3 lb bag"],
  oliveOil: ["Olive oil","Pantry","Kirkland Signature, Organic Extra Virgin Olive Oil, 2 L",null,"2 L bottle"],
  pineappleJuice: ["Pineapple juice, unsweetened","Pantry",null,null,null],
  soySauce: ["Soy sauce","Pantry","Kikkoman Soy Sauce, Less Sodium, 2 qt",null,"2 qt (64 fl oz) bottle"],
  brownSugar: ["Brown sugar","Pantry",null,null,null],
  garlic: ["Garlic","Produce","Kirkland Signature Minced Garlic, 48 oz",1361,"48 oz jar (in water)"],
  ginger: ["Ginger root","Produce",null,null,"not checked"],
  sesameOil: ["Toasted sesame oil","Pantry",null,null,"5 fl oz (Publix)"],
  flank: ["Flank steak","Meat","Kirkland Signature USDA Choice Beef Flank Steak",null,"random-weight package, sold 'each' (same-day listing shows item #33977, via search index)"],
  fishSauce: ["Fish sauce","Pantry",null,null,"not checked"],
  limeJuice: ["Lime juice, fresh","Produce","Limes, 3 lbs",1361,"3 lb bag"],
  riceNoodles: ["Rice noodles","Pantry",null,null,"not checked"],
  cabbage: ["Cabbage / coleslaw mix","Produce",null,null,"not checked"],
  cucumber: ["Cucumber with peel","Produce","Cocktail Cucumber, Greenhouse Grown, 1.5 lbs",680,"1.5 lb"],
  bellPepper: ["Red bell pepper","Produce",null,null,"not checked"],
  cilantro: ["Cilantro leaves","Produce",null,null,"not checked"],
  mint: ["Mint","Produce",null,null,"not checked"],
  peanuts: ["Peanuts, dry-roasted","Pantry",null,null,null],
  peanutButter: ["Peanut butter, creamy","Pantry",null,null,"not checked"],
  sockeye: ["Wild sockeye salmon portions","Frozen","Kirkland Signature Wild Alaskan Sockeye Salmon, 5 oz - 7 oz Portion, 3 lbs",1361,"3 lb (48 oz) bag of 5-7 oz portions (Item 221177)"],
  wildRice: ["Wild rice","Pantry",null,454,"16 oz (Publix)"],
  chickenStock: ["Chicken stock","Pantry","Kirkland Signature, Organic Chicken Stock, 32 fl oz, 6-Count",null,"6 x 32 fl oz cartons"],
  lemonZest: ["Lemon zest","Produce","Lemons, 5 lbs",2268,"5 lb bag"],
  lemonJuice: ["Lemon juice, fresh","Produce","Lemons, 5 lbs",2268,"5 lb bag"],
  parsley: ["Flat-leaf parsley","Produce",null,null,null],
  greenBeans: ["Green beans","Produce",null,null,null],
  chickenBreast: ["Chicken breasts, boneless skinless","Meat","Kirkland Signature Fresh Boneless Skinless Chicken Breasts",null,"random weight, 6 lb average; tear-off vacuum pouches of 2-3 breasts (Item 33841)"],
  chickenThigh: ["Chicken thighs, boneless skinless","Meat","Kirkland Signature Fresh Boneless Skinless Chicken Thighs",null,"random weight; tear-off vacuum pouches; one same-day listing shows ~8.76 lb per package (via search index)"],
  paprika: ["Paprika","Pantry",null,null,"not checked"],
  garlicPowder: ["Garlic powder / granulated garlic","Pantry","Kirkland Signature, Granulated Garlic, 18 oz",510,"18 oz shaker"],
  potatoYukon: ["Yukon Gold potatoes","Produce","Gold Potatoes, 10 lbs",4536,"10 lb bag"],
  kale: ["Kale","Produce","Organic Power Greens, 1.5 lbs",680,"1.5 lb clamshell (Earthbound Farm)"],
  parmesan: ["Parmesan / Parmigiano-Reggiano, hard","Dairy & eggs","Kirkland Signature Italian Parmesan Parmigiano Reggiano",null,"random-weight wedge"],
  sourdough: ["Sourdough bread","Bakery","The Essential Baking Company Organic Sourdough Bread (bake-at-home), 3-count",null,"3 loaves (weight not verified)"],
  topRound: ["Top round / London broil","Meat","Kirkland Signature USDA Choice Beef Round Top Round Steak (London Broil)",null,"random-weight package, sold by the lb; one same-day listing shows ~5.4 lb average (via search index)"],
  romaine: ["Romaine lettuce","Produce","Artisan Romaine Hearts, 5-count",null,"5 hearts"],
  onion: ["Yellow onion","Produce",null,null,"not checked"],
  horseradish: ["Horseradish, prepared","Pantry",null,null,null],
  dijon: ["Dijon mustard","Pantry",null,null,"not checked"],
  beef93: ["Ground beef 93/7","Meat","Kirkland Signature Ground Beef, 1.33 lbs, 3-count",1810,"3 x 1.33 lb packages"],
  cheddar: ["Sharp cheddar, shredded","Dairy & eggs","Kirkland Signature Shredded Sharp Cheddar Cheese, 2 x 2.5 lbs",2268,"2 x 2.5 lb bags"],
  potatoRusset: ["Russet potatoes","Produce","Baking Potatoes, 10 lbs",4536,"10 lb bag (russet)"],
  tomatoes: ["Grape tomatoes","Produce",null,null,"not checked"],
  pickles: ["Dill pickles","Pantry",null,null,null],
  shrimp: ["Raw shrimp, 21-25s","Frozen","Kirkland Signature Farm-Raised Raw Shrimp, Tail-On, 21-25-count per Pound, 2 lbs",907,"2 lb bag, peeled & deveined, tail-on, 21-25 per lb (Item 25551)"],
  avocado: ["Avocado","Produce","Avocados (bagged)",null,"bag; count and size not verified"],
  tenderloin: ["Beef tenderloin (filet)","Meat","Kirkland Signature USDA Prime Beef Loin Tenderloin Steak (pre-cut filets; read the grade on the label)",null,"pre-cut filet steaks, sold by the lb"],
  asparagus: ["Asparagus","Produce","Asparagus, 2.25 lbs",1021,"2.25 lb bunch"],
  ahi: ["Ahi tuna, sushi-grade","Seafood","Kirkland Signature Fresh Wild Ahi Tuna",null,"random weight, sold by the lb"],
  ponzu: ["Ponzu","Pantry",null,null,"10 oz (Publix)"],
  cottage: ["Cottage cheese, low-fat 2%","Dairy & eggs","Daisy Cottage Cheese, Low Fat, Small Curd, 2% Milkfat, 3 lb",1361,"3 lb tub"],
  pineapple: ["Pineapple","Produce",null,null,"not checked"],
  banana: ["Banana","Produce",null,null,"not checked"],
};
const STAPLES = ["salt","blackPepper","paprika","garlicPowder","cinnamon","oliveOil","avocadoOil","sesameOil","soySauce","fishSauce","sriracha","dijon","honey","ponzu","horseradish","water","brownSugar","chickenStock","peanutButter","pickles","garlic","riceWhite","oats","wildRice","riceNoodles","granola","wheyAscent","pineappleJuice"];
// RECIPES: portion/sauce lines are [food key, grams (ml for stock and ponzu), flag]; flag 1 = a share of the pan, a string = the cup it goes in.
// sizes: grams per portion for TRIM / GAIN (MAINTAIN is the line itself); only starch and added fat change, never protein.
// batch: [food id, state, grams for the recipe's portions, what it is for]
const RECIPES = [
  {
    id: "steakEggs", kind: "breakfast", name: "Steak & eggs, the morning after", slots: ["breakfast"], portions: 1, prepMin: 12, activeMin: 12, ahead: "",
    style: "The steakhouse breakfast: last night's sirloin sliced thin and flashed in a hot pan, soft-set eggs and whites, garlicky wilted spinach and browned mushrooms, 21-grain toast. Cook the steak once, eat it twice.",
    portion: [["topSirloin:cooked",80],["avocadoOil:as sold",1],["egg:raw",100],["eggWhites:as sold",80],["butter:as sold",5],["spinach:raw",80],["mushrooms/cremini:raw",80],["wholeGrainBread:as sold",87],["greenOnion:raw",5],["salt:as sold",0.6],["blackPepper:as sold",0.3]],
    sauce: [["sriracha:as sold",5,"hot sauce"]],
    sizes: {"trim":{"wholeGrainBread":55,"butter":2},"gain":{"wholeGrainBread":105,"butter":8}},
    batch: [["topSirloin","raw",100,"seared the night before with dinner, chilled whole"],["avocadoOil","as sold",1,"its share of last night's sear"],["egg","raw",100,"2 large eggs"],["eggWhites","as sold",80,""],["butter","as sold",5,"2 g mushrooms, 3 g eggs"],["spinach","raw",80,""],["mushrooms","raw",80,"Costco mini bellas"],["wholeGrainBread","as sold",87,"about 2 slices; weigh them"],["greenOnion","raw",5,""],["salt","as sold",0.6,""],["blackPepper","as sold",0.3,""],["sriracha","as sold",5,"hot sauce"]],
    method: ["The night before: sear one extra 100 g raw sirloin alongside dinner, rest it, chill it whole. Its raw weight is what you log.","Slice the cold steak 3 mm thick against the grain. Toast the bread.","Nonstick pan, high: 2 g butter, mushrooms in one layer, leave them 2 minutes to brown, toss, add the spinach and half the salt, wilt 30 s. Plate.","Same pan, medium-low: 3 g butter, the eggs and whites whisked with pepper and the rest of the salt. Push slowly with a spatula and pull them the moment no liquid egg is left (USDA: cook eggs until set).","Steak slices onto the hot side of the pan for 30 s, just to warm. Scallions over everything, sriracha weighed in its cup."],
    keeps: "Made to order. The cooked steak keeps 3 days in the fridge (eat by cook date + 3).",
    reheat: "Warm the steak slices 30 s in the hot pan; a microwave overcooks them." },
  {
    id: "bircherBowl", kind: "breakfast", name: "Greek-yogurt Bircher bowl", slots: ["breakfast"], portions: 3, prepMin: 10, activeMin: 10, ahead: "",
    style: "The Swiss-hotel breakfast built for a lifter: oats soaked overnight in Greek yogurt with certified whey, grated apple and cinnamon; berries thawed into it, toasted granola and a weighed ribbon of honey at the table.",
    portion: [["greekNonfat:as sold",250],["wheyAscent:as sold",20],["water:as sold",50,1],["oats:raw",50],["apple:raw",80],["cinnamon:as sold",1,1],["berries:as sold",120],["granola:as sold",21]],
    sauce: [["honey:as sold",9,"honey"]],
    sizes: {"trim":{"oats":45,"granola":5,"honey":6},"gain":{"oats":62,"granola":28,"honey":10}},
    batch: [["greekNonfat","as sold",750,""],["wheyAscent","as sold",60,""],["water","as sold",150,"loosens the whey"],["oats","raw",150,"dry rolled oats"],["apple","raw",240,"grated, skin on"],["cinnamon","as sold",3,""],["berries","as sold",360,"frozen Three Berry Blend, on top"],["granola","as sold",63,"in a small bag, added at the table"],["honey","as sold",27,"honey"]],
    method: ["Whisk the yogurt, whey and water until there are no lumps. Fold in the oats, cinnamon and the apple grated on a box grater, skin on.","Weigh the mix and divide it by 3 into jars. Berries on top straight from the freezer: they thaw overnight and bleed into the oats.","Granola into 3 small bags and honey into 3 cups, both weighed. They go on at the table so the granola stays crisp."],
    keeps: "3 days in the fridge (judgment, for texture: the apple browns and the oats go soft after that).",
    reheat: "Eaten cold." },
  {
    id: "hawaiianSirloin", kind: "batch", name: "Hawaiian-marinated sirloin, jasmine rice, charred broccoli", slots: ["lunch","shiftDinner","homeDinner"], portions: 4, prepMin: 50, activeMin: 30, ahead: "marinate 4-12 h",
    style: "The Hawaiian ribeye idea on lean Prime top sirloin: a pineapple-soy-ginger marinade, a hard cast-iron sear, every drop of the marinade boiled down to a lacquer, scallions; jasmine rice and broccoli roasted until the edges char.",
    portion: [["topSirloin:cooked",160],["avocadoOil:as sold",2,1],["riceWhite:cooked",262],["broccoli:raw",200],["oliveOil:as sold",4,1],["salt:as sold",0.5,1],["greenOnion:raw",5]],
    sauce: [["pineappleJuice:as sold",30,"glaze"],["soySauce/lowSodium:as sold",15,"glaze"],["brownSugar:as sold",4,"glaze"],["garlic:raw",4,"glaze"],["ginger:raw",4,"glaze"],["sesameOil:as sold",1,"glaze"],["blackPepper:as sold",0.5,"glaze"]],
    sizes: {"trim":{"riceWhite":197,"oliveOil":3},"gain":{"riceWhite":322,"oliveOil":6}},
    batch: [["topSirloin","raw",800,"2 steaks about 1¼\" thick"],["avocadoOil","as sold",8,"the sear"],["riceWhite","dry",352,"jasmine, rinsed"],["broccoli","raw",800,"florets"],["oliveOil","as sold",16,"the broccoli"],["salt","as sold",2,"the broccoli (the soy salts the steak)"],["greenOnion","raw",20,"sliced thin on the bias"],["pineappleJuice","as sold",120,"glaze"],["soySauce","as sold",60,"glaze"],["brownSugar","as sold",16,"glaze"],["garlic","raw",16,"glaze"],["ginger","raw",16,"glaze"],["sesameOil","as sold",4,"glaze"],["blackPepper","as sold",2,"glaze"]],
    method: ["Marinade: whisk the pineapple juice, soy, brown sugar, grated ginger and garlic, sesame oil and pepper. Steaks and marinade into a zip bag, air pressed out, 4-12 h in the fridge (any longer and the pineapple turns the surface mushy).","Rice: rinse until the water runs clear, cook (rice cooker or the bag's ratio), then weigh the whole cooked pot.","Broccoli: 450 °F, toss with the olive oil and salt, one layer on a sheet pan (two pans if crowded), 18-20 min until the tips char.","Steak: lift it out and pat it dry; keep every drop of the marinade. Smoking-hot cast iron, avocado oil, 3-4 min a side to 130 °F for medium-rare (or 145 °F plus a 3-min rest, USDA's line). Rest 10 min.","Glaze: pour the marinade into the hot pan and bring it to a rolling boil (FSIS: marinade that touched raw meat is boiled before it goes on cooked food), then reduce it to a syrupy lacquer, about 120 g.","Slice the steak ½ cm thick against the grain and brush it with the glaze. Weigh each component and divide it by 4: steak, rice, broccoli, the rest of the glaze, scallions over the top."],
    keeps: "Eat by cook date + 3 days (FSIS's hard limit is 4). Cool the rice fast in shallow boxes.",
    reheat: "Covered, microwave to 165 °F (rice steaming); the glaze keeps the steak from drying out. Or eat the steak cold over the hot rice." },
  {
    id: "thaiSteakNoodle", kind: "batch", name: "Thai steak & noodle salad, peanut-lime dressing", slots: ["lunch","shiftDinner","homeDinner"], portions: 4, prepMin: 45, activeMin: 35, ahead: "dry-brine 1-24 h",
    style: "The Thai steak salad from a high-end grill: flank dry-brined and seared hard, sliced thin and dressed with lime and fish sauce while warm, cold rice noodles, crunchy cabbage, cucumber and pepper, a fistful of mint, cilantro and scallion, peanuts; the peanut-lime dressing on the side.",
    portion: [["flank:cooked",154],["salt:as sold",0.5,1],["avocadoOil:as sold",2,1],["fishSauce:as sold",3,1],["limeJuice:raw",10,1],["riceNoodles:cooked",222],["sesameOil:as sold",1,1],["cabbage:raw",100],["cucumber:raw",60],["bellPepper:raw",60],["greenOnion:raw",10],["cilantro:raw",5,1],["mint:raw",3,1],["peanuts:as sold",6]],
    sauce: [["peanutButter:as sold",12,"dressing"],["water:as sold",15,"dressing"],["limeJuice:raw",18,"dressing"],["fishSauce:as sold",6,"dressing"],["soySauce/lowSodium:as sold",5,"dressing"],["honey:as sold",6,"dressing"],["sriracha:as sold",5,"dressing"],["garlic:raw",2,"dressing"],["ginger:raw",2,"dressing"]],
    sizes: {"trim":{"riceNoodles":185,"peanuts":0,"peanutButter":10},"gain":{"riceNoodles":276,"peanuts":12,"peanutButter":12}},
    batch: [["flank","raw",760,"one flank, about 1.7 lb"],["salt","as sold",2,"dry brine"],["avocadoOil","as sold",8,"the sear"],["fishSauce","as sold",12,"tossed with the warm sliced steak"],["limeJuice","raw",40,"5 g on the steak, 5 g on the noodles"],["riceNoodles","dry",264,"rice vermicelli or pad-thai sticks"],["sesameOil","as sold",4,"keeps the noodles from clumping"],["cabbage","raw",400,"shredded fine (red and green)"],["cucumber","raw",240,"matchsticks"],["bellPepper","raw",240,"matchsticks"],["greenOnion","raw",40,""],["cilantro","raw",20,""],["mint","raw",12,""],["peanuts","as sold",24,"chopped"],["peanutButter","as sold",48,"dressing"],["water","as sold",60,"dressing"],["limeJuice","raw",72,"dressing"],["fishSauce","as sold",24,"dressing"],["soySauce","as sold",20,"dressing"],["honey","as sold",24,"dressing"],["sriracha","as sold",20,"dressing"],["garlic","raw",8,"dressing"],["ginger","raw",8,"dressing"]],
    method: ["Dry brine: salt the flank, uncovered on a rack in the fridge, 1-24 h.","Dressing: whisk the peanut butter with the warm water until smooth, then the lime, fish sauce, soy, honey, sriracha, grated garlic and ginger. Weigh into 4 cups.","Noodles: cook to the pack's time, rinse under cold water until it runs clear, drain hard, toss with the sesame oil and 20 g of the lime. Weigh and divide by 4.","Veg: cabbage shaved fine, cucumber and pepper in matchsticks, scallions on the bias, herbs picked. Divide by 4.","Steak: smoking-hot cast iron, avocado oil, about 4 min a side to 130 °F. Rest 10 min, slice thin across the grain on a sharp bias, toss with the fish sauce and the last 20 g of lime. Weigh and divide by 4.","Box it: noodles, veg and herbs, steak on top, peanuts in a corner, dressing cup on the side. Toss it all together at the meal."],
    keeps: "Eat by cook date + 3 days; the dressing keeps as long.",
    reheat: "Eaten cold: this is the shift-bag meal. If the noodles have firmed up, the dressing and 10 minutes loosen them." },
  {
    id: "salmonWildRice", kind: "batch", name: "Roasted sockeye, lemon-herb wild rice, blistered green beans", slots: ["lunch","shiftDinner","homeDinner"], portions: 2, prepMin: 55, activeMin: 25, ahead: "thaw the fish overnight in the fridge",
    style: "The roasted salmon plate: wild sockeye roasted hot and finished with lemon butter, a wild-and-jasmine rice pilaf cooked in stock and folded with lemon zest, parsley and scallions, green beans blistered in a hot oven.",
    portion: [["sockeye:raw",195],["avocadoOil:as sold",3,1],["salt:as sold",1.2,1],["wildRice:cooked",177],["riceWhite:cooked",128],["chickenStock:as sold",150,1],["oliveOil:as sold",7,1],["lemonZest:raw",1,1],["lemonJuice:raw",10,1],["parsley:raw",5,1],["greenOnion:raw",5],["greenBeans:raw",180]],
    sauce: [["butter:as sold",5,"lemon butter"],["lemonJuice:raw",5,"lemon butter"]],
    sizes: {"trim":{"wildRice":149,"riceWhite":98,"oliveOil":6,"butter":3},"gain":{"wildRice":205,"riceWhite":161,"oliveOil":9,"butter":7}},
    batch: [["sockeye","raw",390,"one large frozen portion each (about 7 oz); log its own raw weight"],["avocadoOil","as sold",6,"the fish"],["salt","as sold",2.4,"fish and beans"],["wildRice","dry",100,"100% wild rice (not a blend)"],["riceWhite","dry",86,"jasmine"],["chickenStock","as sold",300,"the wild rice cooking liquid","ml"],["oliveOil","as sold",14,"4 g pilaf, 3 g beans"],["lemonZest","raw",2,""],["lemonJuice","raw",20,"the pilaf"],["parsley","raw",10,""],["greenOnion","raw",10,""],["greenBeans","raw",360,""],["butter","as sold",10,"lemon butter"],["lemonJuice","raw",10,"lemon butter"]],
    method: ["The night before: move the sockeye from the freezer to the fridge on a plate.","Pilaf: simmer the wild rice in the stock, covered, 45-50 min until the grains split open (top up with water if it runs dry). Cook the jasmine separately. Drain, combine, then fold in 8 g olive oil, the zest, lemon juice, parsley and scallions. Weigh and divide by 2.","Beans: 450 °F, toss with 6 g olive oil and a pinch of the salt, 12-15 min until blistered.","Fish: weigh each portion raw (that is what you log), pat dry, salt it 15 min ahead. Oiled sheet pan, 425 °F, 8-12 min to 145 °F: the thick end flakes and is just opaque.","Lemon butter: melt the butter with the lemon juice and spoon it over the fish as it comes out."],
    keeps: "Eat it the day it is cooked or the next day (the prep calendar's seafood rule; FDA allows 3-4 days for cooked fish).",
    reheat: "Best cold: salmon dries out when reheated. If you want it hot, cover it and take the box to 165 °F." },
  {
    id: "roastChicken", kind: "batch", name: "Rotisserie-style roast chicken, crispy potatoes, lemon-parmesan kale", slots: ["lunch","shiftDinner","homeDinner"], portions: 4, prepMin: 70, activeMin: 30, ahead: "dry-brine the night before",
    style: "The rotisserie chicken plate made at home, not bought: breast and thigh dry-brined under a smoked-paprika and garlic rub and roasted hot until the edges catch, Yukon Golds parboiled and roasted until shattering, a lemony massaged kale salad with Parmigiano and toasted sourdough crumbs.",
    portion: [["chickenBreast:cooked",86],["chickenThigh:cooked",64],["salt:as sold",2.2,1],["paprika:as sold",1,1],["garlicPowder:as sold",1,1],["blackPepper:as sold",0.5,1],["potatoYukon:cooked",340],["avocadoOil:as sold",8,1],["kale:raw",70],["parmesan:as sold",8],["sourdough:as sold",20]],
    sauce: [["lemonJuice:raw",10,"lemon dressing"],["oliveOil:as sold",5,"lemon dressing"],["garlic:raw",1,"lemon dressing"],["lemonZest:raw",0.5,"lemon dressing"]],
    sizes: {"trim":{"potatoYukon":271,"avocadoOil":7,"sourdough":10},"gain":{"potatoYukon":405,"avocadoOil":10,"sourdough":25}},
    batch: [["chickenBreast","raw",480,""],["chickenThigh","raw",340,""],["salt","as sold",8.8,"1.5 g dry brine, 0.7 g potatoes and kale"],["paprika","as sold",4,""],["garlicPowder","as sold",4,""],["blackPepper","as sold",2,""],["potatoYukon","raw",1680,"4 cm chunks"],["avocadoOil","as sold",32,"2 g chicken, 6 g potatoes"],["kale","raw",280,"Costco Power Greens or lacinato kale"],["parmesan","as sold",32,"Parmigiano, microplaned"],["sourdough","as sold",80,"toasted crumbs"],["lemonJuice","raw",40,"lemon dressing"],["oliveOil","as sold",20,"lemon dressing"],["garlic","raw",4,"lemon dressing"],["lemonZest","raw",2,"lemon dressing"]],
    method: ["Dry brine (the night before, or at least 1 h): pat the chicken dry and rub it with 6 g of the salt, the paprika, garlic powder and pepper. Uncovered on a rack in the fridge.","Potatoes: boil the chunks in plain water 8-10 min until a knife meets little resistance, drain, steam-dry 5 min, then shake the pot to rough up the edges. Toss with 24 g avocado oil onto a preheated sheet pan, 450 °F, 35-40 min, turning once. Salt them (weighed) as they come out.","Chicken: brush with the remaining 8 g avocado oil, on a rack at 425 °F, 20-25 min to 165 °F in the thickest piece. Rest 5 min and slice; mix white and dark meat together.","Crumbs: tear the sourdough, pulse it to coarse crumbs, toast in a dry pan until golden.","Kale: strip the stems, slice thin, massage 1 minute with a pinch of the salt. Dressing (lemon juice, zest, grated garlic, olive oil) into 4 cups. Parmesan and crumbs go on at the meal.","Weigh the chicken, the potatoes and the kale, and divide each by 4."],
    keeps: "Eat by cook date + 3 days. Massaged kale holds 3 days undressed; keep the dressing in its cup.",
    reheat: "Chicken and potatoes: air fryer or oven at 375 °F for 6-8 min at home (they crisp again), or covered in the microwave to 165 °F at work. The salad is eaten cold." },
  {
    id: "frenchDip", kind: "batch", name: "French dip, onion jus, horseradish cream", slots: ["lunch","shiftDinner","homeDinner"], portions: 4, prepMin: 100, activeMin: 30, ahead: "dry-brine overnight; the roast is mostly hands-off",
    style: "The French dip, home edition: top round dry-brined overnight, slow-roasted to medium-rare and seared, chilled and sliced paper-thin; buttered toasted sourdough; a deep onion-garlic jus built in the roasting pan; horseradish cream; a crisp romaine side with Dijon vinaigrette.",
    portion: [["topRound:cooked",126],["salt:as sold",0.8,1],["blackPepper:as sold",1,1],["garlicPowder:as sold",1,1],["avocadoOil:as sold",2,1],["sourdough:as sold",125],["butter:as sold",6],["romaine:raw",100],["cucumber:raw",50]],
    sauce: [["chickenStock:as sold",160,"jus"],["onion:raw",25,"jus"],["garlic:raw",3,"jus"],["soySauce/lowSodium:as sold",4,"jus"],["greekNonfat:as sold",20,"horseradish cream"],["horseradish:as sold",8,"horseradish cream"],["lemonJuice:raw",2,"horseradish cream"],["lemonJuice:raw",6,"vinaigrette"],["dijon:as sold",4,"vinaigrette"],["oliveOil:as sold",6,"vinaigrette"]],
    sizes: {"trim":{"sourdough":110,"butter":2,"oliveOil":5},"gain":{"sourdough":145,"butter":9,"oliveOil":8}},
    batch: [["topRound","raw",700,"one London broil roast, about 1.5 lb (cut a big Costco pack into roasts and freeze the rest)"],["salt","as sold",3.2,"dry brine"],["blackPepper","as sold",4,""],["garlicPowder","as sold",4,""],["avocadoOil","as sold",8,"the sear"],["sourdough","as sold",500,"about 2 big slices, toasted"],["butter","as sold",24,"on the bread, weighed per portion"],["romaine","raw",400,""],["cucumber","raw",200,""],["chickenStock","as sold",640,"jus","ml"],["onion","raw",100,"jus"],["garlic","raw",12,"jus"],["soySauce","as sold",16,"jus"],["greekNonfat","as sold",80,"horseradish cream"],["horseradish","as sold",32,"horseradish cream"],["lemonJuice","raw",8,"horseradish cream"],["lemonJuice","raw",24,"vinaigrette"],["dijon","as sold",16,"vinaigrette"],["oliveOil","as sold",24,"vinaigrette"]],
    method: ["Dry brine: rub the roast with the salt, pepper and garlic powder; uncovered on a rack in the fridge overnight.","Roast: on a rack at 250 °F until the center reads 125-128 °F, about 60-75 min, then sear all over in smoking cast iron with the avocado oil (final 130 °F, medium-rare; USDA's line for roasts is 145 °F plus a 3-min rest). Rest 15 min, then chill it whole: cold beef slices paper-thin.","Jus: in the roasting pan, sweat the sliced onion and garlic in the drippings, add the stock and soy, scrape up the fond, simmer about 10 min to two-thirds. Strain, weigh into 4 cups, and freeze 2 of them the same day (jus keeps only 1-2 days).","Horseradish cream: Greek yogurt, horseradish and 8 g lemon juice. Vinaigrette: Dijon, 24 g lemon juice and the olive oil, whisked. Weigh each into 4 cups.","Slice the cold beef across the grain as thin as you can, weigh it and divide by 4.","To serve: butter and toast the bread; bring the jus to a rolling boil; dip the beef 10 s, pile it on the toast, dip as you eat. Romaine and cucumber with the vinaigrette on the side."],
    keeps: "Beef: eat by cook date + 3 days. Jus keeps 1-2 days: freeze half on prep day and thaw it in the fridge the night before.",
    reheat: "At home: jus to a rolling boil, beef dipped in it. On a shift: boiling jus into a thermos preheated with boiling water (it stays at 140 °F or above), cold beef and the toast packed separately; dip the cold beef in the hot jus at the break." },
  {
    id: "smashBurgerBowl", kind: "batch", name: "Cast-iron smash burger bowl, special sauce", slots: ["lunch","shiftDinner","homeDinner"], portions: 4, prepMin: 60, activeMin: 40, ahead: "",
    style: "The cheeseburger, rebuilt for the box: 93/7 smashed thin on screaming cast iron with shaved onion pressed into the crust, sharp cheddar melted over, oven fries from real russets, romaine, tomato and dill pickles, a Greek-yogurt special sauce.",
    portion: [["beef93:cooked",138],["onion:raw",40],["salt:as sold",1.4,1],["blackPepper:as sold",0.5,1],["cheddar:as sold",15],["potatoRusset:cooked",284],["avocadoOil:as sold",9,1],["paprika:as sold",0.5,1],["romaine:raw",100],["tomatoes:raw",60],["pickles:as sold",30]],
    sauce: [["greekNonfat:as sold",30,"special sauce"],["dijon:as sold",6,"special sauce"],["honey:as sold",3,"special sauce"],["sriracha:as sold",4,"special sauce"],["lemonJuice:raw",3,"special sauce"],["pickles:as sold",10,"special sauce"],["paprika:as sold",0.3,"special sauce"],["garlicPowder:as sold",0.3,"special sauce"]],
    sizes: {"trim":{"potatoRusset":207,"avocadoOil":6},"gain":{"potatoRusset":356,"avocadoOil":11}},
    batch: [["beef93","raw",800,"2 balls of 100 g raw; weigh the cooked patties"],["onion","raw",160,"shaved paper-thin, smashed into the patties"],["salt","as sold",5.6,"0.6 g patties, 0.8 g fries"],["blackPepper","as sold",2,""],["cheddar","as sold",60,"Kirkland shredded sharp cheddar"],["potatoRusset","raw",1400,"1 cm batons"],["avocadoOil","as sold",36,"7 g fries, 2 g the griddle"],["paprika","as sold",2,"fries"],["romaine","raw",400,""],["tomatoes","raw",240,""],["pickles","as sold",120,"dill pickle chips"],["greekNonfat","as sold",120,"special sauce"],["dijon","as sold",24,"special sauce"],["honey","as sold",12,"special sauce"],["sriracha","as sold",16,"special sauce"],["lemonJuice","raw",12,"special sauce"],["pickles","as sold",40,"special sauce"],["paprika","as sold",1.2,"special sauce"],["garlicPowder","as sold",1.2,"special sauce"]],
    method: ["Fries: russet batons soaked in cold water 30 min, dried very well, tossed with 28 g avocado oil and the paprika; preheated sheet pan, 450 °F, 30-35 min, turned once. Salt (weighed) out of the oven.","Patties: 8 cold balls of 100 g raw beef, 2 per box. Onion shaved paper-thin on a mandoline.","Smash: cast iron smoking hot with a film of the remaining oil. Ball down, a mound of onion on top, smash it flat hard under parchment with a stiff spatula, salt and pepper. 2 min until the edge is mahogany, scrape and flip (the onions are now underneath), cheddar on, 45 s more. Ground beef goes to 160 °F.","Special sauce: Greek yogurt, Dijon, honey, sriracha, lemon, minced pickle, paprika and garlic powder. Weigh into 4 cups.","Weigh the cooked patties and the fries and divide each by 4. Cold side: romaine, tomato and pickles."],
    keeps: "Eat by cook date + 3 days. Raw ground beef keeps only 1-2 days, so cook it on prep day.",
    reheat: "Patties and fries: air fryer at 375 °F for 4-5 min at home (crisp again), or covered in the microwave to 165 °F at work. Salad and sauce cold." },
  {
    id: "shrimpLouie", kind: "batch", name: "Shrimp Louie, olive-oil grilled sourdough", slots: ["lunch","shiftDinner","homeDinner"], portions: 2, prepMin: 30, activeMin: 25, ahead: "thaw the shrimp overnight in the fridge",
    style: "The San Francisco classic done the way a grill does it: jumbo shrimp poached and chilled hard, crisp romaine, tomato, cucumber, avocado and a jammy egg, a Louie dressing made on Greek yogurt with chili, lemon and horseradish, sourdough brushed with olive oil and grilled hard.",
    portion: [["shrimp:cooked",120],["egg:raw",50],["lemonJuice:raw",5,1],["romaine:raw",120],["tomatoes:raw",80],["cucumber:raw",60],["avocado:raw",60],["greenOnion:raw",5],["sourdough:as sold",130],["oliveOil:as sold",5]],
    sauce: [["greekNonfat:as sold",40,"Louie dressing"],["sriracha:as sold",6,"Louie dressing"],["lemonJuice:raw",6,"Louie dressing"],["dijon:as sold",3,"Louie dressing"],["honey:as sold",2,"Louie dressing"],["horseradish:as sold",3,"Louie dressing"],["pickles:as sold",10,"Louie dressing"],["paprika:as sold",0.3,"Louie dressing"],["salt:as sold",0.3,"Louie dressing"],["water:as sold",5,"Louie dressing"]],
    sizes: {"trim":{"sourdough":100,"avocado":50,"oliveOil":4},"gain":{"sourdough":145,"avocado":75,"oliveOil":8}},
    batch: [["shrimp","cooked",240,"cooked, tails off (from about 300 g raw 21-25s per batch)"],["egg","raw",100,"1 large, 9-minute egg"],["lemonJuice","raw",10,"over the shrimp and avocado"],["romaine","raw",240,""],["tomatoes","raw",160,""],["cucumber","raw",120,""],["avocado","raw",120,""],["greenOnion","raw",10,""],["sourdough","as sold",260,""],["oliveOil","as sold",10,"brushed on the bread, weighed per portion"],["greekNonfat","as sold",80,"Louie dressing"],["sriracha","as sold",12,"Louie dressing"],["lemonJuice","raw",12,"Louie dressing"],["dijon","as sold",6,"Louie dressing"],["honey","as sold",4,"Louie dressing"],["horseradish","as sold",6,"Louie dressing"],["pickles","as sold",20,"Louie dressing"],["paprika","as sold",0.6,"Louie dressing"],["salt","as sold",0.6,"Louie dressing"],["water","as sold",10,"Louie dressing"]],
    method: ["The night before: move the frozen raw shrimp to the fridge.","Shrimp: bring 2 L of water to a boil with two lemon halves (no salt), take it off the heat, add the shrimp, 3-4 min until pink and opaque, then straight into ice water. Peel the tails, pat dry, weigh: that cooked weight is what you log. Quick option: Costco's cooked 50-70s, thawed in the fridge.","Eggs: into boiling water for 9 min, then an ice bath; peel.","Dressing: whisk the Greek yogurt, sriracha, lemon, Dijon, honey, horseradish, minced pickle, paprika, salt and water. Weigh into 2 cups.","Boxes: romaine, tomato wedges, cucumber, the egg halved, shrimp on top. Slice the avocado at the meal, or turn it in the lemon so it holds a day.","Bread: brush with the olive oil and grill or toast it hard."],
    keeps: "Eat it the day it is made or the next day (seafood rule). Dressing in its own cup.",
    reheat: "Eaten cold." },
  {
    id: "filetPlate", kind: "plate", name: "Center-cut filet, baked russet, charred asparagus", slots: ["homeDinner"], portions: 1, prepMin: 70, activeMin: 20, ahead: "dry-brine 1-24 h; the potato bakes for an hour hands-off",
    style: "The steakhouse plate: a center-cut filet dry-brined, seared hard and butter-basted with garlic; a baked russet with a crackling skin, Greek-yogurt \"sour cream\", butter and scallions; asparagus charred with lemon.",
    portion: [["tenderloin:raw",195],["salt:as sold",2],["blackPepper:as sold",0.7],["avocadoOil:as sold",3],["butter:as sold",10],["garlic:raw",3],["potatoRusset:raw",390],["asparagus:raw",180],["oliveOil:as sold",3],["lemonJuice:raw",5]],
    sauce: [["greekNonfat:as sold",40,"potato cream"],["greenOnion:raw",6,"potato cream"]],
    sizes: {"trim":{"potatoRusset":300,"butter":6,"oliveOil":3},"gain":{"potatoRusset":460,"butter":13,"oliveOil":5}},
    batch: [["tenderloin","raw",195,"one center-cut filet; weigh it raw and log that"],["salt","as sold",2,"1.2 g dry brine, the rest potato and asparagus"],["blackPepper","as sold",0.7,""],["avocadoOil","as sold",3,"the sear"],["butter","as sold",10,"6 g baste, 4 g in the potato"],["garlic","raw",3,"a smashed clove in the baste"],["potatoRusset","raw",390,"one russet; weigh it raw before baking and log that"],["asparagus","raw",180,""],["oliveOil","as sold",3,"the asparagus"],["lemonJuice","raw",5,""],["greekNonfat","as sold",40,"potato cream"],["greenOnion","raw",6,"potato cream"]],
    method: ["Dry brine: salt the filet (1.2 g) on a rack in the fridge, uncovered, 1-24 h. Out of the fridge 30 min before it cooks.","Potato: scrub, prick, rub with a few drops of water and a pinch of the salt, bake straight on the rack at 425 °F for 50-60 min until the skin crackles and a skewer slides through.","Asparagus: snap off the woody ends, toss with the olive oil and a pinch of salt, 450 °F or a grill pan, 6-8 min until charred in spots; lemon over.","Filet: smoking-hot cast iron with the avocado oil, 3 min a side plus the edges. Drop to medium, add 6 g butter and the smashed garlic, tilt the pan and baste 1 min to 125-130 °F for medium-rare (or 145 °F plus a 3-min rest, USDA). Rest 5 min.","Split the potato, fluff it with the last 4 g butter, and top it with the Greek yogurt and scallions."],
    keeps: "Made to order. Sear a second 100 g sirloin in the same pan for tomorrow's steak & eggs.",
    reheat: "Not reheated: it is cooked to order." },
  {
    id: "ahiPonzu", kind: "plate", name: "Seared ahi, shiitake ponzu, jasmine rice, sesame-lime slaw", slots: ["lunch","homeDinner"], portions: 1, prepMin: 25, activeMin: 20, ahead: "rice: use a cooked pot or add 15 min",
    style: "The ahi plate: sushi-grade yellowfin pressed into cracked pepper and seared rare in a smoking pan, shiitakes glazed with ponzu, ginger and sesame, jasmine rice, a crunchy cabbage-cucumber slaw with lime and cilantro, sliced avocado.",
    portion: [["ahi:raw",180],["blackPepper:as sold",1],["salt:as sold",0.5],["avocadoOil:as sold",4],["riceWhite:cooked",283],["cabbage:raw",120],["cucumber:raw",50],["cilantro:raw",4],["greenOnion:raw",8],["avocado:raw",45]],
    sauce: [["mushrooms/shiitake:raw",50,"shiitake ponzu"],["sesameOil:as sold",3,"shiitake ponzu"],["ginger:raw",3,"shiitake ponzu"],["garlic:raw",2,"shiitake ponzu"],["ponzu:as sold",25,"shiitake ponzu"],["limeJuice:raw",12,"slaw dressing"],["honey:as sold",3,"slaw dressing"],["sesameOil:as sold",2,"slaw dressing"]],
    sizes: {"trim":{"riceWhite":221,"avocado":30},"gain":{"riceWhite":334,"avocado":65}},
    batch: [["ahi","raw",180,"sushi-grade, previously frozen is best for rare (FDA)"],["blackPepper","as sold",1,"cracked, the crust"],["salt","as sold",0.5,""],["avocadoOil","as sold",4,"the sear"],["riceWhite","dry",95,"jasmine (cook it, or take this share of a bigger pot by the batch method)"],["cabbage","raw",120,""],["cucumber","raw",50,""],["cilantro","raw",4,""],["greenOnion","raw",8,""],["avocado","raw",45,""],["mushrooms","raw",50,"shiitake ponzu"],["sesameOil","as sold",3,"shiitake ponzu"],["ginger","raw",3,"shiitake ponzu"],["garlic","raw",2,"shiitake ponzu"],["ponzu","as sold",25,"shiitake ponzu","ml"],["limeJuice","raw",12,"slaw dressing"],["honey","as sold",3,"slaw dressing"],["sesameOil","as sold",2,"slaw dressing"]],
    method: ["Rice: cook it, or weigh out this plate's share of a bigger pot (dry grams × the pot's cooked-to-dry ratio).","Slaw: shave the cabbage, cut the cucumber in matchsticks, add cilantro and scallion; dress with the lime, honey and 2 g sesame oil.","Shiitake ponzu: 3 g sesame oil in a hot pan, sliced shiitakes 3 min until browned, ginger and garlic 30 s, then the ponzu; let it bubble 20 s and take it off the heat.","Ahi: pat it bone-dry, press the cracked pepper and salt into every side. Smoking-hot pan, avocado oil, 45-60 s a side and the edges: a seared shell, red center. Rest 1 min and slice 1 cm thick.","Plate: rice, slaw, sliced ahi, the shiitakes and their juices spooned over the fish, avocado alongside."],
    keeps: "Same day only, never packed: tuna that warms up can form histamine that cooking does not destroy (FDA Bad Bug Book). Thaw frozen ahi overnight in the fridge.",
    reheat: "Not reheated: eaten as soon as it is seared." },
  {
    id: "cottagePineapple", kind: "snack", name: "Cottage cheese, pineapple, mint, cracked pepper", slots: ["snack"], portions: 3, prepMin: 10, activeMin: 10, ahead: "",
    style: "A chef's fruit trick: sweet pineapple, torn mint and a crack of black pepper over 2% cottage cheese. Casein-heavy, cold, and it rides the shift bag well.",
    portion: [["cottage:as sold",250],["pineapple:raw",170],["mint:raw",2],["blackPepper:as sold",0.2]],
    sauce: [],
    sizes: {},
    batch: [["cottage","as sold",750,""],["pineapple","raw",510,"fresh, 1.5 cm dice"],["mint","raw",6,""],["blackPepper","as sold",0.6,""]],
    method: ["Dice the pineapple. Weigh 250 g cottage cheese and 170 g pineapple into each of 3 containers.","Mint torn and pepper cracked over it at the meal."],
    keeps: "3 days in the fridge (judgment: cut pineapple goes soft after that).",
    reheat: "Eaten cold." },
  {
    id: "yogurtBerries", kind: "snack", name: "Greek yogurt, berries, honey, granola", slots: ["snack"], portions: 3, prepMin: 5, activeMin: 5, ahead: "",
    style: "Thick 0% Greek yogurt, a cup of three-berry blend thawed into it overnight, cinnamon, a weighed drizzle of honey and a spoon of granola for crunch.",
    portion: [["greekNonfat:as sold",250],["berries:as sold",150],["cinnamon:as sold",0.5,1],["granola:as sold",10]],
    sauce: [["honey:as sold",12,"honey"]],
    sizes: {},
    batch: [["greekNonfat","as sold",750,""],["berries","as sold",450,"frozen Three Berry Blend"],["cinnamon","as sold",1.5,""],["granola","as sold",30,"in a small bag"],["honey","as sold",36,"honey"]],
    method: ["Weigh the yogurt and the frozen berries into 3 containers (the berries thaw by morning); cinnamon over.","Granola into small bags and honey into cups, added at the meal."],
    keeps: "3 days in the fridge.",
    reheat: "Eaten cold." },
  {
    id: "wheyShake", kind: "snack", name: "Certified whey shake + banana", slots: ["preLift","snack"], portions: 1, prepMin: 2, activeMin: 2, ahead: "",
    style: "The pre-lift and the shift-bag backup: one rounded scoop of Informed Sport certified whey shaken with cold water, a banana on the side. The powder is weighed, never a heaped scoop.",
    portion: [["wheyAscent:as sold",33],["water:as sold",350],["banana:raw",118]],
    sauce: [],
    sizes: {},
    batch: [["wheyAscent","as sold",33,"1 rounded scoop, weighed"],["water","as sold",350,"cold"],["banana","raw",118,"1 medium, peeled"]],
    method: ["Weigh 33 g whey into a shaker (scoops vary about 10%), add 350 g cold water, shake 20 s. Banana alongside.","For the shift bag: the powder in a dry shaker, water added at the break. Once mixed, the 2-hour rule applies."],
    keeps: "Powder sealed and dry. Once mixed, drink it within 2 hours.",
    reheat: "—" },
];
const KITCHEN = {"split":"Weigh the raw or dry batch, cook it, then weigh each cooked component and divide it by the number of portions. Every container gets 1/N of every component, so each portion carries exactly 1/N of the batch whatever the cooking yield; the cooked grams listed are what to expect.","weighRaw":"Single pieces (a filet, a sockeye portion, a whole baked potato) are weighed and logged raw.","fats":"Oil, butter, salt and spices are weighed into the pan and counted in full, including what stays in the pan (errs slightly high).","sauces":"Sauces and dressings are weighed into lidded cups, one per portion, and eaten from the cup: 2-oz cups up to about 55 g, 4-oz above that; the French dip jus goes in an 8-oz cup (or the thermos).","label":"Label every container: recipe, size, cook date, eat-by date (cook date + 3 days; seafood + 1 day; seared ahi never stored).","sizes":"TRIM / MAINTAIN / GAIN change only the starch and the added fat. The method's grams are for MAINTAIN; `sizes` lists the other two, and a batch is cooked at one size (the current mode).","log":"Log before eating: one tap on the prepped portion. Anything not in a recipe is weighed and logged as its own entry."};
// ==/HOME-DATA==
// ── The plan (v65): zero restaurant food. Every meal is one of the recipes above at a weighed size, its
// macros computed from FOOD at load (never typed). A week has two cooks (Sunday for Mon-Wed, Wednesday for
// Thu-Sat) so every batch portion is eaten by cook date + 3 (FSIS: 3-4 days); Sunday eats fresh.
const SIZES = ["trim", "maintain", "gain"];
const foodOf = (key) => key.split(/[/:]/)[0];
function recipeMacros(r, size) {
  const sz = (r.sizes || {})[size] || {}, t = [0, 0, 0, 0, 0];
  for (const [key, g0] of [...r.portion, ...r.sauce]) {
    const v = FOOD[key]; if (!v) throw new Error(`${r.id}: no food ${key}`);
    const g = sz[foodOf(key)] != null ? sz[foodOf(key)] : g0;
    for (let i = 0; i < 5; i++) t[i] += (v[i] * g) / 100;
  }
  return { kcal: Math.round(t[0]), p: Math.round(t[1]), f: Math.round(t[2]), c: Math.round(t[3]), fib: Math.round(t[4]) };
}
const RB = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
const sized = (r) => !!(r.sizes && Object.keys(r.sizes).length);
const SIZE_LABEL = { trim: "trim", maintain: "maintain", gain: "gain" };
// MEALS: every recipe at each of its sizes, plus a bare certified-whey shake for a deep trim
const MEALS = [];
for (const r of RECIPES) for (const s of sized(r) ? SIZES : ["maintain"])
  MEALS.push({ id: sized(r) ? `${r.id}.${s}` : r.id, recipe: r.id, size: sized(r) ? s : null, kind: r.kind, slots: r.slots, name: sized(r) ? `${r.name} · ${SIZE_LABEL[s]}` : r.name, ...recipeMacros(r, s) });
{ const v = FOOD["wheyAscent:as sold"], g = 33;
  MEALS.push({ id: "wheyOnly", recipe: null, size: null, kind: "snack", slots: ["snack"], name: "Certified whey, 33 g in water (no banana)", note: "The deep-trim snack", kcal: Math.round(v[0] * g / 100), p: Math.round(v[1] * g / 100), f: Math.round(v[2] * g / 100), c: Math.round(v[3] * g / 100), fib: Math.round(v[4] * g / 100) }); }
const MB = Object.fromEntries(MEALS.map((m) => [m.id, m]));
const mealOf = (rid, size) => MB[sized(RB[rid]) ? `${rid}.${size || "maintain"}` : rid];
const mealById = (id) => MB[id] || null;
const byId = mealById;
// The day's slots by day type: [slot, time, label, kind]. Shift days: the last two meals travel in the cold bag.
const DAY = {
  shift: [["pre", "6:10", "Pre-lift", "preLift"], ["bfast", "8:45", "Post-lift breakfast", "breakfast"], ["lunch", "12:30", "Lunch", "lunch"], ["snack", "4:00", "Before the shift", "snack"], ["dinner", "8:30", "Shift break · cold bag", "shiftDinner"]],
  off: [["pre", "6:10", "Pre-lift", "preLift"], ["bfast", "8:45", "Post-lift breakfast", "breakfast"], ["lunch", "12:30", "Lunch", "lunch"], ["snack", "4:00", "Snack", "snack"], ["dinner", "7:30", "Dinner at home", "homeDinner"]],
  rest: [["bfast", "9:00", "Breakfast", "breakfast"], ["lunch", "1:00", "Lunch", "lunch"], ["snack", "4:00", "Snack", "snack"], ["dinner", "7:30", "Dinner", "homeDinner"], ["pre", "9:30 PM", "Evening shake", "snack"]],
};
const DAY_TITLE = { shift: "Shift day", off: "Off tonight", rest: "Rest day" };
// ROTATION (judgment): two weeks alternate so no batch dish repeats inside a week. a = Sunday's cook (Mon-Wed),
// b = Wednesday's (Thu-Sat); sun = Sunday's own fresh plates (seafood is eaten the day it is cooked).
const ROTATION = [
  { sun: { lunch: "shrimpLouie", dinner: "filetPlate" }, a: { lunch: "frenchDip", dinner: "thaiSteakNoodle" }, b: { lunch: "roastChicken", dinner: "hawaiianSirloin" } },
  { sun: { lunch: "ahiPonzu", dinner: "salmonWildRice" }, a: { lunch: "smashBurgerBowl", dinner: "roastChicken" }, b: { lunch: "hawaiianSirloin", dinner: "thaiSteakNoodle" } },
];
const EPOCH = "2026-11-01"; // a Sunday: week 1 of the rotation
const dowOf = (dk) => new Date(dkMs(dk)).getUTCDay();
const sundayOf = (dk) => addDays(dk, -dowOf(dk));
const weekIndex = (dk) => ((Math.round((dkMs(sundayOf(dk)) - dkMs(EPOCH)) / (7 * 86400000)) % 2) + 2) % 2;
// the usual day type: Sunday rests; a weekday in his usual shift days works; an override on the day wins
function dayType(dk, override, shiftDays) {
  if (override && DAY[override]) return override;
  const d = dowOf(dk);
  return d === 0 ? "rest" : (shiftDays || []).includes(d) ? "shift" : "off";
}
// MAINT-6: portion sizes, picked so a day lands nearest the target: breakfast, lunch and dinner sizes for
// each cook block (a batch is cooked at one size, so Sunday's cook and Wednesday's each get their own), the
// bare-whey snack for a deep trim, up to two extra snacks above the gain sizes.
const BFAST = ["bircherBowl", "steakEggs"], MAINS = [...new Set(ROTATION.flatMap((w) => [w.a, w.b, w.sun].flatMap((x) => [x.lunch, x.dinner])))];
const SNACKS = ["cottagePineapple", "yogurtBerries"];
function fitSizes(kcal, block) {
  const avg = (ids, s) => ids.reduce((a, id) => a + mealOf(id, s).kcal, 0) / ids.length;
  const Ls = block ? [block.lunch] : MAINS, Ds = block ? [block.dinner] : MAINS;
  const pre = MB.wheyShake.kcal, snack = avg(SNACKS), lean = MB.wheyOnly.kcal, extras = [0, MB.wheyShake.kcal, MB.wheyShake.kcal + MB.cottagePineapple.kcal];
  let best = null;
  for (const b of SIZES) for (const l of SIZES) for (const d of SIZES) for (const lz of [false, true]) for (let x = 0; x < extras.length; x++) {
    if (lz && x) continue;
    const tot = pre + (lz ? lean : snack) + avg(BFAST, b) + avg(Ls, l) + avg(Ds, d) + extras[x];
    const mixed = new Set([b, l, d]).size - 1, cost = Math.abs(tot - kcal) + (lz ? 60 : 0) + x * 60 + mixed * 8;
    if (!best || cost < best.cost) best = { b, l, d, lean: lz, extra: x, est: Math.round(tot), cost };
  }
  const { cost, ...out } = best;
  out.label = out.b === out.l && out.l === out.d ? `${out.b} portions` : `breakfast ${out.b} · lunch ${out.l} · dinner ${out.d}`;
  return out;
}
// which cook block a day eats from: Sunday its own fresh plates, Mon-Wed Sunday's cook, Thu-Sat Wednesday's
const blockOf = (dk) => { const wk = ROTATION[weekIndex(dk)], d = dowOf(dk); return d === 0 ? wk.sun : d <= 3 ? wk.a : wk.b; };
// the planned day: slots with their meal (this week's rotation, the block's sizes) and the totals
function dayPlan(type, kcal, dk) {
  const t = DAY[type] ? type : "off", dow = dowOf(dk), wk = ROTATION[weekIndex(dk)], block = blockOf(dk), sz = fitSizes(kcal, block), odd = dow % 2 === 1;
  const pick = { pre: "wheyShake", bfast: odd ? "bircherBowl" : "steakEggs", lunch: block.lunch, snack: sz.lean ? "wheyOnly" : odd ? "cottagePineapple" : "yogurtBerries", dinner: block.dinner };
  const size = { bfast: sz.b, lunch: sz.l, dinner: sz.d };
  // a plate that cannot travel (filet, ahi) never goes in the shift bag: Sunday's spare batch box goes instead
  const travel = (kind, rid) => kind === "shiftDinner" && RB[rid] && !RB[rid].slots.includes("shiftDinner");
  for (const [slot, , , kind] of DAY[t]) if (travel(kind, pick[slot])) { pick[slot] = wk.a.dinner; size[slot] = fitSizes(kcal, wk.a).d; }
  // the breakfast is made fresh (or prepped for its own days), so its size is fitted to this day's other meals
  { const rest = DAY[t].filter(([slot]) => slot !== "bfast").reduce((a, [slot]) => a + (pick[slot] === "wheyOnly" ? MB.wheyOnly : mealOf(pick[slot], size[slot])).kcal, 0)
      + (sz.extra >= 1 ? MB.wheyShake.kcal : 0) + (sz.extra >= 2 ? MB.cottagePineapple.kcal : 0);
    if (DAY[t].some(([slot]) => slot === "bfast")) size.bfast = SIZES.reduce((b, z) => (Math.abs(rest + mealOf(pick.bfast, z).kcal - kcal) < Math.abs(rest + mealOf(pick.bfast, b).kcal - kcal) ? z : b), sz.b); }
  const items = DAY[t].map(([slot, time, label, kind]) => {
    const rid = pick[slot], meal = rid === "wheyOnly" ? MB.wheyOnly : mealOf(rid, size[slot]);
    const r = RB[rid], note = kind === "shiftDinner" ? "Packed cold: two gel packs + a frozen water bottle, thermometer in the bag" : slot === "bfast" && rid === "steakEggs" ? "Steak seared on the cook day (or fresh, 6 min)" : r && r.kind === "batch" && dow !== 0 ? `From ${dow <= 3 ? "Sunday" : "Wednesday"}'s cook` : "";
    return { slot, time, label, kind, meal, note };
  });
  for (let x = 1; x <= sz.extra; x++) items.push({ slot: "extra" + x, time: x === 1 ? "10:00 AM" : "9:30 PM", label: "Extra", kind: "snack", meal: x === 1 ? MB.wheyShake : MB.cottagePineapple, note: "Above the gain sizes: one more snack" });
  const total = dayTotals(items.map((x) => x.meal));
  const sizes = { ...sz, b: size.bfast, l: size.lunch, d: size.dinner };
  sizes.label = sizes.b === sizes.l && sizes.l === sizes.d ? `${sizes.b} portions` : `breakfast ${sizes.b} · lunch ${sizes.l} · dinner ${sizes.d}`;
  return { type: t, title: `${DAY_TITLE[t]} · week ${weekIndex(dk) + 1}`, size: sizes.label, sizes, items, total };
}
// the food sheet: the slot's dishes first (at this week's size for that slot), then everything else
function menuFor(kind, sizes) {
  const sz = sizes || fitSizes(MODES.maintain.kcal), sizeFor = (r) => (r.kind === "breakfast" ? sz.b : kind === "shiftDinner" || kind === "homeDinner" ? sz.d : sz.l);
  const pickAll = (f) => RECIPES.filter(f).map((r) => mealOf(r.id, sizeFor(r)));
  const groups = [];
  if (kind) groups.push({ title: "For this slot", items: [...pickAll((r) => r.slots.includes(kind)), ...(kind === "snack" ? [MB.wheyOnly] : [])] });
  const seen = new Set((groups[0] || { items: [] }).items.map((m) => m.id));
  for (const [title, f] of [["Breakfast", (r) => r.kind === "breakfast"], ["Batch meals · travel in the cold bag", (r) => r.kind === "batch"], ["Steakhouse plates · cooked to order, never packed", (r) => r.kind === "plate"], ["Snacks", (r) => r.kind === "snack"]]) {
    const items = pickAll(f).filter((m) => !seen.has(m.id));
    if (title === "Snacks" && !seen.has("wheyOnly")) items.push(MB.wheyOnly);
    if (items.length) groups.push({ title, items });
  }
  return groups;
}
// a recipe's batch at a size, for `make` portions: every line scales with its size grams and the portion count
function batchAt(rid, size, make) {
  const r = RB[rid], sz = (r.sizes || {})[size] || {}, k = (make || r.portions) / r.portions;
  const base = {}; for (const [key, g] of [...r.portion, ...r.sauce]) { const f = foodOf(key); base[f] = (base[f] || 0) + g; }
  return r.batch.map(([food, state, g, use, unit]) => ({ food, state, unit: unit || "g", use, g: Math.round(g * k * (sz[food] != null && base[food] ? sz[food] / base[food] : 1) * 10) / 10 }));
}
// MAINT-7: the week's two cooks (food-safety windows from FSIS/FDA; the layout is judgment)
function prepWeek(dk, kcal) {
  const sun = sundayOf(dk), wk = ROTATION[weekIndex(sun)], A = fitSizes(kcal, wk.a), B = fitSizes(kcal, wk.b), Z = fitSizes(kcal, wk.sun);
  const item = (rid, size, make, uses) => ({ rid, name: RB[rid].name, size: sized(RB[rid]) ? size : null, make, uses, min: RB[rid].prepMin, ahead: RB[rid].ahead, keeps: RB[rid].keeps });
  return [
    { dk: sun, day: "Sunday", title: "Sunday cook · covers Mon–Wed", eatBy: addDays(sun, 3), sizes: A,
      items: [item(wk.a.lunch, A.l, 4, "Mon–Wed lunch + 1 spare"), item(wk.a.dinner, A.d, 4, "Mon–Wed dinner + 1 spare"), item("bircherBowl", dayPlan("off", kcal, addDays(sun, 1)).sizes.b, 2, "Mon + Wed breakfast"), item("cottagePineapple", null, 2, "Mon + Wed snack"), item("yogurtBerries", null, 2, "Sun + Tue snack"),
        item(wk.sun.lunch, Z.l, 1, "today's lunch, fresh"), item(wk.sun.dinner, Z.d, 1, "today's dinner, cooked to order")],
      steakNote: "Sear 2 × 100 g raw sirloin with the cook: today's and Tuesday's steak & eggs (Tuesday is day 2).",
      notes: ["Raw chicken, ground beef, fish and shrimp keep 1–2 days: cook Sunday's today, freeze Wednesday's the day you buy them, and move them to the fridge Monday night.", "Label every box: dish, size, cook date, eat by (cook date + 3).", "Cool fast in shallow boxes; into the fridge within 2 hours (1 hour above 90 °F)."] },
    { dk: addDays(sun, 3), day: "Wednesday", title: "Wednesday cook · covers Thu–Sat", eatBy: addDays(sun, 6), sizes: B,
      items: [item(wk.b.lunch, B.l, 4, "Thu–Sat lunch + 1 spare"), item(wk.b.dinner, B.d, 4, "Thu–Sat dinner + 1 spare"), item("bircherBowl", dayPlan("off", kcal, addDays(sun, 5)).sizes.b, 1, "Fri breakfast"), item("cottagePineapple", null, 1, "Fri snack"), item("yogurtBerries", null, 2, "Thu + Sat snack")],
      steakNote: "Sear 2 × 100 g raw sirloin: Thursday's and Saturday's steak & eggs (Saturday is day 3).",
      notes: ["Wednesday's meals before the cook are Sunday's, day 3: the planned last day.", "The spare box from each batch: tonight's meal on a double, or freeze it (cooked meat keeps 2–3 months at 0 °F).", "Anything left on Sunday is day 4, FSIS's hard limit: it goes, it is not eaten."] },
  ];
}
// MAINT-7: the week's Costco list, computed from the two cooks plus the fresh food (steak & eggs four mornings,
// the pre-lift shake six mornings and Sunday's evening shake). Meat in lb, eggs by count, packs where the pack
// size is known; pantry staples are listed to check, not computed.
function shopList(dk, kcal) {
  const need = {}, add = (rows) => { for (const x of rows) if (x.food !== "water") need[x.food] = (need[x.food] || 0) + x.g; };
  for (const p of prepWeek(dk, kcal)) for (const it of p.items) add(batchAt(it.rid, it.size, it.make));
  // the fresh food, day by day: steak & eggs on the even days, the shake every day, any lean or extra snack
  for (let i = 0; i < 7; i++) {
    const d = addDays(sundayOf(dk), i), sz = fitSizes(kcal, blockOf(d));
    if (dowOf(d) % 2 === 0) add(batchAt("steakEggs", dayPlan("off", kcal, d).sizes.b, 1));
    add(batchAt("wheyShake", null, 1));
    if (sz.lean) { add([{ food: "wheyAscent", g: 33 }]); need.cottage = need.cottage || 0; }
    if (sz.extra >= 1) add(batchAt("wheyShake", null, 1)); if (sz.extra >= 2) add(batchAt("cottagePineapple", null, 1));
  }
  // zest rides with the lemons; counts use USDA portion weights (edible g per piece)
  if (need.lemonZest) { need.lemonJuice = (need.lemonJuice || 0); delete need.lemonZest; }
  const EACH = { egg: [50, "eggs"], banana: [118, "bananas"], apple: [182, "apples"], avocado: [136, "avocados"], lemonJuice: [48, "lemons"], limeJuice: [44, "limes"], pineapple: [905, "pineapple"], onion: [110, "onions"], bellPepper: [119, "peppers"] };
  const secs = {}, lb = (g) => Math.round(g / 45.36) / 10;
  for (const [food, g] of Object.entries(need)) {
    const [name, sec, item, packG, pack] = GROCERY[food] || [food, "Pantry", null, null, null], staple = STAPLES.includes(food);
    const qty = EACH[food] ? `${Math.ceil(g / EACH[food][0] - 0.05)} ${EACH[food][1]}` : staple ? "staple: check stock" : ["Meat", "Seafood"].includes(sec) || /sockeye|shrimp/.test(food) ? `${lb(g)} lb` : g >= 1000 ? `${lb(g)} lb` : `${Math.round(g)} g`;
    const packs = !staple && packG && !EACH[food] ? Math.ceil(g / packG) : null;
    (secs[sec] = secs[sec] || []).push({ food, name, g: Math.round(g), qty, packs, item: item || "not checked at Costco: Publix", pack });
  }
  const order = ["Meat", "Seafood", "Frozen", "Produce", "Dairy & eggs", "Bakery", "Pantry", "Supplements"];
  return order.filter((s) => secs[s]).map((s) => ({ section: s, items: secs[s].sort((a, b) => b.g - a.g) }));
}
// MAINT-8: the strict rules, each with its evidence label (EVIDENCE.md, Nutrition: the strict home-cooked system)
const RULES = [
  { t: "Zero restaurant food. No staff meal, no tasting, no grazing on shift: every bite is your own weighed food.", why: "A kitchen that publishes no numbers missed by ±465 kcal a meal when measured. An unlogged staff meal twice a week cannot be calibrated out. (Judgment, built on Urban 2016.)" },
  { t: "Weigh every component on a gram scale, raw or cooked as the recipe says. No eyeballed portions.", why: "Even weighed records missed 10–19%; estimates missed 50%+ (Lichtman 1992, Lansky & Brownell 1982)." },
  { t: "Log before the first bite: one tap on the prepped portion.", why: "Forgetting is the commonest error; an entry made first cannot be forgotten (Whitton 2022). Judgment." },
  { t: "Oil, butter, sauces and dressings are weighed into the pan or a lidded cup and counted in full.", why: "Condiments are the most-left-out items, and fat carries the calories: 1 tbsp of olive oil is 119 kcal (USDA)." },
  { t: "Mark the day complete when the last bite is logged. Fewer than 6 of 7 complete days and the maintenance estimate waits.", why: "A half-logged day reads as eating less and drags the estimate down. Judgment on the threshold." },
  { t: "Same plan seven days a week, holidays included.", why: "Maintainers who ate the same way all week were 1.5× more likely to hold their weight (Gorin 2004); weekends are where it leaks (Racette 2008)." },
  { t: "No liquid calories: water, black coffee, zero-sugar certified Celsius. The whey is weighed and logged.", why: "Drinks did not reduce food eaten (DiMeglio & Mattes 2000)." },
  { t: "Alcohol: 2 drinks at most, logged (about 100 kcal each before the mixer); never the night before a squat or deadlift day, none on a trim, none in a test week.", why: "7 kcal a gram, not offset by eating less (Kwok 2019); a big dose cut muscle protein synthesis 24% (Parr 2014). The cap is judgment." },
  { t: "Protein at every meal: 45–60 g at the three meals, 25–30 g at the shake and the snack.", why: "About 0.4–0.55 g/kg a meal over 4+ meals (Schoenfeld & Aragon 2018); the rest is for fullness (Weigle 2005)." },
  { t: "Weigh in every morning: after the bathroom, before food or drink, same scale.", why: "Daily weigh-ins make the trend precise enough to measure maintenance (Turicchi 2020)." },
  { t: "The plan changes only on the app's call: the measured maintenance or the decision rule, never one morning.", why: "Two-week scale swings are mostly water (Bhutani 2017)." },
  { t: "Batch food by cook date + 3 (seafood + 1); reheat to 165 °F; the shift bag stays at 40 °F or below or the food goes.", why: "FSIS: leftovers 3–4 days, 2 hours out of the cold (1 hour above 90 °F)." },
];
// The road in phases. Phase 1 is the build. Phase 2 is the reveal: the SAME 170 lb of
// lean mass at ~11% — the 1992 Calvin Klein Wahlberg, carrying ~25 lb more muscle than
// the ad. It is not a multi-year goal; it is a ten-week trim once Phase 1 is real.
const PHASES = [
  { id: "build", name: "Pain & Gain build", target: "200 lb @ 15% \u00b7 170 lb lean \u00b7 315/405/495 \u00b7 16\" arms", by: "~Wave 45 (2030)", mode: "gain",
    note: "Small surplus for years. Trim only when body fat hits 18%." },
  { id: "ck", name: "The CK cut", target: "~190 lb @ 11% \u00b7 same 170 lb lean", short: "~190 @ 11%", by: "10 weeks after Wave 45", mode: "trim", kcal: 2300, weeks: 10, floorBF: 10,
    gate: "Starts only once 200 @ 15% is real on the tape \u2014 waist and weekly average, not a good morning.",
    protein: [215, 230],
    note: "\u22121 lb/wk, protein 215\u2013230 g (Helms 2014: 2.3\u20133.1 g per kg of lean mass), heavy lifting held with back-offs cut ~20%. A refeed day is allowed when hunger bites: it helps you stick to the cut, it does not save muscle (ICECAP). Stop at 10%: that is a floor, not a target. Then three weeks back up to maintenance.",
    back: "The shredded back is this phase's job. Back work builds the muscle under the fat; it does not burn the fat over it (Ramirez-Campillo 2022), so the detail arrives with whole-body leanness. Judge it by a monthly rear relaxed and rear lat-spread photo (same light, same distance) next to the waist, not by a body-fat reading." },
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
           ["G",  "Stomach vacuum, standing",       "3×30 s",       "finisher — a held vacuum draws the waist in for the moment (posture, not training: no study shows it shrinks the waist). Skip the ab wheel today: abs don’t read through a shirt, a tight waist does (judgment)", 0]],
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
  { tier: 1, name: "Creatine monohydrate", dose: "5 g a day, any time, forever", why: "The best-supported supplement there is (ISSN, Kreider 2017).", buy: "Costco: Sports Research Creatine Monohydrate capsules (Informed Sport; 4 capsules = 5 g). Not ON or Orgain creatine: 'banned substance tested' is not a certification." },
  { tier: 1, name: "Whey protein", dose: "33 g, weighed: the pre-lift shake", why: "Convenience for hitting protein, not magic. It is in the plan's numbers.", buy: "Costco: Ascent 100% Whey (Informed Sport). Not Kirkland whey (on neither list) and not ON Gold Standard as Costco sells it (its sizes and flavours are not the listed ones)." },
  { tier: 1, name: "Caffeine", dose: "3 mg/kg (~250 mg) 50\u201360 min before the lift", why: "ISSN: 3\u20136 mg/kg about an hour out. At this dose, nothing within ~13 h of bed (Gardiner 2023: 8.8 h for a coffee, 13.2 h for a pre-workout dose). Sleep is the bottleneck.", buy: "Black coffee, or Celsius (NSF Certified for Sport, zero sugar): read the can's caffeine against the dose." },
  { tier: 2, name: "Omega-3", dose: "Fatty fish twice a week, or 2 g EPA+DHA", why: "Food first. The rotation has sockeye every other Sunday: swap the salmon plate in on an off night (the spare box goes to the freezer) to make it twice a week.", buy: "If you use fish oil: NSF Certified for Sport or Informed Sport only, checked by product and lot." },
  { tier: 2, name: "Electrolytes", dose: "Sodium ~500 mg + potassium on sweaty days", why: "Florida shifts and the incline walk.", buy: "Costco: DripDrop Zero Sugar, the Lemon Lime and Watermelon sticks only (NSF lists those two flavours). Not LMNT, Liquid I.V. or Kirkland sticks." },
  { tier: 3, name: "Vitamin D3", dose: "Only if a blood test says you are low", why: "No clear strength benefit in athletes who are not deficient (Han 2024)." },
  { tier: 3, name: "Magnesium glycinate", dose: "300\u2013400 mg before bed if sleep is under 7.5 h", why: "A sleep aid, not a muscle builder." },
];
// a mode's targets: measured maintenance + the mode's offset when there is one (MAINT-2), else the
// starting number; then an applied adjustment. Carbs carry every change at 4 kcal/g; fibre is 14 g
// per 1,000 kcal (Slavin 2008).
const r50 = (x) => Math.round(x / 50) * 50;
function targets(mode, adj, maint) {
  const m = MODES[mode] || MODES.gain, a = Math.max(-ADJ_CAP, Math.min(ADJ_CAP, Math.round(+adj || 0)));
  const measured = Number.isFinite(+maint) && +maint > 0, base = measured ? r50(+maint) + m.off : m.kcal, kcal = base + a;
  return { ...m, kcal, base, measured, c: Math.round((kcal - 4 * m.p - 9 * m.f) / 4), fib: Math.round(kcal * 0.014), adj: a };
}
// a day's totals. Entries logged before v65 carry kcal and protein only; `full` says whether every
// entry also carries fat and carbs, so a part-known macro total is never shown as the whole.
function dayTotals(entries) {
  let kcal = 0, p = 0, f = 0, c = 0, fib = 0, full = true;
  for (const e of entries || []) {
    kcal += +e.kcal || 0; p += +e.p || 0; f += +e.f || 0; c += +e.c || 0; fib += +e.fib || 0;
    if (!Number.isFinite(e.f) || !Number.isFinite(e.c)) full = false;
  }
  const r = (x) => Math.round(x);
  return { kcal: r(kcal), p: r(p), f: r(f), c: r(c), fib: r(fib), full };
}
const dkMs = (dk) => Date.UTC(+dk.slice(0, 4), +dk.slice(5, 7) - 1, +dk.slice(8, 10));
const msDk = (ms) => new Date(ms).toISOString().slice(0, 10);
// Last n days ending at dk. Only days with entries count as logged. Given the complete-day marks
// (MAINT-3), the averages use complete days only: a half-logged day would read as eating less.
function weekStats(food, dk, n, done) {
  n = n || 7; const days = []; let logged = 0;
  for (let i = 0; i < n; i++) {
    const k = msDk(dkMs(dk) - i * 86400000), ent = (food || {})[k];
    if (!ent || !ent.length) continue;
    logged++;
    if (!done || done[k]) days.push(dayTotals(ent));
  }
  const out = { logged, done: done ? days.length : null, avgKcal: null, avgP: null };
  if (!days.length) return out;
  return { ...out,
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
// NUT-1: least-squares line through every reading in [fromDk, toDk]. slope is lb a day; at(dk) the fitted value.
function fitIn(map, fromDk, toDk) {
  const pts = Object.keys(map || {}).filter((k) => DK.test(k) && k >= fromDk && k <= toDk && Number.isFinite(+map[k])).sort()
    .map((k) => [(dkMs(k) - dkMs(fromDk)) / 86400000, +map[k]]);
  const n = pts.length;
  if (n < 2) return { n, days: 0, slope: null, at: () => null };
  const mx = pts.reduce((a, q) => a + q[0], 0) / n, my = pts.reduce((a, q) => a + q[1], 0) / n;
  let sxx = 0, sxy = 0;
  for (const [x, y] of pts) { sxx += (x - mx) * (x - mx); sxy += (x - mx) * (y - my); }
  const slope = sxx > 0 ? sxy / sxx : null;
  // MAINT-1: the slope's standard error from its own residuals, widened for day-to-day carry-over
  // (lag-1 autocorrelation of residuals on consecutive days, clamped 0-0.8): water carries over, so
  // n readings hold fewer than n independent pieces of information.
  let se = null, rho = 0;
  if (slope != null && n >= 3) {
    const res = pts.map(([x, y]) => [x, y - (my + slope * (x - mx))]), ss = res.reduce((a, q) => a + q[1] * q[1], 0);
    let num = 0, den = 0;
    for (let i = 1; i < n; i++) if (res[i][0] - res[i - 1][0] === 1) { num += res[i][1] * res[i - 1][1]; den += res[i - 1][1] * res[i - 1][1]; }
    rho = den > 0 ? Math.max(0, Math.min(0.8, num / den)) : 0;
    se = Math.sqrt(ss / (n - 2) / sxx) * Math.sqrt((1 + rho) / (1 - rho));
  }
  return { n, days: pts[n - 1][0] - pts[0][0], slope, se, rho, at: (dk) => (slope == null ? null : my + slope * ((dkMs(dk) - dkMs(fromDk)) / 86400000 - mx)) };
}
// MAINT-1: maintenance measured from his own weighed logs and scale. The window ends today once today
// is marked complete, else yesterday; it starts 28 days back or 7 days after `since` (the switch or the
// last mode change), whichever is later, so old logs with a different bias never set the number.
// Returns ready:false with the reason until there are 21 days, 6 of every 7 days complete and 5
// weigh-ins a week. kcal and band are rounded to 10; the band is one standard error.
function estimateMaintenance(food, bw, done, opts) {
  const o = opts || {}, today = o.today;
  const out = { ready: false, provisional: true, kcal: null, band: null, intake: null, rate: null, days: 0, nDone: 0, nW: 0, start: null, end: null, first: null, why: "" };
  if (!today || !DK.test(today)) return { ...out, why: "No date." };
  const end = done && done[today] ? today : addDays(today, -1);
  const first = o.since && DK.test(o.since) ? addDays(o.since, EST.runIn) : null;
  const back = addDays(end, -(EST.full - 1)), start = first && first > back ? first : back;
  const days = Math.round((dkMs(end) - dkMs(start)) / 86400000) + 1;
  Object.assign(out, { start, end, days: Math.max(0, days), first: addDays(start, EST.prov - 1) });
  if (days < 1) return { ...out, why: `Run-in: the first ${EST.runIn} days after a switch are water, glycogen and gut content, not tissue. Counting starts ${start}; a first estimate ${out.first}.` };
  if (days < EST.prov) return { ...out, why: `Day ${days} of ${EST.prov}. A first estimate ${out.first}; the full 28-day number ${addDays(start, EST.full - 1)}.` };
  let sum = 0, nDone = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) { const e = (food || {})[d]; if (done && done[d] && e && e.length) { sum += dayTotals(e).kcal; nDone++; } }
  out.nDone = nDone;
  const needDone = Math.ceil(days * EST.done - 1e-9);
  if (nDone < needDone) return { ...out, why: `${nDone} of the last ${days} days are marked complete; the estimate needs ${needDone} (6 of every 7). A half-logged day reads as eating less, so only complete days count.` };
  const fit = fitIn(bw, start, end), needW = Math.ceil(days * EST.weigh - 1e-9);
  out.nW = fit.n;
  if (fit.n < needW || fit.slope == null || fit.se == null) return { ...out, why: `${fit.n} weigh-ins in the last ${days} days; the estimate needs ${needW} (5 a week).` };
  out.intake = Math.round(sum / nDone);
  out.rate = +(fit.slope * 7).toFixed(2);
  out.kcal = Math.round((out.intake - fit.slope * EST.kcalLb) / 10) * 10;
  const xs = Object.keys(bw || {}).filter((k) => DK.test(k) && k >= start && k <= end && Number.isFinite(+bw[k])).map((k) => dkMs(k) / 86400000);
  const xm = xs.reduce((a, x) => a + x, 0) / xs.length, sxx = xs.reduce((a, x) => a + (x - xm) * (x - xm), 0);
  const floor = (EST.noise / Math.sqrt(sxx)) * Math.sqrt((1 + EST.rho) / (1 - EST.rho));
  out.band = Math.round((Math.max(fit.se, floor) * EST.kcalLb) / 10) * 10;
  out.ready = true; out.provisional = days < EST.full;
  out.why = `${out.intake} kcal a day logged on ${nDone} complete days, weight trend ${out.rate >= 0 ? "+" : ""}${out.rate} lb/wk over ${days} days (${fit.n} weigh-ins).`;
  return out;
}
// MAINT-4: the maintenance number moves only when a new estimate differs from it by more than its band
// and by more than 100 kcal, so it never chases water. Returns the new number (rounded to 50) or null.
function maintCall(est, current) {
  if (!est || !est.ready) return null;
  const cur = Number.isFinite(+current) && +current > 0 ? +current : MODES.maintain.kcal;
  const to = r50(est.kcal);
  return Math.abs(est.kcal - cur) > Math.max(est.band || 0, EST.move) && to !== cur ? to : null;
}
// the first 7-day window from `since` with 3+ readings (scanning forward), when there is no valid fit
function firstWindow(map, since, today) {
  for (let d = since; d <= today; d = addDays(d, 1)) { const v = avgIn(map, d, addDays(d, 6)); if (v != null) return v; }
  return null;
}
// NUT-5: when a trim that starts on `since` must end: six weeks, or the day before the next no-trim window
function trimEndInfo(since, weeks, blocked) {
  const cap = msDk(dkMs(since) + (weeks || TRIM_WEEKS) * 7 * 86400000);
  const win = (blocked || []).filter((b) => b && b.from > since && addDays(b.from, -1) < cap).sort((a, b) => (a.from < b.from ? -1 : 1))[0];
  return win ? { end: addDays(win.from, -1), win } : { end: cap, win: null };
}
// the plain-language call for one week's change in the 7-day average (NUT-3). Descriptive only:
// calorie advice comes from decision() alone.
function weekCall(d, mode, avg) {
  if (d == null || !Number.isFinite(d)) return "";
  if (mode === "maintain") return Math.abs(d) <= PACE.target ? "holding" : d > 0 ? `up ${d.toFixed(1)}` : `down ${(-d).toFixed(1)}`;
  if (mode === "trim") {
    if (d >= 0) return "not losing";
    return avg && -d > avg * PACE.trimFast ? "faster than 1%" : `losing ${(-d).toFixed(1)} (on plan)`;
  }
  return d < PACE.flat ? "flat" : d > PACE.fast ? "fast" : "on pace";
}
function decision(bw, meas, opts) {
  const o = Object.assign({ mode: "gain" }, opts || {});
  const bk = Object.keys(bw || {}).filter((k) => DK.test(k) && Number.isFinite(+bw[k])).sort();
  const today = o.today || bk[bk.length - 1];
  const since = o.since && DK.test(o.since) ? o.since : bk[0];
  const out = { mode: null, avg: null, start: null, dW: null, rate: null, weeks: null, sleep: null, minSleep: null, gate: null, kcal: 0, n: 0, end: null, days: bk.length };
  if (!today || !since) return { ...out, reason: "Log the scale for 3+ days first." };
  out.avg = avgIn(bw, addDays(today, -6), today);
  // NUT-1: the rate is the least-squares slope of every weigh-in this phase; the start is the fitted
  // value on the phase's first day (else the first 7-day window with 3+ readings)
  const fit = fitIn(bw, since, today), fitOK = fit.slope != null && fit.n >= RATE_MIN.n && fit.days >= RATE_MIN.days;
  out.n = fit.n;
  out.start = fitOK ? +fit.at(since).toFixed(1) : firstWindow(bw, since, today);
  out.weeks = +((dkMs(today) - dkMs(since)) / (7 * 86400000)).toFixed(1);
  const mk = Object.keys(meas || {}).filter((k) => DK.test(k) && meas[k] && Number.isFinite(meas[k].wa)).sort();
  const base = [...mk].reverse().find((k) => k <= since) || mk.find((k) => k > since);
  const cur = mk[mk.length - 1];
  out.dW = base && cur && cur !== base ? +(meas[cur].wa - meas[base].wa).toFixed(2) : null;
  // NUT-4: the sleep gate needs 3+ logged nights this week; any night under 6 h counts as short sleep
  out.sleep = avgIn(o.sleep, addDays(today, -6), today);
  const nights = Object.keys(o.sleep || {}).filter((k) => DK.test(k) && k >= addDays(today, -6) && k <= today && Number.isFinite(+o.sleep[k])).map((k) => +o.sleep[k]);
  out.minSleep = nights.length ? Math.min(...nights) : null;
  const shortSleep = out.sleep != null && (out.sleep < 7 || out.minSleep < 6);
  const sleepTxt = () => (out.sleep < 7 ? `sleep is averaging ${out.sleep} h` : `one night this week was ${out.minSleep} h`);
  if (out.avg == null) return { ...out, reason: "Log the scale 3+ mornings this week: the 7-day average is the number." };
  const wTxt = out.dW == null ? "waist not re-measured this phase" : `waist ${out.dW >= 0 ? "+" : ""}${out.dW}" since the phase began`;
  if (fitOK) out.rate = +(fit.slope * 7).toFixed(2);
  const rateTxt = `The rate needs 10 days and 8 weigh-ins this phase (you have ${fit.n}).`;
  if (o.mode === "trim") {
    const { end, win } = trimEndInfo(since, TRIM_WEEKS, o.blocked);
    out.end = end;
    if (today >= end) return { ...out, mode: "gain", reason: win ? `${win.label} starts ${win.from}: back to gaining. No trims in Cycles 5\u20136. (${wTxt})` : `Six weeks is the cap. Back to gaining. (${wTxt})` };
    if (out.dW != null && out.dW <= TRIM_DONE.waist) return { ...out, mode: "gain", reason: `${wTxt}: the trim did its job. Back to gaining.` };
    if (out.start != null && out.start - out.avg >= TRIM_DONE.lb) return { ...out, mode: "gain", reason: `7-day average ${out.avg}, down ${(out.start - out.avg).toFixed(1)} from ${out.start}. Done. Back to gaining.` };
    const fast = out.rate != null && -out.rate > out.avg * PACE.trimFast;
    if (fast) out.kcal = 200;
    return { ...out, mode: "trim", gate: shortSleep ? "sleep" : null,
      reason: `7-day average ${out.avg}${out.start != null ? ` vs ${out.start} at the start` : ""}${out.rate != null ? `, ${out.rate} lb/wk` : ""} · ${wTxt}. Keep trimming.${out.rate == null ? " " + rateTxt : ""}${fast ? " Losing faster than 1% a week: add 200 kcal (a slower loss kept more lean mass, Garthe 2011)." : ""}${shortSleep ? ` ${sleepTxt()[0].toUpperCase() + sleepTxt().slice(1)}: on short sleep the loss comes out of muscle. Fix sleep or end the trim early.` : ""}` };
  }
  if (o.mode === "maintain") {
    // MAINT-5: maintenance never nudges by ±150 from a short rate: the rate can call a direction, not a
    // number (±489 kcal at 10 days). The measured estimate moves the target. The trim trigger is the
    // waist (+1" since the phase began) or tape body fat at 18%+, never into a no-trim window; once a
    // no-trim window this phase covered is over and no trim is due, it hands back to a slow gain.
    const fat = o.bf && Number.isFinite(o.bf.v) && o.bf.v >= BF_TRIM && (!o.bf.dk || dkMs(today) - dkMs(o.bf.dk) <= 42 * 86400000);
    const why = out.dW != null && out.dW >= 1 ? wTxt : fat ? `tape body fat ${o.bf.v}%` : null;
    const rTxt = out.rate != null ? `, ${out.rate >= 0 ? "+" : ""}${out.rate} lb/wk` : "";
    if (why) {
      const hit = (o.blocked || []).find((b) => b && b.from <= addDays(today, TRIM_MIN_DAYS) && b.to >= today);
      if (hit) return { ...out, mode: "maintain", gate: "cycle", reason: `${why}: a trim is due, but it would run into ${hit.label} from ${hit.from}. No trims in Cycles 5–6: hold maintenance and start it after ${hit.after} (${hit.to}).` };
      if (out.sleep == null) return { ...out, mode: "maintain", gate: "sleep-unknown", reason: `${why}: a trim is due, but sleep isn't logged. Log last night's sleep 3+ mornings this week to clear the sleep gate.` };
      if (shortSleep) return { ...out, mode: "maintain", gate: "sleep", reason: `${why} says trim, but ${sleepTxt()}. A deficit on short sleep takes the loss from muscle. Get to 7 h+ every night first, then start the trim.` };
      out.end = trimEndInfo(today, TRIM_WEEKS, o.blocked).end;
      return { ...out, mode: "trim", reason: `${why}: trim until ${out.end} at the latest, 500 under your maintenance.` };
    }
    const over = (o.blocked || []).find((b) => b && b.to >= since && b.to < today);
    if (over) return { ...out, mode: "gain", reason: `${over.label} is done and no trim is due (${wTxt}). Back to a slow gain: 125 over your maintenance.` };
    return { ...out, mode: "maintain", reason: `7-day average ${out.avg}${rTxt} · ${wTxt}. Hold maintenance; the measured number moves the target, never one week on the scale.` };
  }
  // gaining
  if (out.dW != null && out.dW >= 1) {
    // NUT-5: never into Intensification or Peak; NUT-4: never on unknown or short sleep
    const hit = (o.blocked || []).find((b) => b && b.from <= addDays(today, TRIM_MIN_DAYS) && b.to >= today);
    if (hit) return { ...out, mode: "gain", gate: "cycle", reason: `${wTxt}: a trim is due, but it would run into ${hit.label} from ${hit.from}. No trims in Cycles 5\u20136: start it after ${hit.after} (${hit.to}).` };
    if (out.sleep == null) return { ...out, mode: "gain", gate: "sleep-unknown", reason: `${wTxt}: a trim is due, but sleep isn't logged. Log last night's sleep 3+ mornings this week to clear the sleep gate.` };
    if (shortSleep) return { ...out, mode: "gain", gate: "sleep", reason: `${wTxt} says trim, but ${sleepTxt()}. A deficit on short sleep takes the loss from muscle. Get to 7 h+ every night first, then start the trim.` };
    out.end = trimEndInfo(today, TRIM_WEEKS, o.blocked).end;
    return { ...out, mode: "trim", reason: `${wTxt}: that is tissue, not water. Trim until ${out.end} at the latest.` };
  }
  if (out.rate == null) return { ...out, mode: "gain", reason: `7-day average ${out.avg} · ${wTxt}. ${rateTxt} Keep gaining.` };
  out.kcal = out.rate > PACE.fast ? -150 : out.rate < PACE.flat ? 150 : 0;
  const adj = out.kcal < 0 ? " Gaining faster than 0.5 lb a week: drop 150 kcal, that extra is fat." : out.kcal > 0 ? " Flat: add 150 kcal." : " On pace.";
  return { ...out, mode: "gain", reason: `7-day average ${out.avg}, ${out.rate >= 0 ? "+" : ""}${out.rate} lb/wk since the phase began · ${wTxt}.${adj}` };
}
const trimEnd = (sinceDk, weeks, blocked) => trimEndInfo(sinceDk, weeks, blocked).end;
const NUTRI = { CERT, SUPPS, TRIM_DONE, avgIn, MODES, TRIM_WEEKS, PHASES, PRIMER, primerStage, primerLoads, roundLoad, byId, targets, dayTotals, weekStats, decision, trimEnd,
  PACE, RATE_MIN, ADJ_CAP, TRIM_MIN_DAYS, fitIn, weekCall, menuFor, EST, BF_TRIM, estimateMaintenance, maintCall,
  FOOD, GROCERY, STAPLES, RECIPES, KITCHEN, SIZES, MEALS, mealById, recipeMacros, DAY, ROTATION, dayType, fitSizes, dayPlan, batchAt, prepWeek, shopList, RULES, sundayOf, weekIndex, blockOf };
if (typeof module !== "undefined") module.exports = NUTRI;
