# Food safety for the prep system

USDA FSIS and FDA storage times, cooling and reheating rules, a Sunday + Wednesday prep calendar, and shift packing without a fridge. Every time below comes from a federal page, cited inline. Anything without a federal source is labelled **judgment** or **applied** (a federal rule used on a food it doesn't name).

Prepared 2026-11-01. The dates and arithmetic were computed with node, from `scratchpad/tools/build_food_safety.js`.

## Sources, and what was actually read

| # | Source | Status |
|---|---|---|
| FDA-chart | FDA, *Refrigerator & Freezer Storage Chart* (March 2018). https://www.fda.gov/media/74435/download | Fetched; full text read |
| FSIS-basics | USDA FSIS, *Basics for Handling Food Safely* fact sheet (revised June 2011), archived by GPO: https://www.govinfo.gov/content/pkg/GOVPUB-A110-PURL-gpo26772/pdf/GOVPUB-A110-PURL-gpo26772.pdf | Fetched; full text read |
| FSIS-danger | USDA FSIS, *"Danger Zone" (40 °F - 140 °F)* (July 2011): https://www.govinfo.gov/content/pkg/GOVPUB-A110-PURL-gpo11877/pdf/GOVPUB-A110-PURL-gpo11877.pdf | Fetched; full text read |
| FSIS-KC | USDA FSIS, *Kitchen Companion: Your Safe Food Handbook* (Feb 2008, slightly revised March 2015): https://www.govinfo.gov/content/pkg/GOVPUB-A110-PURL-gpo234150/pdf/GOVPUB-A110-PURL-gpo234150.pdf | Fetched; full text read |
| FSIS-veal | USDA FSIS, *Veal from Farm to Table* (revised June 2011): https://www.govinfo.gov/content/pkg/GOVPUB-A110-PURL-gpo19096/pdf/GOVPUB-A110-PURL-gpo19096.pdf | Fetched; marinating section read |
| FoodCode | FDA *Food Code 2022*: https://www.fda.gov/media/164194/download | Fetched; §3-401.11, 3-402.11, 3-403.11, 3-501.14/15, 3-501.17, 3-501.19, 6-403.11 read |
| FDA-seafood | FDA, *Selecting and Serving Fresh and Frozen Seafood Safely* (content current as of 03/05/2024): https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-fresh-and-frozen-seafood-safely | Fetched |
| BadBug | FDA, *Bad Bug Book*, 2nd ed. (2012), chapters *Bacillus cereus* and *Scombrotoxin*: https://www.fda.gov/media/83271/download | Fetched; both chapters read |
| FSIS-current | Current FSIS pages: Leftovers and Food Safety https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety · Keeping "Bag" Lunches Safe https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/keeping-bag-lunches-safe · Beef From Farm to Table https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/meat-catfish/beef-farm-table · Freezing and Food Safety https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/freezing-and-food-safety · foodsafety.gov Cold Food Storage Chart https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts | **Not fetched**: fsis.usda.gov and foodsafety.gov return HTTP 403 to this network. Links are given so you can read them. Search results attribute the same 3-4 day, 2-hour/1-hour, two-cold-source and 5-day beef-marinade figures to them, so they appear consistent with the archived FSIS sheets above. |

Where two federal sources disagree, the stricter one is used, and the disagreement is noted.

## The five rules everything else hangs on

1. **Fridge at 40 °F or below, freezer at 0 °F or below.** Check both with an appliance thermometer, because the dial is not a thermometer (FSIS-basics; FSIS-KC).
2. **The 2-hour rule.** Perishable food goes into the fridge within 2 hours of cooking or buying, and within **1 hour when it is above 90 °F** (FSIS-basics; FSIS-danger; FDA-seafood). **Judgment:** in Florida, treat a parked car as above 90 °F, and bring a cooler bag on the Costco run. Between 40 and 140 °F, bacteria can double "in as little as 20 minutes" (FSIS-danger).
3. **Cool fast and shallow.** Divide big batches into shallow containers. Cut large cooked meat into smaller pieces. Hot food may go straight into the fridge (FSIS-KC). Restaurants must cool from 135 °F to 70 °F within 2 hours and to 41 °F within 6 hours total, using shallow pans, smaller portions or an ice bath (FoodCode §3-501.14/15). Use the same methods at home.
4. **Cooked leftovers: 3-4 days in the fridge.** FSIS-KC says "Use within 3 to 4 days", and FSIS-basics says "Use cooked leftovers within 4 days". The plan treats **day 3 as the planned last day and day 4 as the hard limit**.
5. **Reheat to 165 °F.** Check with a food thermometer. Bring sauces and gravies to a rolling boil (FSIS-KC; FSIS-danger; FoodCode §3-403.11).

## How long it keeps

Freezer times are **quality only**: "freezing 0° F (-18° C) keeps food safe indefinitely" (FDA-chart; same in FSIS-basics and FSIS-KC).

### Cooked food

| Food | Fridge (≤40 °F) | Freezer (0 °F, best quality) | Source / note |
|---|---|---|---|
| Cooked beef, pork, steak, meat dishes | 3-4 days | 2-3 months | FDA-chart ("Cooked meat & meat dishes") |
| Cooked chicken, plain pieces | 3-4 days | 4 months | FDA-chart |
| Cooked poultry dishes (chicken + rice bowls) | 3-4 days | 4-6 months | FDA-chart |
| Rotisserie chicken | Buy it hot, then use it within 2 hours or cut it up and refrigerate in shallow covered containers. Eat within 3-4 days | 4 months (plain pieces) | FSIS-KC ("Take-Out Chicken"); FDA-chart |
| Cooked fish (salmon, ahi cooked through) | 3-4 days | 4-6 months | FDA-chart ("Cooked fish") |
| Cooked shrimp (incl. Costco's cooked frozen shrimp once thawed) | 3-4 days | 4-6 months | **applied**: the FDA chart lists "cooked fish", not shrimp separately |
| Cooked rice, quinoa, wild rice, other grains | 3-4 days | No federal quality time found; it stays safe at 0 °F. **Judgment:** freeze flat in portion bags and use within about a month for texture | FSIS leftovers rule (FSIS-KC). Rice is the classic *Bacillus cereus* food: the vomiting-type toxin "most often affects rice and other starchy foods", and "cooking may kill the bacteria, but it might not disable the toxin" (BadBug). So cool it fast in shallow containers and never leave it out. |
| Cooked vegetables | 3-4 days | 2-3 months as vegetable soups/stews; roasted veg goes soft when frozen (**judgment**) | FSIS leftovers rule; FDA-chart ("Soups & Stews") |
| Au jus, gravy, meat broth | **1-2 days** | 2-3 months | FDA-chart (2018) says 1-2 days, while the older FSIS-basics (2011) said 3-4 days. **The stricter one is used.** Freeze French-dip jus in portions on prep day. |
| Hard-boiled eggs | **1 week** | Do not freeze | FDA-chart; FSIS-KC ("If eggs crack during hard cooking, they are safe") |
| Egg dishes (egg bites, frittata, burrito filling) | 3-4 days | 2-3 months after baking | FSIS-KC egg chart ("Casseroles with eggs") |
| Mayo-dressed chicken / tuna / egg salads (homemade) | 3-5 days | Do not freeze | FDA-chart ("Store-prepared (or homemade) egg, chicken, tuna, ham, macaroni salads"). **Judgment:** keep the Louie dressing in its own cup and dress at the meal. |
| Opened canned tuna | 3-4 days | 2 months (out of the can) | FDA-chart (unopened: pantry, 5 years) |

### Raw food

| Food | Fridge (≤40 °F) | Freezer (0 °F, best quality) | Source |
|---|---|---|---|
| Beef / pork / lamb **steaks** | 3-5 days | 6-12 months | FDA-chart. Costco's own card for beef cut at home: 3-4 days at 35-40 °F, 6-12 months frozen (https://www.costco.com/f/-/extreme-peeled-tenderloin; a retailer source, not federal) |
| **Chops** (pork medallions) | 3-5 days | 4-6 months | FDA-chart |
| **Roasts** (whole tenderloin, pork tenderloin) | 3-5 days | 4-12 months | FDA-chart |
| **Ground beef**, stew meat | **1-2 days** | 3-4 months | FDA-chart; FSIS-basics ("Cook or freeze fresh poultry, fish, ground meats... within 2 days") |
| Chicken parts / whole | **1-2 days** | 9 months / 1 year | FDA-chart |
| Lean fish (ahi) | **1-2 days** | 6-8 months | FDA-chart; FDA-seafood ("used within 2 days after purchase") |
| Fatty fish (salmon) | **1-2 days** | 2-3 months | FDA-chart |
| Shrimp (thawed raw) | 1-2 days | 3-6 months | FDA-chart |
| Shell eggs | 3-5 weeks | Do not freeze in the shell | FDA-chart |
| Liquid egg whites | Unopened 10 days (or the carton date if shorter); **opened 3 days** | Unopened 1 year; opened, do not freeze | FDA-chart ("Liquid pasteurized eggs or egg substitutes"). Open one carton at a time. |
| Commercial mayonnaise, opened | 2 months | Do not freeze | FSIS-basics |

### Marinated raw meat (the Hawaiian steak, the chicken)

| What | Max time in the marinade, in the fridge | Source |
|---|---|---|
| Chicken | **Up to 2 days** | FSIS-KC ("Chicken may be marinated in the refrigerator up to 2 days") |
| Whole steaks, chops, roasts (beef, veal, lamb, pork) | **Up to 5 days** | FSIS-veal (read): "Marinate veal in the refrigerator up to 5 days for chops, roasts or steaks". The current FSIS *Beef From Farm to Table* page gives 5 days for beef according to search results (not fetched). |
| Cubed / stew meat (kebab cubes, stir-fry strips) | **1-2 days** | FSIS-veal ("Veal cubes or stew meat can be marinated up to 1 to 2 days") |
| Fish, shrimp | Inside the 1-2 day raw window | **applied** from FDA-chart / FDA-seafood |

How to marinate (FSIS-KC): in the refrigerator, in glass or plastic, never metal. Never put raw-meat marinade on cooked food unless it was boiled just before use. To use some as a sauce, set that portion aside before the raw meat goes in.

**Applied:** the marinade does not restart the clock. A steak bought on Sunday, marinated on Tuesday, is still on its Sunday raw clock.

**Judgment:** pineapple and citrus marinades turn steak mushy if left too long. Give the Hawaiian steak a few hours to overnight, not five days.

## The prep calendar: Sunday + Wednesday

The design keeps **every cooked portion inside its planned 3 days**, with FSIS's day 4 as the unused buffer:

- **Sunday prep:** covers Mon, Tue, and Wednesday's meals before the Wednesday cook. The planned last day is 2026-11-04 and the hard limit is 2026-11-05.
- **Wednesday prep:** covers Thu-Sat. The planned last day is 2026-11-07 and the hard limit is 2026-11-08. That limit is a Sunday, which is a fresh prep day, so nothing should be left.
- **Prep days** (Sun, Wed) are eaten fresh off the stove once the cook is done.
- **Seafood rule:** fish and shrimp plates are cooked on prep days and eaten that day or the next. **Seared ahi is eaten the day it is seared and is never packed** (see below).

Two weeks starting today (computed):

| Date | Day | Prep | What you eat | Freezer → fridge moves |
|---|---|---|---|---|
| 2026-11-01 | Sun | PREP (after the Costco run): cook, portion, label | fresh from today's prep |  |
| 2026-11-02 | Mon |  | batch from Sun 11-01, day 1 of 3 planned | Tonight: move Wednesday's frozen raw chicken / ground beef / fish to the fridge (thaws in 'a day or two', FSIS-KC) |
| 2026-11-03 | Tue |  | batch from Sun 11-01, day 2 of 3 planned |  |
| 2026-11-04 | Wed | PREP (after the lift or after the shift): cook, portion, label | meals before the cook: batch from Sun 11-01, day 3 of 3; after: fresh |  |
| 2026-11-05 | Thu |  | batch from Wed 11-04, day 1 of 3 planned |  |
| 2026-11-06 | Fri |  | batch from Wed 11-04, day 2 of 3 planned | Tonight, only if Sunday cooks from the freezer: move those raw proteins to the fridge |
| 2026-11-07 | Sat |  | batch from Wed 11-04, day 3 of 3 planned |  |
| 2026-11-08 | Sun | PREP (after the Costco run): cook, portion, label | fresh from today's prep; the Wed 11-04 batch would be day 4, the FSIS limit, so it should be finished by Saturday |  |
| 2026-11-09 | Mon |  | batch from Sun 11-08, day 1 of 3 planned | Tonight: move Wednesday's frozen raw chicken / ground beef / fish to the fridge (thaws in 'a day or two', FSIS-KC) |
| 2026-11-10 | Tue |  | batch from Sun 11-08, day 2 of 3 planned |  |
| 2026-11-11 | Wed | PREP (after the lift or after the shift): cook, portion, label | meals before the cook: batch from Sun 11-08, day 3 of 3; after: fresh |  |
| 2026-11-12 | Thu |  | batch from Wed 11-11, day 1 of 3 planned |  |
| 2026-11-13 | Fri |  | batch from Wed 11-11, day 2 of 3 planned | Tonight, only if Sunday cooks from the freezer: move those raw proteins to the fridge |
| 2026-11-14 | Sat |  | batch from Wed 11-11, day 3 of 3 planned |  |

**Buying around the raw windows** (Costco trip on Saturday or Sunday):

- **Chicken, ground beef, fish and shrimp** have a 1-2 day raw window. Cook them in Sunday's batch, or **freeze Wednesday's share the day you buy it**. Move it to the fridge Monday night. FSIS-KC: refrigerator thawing "normally" takes "a day or two, depending on its size".
- **Steaks and roasts** have a 3-5 day raw window. Bought Sunday, Wednesday is day 3, which is inside it. Bought Saturday, Wednesday is day 4, still inside the FDA's 3-5 days but outside Costco's own 3-4 day card for beef cut at home. **Judgment:** if you shop Saturday, freeze Wednesday's steaks too.
- **Anything for day 4 or later goes in the freezer on prep day**, once it has cooled and within 2 hours of cooking, not on day 3 (FSIS-KC: "Refrigerate (or freeze) leftovers within 2 hours after cooking").
- **Label every container** with the cook date and "eat by" (cook date + 3 days). The FDA Food Code uses the same convention in restaurants (prep day = Day 1, 7 days max at ≤41 °F, §3-501.17). At home, follow FSIS's 3-4 days, which is stricter.

## Packing for a 6-10 hour shift with no fridge

Zero Hillstone food means the bag *is* the kitchen. What FSIS says (FSIS-KC, "Bag Lunches" and "Coolers"):

- **Keep cooked food refrigerated until you leave.** Pack straight from the fridge into the bag immediately before leaving.
- **At least two cold sources:** "two frozen gel packs (not smaller than 5x3-inches each) or a frozen gel pack with a frozen juice box or frozen bottle of water". Put them **on top and on the bottom** of the food.
- **"If a refrigerator is available, store perishable items there upon arrival."** If the whole bag goes into a fridge, leave it open so cold air reaches the food.
- **Pack in reverse order:** the first food packed is the last eaten.
- **Put an appliance thermometer in the cooler.** The food must stay at 40 °F or below.
- **Keep the cooler in the shade, closed, and don't keep opening it.**
- **"Discard all perishable foods if there is no longer ice in the cooler, or if the gel packs are no longer frozen."**
- **Above 90 °F the out-of-cold limit is 1 hour, not 2.** In Florida, never leave the bag in the car.
- **Hot food:** preheat an insulated container with boiling water, fill it with piping-hot food and keep it closed. It must stay at 140 °F or above.
- **Reheating at work:** cover, stir, and heat to at least 165 °F, checked with a food thermometer.

**Why a 10-hour shift needs real cold, not hope.** The FDA Food Code's time-only rules (§3-501.19, for restaurants) let cold food that leaves 41 °F or below go without temperature control for at most **6 hours, and only if it never exceeds 70 °F**. With no temperature cap the limit is **4 hours**. After that it is discarded. A 10-hour shift is 4 hours past the longest of those allowances. That is context, not a home rule: the home rule is the FSIS cold-source and thermometer rule above. No federal source gives a number for how long gel packs hold a bag at 40 °F, so **the thermometer decides, not the clock**.

**The kit and routine** (**judgment**, built on the FSIS rules above):

1. Freeze **two gel packs (≥5x3 in) plus a 1 L water bottle** every night. The bottle is the third cold source and turns into drinking water: no liquid calories.
2. Use a thick insulated bag or small hard cooler with a **fridge/freezer thermometer** inside, and leak-proof containers.
3. Layer it: gel pack → **meal 2 (latest)** → water bottle → **meal 1** → gel pack on top. Put dressings and sauces in small separate cups.
4. Bag closed, in AC or shade, never the car. Ask the manager whether staff may keep their own food in a designated spot. The Food Code requires employee eating areas and lockers to be located so the restaurant's food is protected (§6-403.11). Whether your own meal may go in a restaurant fridge is house policy: ask, don't assume.
5. **At each meal, check the thermometer.** If it reads above 40 °F, or the packs have gone soft, discard the remaining perishable food and use the shelf-stable backup.
6. **Shelf-stable backup for the tail of a double:** an unopened can of tuna (FDA-chart: unopened canned seafood keeps 5 years in the pantry), whole fruit, a weighed bag of nuts, and certified whey powder kept dry and mixed with water at the break. **Judgment:** once mixed, a shake follows the 2-hour rule.

**What to pack and what never to pack** (**judgment**):

- **Pack:** sliced cold steak, chicken (cooked to 165 °F), cooked shrimp, roasted salmon (cooked to 145 °F), grains, sturdy vegetables, dressing on the side. All of these eat well cold, which suits the Thai steak-noodle salad, kale and chicken salad, shrimp Louie and salmon with wild rice.
- **Never pack:** rare seared ahi; anything still warm; raw-marinated anything; a mayo-dressed salad that has not been chilled first.

## Dish-specific safety

- **USDA safe minimum internal temperatures** (FSIS-KC chart):
  - Beef, pork, veal and lamb steaks, roasts and chops: **145 °F with a 3-minute rest**.
  - Ground meats: **160 °F**.
  - Poultry, whole, parts or ground: **165 °F**.
  - Eggs and egg dishes: **160 °F**.
  - Fin fish: **145 °F**.
  - Leftovers: **165 °F**.
  - Shrimp: until "the flesh becomes firm, pearly, and opaque" (FDA-seafood).
- **Medium-rare steak (the Hillstone way) is below USDA's 145 °F.** The FDA Food Code lets a restaurant serve a raw or undercooked **whole-muscle, intact beef steak** if it stays intact and is "cooked on both the top and bottom to a surface temperature of 63 °C (145 °F) or above and a cooked color change is achieved on all external surfaces" (§3-401.11(C)). That allowance does not cover ground beef: **the burger goes to 160 °F**. It does not cover chicken either.
- **Seared ahi.**
  - Tuna species, including yellowfin and bigeye, are **exempt** from the Food Code's parasite-destruction freezing rule (§3-402.11(B)(3)).
  - FDA consumer advice is still that "it's always best to cook seafood thoroughly". If you eat fish raw or undercooked, choose fish that was **previously frozen** (FDA-seafood).
  - The real tuna risk is **scombrotoxin (histamine)**. It forms when fish "aren't properly refrigerated", and "cooking, freezing, and canning won't 'get rid' of this toxin after it has formed". Prevention is keeping fish at 40 °F or lower (BadBug).
  - So: buy it cold, keep it cold, thaw frozen ahi in the fridge overnight (FDA-seafood), sear it and eat it the same day, and never pack it.
- **Salmon.** Pellet-fed farmed salmon is also exempt from the Food Code's parasite-freezing rule (§3-402.11(B)(4)). The consumer guideline remains 145 °F.
- **Rice and wild-rice salad.** *B. cereus*: cool it fast, refrigerate within 2 hours, eat within 3-4 days, and reheat to 165 °F if eating it hot (BadBug; FSIS-KC).
- **French dip jus.** Boil it when reheating (FSIS-KC). Keep it 1-2 days in the fridge, or freeze it in portions (FDA-chart).
- **Rotisserie chicken.** Buy it hot. Pick and refrigerate it within 2 hours. Eat within 3-4 days (FSIS-KC).
- **Cut produce.** "Throw away fresh fruits and vegetables that have not been refrigerated within 2 hours of cutting, peeling, or cooking" (FSIS-KC).

## Freezer guidance

- **0 °F keeps food safe indefinitely. Storage times are for quality** (FDA-chart; FSIS-KC: "Food stored constantly at 0 °F ... will always be safe. Only the quality suffers").
- **Overwrap** meat frozen in its original package for longer than 2 months: use heavy-duty foil, plastic wrap or freezer paper, or put the package in a plastic bag (FDA-chart).
- **Freezer burn** won't make you sick, but it makes meat tough and tasteless. Wrap tightly, **date every package**, and put new items at the back so the oldest gets used first (FSIS-KC).
- **Thawing** (FSIS-KC):
  - **Refrigerator:** safest. Put the food on a plate. It takes "a day or two, depending on its size".
  - **Cold water:** in a leak-proof bag, change the water every 30 minutes, and cook immediately.
  - **Microwave:** cook immediately.
  - **Never on the counter.**
  - Frozen meat and poultry can be cooked without thawing: "Just add 50% to the cooking time."
- **Refreezing** (FSIS-KC):
  - Food thawed in the fridge may be refrozen raw or after cooking.
  - Food thawed in cold water or the microwave must be fully cooked before refreezing.
  - Cooked food made from previously frozen raw food may be frozen.
- **For this plan** (**judgment**): freeze cooked portions flat in labeled bags at the planned gram weight, so a frozen meal logs with one tap. Freeze raw proteins in single-cook portions so you never thaw more than one prep needs.

## What could not be verified

- The current fsis.usda.gov and foodsafety.gov pages, including the FoodKeeper app, were not reachable from this session (HTTP 403). Everything attributed to FSIS was read from FSIS's own archived publications (2011 fact sheets; Kitchen Companion revised 2015). Wording on the live pages may have changed.
- FoodKeeper's own cooked-rice time: search results quote "4-6 days", but it was not verified. This plan uses the stricter general leftovers rule (3-4 days).
- How many hours gel packs keep an insulated bag at 40 °F or below in Florida heat: no federal number exists. Hence the thermometer rule.
- The 5-day beef marinating limit: read directly only for veal (FSIS 2011). For beef it rests on search results describing the current FSIS beef page.
- Freezer quality times for cooked rice and grains, bread, tortillas, butter, nuts and yogurt: not on the federal charts used.
