#!/usr/bin/env python3
"""
Generate college-site/data.js from the repository's own dataset.

    python3 college-site/tools/build_data.py

Source of truth : server/data/colleges.json  (12 colleges, departments, courses,
                  seats, admission dates, events, contact)
                  app/src/core.js            (MEDIA map, indicative cut-offs, hostel/bus)

Nothing is hand-copied into the standalone site - re-run this after any data edit.
"""

import json
import os
import re

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
COLLEGES_JSON = os.path.join(REPO, "server", "data", "colleges.json")
CORE_JS = os.path.join(REPO, "app", "src", "core.js")
OUT = os.path.join(REPO, "college-site", "data.js")


def media_from_core(src):
    """pull `export const MEDIA = {...}` + GROUP_MARK out of core.js"""
    start = src.index("export const MEDIA = {") + len("export const MEDIA = ")
    depth = 0
    for i in range(start, len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    media = json.loads(src[start:end])
    mark = re.search(r'export const GROUP_MARK = "([^"]+)"', src).group(1)
    return media, mark


def facilities():
    """hostel / bus facts (same table as FACIL in core.js)"""
    return {
        "psg":        {"hostel": True,  "bus": True,  "busNote": "city & route buses"},
        "psgitech":   {"hostel": True,  "bus": True,  "busNote": "city & route buses"},
        "psgcas":     {"hostel": True,  "bus": True,  "busNote": "city & route buses"},
        "psgimsr":    {"hostel": True,  "bus": True,  "busNote": "city & route buses"},
        "psgim":      {"hostel": True,  "bus": True,  "busNote": "city & route buses"},
        "psgnursing": {"hostel": True,  "bus": True,  "busNote": "college transport"},
        "psgpharma":  {"hostel": True,  "bus": False, "busNote": ""},
        "psgphysio":  {"hostel": True,  "bus": False, "busNote": ""},
        "psgpoly":    {"hostel": True,  "bus": True,  "busNote": "city & route buses"},
        "psgr":       {"hostel": True,  "bus": True,  "busNote": "college transport"},
        "gct":        {"hostel": True,  "bus": True,  "busNote": "city & route buses"},
        "psgias":     {"hostel": False, "bus": False, "busNote": ""},
    }


def cutoffs():
    """indicative cut-offs (same table as MATCH in core.js) - demo values"""
    return {
        "psg":         {"min": 92, "basis": "engineering", "stream": "Science · Maths"},
        "psgitech":    {"min": 85, "basis": "engineering", "stream": "Science · Maths"},
        "gct":         {"min": 93, "basis": "engineering", "stream": "Science · Maths"},
        "psgcas":      {"min": 65, "basis": "merit"},
        "psgr":        {"min": 70, "basis": "merit"},
        "psgimsr":     {"min": 75, "basis": "exam", "exam": "NEET", "stream": "Science · Biology (NEET)"},
        "psgnursing":  {"min": 60, "basis": "merit", "stream": "Science · Biology"},
        "psgpharma":   {"min": 60, "basis": "merit", "stream": "the Science stream"},
        "psgphysio":   {"min": 60, "basis": "merit", "stream": "Science · Biology"},
        "psgim":       {"basis": "after-degree", "note": "MBA — any degree plus CAT / TANCET"},
        "psgpoly":     {"basis": "class10", "note": "Polytechnic — Class 10 marks"},
        "psgias":      {"basis": "after-degree", "note": "PG & research — after your degree"},
    }


def main():
    with open(COLLEGES_JSON, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    with open(CORE_JS, "r", encoding="utf-8") as fh:
        core = fh.read()
    media, group_mark = media_from_core(core)

    payload = {
        "build": data.get("build", "unknown"),
        "groups": data.get("groups", []),
        "categories": data.get("categories", {}),
        "notes": data.get("notes", {}),
        "media": media,
        "groupMark": group_mark,
        "cutoffs": cutoffs(),
        "facilities": facilities(),
        "colleges": data.get("colleges", []),
    }

    header = (
        "/* =============================================================================\n"
        "   CampusConnect college site - dataset\n"
        "   GENERATED FILE - do not edit by hand.\n"
        "   Regenerate:  python3 college-site/tools/build_data.py\n"
        "   Sources:     server/data/colleges.json  +  app/src/core.js (media, cut-offs)\n"
        "   ============================================================================= */\n"
    )
    body = json.dumps(payload, indent=1, ensure_ascii=False)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(header + "window.CC_DATA = " + body + ";\n")

    colleges = payload["colleges"]
    courses = sum(len(dep["courses"]) for c in colleges for dep in c["departments"])
    print("wrote %s" % OUT)
    print("  %d colleges · %d departments · %d courses · %d events · %d media entries"
          % (len(colleges), sum(len(c["departments"]) for c in colleges), courses,
             sum(len(c.get("events", [])) for c in colleges), len(media)))


if __name__ == "__main__":
    main()
