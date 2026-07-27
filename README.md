# Road to 3/4/5

Training tracker for a 19-wave powerbuilding program. Goal: **200 lb @ 15% body fat while hitting a 315 bench / 405 squat / 495 deadlift.**

**📱 Live app (this is the real one):** https://colin330smith.github.io/road-to-345/
Install on iPhone: open in Safari → Share → **Add to Home Screen**. Runs standalone, works fully offline, logs live in on-device `localStorage`.

> There is also a Claude Artifact copy. It does **not** share logs with the PWA and is currently behind. The PWA is canonical.

---

## Quick start

```bash
git clone https://github.com/colin330smith/road-to-345.git
cd road-to-345

python3 build.py --check     # build + syntax check
node test.js                 # 10,937 assertions — must pass
python3 -m http.server 8471  # open http://localhost:8471/road-to-345.html
```

No dependencies, no package manager. Python 3 and Node are used only to build and test — the app itself is one self-contained HTML file.

---

## Architecture

Three source files splice into two deliverables. **Never edit the deliverables** — they are generated and your changes will be overwritten.

| File | Role | Edit? |
|---|---|---|
| `engine.js` | All programming logic — waves, cycle bases, gates, session building, progression | ✅ |
| `fig.js` | IK-rigged stick-figure movement demos (canvas) | ✅ |
| `app-shell.html` | UI, styling, state, rendering. Holds the `/*==ENGINE==*/` and `/*==FIGS==*/` markers | ✅ |
| `test.js` | Test suite | ✅ |
| `build.py` | Splices the above into the two outputs | ✅ |
| `road-to-345.html` | **generated** — standalone single file | ❌ |
| `index.html` | **generated** — PWA (adds `<head>`, manifest, SW registration) | ❌ |
| `sw.js` | Service worker / offline cache. Version bumped by `build.py --bump` | ✅ |
| `manifest.webmanifest`, `icon-*.png` | PWA install metadata | ✅ |
| `figtest.html` | Visual grid of every movement figure at 3 rep phases | ✅ |

### `engine.js` — the important one

Pure logic, no DOM. Exported as `ENGINE`; works under Node (`require`) and in the browser.

- **Cycle bases (CB)** chain forward from `START = {bn:225, sq:315, dl:405}`. Each wave's gate result (`clean` / `small` / `repeat` / `reset`) sets the next wave's CB — see `cbFor(wave, gates)`.
- **Waves 1–4 main lifts are hardcoded** in `NOTES` and must match the printed wave notes in Apple Notes verbatim. Waves 5–19 are generated from the percentage windows in `PCT`.
- **6-wave macrocycles.** `cycleOf(wave)` → 1 Calibration, 2 Build, 3 Accumulate, 4 Specificity, 5 Intensification, 6 Peak (test day).
- **7-day week.** `sessionFor(wave, week, day, gates, spec)` where day 1=Mon squat, 2=Tue bench, 3=Wed paused squat, 4=Thu paused bench+OHP, 5=Fri deadlift, 6=Sat frame specialization, 7=Sun optional arms.
- **Double progression** drives every accessory through `accState()` — rep waypoints advance per wave, then weight climbs by `inc` and reps reset. Both the weekday `ACC` array and the weekend `sx()` spec exercises use it.
- **Weekend specialization** picks a `framePrimary` (arms / latwidth / shoulders / upperchest / upperback / traps) plus a `detail`. When Sunday runs, volume *transfers* off weekdays rather than stacking on top.

### Invariants worth not breaking

- Weekly caps: **biceps 16, triceps 14, side delts 16.** Current default (arms priority) sits at 16 / 13 / 10, with 8 vertical-pull sets.
- Main lifts stop at **RPE 8**. Week 3 trims accessory sets, week 4 is a deload, cycle 6 drops specialization entirely.
- Waves 1–4 output must equal the printed notes.
- Yellow mode = −5% on back-offs, 2 sets per accessory. Red = 3×3 @ 60%.

---

## Workflow

```bash
# 1. edit engine.js / fig.js / app-shell.html
# 2. rebuild + verify
python3 build.py --check && node test.js

# 3. look at it
python3 -m http.server 8471
#    → http://localhost:8471/road-to-345.html

# 4. ship
python3 build.py --bump        # MUST bump, or installed phones keep serving stale cache
git add -A && git commit -m "..." && git push
#    GitHub Pages redeploys in 1–3 min
```

### Changing a movement figure

Figures are 2-bone IK rigs in a 100×100 box, ground at y=90, lifter facing +x. Each archetype is a function of `k` (0 = start of rep, 1 = end).

```bash
python3 build.py && python3 -m http.server 8471
# → http://localhost:8471/figtest.html   every archetype at k = 0 / 0.5 / 1
```

**Always eyeball `figtest.html` before shipping figure changes.** The math can be valid and the pose still look broken.

### Gotcha: the service worker will lie to you

`index.html` registers a service worker that aggressively caches the whole origin. Once you have loaded `index.html` on `localhost:8471`, it intercepts **every** request on that port — including `road-to-345.html` — and you will keep seeing stale builds no matter how hard you reload.

```js
// paste in DevTools console to break out
(async () => {
  for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  for (const k of await caches.keys()) await caches.delete(k);
  location.reload();
})()
```

---

## Data

Everything is `localStorage` under the key `r345.v1`, on the device running the app:

```js
{
  logs:     { "2026-07-20": { r: "G", sleep: 7.5, note: "", sets: { b1: [{w,r,rpe}] } } },
  bw:       { "2026-07-20": 182 },
  gates:    { 2: { sq: "clean", bn: "repeat" } },
  testMax:  { 6: { sq: 365 } },
  spec:     { framePrimary: "arms", frameSecondary: "latwidth", detail: "triceps", sundayOn: true },
  ledger:   {},
  settings: { offsetWeeks: 0 }
}
```

No backend. Export/import lives in the app under **More → Data** — export after every test day.

---

## Log-driven progression (how it decides)

Every logged set is stamped with a stable exercise key (`k`: the `ACC` id for weekday work, a name slug for weekend spec work). At each wave boundary, `accStateLogged()` replays the log:

- **Advance** — some session that wave hit the **top of the rep range on 2+ sets** at ≥ the rung weight.
- **Adopt** — if that qualifying session was logged *heavier* than prescribed, the user's weight becomes the new rung (printed loads are floors).
- **Hold** — logged sets exist but didn't clear the top → the rung stays put, and the card shows "⏸ Holding".
- **Fallback** — nothing logged for an exercise that wave → scheduled advance, same as the old behavior.

Sets logged before this feature (no `k` stamp) are ignored by the replay; the fallback covers those waves. Mains stay gate-driven; Week 4 stays flat.

## Known gaps / next up

- The Claude Artifact copy is behind the PWA and has a version conflict.

---

## Companion pieces (outside this repo)

- **Apple Notes** — `💪 Powerlifting + Juicy Arms v7` (master program), `💪 WAVE 1–4` (printed wave notes), `🍚 NUTRITION — 200 @ 15% + 3/4/5`
- **Apple Calendar** — one calendar per wave; sessions 7:00–8:30 AM with a 30-minute alert
