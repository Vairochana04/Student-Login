#!/usr/bin/env python3
"""
Package the standalone college site into a single self-contained folder + zip.

    python3 college-site/tools/package_site.py [--out DIR] [--zip PATH]

Copies college-site/ (index.html, style.css, app.js, data.js, README.txt) together with
the campus photos / logos from app/dist/media into one folder that runs by
double-clicking index.html — no server, no npm, no Java, no internet needed for
the app itself (only the Google Map embed and the official-website links need it).
"""

import argparse
import os
import shutil
import zipfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(REPO, "college-site")
MEDIA_SRC = os.path.join(REPO, "app", "dist", "media")
FILES = ["index.html", "style.css", "app.js", "data.js", "README.txt"]


def build(out_dir, zip_path):
    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)

    for name in FILES:
        src = os.path.join(SITE, name)
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(out_dir, name))
        else:
            print("  ! missing %s" % name)

    media_out = os.path.join(out_dir, "media")
    if os.path.isdir(MEDIA_SRC):
        shutil.copytree(MEDIA_SRC, media_out)
        print("  media: %d files" % len(os.listdir(media_out)))
    else:
        print("  ! no media folder at %s" % MEDIA_SRC)

    if zip_path:
        if os.path.isfile(zip_path):
            os.remove(zip_path)
        base = os.path.basename(out_dir)
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
            for root, _dirs, files in os.walk(out_dir):
                for f in sorted(files):
                    full = os.path.join(root, f)
                    zf.write(full, os.path.join(base, os.path.relpath(full, out_dir)))
        print("  zip  : %s (%.1f MB)" % (zip_path, os.path.getsize(zip_path) / 1e6))
    return out_dir


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/home/user/.cache/cc-site")
    ap.add_argument("--zip", default="/home/user/CampusConnect-College-Site.zip")
    a = ap.parse_args()
    print("packaging standalone site -> %s" % a.out)
    build(a.out, a.zip)
