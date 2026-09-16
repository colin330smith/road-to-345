#!/usr/bin/env python3
"""Push out/cal-waveN.json descriptions into the "Wave N — Strength Block" calendars.
Matches timed events by date; never touches all-day events (gate reminders).
    python3 sync.py cal 3 4 && python3 push_cal.py 3 4
"""
import json, subprocess, sys, datetime, pathlib
ROOT = pathlib.Path(__file__).parent
def push(wave):
    d = json.loads((ROOT / f"out/cal-wave{wave}.json").read_text(encoding="utf-8"))
    start = datetime.datetime.fromtimestamp(d["start"] / 1000, datetime.UTC).date()
    items = [{"date": (start + datetime.timedelta(days=(int(k.split("-")[0]) - 1) * 7 + int(k.split("-")[1]) - 1)).isoformat(), "body": body}
             for k, body in d["events"].items()]
    payload = json.dumps({"cal": f"Wave {wave} — Strength Block", "items": items})
    js = r'''
    ObjC.import("stdlib");
    const P = JSON.parse($.getenv("CAL_PAYLOAD"));
    const cal = Application("Calendar").calendars.whose({ name: P.cal })[0];
    const evs = cal.events(); const byDay = {};
    for (const e of evs) {
      if (e.alldayEvent()) continue;
      const s = e.startDate();
      const k = [s.getFullYear(), String(s.getMonth()+1).padStart(2,"0"), String(s.getDate()).padStart(2,"0")].join("-");
      (byDay[k] = byDay[k] || []).push(e);
    }
    let hit = 0; const missed = [];
    for (const it of P.items) { const c = byDay[it.date]; if (!c || !c.length) { missed.push(it.date); continue; } c[0].description = it.body; hit++; }
    JSON.stringify({ hit, missed, calEvents: evs.length });'''
    r = subprocess.run(["osascript", "-l", "JavaScript", "-e", js], capture_output=True, text=True, env={"CAL_PAYLOAD": payload, "PATH": "/usr/bin:/bin"})
    print(f"wave {wave}:", r.stdout.strip() or ("ERR " + r.stderr.strip()[:300]))
if __name__ == "__main__":
    for w in (int(x) for x in sys.argv[1:]): push(w)
