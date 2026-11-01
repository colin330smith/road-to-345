# foods.json: the verified food table

This file has 73 foods, one for each item on the requested coverage list, plus 17 added later for the recipes (90 in all; see "Added for the recipes" at the end). "Jasmine" and "basmati" share one entry, and the 88/12 burger patty gets its own. I built it on 1 Nov 2026 with node. Every macro was read from USDA FoodData Central (FDC) download files or calculated from them. None was typed by hand.

- **Sources:** SR Legacy (2018-04), Foundation Foods (release 2026-10-29) and Branded Foods (release 2026-10-29, the label data).
- **Live check:** all 139 FDC IDs mentioned anywhere in the file were checked against live FDC on 1 Nov 2026: 37 through `api.nal.usda.gov` and 102 through `fdc.nal.usda.gov/portal-data`. Every description, protein, fat and carb value matches. Every label entry reproduces its label's per-serving numbers (for example, whey is 120 kcal / 24 g protein per 30.4 g scoop).
- **One energy exception:** four older Foundation entries (banana, garlic, onion, egg) carry only a general-factor kcal in the download. For those I used the live Atwater-specific value instead, to match the basis SR Legacy uses: 88 vs 97, 130 vs 143, 36 vs 38, 147 vs 148. Each `src` says so.
- **Rebuilding:** `node tools/build_foods.js <fdc_index.json> <branded_subset.json> foods.json costco.json <portal dir>`. The index and branded subset come from the FDC zips via `tools/build_index.js` and `tools/branded_filter.js`. Then re-add the recipe foods and rebuild the side table. Run from the scratchpad root: `node diet/tools/add_recipe_foods.js scripts/fdc_index.json scripts/branded_subset.json diet/foods.json diet/costco.json dl_recipes`, then `node diet/tools/build_extra.js diet/foods.json dl_sr/FoodData_Central_sr_legacy_food_csv_2018-04 dl_ffj/FoodData_Central_foundation_food_json_2026-10-29.json scripts/branded_subset.json diet/foods-extra.json dl_api/portal dl_recipes`.

## Fields

`per100` holds the values for 100 g of the food in the state named by `state`. The one exception is `ponzu`, which is per 100 ml (`per: "100 ml"`). Each `per100` has kcal, protein, fat, carbs and fibre. Carbs are total carbohydrate by difference, and fibre is part of that total.

| Field | What it holds |
|---|---|
| `src` | The FDC ID, data type and exact description, or the brand label as FDC stores it (brand, GTIN, serving). |
| `raw` / `dry` / `cooked` | Values for the other state, with their own `src`. |
| `yield` | Cooked weight ÷ raw weight (or ÷ dry weight for grains), with its range, the range type and the source. |
| `check` | Whether the cooked value agrees with raw ÷ yield. |
| `logAs` | The state to weigh this food in. |
| `units` | Per-unit macros, all computed. |
| `alt` | Other sourced values: older USDA analytical numbers, white or dark meat, 1% cottage cheese, and so on. |
| `labelCheck` | A Costco or brand label shown next to the USDA value. |
| `costco` | What was or was not verified about Costco. |
| `unverified` | Anything in the entry that could not be checked. |

## Raw vs cooked: which number to use

1. **Batch-cooked proteins and grains** (chicken, ground beef, rice, quinoa, wild rice): use the batch method. It is the most accurate way and it is the method USDA itself uses for recipes.
   1. Weigh the raw or dry batch and multiply by the `raw` or `dry` values. That gives the batch total.
   2. Weigh the cooked batch.
   3. The values per cooked gram are the batch total ÷ the cooked weight.
   4. Write the result on the containers.

   If you skip a weigh-in, `per100` (cooked) is the fallback.
2. **Steaks, salmon, sockeye and seared ahi:** weigh them raw (`logAs: raw`) and use `raw.per100`. They are cut or bought as single portions, so the raw weight is exact.
   - USDA cooked its test steaks to an internal 149 °F (65 °C). A medium-rare steak keeps more water, so cooked values overcount it slightly.
   - Ahi is seared rare, so its `per100` is the raw value.
