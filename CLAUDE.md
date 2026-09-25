# Road to 3/4/5 — notes for Claude sessions

- **Push after every commit.** Cloud containers are wiped without warning; unpushed work is lost (it happened once: two batches and the `.audit/` specs).
- Before committing: `python3 build.py --check && node test.js` (both must pass). Never hand-edit `index.html` / `road-to-345.html`.
- Ship: `python3 build.py --bump`, commit, fast-forward `main`, push, then confirm https://colin330smith.github.io/road-to-345/sw.js shows the new version.
- Material changes only when backed by science (a checked source, recorded in `EVIDENCE.md`) or truth (a real bug). Label judgment calls as judgment calls.
- Never cite the retracted Barbalho volume papers.
- Apple Notes / Calendar sync (`sync.py` push, `push_cal.py`, osascript) runs only on the Mac. In the cloud, regenerate `out/` with `python3 sync.py notes|cal N` and leave the push for the Mac.
