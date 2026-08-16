#!/usr/bin/env python3
"""
Generate wave-note and calendar text FROM the engine.

The Apple Notes wave notes and the ~80 calendar event descriptions used to be
hand-written, which meant every program change silently made them wrong. This
renders both from engine.js so the app stays the single source of truth.

    python3 sync.py notes 1 2 3 4     # wave note bodies -> out/note-waveN.txt
    python3 sync.py cal 1 2 3 4       # per-day event descriptions -> out/cal-waveN.json
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
OUT = ROOT / "out"
DAY = ["", "Mon — Comp Squat + Legs", "Tue — Comp Bench + Back", "Wed — Paused Squat + Arms",
       "Thu — Paused Bench + OHP", "Fri — Comp Deadlift + Back", "Sat — Frame Spec", "Sun — Optional Arms"]


def sessions(wave):
    """Ask the engine for every session in a wave."""
    js = """
    const E = require('./engine.js');
    const wave = %d, out = {};
    for (let wk = 1; wk <= 4; wk++) for (let d = 1; d <= 7; d++) {
      out[wk + '-' + d] = E.sessionFor(wave, wk, d, {}, E.DEFAULT_SPEC)
        .map(b => ({ type: b.type, name: b.name, w: b.w, reps: b.reps, sets: b.sets,
                     rpe: b.rpe, db: b.db, note: b.note, rows: b.rows, lastHard: b.lastHard, added: b.added }));
    }
    const t = E.mainTables(wave, {});
    const tr = {};
    for (const id of ['inc', 'chin', 'rdl']) tr[id] = { cb: E.trackedCB(id, wave, {}), goal: E.TRACKED[id].goal };
    console.log(JSON.stringify({ blocks: out, cb: t.cb, cyc: t.cyc, cycName: E.CYCLE_NAME[t.cyc],
      tracked: tr, start: E.waveStartUTC(wave, 0) }));
    """ % wave
    r = subprocess.run(["node", "-e", js], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def line(b):
    if b["type"] == "warmup":
        return "  " + " · ".join(f"{r[0]} × {r[1]}" for r in b["rows"])
    if b["type"] in ("conditioning", "cooldown", "test", "spechead", "note"):
        return f"  {b['name']}" + (f" — {b['note']}" if b.get("note") else "")
    w = "BW" if b.get("w") == 0 else f"+{b['w']}" if b.get("added") else b.get("w")
    tail = " · per hand" if b.get("db") else ""
    hard = "  ← last set RPE 9–10" if b.get("lastHard") else ""
    return f"  {b['name']}: {w} × {b['reps']} × {b['sets']} @ RPE {b['rpe']}{tail}{hard}"


def render_day(blocks):
    return "\n".join(line(b) for b in blocks)


def note_body(wave, data):
    cb = data["cb"]
    tr = data["tracked"]
    L = [f"💪 WAVE {wave} — {data['cycName'].upper()}",
         "",
         f"CYCLE BASES: bench {cb['bn']} · squat {cb['sq']} · deadlift {cb['dl']}",
         f"TRACKED: incline {tr['inc']['cb']} → {tr['inc']['goal']} · "
         f"chin-up +{tr['chin']['cb']} → +{tr['chin']['goal']} · "
         f"RDL {tr['rdl']['cb']} → {tr['rdl']['goal']}",
         "",
         "ARMS + HAMSTRINGS ARE GOALS NOW, not accessories. The weighted chin-up and",
         "the RDL are tracked and gated exactly like the big three — they climb every",
         "wave and they have finish lines. Chase them like you chase 3/4/5.",
         "",
         "⚠️ THIS NOTE IS GENERATED FROM THE APP. The app is the source of truth —",
         "it adapts loads to what you actually log. Use this only as a reference.",
         "Printed weights are FLOORS: if a set is easy, add weight and log it.",
         ""]
    for wk in range(1, 5):
        L += ["━" * 34, f"WEEK {wk}" + ("  (deload)" if wk == 4 else "  (reduced sets)" if wk == 3 else ""), "━" * 34, ""]
        for d in range(1, 8):
            blocks = data["blocks"][f"{wk}-{d}"]
            if not blocks:
                continue
            L += [DAY[d], render_day(blocks), ""]
    return "\n".join(L)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "notes"
    waves = [int(x) for x in sys.argv[2:]] or [1, 2, 3, 4]
    OUT.mkdir(exist_ok=True)
    for w in waves:
        data = sessions(w)
        if mode == "notes":
            p = OUT / f"note-wave{w}.txt"
            p.write_text(note_body(w, data), encoding="utf-8")
            print(f"wrote {p} ({len(p.read_text(encoding='utf-8')):,} chars)")
        else:
            evs = {}
            for wk in range(1, 5):
                for d in range(1, 8):
                    blocks = data["blocks"][f"{wk}-{d}"]
                    if not blocks:
                        continue
                    evs[f"{wk}-{d}"] = (
                        f"Wave {w} · Week {wk} · {DAY[d]}\n"
                        f"CB {data['cb']['bn']}/{data['cb']['sq']}/{data['cb']['dl']}\n\n"
                        + render_day(blocks)
                        + "\n\nWeights are floors — log what you actually lift; the app adapts.\n"
                        "Full session + demos: Road to 3/4/5 app."
                    )
            p = OUT / f"cal-wave{w}.json"
            p.write_text(json.dumps({"start": data["start"], "events": evs}, indent=1), encoding="utf-8")
            print(f"wrote {p} ({len(evs)} events)")