3. **Shrimp and rotisserie chicken:** weigh them cooked. USDA's 2024 farm-raised raw shrimp entry has only 15.6 g protein per 100 g. It is about 81% water, so a raw weight would overstate what you eat.
4. **Vegetables:** weigh raw. Roasting removes water, not calories.
5. **Oats and rice noodles:** weigh dry.
6. **Oils, butter, nut butter, honey, sauces:** weigh in grams on the scale. The tablespoon gram weights in `units` are USDA's.

**Never mix states.** A raw weight times cooked values overcounts. For the meats here the error is 12–40%: chicken breast is 151 kcal per 100 g cooked against 112 raw. For salmon it is only 1%, because USDA's cooked salmon sample barely changed in concentration.

## Yields: where they come from

- **Meat:** *USDA Table of Cooking Yields for Meat and Poultry* (USDA ARS Nutrient Data Laboratory, 2012). These are measured yields, given with n and min–max:

  | Cut | Yield |
  |---|---|
  | Top sirloin | 80% (n=20, 69–87) |
  | Flank | 81% (n=20) |
  | Top round | 72% (n=20) |
  | Tenderloin | 80% (n=19) |
  | Boneless lip-on ribeye | 84% (n=36) |
  | Pork tenderloin | 80% (n=12) |
  | Ground beef crumbles, under 12% fat | 69% |
  | Ground beef crumbles, 12–22% fat | 67% |
  | Ground beef patty, 12–22% fat, pan-broiled | 73% |
  | Chicken breast | 72% (1975 data). USDA's own portion weights agree: one breast is 272 g raw and 196 g grilled. |

- **Chicken thighs:** 0.75. This comes from USDA SR portion weights for one skinless thigh (0.74 braised, 0.78 roasted) and from protein balance.
- **Fish and grains:** Bognár (2002), a set of German government yield and retention tables. USDA has no fish yields.
  - Fish fillet, fried or grilled: 0.80 ± 0.02 (n=10). This is measured on lean white fish. No yield specific to salmon was found.
  - Long-grain white rice, boiled: 2.98 (n=140).
  - Quinoa: 3.42 (n=3).
  - Potato baked in its skin: 0.81.
- **Composition-based yields (calculated):** wild rice and rice noodles, from USDA dry matter. Shrimp, from USDA's matched raw and cooked analytical pair.
- **Sweet potato:** no sourced baking yield, so weigh it after baking.

Yields vary by roughly ±5 points (see the ranges). Use them to plan purchases and to sanity-check numbers. For logging, use the batch method.

## How the USDA entries were chosen

- **Raw values** come from the newest Foundation Foods raw entries (published 2023–2025) wherever they exist. These are samples USDA buys in stores: the thigh composite, for example, includes a Perdue pack bought at a Food Lion in Blacksburg, VA in March 2023, according to FDC acquisition records.
- **Cooked values** come from the USDA cooked entry for the same cut, trim and method. Each one had to agree with raw ÷ yield within ±8%. For fish, Bognár's retention factors were applied in that check (fatty fish keep 95% of protein and 80% of fat). The `check` field shows the result:

  | Food | Difference |
  |---|---|
  | Chicken breast | −3% |
  | Top sirloin | +3% |
  | Flank | −4% |
  | Top round | +1% |
  | Tenderloin | +7% |
  | Ribeye | −2% |
  | Pork tenderloin | −6% |
  | Ground beef 93/7 | −5% |
  | Farmed salmon | −7% |
  | Sockeye | −6% |

- **Calculated values**, flagged as such in `src`:
  - **`chickenThigh`:** USDA's old roasted value (179 kcal) came from leaner raw meat than today's retail thighs (7.9 g fat per 100 g in the 2023 Foundation sample). I used Foundation raw ÷ 0.75 instead, which gives 199 kcal. It assumes no fat drips off, so it errs slightly high. The USDA value is kept in `alt`.
  - **`beef88` and `beef88Patty`:** USDA has no 88/12 entry. I interpolated between the 85/15 and 90/10 entries. USDA fits its ground-beef values linearly on fat level (derivation code AR), so this follows USDA's own method.
  - **`rotisserie`:** a 50/50 blend of USDA rotisserie breast and thigh meat. The ratio is my judgment. The white-only and dark-only values are in `alt`.

