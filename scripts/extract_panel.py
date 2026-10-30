#!/usr/bin/env python3
"""Extract decoded HTML main-content from Buskool panel MHTML snapshots."""
import quopri, re, sys, os, html as htmllib

UPLOAD = "/home/z/my-project/upload"
OUT = "/home/z/my-project/scripts/panel_extract"
os.makedirs(OUT, exist_ok=True)

FILES = {
    "my-buskool": "باسکول من.mhtml",
    "reg-step1": "ثبت محصول.mhtml",
    "reg-step2": "ثبت محصول2.mhtml",
    "reg-step3": "ثبت محصول3.mhtml",
    "reg-step4": "ثبت محصول4.mhtml",
    "reg-step5": "ثبت محصول5.mhtml",
    "buyers": "خریداران.mhtml",
    "my-products": "محصولات من.mhtml",
    "saved-lists": "نشان شده ها.mhtml",
    "saved-detail": "نشان شده ها 2.mhtml",
}

def extract(fname):
    raw = open(os.path.join(UPLOAD, fname), "rb").read()
    # decode quoted-printable
    dec = quopri.decodestring(raw).decode("utf-8", errors="replace")
    # cut the main content region: after <div id="main" to end of that section
    m = re.search(r'<div[^>]*\bid="main"[^>]*>', dec)
    if not m:
        return dec, None
    start = m.end()
    # take a big chunk after main starts (content area)
    chunk = dec[start:start + 400000]
    return dec, chunk

for key, fname in FILES.items():
    dec, chunk = extract(fname)
    if chunk is None:
        print(f"[{key}] NO #main found, len={len(dec)}")
        continue
    # save raw main html
    with open(os.path.join(OUT, f"{key}.html"), "w") as f:
        f.write(chunk)
    # text-only version: strip scripts/styles/tags
    txt = re.sub(r"<script[\s\S]*?</script>", " ", chunk)
    txt = re.sub(r"<style[\s\S]*?</style>", " ", txt)
    txt = re.sub(r"<svg[\s\S]*?</svg>", " [SVG] ", txt)
    txt = re.sub(r"<!--[\s\S]*?-->", " ", txt)
    txt = re.sub(r"<[^>]+>", "\n", txt)
    txt = htmllib.unescape(txt)
    txt = re.sub(r"\n\s*\n+", "\n", txt)
    txt = re.sub(r"[ \t]+", " ", txt)
    with open(os.path.join(OUT, f"{key}.txt"), "w") as f:
        f.write(txt)
    print(f"[{key}] main-html={len(chunk)} chars, text={len(txt)} chars")

print("done ->", OUT)
