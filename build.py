#!/usr/bin/env python3
"""
Build Road to 3/4/5.

Splices the two logic modules into the UI shell and writes both deliverables:

    engine.js  ─┐
    fig.js     ─┼─►  app-shell.html  ──►  road-to-345.html   (standalone / artifact)
                │                    └─►  index.html          (PWA, adds <head> + SW)
                ┘

Usage:
    python3 build.py              # build
    python3 build.py --bump       # build + bump the service-worker cache version
                                  # (REQUIRED before deploying, or phones serve stale files)
    python3 build.py --check      # build, then node --check the combined script
"""
import io
import re
import sys
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent
SHELL = ROOT / "app-shell.html"
ENGINE = ROOT / "engine.js"
FIGS = ROOT / "fig.js"
OUT_STANDALONE = ROOT / "road-to-345.html"
OUT_PWA = ROOT / "index.html"
SW = ROOT / "sw.js"

PWA_HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Road to 3/4/5</title>
<meta name="theme-color" content="#101216">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Road to 3/4/5">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/png" href="icon-192.png">
<style>html{-webkit-text-size-adjust:100%;background:#101216}</style>
</head>
<body>
"""

PWA_TAIL = """
<script>
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
</script>
</body>
</html>
"""


def read(p):
    return io.open(p, encoding="utf-8").read()


def write(p, s):
    io.open(p, "w", encoding="utf-8").write(s)


def build():
    shell = read(SHELL)
    for marker, src in (("/*==ENGINE==*/", ENGINE), ("/*==FIGS==*/", FIGS)):
        if marker not in shell:
            sys.exit(f"ERROR: {marker} missing from app-shell.html — cannot splice {src.name}")
        shell = shell.replace(marker, read(src), 1)

    write(OUT_STANDALONE, shell)

    frag = shell.replace('<meta charset="utf-8">\n', "", 1)
    frag = frag.replace("<title>Road to 3/4/5</title>\n", "", 1)
    write(OUT_PWA, PWA_HEAD + frag + PWA_TAIL)

    print(f"built  road-to-345.html  {len(shell):,} bytes")
    print(f"built  index.html        {len(PWA_HEAD + frag + PWA_TAIL):,} bytes")
    return shell


def bump_sw():
    s = read(SW)
    m = re.search(r'const C = "r345-v(\d+)";', s)
    if not m:
        sys.exit("ERROR: could not find cache version in sw.js")
    nxt = int(m.group(1)) + 1
    write(SW, re.sub(r'const C = "r345-v\d+";', f'const C = "r345-v{nxt}";', s))
    print(f"bumped service worker cache  ->  r345-v{nxt}")


def check(html):
    script = re.search(r"<script>(.*)</script>", html, re.S)
    if not script:
        sys.exit("ERROR: no <script> block found in build output")
    tmp = ROOT / "_check.js"
    write(tmp, script.group(1))
    try:
        subprocess.run(["node", "--check", str(tmp)], check=True)
        print("syntax OK")
    finally:
        tmp.unlink(missing_ok=True)


if __name__ == "__main__":
    html = build()
    if "--check" in sys.argv:
        check(html)
    if "--bump" in sys.argv:
        bump_sw()