## Costco

`costco.json` is the Costco catalog, built separately in this folder. It owns availability. 63 foods here link to it through `costcoIds`, and their `costco` text names each product's catalog confidence.

Where the Costco product changes the numbers, the note says so:
- Costco's top sirloin is USDA Prime, cap off, which is more marbled than the Choice values here, so weigh it raw.
- The Kirkland mayonnaise is full-fat: 680 kcal per 100 g, against 233 for light.
- The Mission 10" tortillas are pre-cooked, so use their label.
- The catalog lists unsalted and grass-fed butter. Unsalted has the same macros as the salted entry here.
- The garlic is jarred minced garlic, so use the jar's label.

What this pass verified on its own:

**Verified on costco.com or Costco same-day listings:**
- Kirkland boneless skinless chicken thighs, fresh and frozen
- Kirkland ground beef, 88/12 and 93/7
- Kirkland Wild Alaskan Sockeye, 3 lb bag of portions
- Kirkland farm-raised raw shrimp, 21–25 per lb
- Kirkland Thai Hom Mali jasmine rice
- Kirkland Organic Greek Yogurt (nonfat) and FAGE Total 0%, both 48 oz

**Labels present in FDC branded data** (GTIN prefix 096619; label dates 2018–2023, so current stock was not checked): Kirkland eggs, Ancient Grains granola, organic peanut butter, salted butter, honey, Three Berry Blend, frozen broccoli and green beans, olive oil, peanuts.

**Flagged to buy elsewhere:**
- Ponzu, sesame oil and wild rice: `costco.json` points to Publix.
- Fish sauce, rice noodles, fresh ginger and light mayo: not confirmed at Costco.
- Ahi: my costco.com search found only bulk online cases. `costco.json` rates Kirkland fresh wild ahi "likely".

## Not verified

- Costco's own rotisserie chicken label
- The 50/50 white-to-dark rotisserie ratio
- Dijon macros: US labels round heavily per 5 g teaspoon, so I used Maille's higher figure, 10 kcal per teaspoon.
- The sport certification of the two example whey labels. Before buying, the exact product and flavour must appear on NSF Certified for Sport or Informed Sport.
- Costco availability beyond the items listed above (see each product's `confidence` in `costco.json`)
- Whether the Swift pork tenderloin and the Kirkland chicken are sold "enhanced" with added solution. Read the pack: the `raw.note` and `costco` fields name the USDA entry to use if they are.

## Sources

- USDA FoodData Central: https://fdc.nal.usda.gov (datasets at /download-datasets)
- USDA ARS (2012), *USDA Table of Cooking Yields for Meat and Poultry*: https://www.ars.usda.gov/ARSUserFiles/80400525/Data/retn/USDA_CookingYields_MeatPoultry.pdf
- Bognár A. (2002), *Tables on weight yield of food and retention factors of food constituents for the calculation of nutrient composition of cooked foods (dishes)*, BFE-R--02-03, Bundesforschungsanstalt für Ernährung: https://publikationen.bibliothek.kit.edu/9642002/1928

## Added for the recipes

`tools/add_recipe_foods.js` added 17 foods the recipes need, tagged `addedBy: "recipes"`. Running it again replaces only those. Each one comes from the same local FDC downloads as the rest, or for the Ascent whey from its live FDC record. Each was matched against live FDC on 1 Nov 2026 (description, kcal, protein, fat and carbs); the `liveCheck` field holds the result. All values are per 100 g, except `chickenStock`, which is per 100 ml.

| id | Food | Source | costco.json |
|---|---|---|---|
| `limeJuice` | Lime juice, fresh | USDA FDC 168156 (SR Legacy): "Lime juice, raw" | limes_3lb |
| `lemonZest` | Lemon zest (peel), raw | USDA FDC 167749 (SR Legacy): "Lemon peel, raw" | lemons_5lb |
| `greenOnion` | Green onions / scallions, raw | USDA FDC 170005 (SR Legacy) | green_onions |
| `cilantro` | Cilantro leaves, raw | USDA FDC 169997 (SR Legacy) | cilantro_mint |
| `mint` | Mint (spearmint), fresh | USDA FDC 173475 (SR Legacy) | cilantro_mint |
| `parsley` | Parsley, fresh | USDA FDC 170416 (SR Legacy) | — (Publix) |
| `chickenStock` | Kirkland Signature Organic Chicken Stock | Label, FDC 2655506 (GTIN 096619168224), per 100 ml | chicken_stock_ks_org |
| `cheddar` | Kirkland Signature Shredded Sharp Cheddar | Label, FDC 2429357 (GTIN 096619364756) | cheese_sharp_cheddar_shred |
| `salt` | Salt, weighed (0 kcal; it is there for sodium) | USDA FDC 173468 (SR Legacy) | salt |
| `blackPepper` | Black pepper, ground | USDA FDC 170931 (SR Legacy) | ks_black_pepper_grinder |
| `paprika` | Paprika (also used for smoked paprika) | USDA FDC 171329 (SR Legacy) | smoked_paprika |
| `garlicPowder` | Garlic powder (also used for granulated garlic) | USDA FDC 171325 (SR Legacy) | ks_granulated_garlic |
| `cinnamon` | Cinnamon, ground | USDA FDC 171320 (SR Legacy) | ks_saigon_cinnamon |
| `horseradish` | Horseradish, prepared | USDA FDC 173472 (SR Legacy) | — (Publix) |
| `pickles` | Dill pickles | USDA FDC 168558 (SR Legacy) | — (Publix) |
| `water` | Water (0 kcal; gives a dressing or soak an exact weight) | USDA FDC 173647 (SR Legacy) | — |
| `wheyAscent` | Ascent 100% Whey / Native Fuel, Chocolate: the Informed Sport whey sold at Costco | Label, live FDC 2664129 (GTIN 815863020016, 2 lb bag): 120 kcal / 25 g protein per 33 g scoop | supplements: whey_ascent_100 |

**Not verified:**
- The Costco 4.25 lb Ascent bag's own label. Its GTIN is not in FDC, so the 2 lb record from the same product line is used. The Vanilla Bean 2 lb record (FDC 2608632) is also 120 kcal / 25 g per 31 g scoop.
- Smoked paprika and granulated garlic, which use the plain USDA paprika and garlic powder entries as proxies.

The original `whey` entry (an ON label) is unchanged. costco.json says to avoid ON as Costco sells it, so the recipes use `wheyAscent`.

## foods-extra.json: saturated fat and sodium

`tools/build_extra.js` writes saturated fat (g) and sodium (mg) per 100 g for every entry and state in foods.json, keyed the same way. foods.json itself is not changed. The values come from the FDC record each entry already cites:
- SR Legacy `food_nutrient.csv` (nutrients 1258 and 1093)
- Foundation Foods JSON (606 and 307)
- the Branded label
- otherwise a cached live record

Calculated entries (thigh ÷ yield, the 88/12 interpolation, the rotisserie 50/50 blend) are derived the same way as in foods.json. Two fallbacks fill gaps, and each one is labelled in `how`:
- **Newer Foundation records that omit total saturated fat** (raw top sirloin, raw tenderloin): the saturated share of fat from the same food's cooked record, times the raw fat. Both cuts come out at 38%.
- **Records that omit a nutrient entirely** (romaine, garlic): the SR Legacy record with the identical description.

Eight foods have no saturated-fat value anywhere: banana, berries, Dijon, onion, pineapple, ponzu, sriracha, tomatoes. Each is under 1 g fat per portion in the recipes, and `recipes-check.js` counts them as 0.
