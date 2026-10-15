#!/usr/bin/env python3
"""
CampusConnect — preview server (Python stand-in for server/Server.java)
=======================================================================

WHY THIS EXISTS
---------------
The real backend is server/Server.java (single-file Java, `java Server.java`).
That is still the intended way to run the site: it needs nothing but a JDK
(see START-HERE.txt). This script is a *preview/dev helper* for machines where
Java is not installed — it serves the exact same thing on the same port:

    * the React build from app/dist (with SPA fallback to index.html)
    * /api/*  — colleges, login, student register/update/me, tracking,
                admin summary + CSV exports
    * /site/<college-id>/...  — proxy to the college's official website

It reads and writes the same files as the Java server
(server/data/students.json, server/data/student-events.jsonl), so the two
backends can be used interchangeably — including the same password hashing
(salt:sha256(salt + password)) and the same JSON shapes.

RUN
---
    python3 tools/preview_server.py             # http://localhost:8080
    PORT=9000 python3 tools/preview_server.py   # a different port

Demo credentials (from server/data/demo-credentials.json):
    student@demo.edu / student123      college@demo.edu / college123
    admin@demo.edu   / admin123
"""

import base64
import hashlib
import json
import os
import re
import secrets
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

# ------------------------------------------------------------------ config

PORT = int(os.environ.get("PORT", "8080"))
HOST = "0.0.0.0"

ROOT = Path(__file__).resolve().parent.parent          # repo root
DIST = ROOT / "app" / "dist"                           # React build
DATA = ROOT / "server" / "data"
STUDENTS_FILE = DATA / "students.json"
EVENTS_FILE = DATA / "student-events.jsonl"

STUDENT_FIELDS = ["name", "email", "mobile", "marks", "marks10", "phy", "chem", "math",
                  "stream", "want", "degree", "stay", "hostelType", "travel", "town",
                  "track", "checklist", "remind", "consent", "photo"]
EVENT_TYPES = {"register", "login", "profile_view", "save", "unsave",
               "website_click", "apply_click", "update"}
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

# token -> [email, role] for this process
TOKENS = {}
# self-verifying tokens survive a restart (a preview convenience; the Java
# server keeps them in memory only)
TOKEN_SECRET = "campusconnect-preview"

# the official websites the proxy serves (same list as the dataset)
SITES = {
    "psg": "https://www.psgtech.edu",
    "psgcas": "https://www.psgcas.ac.in",
    "psgcas-apply": "https://applications.psgcas.ac.in",
    "psgimsr": "https://psgimsr.ac.in",
    "psgim": "https://psgim.ac.in",
    "psgitech": "https://www.psgitech.ac.in",
    "psgpoly": "https://www.psgpolytech.ac.in",
    "psgnursing": "https://www.psgnursing.ac.in",
    "psgpharma": "https://psgpharma.ac.in",
    "psgphysio": "https://psgphysiotherapy.ac.in",
    "psgias": "https://www.psgias.ac.in",
    "psgr": "https://www.psgrkcw.ac.in",
    "gct": "https://gct.ac.in",
}

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".txt": "text/plain; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
}

# ------------------------------------------------------------------ helpers


def now_iso():
    """Java: Instant.now() truncated to seconds, e.g. 2026-10-14T06:30:00Z"""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256hex(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def pwhash(pw):
    salt_hex = secrets.token_hex(8)
    return salt_hex + ":" + sha256hex(salt_hex + pw)


def checkpw(pw, stored):
    if not stored:
        return False
    if ":" not in stored:
        return stored == pw                      # plain demo credential
    salt_hex, digest = stored.split(":", 1)
    return sha256hex(salt_hex + pw) == digest


def digits(value):
    return re.sub(r"[^0-9]", "", value or "")


def issue(email, role):
    tok = base64.urlsafe_b64encode(f"{email}|{role}".encode()).decode().rstrip("=")
    sig = sha256hex(TOKEN_SECRET + email + "|" + role)[:24]
    token = f"cc1.{tok}.{sig}"
    TOKENS[token] = [email, role]
    return token


def token_of(headers, query):
    tok = headers.get("X-CC-Token")
    if not tok and query:
        tok = (parse_qs(query).get("token") or [""])[0]
    if not tok:
        return None
    if tok in TOKENS:
        return TOKENS[tok]
    parts = tok.split(".")
    if len(parts) == 3 and parts[0] == "cc1":
        try:
            pad = "=" * (-len(parts[1]) % 4)
            email, role = base64.urlsafe_b64decode(parts[1] + pad).decode().split("|", 1)
        except Exception:
            return None
        if sha256hex(TOKEN_SECRET + email + "|" + role)[:24] == parts[2]:
            TOKENS[tok] = [email, role]
            return TOKENS[tok]
    return None


def read_students():
    if not STUDENTS_FILE.exists():
        return {}
    try:
        return json.loads(STUDENTS_FILE.read_text("utf-8"))
    except Exception:
        return {}


def write_students(students):
    tmp = STUDENTS_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(students, ensure_ascii=False, indent=1), "utf-8")
    os.replace(tmp, STUDENTS_FILE)


def read_events():
    if not EVENTS_FILE.exists():
        return []
    out = []
    for line in EVENTS_FILE.read_text("utf-8").splitlines():
        line = line.strip()
        if line:
            try:
                out.append(json.loads(line))
            except Exception:
                pass
    return out


def log_event(email, etype, cid="", label=""):
    if etype not in EVENT_TYPES:
        return
    rec = {"email": email, "type": etype, "cid": cid or "", "label": label or "", "at": now_iso()}
    with EVENTS_FILE.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(rec, ensure_ascii=False) + "\n")


def student_json(rec, with_photo=True):
    out = {}
    for key in STUDENT_FIELDS:
        if key == "photo" and not with_photo:
            continue
        value = rec.get(key, "") or ""
        if key in ("marks", "marks10", "phy", "chem", "math") and re.fullmatch(r"-?\d+(\.\d+)?", str(value)):
            out[key] = int(value) if re.fullmatch(r"-?\d+", str(value)) else float(value)
        else:
            out[key] = value
    for key in ("created", "updated"):
        if rec.get(key):
            out[key] = rec[key]
    return out


def college_names():
    try:
        data = json.loads((DATA / "colleges.json").read_text("utf-8"))
        rows = data["colleges"] if isinstance(data, dict) else data
        return {row.get("id"): row.get("name", row.get("id")) for row in rows}
    except Exception:
        return {}


def college_name(cid):
    return college_names().get(cid, cid)


def seed_demo_student():
    """Java seeds server/data/students.json on first run - same record here.

    The demo student starts EMPTY on purpose (the PSG Campus Compass flow): the
    first sign-in walks through the details form once, and after that the same
    email + password lands straight on the colleges - no re-registering.
    """
    if STUDENTS_FILE.exists():
        return
    rec = {
        "email": "student@demo.edu", "password": pwhash("student123"),
        "created": now_iso(), "updated": now_iso(),
    }
    write_students({"student@demo.edu": rec})


def csv_cell(value):
    value = "" if value is None else str(value)
    return '"' + value.replace('"', '""') + '"' if re.search(r'[",\n]', value) else value


def http_fetch(url, timeout):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as res:      # noqa: S310 (preview only)
        return res.status, res.headers.get("Content-Type", "text/html"), res.read()


# ------------------------------------------------------------------ server


class Handler(BaseHTTPRequestHandler):
    server_version = "CampusConnectPreview/1.0"
    protocol_version = "HTTP/1.1"

    # ---- plumbing -------------------------------------------------------

    def log_message(self, fmt, *args):                     # quieter, one line per request
        sys.stderr.write("  %s\n" % (fmt % args))

    def send_bytes(self, status, body, ctype, extra=None):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def send_json(self, status, payload):
        body = payload if isinstance(payload, (bytes, str)) else json.dumps(payload, ensure_ascii=False)
        if isinstance(body, str) and not body.lstrip().startswith(("{", "[")):
            body = json.dumps({"ok": False, "error": body}, ensure_ascii=False)
        self.send_bytes(status, body, "application/json; charset=utf-8")

    def json_error(self, status, message):
        self.send_bytes(status, json.dumps({"ok": False, "error": message}, ensure_ascii=False),
                        "application/json; charset=utf-8")

    def send_csv(self, text, filename):
        self.send_bytes(200, text, "text/csv; charset=utf-8", {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store, must-revalidate",
        })

    def body_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    # ---- routing --------------------------------------------------------

    def do_GET(self):
        self.route()

    def do_HEAD(self):
        self.route()

    def do_POST(self):
        self.route()

    def route(self):
        split = urlsplit(self.path)
        path, query = unquote(split.path), split.query
        is_post = self.command == "POST"
        try:
            if path.startswith("/site/"):
                return self.site_proxy(path, query)
            if path == "/api/colleges":
                raw = (DATA / "colleges.json")
                if not raw.exists():
                    return self.send_json(200, {"colleges": []})
                return self.send_bytes(200, raw.read_bytes(), "application/json; charset=utf-8")
            if path == "/api/login" and is_post:
                return self.api_login()
            if path == "/api/students/register" and is_post:
                return self.api_register()
            if path == "/api/students/update" and is_post:
                return self.api_update()
            if path == "/api/track" and is_post:
                return self.api_track()
            if path == "/api/students/me":
                return self.api_me()
            if path == "/api/admin/summary":
                return self.api_admin_summary()
            if path == "/api/admin/students.csv":
                return self.api_students_csv()
            if path == "/api/admin/leads.csv":
                return self.api_leads_csv()
            if path.startswith("/api/probe/"):
                cid = path[len("/api/probe/"):]
                return self.send_json(200, {"cid": cid, "ok": self.health(cid)})
            return self.static_file(path)
        except Exception as exc:                                  # keep the preview alive
            return self.send_bytes(500, f"server error: {exc}", "text/plain; charset=utf-8")

    # ---- api: auth ------------------------------------------------------

    def api_login(self):
        body = self.body_json()
        email = (body.get("email") or "").strip().lower()
        pw = body.get("password") or ""

        rec = read_students().get(email)
        if rec is not None:
            if not checkpw(pw, rec.get("password")):
                return self.json_error(401, "That password does not match.")
            token = issue(email, "student")
            log_event(email, "login")
            return self.send_json(200, {"ok": True, "role": "student", "token": token,
                                        "email": email, "student": student_json(rec, True)})

        users = {}
        path = DATA / "users.json"
        if path.exists():
            try:
                users = json.loads(path.read_text("utf-8"))
            except Exception:
                users = {}
        user = users.get(email)
        if not user or not checkpw(pw, user.get("password")):
            return self.json_error(401, "Incorrect email or password. Try the demo credentials "
                                        "below, or tap \"Use demo login\".")
        role = user.get("role", "student")
        token = issue(email, role)
        payload = {"ok": True, "token": token, "email": email}
        for key in ("role", "name", "title", "collegeId"):
            if user.get(key) is not None:
                payload[key] = user[key]
        return self.send_json(200, payload)

    def api_register(self):
        body = self.body_json()
        email = (body.get("email") or "").strip().lower()
        pw = body.get("password") or ""
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            return self.json_error(400, "Please enter a valid email id.")
        if len(pw) < 6:
            return self.json_error(400, "Password should be at least 6 characters.")
        mobile = digits(body.get("mobile"))
        if len(mobile) != 10:
            return self.json_error(400, "Mobile number should be 10 digits.")
        try:
            marks = float(body.get("marks") or "")
            if marks < 30 or marks > 100:
                raise ValueError
        except (TypeError, ValueError):
            return self.json_error(400, "Class 12 percentage should be between 30 and 100.")
        marks10 = None
        raw10 = body.get("marks10")
        if raw10 not in (None, ""):
            try:
                marks10 = float(raw10)
                if marks10 < 30 or marks10 > 100:
                    raise ValueError
            except (TypeError, ValueError):
                return self.json_error(400, "Class 10 percentage should be between 30 and 100 (or leave it blank).")

        subjects = {}
        for key in ("phy", "chem", "math"):
            raw = body.get(key)
            subjects[key] = ""
            if raw in (None, ""):
                continue
            try:
                val = float(raw)
                if val < 0 or val > 100:
                    raise ValueError
            except (TypeError, ValueError):
                return self.json_error(400, "Maths, Physics and Chemistry marks should be between 0 and 100.")
            subjects[key] = str(int(val)) if val == int(val) else str(val)

        students = read_students()
        if email in students:
            return self.json_error(400, "An account with this email already exists.")
        name = (body.get("name") or "").strip()
        rec = {
            "name": name or email.split("@")[0], "email": email, "mobile": mobile,
            "marks": str(int(marks)) if marks == int(marks) else str(marks),
            "marks10": ("" if marks10 is None else
                        (str(int(marks10)) if marks10 == int(marks10) else str(marks10))),
            "phy": subjects["phy"], "chem": subjects["chem"], "math": subjects["math"],
            "password": pwhash(pw),
        }
        for field in ("stream", "want", "degree", "stay", "hostelType", "travel", "town"):
            rec[field] = (body.get(field) or "").strip()
        consent = body.get("consent") or ""
        rec["consent"] = "true" if consent in ("true", "1", "yes") else "false"
        rec["created"] = rec["updated"] = now_iso()
        students[email] = rec
        write_students(students)

        token = issue(email, "student")
        log_event(email, "register")
        return self.send_json(200, {"ok": True, "token": token, "student": student_json(rec, True)})

    def api_update(self):
        auth = token_of(self.headers, urlsplit(self.path).query)
        if not auth or auth[1] != "student":
            return self.json_error(401, "Please sign in again.")
        body = self.body_json()
        email = auth[0]
        students = read_students()
        rec = students.get(email)
        if rec is None:
            rec = {"email": email, "name": email.split("@")[0], "created": now_iso()}

        error = None
        if "mobile" in body:
            mobile = digits(body.get("mobile"))
            if len(mobile) != 10:
                error = "Mobile number should be 10 digits."
            else:
                rec["mobile"] = mobile
        if error is None and "marks" in body:
            try:
                marks = float(body.get("marks") or "")
                if marks < 30 or marks > 100:
                    error = "Class 12 percentage should be between 30 and 100."
                else:
                    rec["marks"] = str(int(marks)) if marks == int(marks) else str(marks)
            except (TypeError, ValueError):
                error = "Class 12 percentage should be a number."
        if error is None and "marks10" in body:
            raw10 = body.get("marks10")
            if raw10 in (None, ""):
                rec["marks10"] = ""
            else:
                try:
                    m10 = float(raw10)
                    if m10 < 30 or m10 > 100:
                        error = "Class 10 percentage should be between 30 and 100."
                    else:
                        rec["marks10"] = str(int(m10)) if m10 == int(m10) else str(m10)
                except (TypeError, ValueError):
                    error = "Class 10 percentage should be a number."
        if error is None:
            for key, label in (("phy", "Physics"), ("chem", "Chemistry"), ("math", "Maths")):
                if key in body:
                    raw = body.get(key)
                    if raw in (None, ""):
                        rec[key] = ""
                    else:
                        try:
                            val = float(raw)
                            if val < 0 or val > 100:
                                raise ValueError
                            rec[key] = str(int(val)) if val == int(val) else str(val)
                        except (TypeError, ValueError):
                            error = label + " mark should be between 0 and 100."
                            break
        if error is None:
            for field in ("name", "stream", "want", "degree", "stay", "hostelType",
                          "travel", "town", "photo"):
                if field in body:
                    rec[field] = (body.get(field) or "").strip()
            # the checklist / tracker / reminders: short id lists only
            for field in ("track", "checklist", "remind"):
                if field in body:
                    rec[field] = re.sub(r"[^A-Za-z0-9,:{}_'\"-]", "", str(body.get(field) or ""))[:1200]
            if "consent" in body:
                consent = body.get("consent") or ""
                rec["consent"] = "true" if consent in ("true", "1", "yes") else "false"
            rec["updated"] = now_iso()
            students[email] = rec
            write_students(students)

        if error:
            return self.json_error(400, error)
        log_event(email, "update")
        return self.send_json(200, {"ok": True, "student": student_json(rec, True)})

    def api_me(self):
        auth = token_of(self.headers, urlsplit(self.path).query)
        if not auth or auth[1] != "student":
            return self.json_error(401, "Please sign in again.")
        rec = read_students().get(auth[0])
        if rec is None:
            return self.json_error(404, "No profile yet.")
        return self.send_json(200, {"ok": True, "student": student_json(rec, True)})

    def api_track(self):
        auth = token_of(self.headers, urlsplit(self.path).query)
        if not auth:
            return self.json_error(401, "Please sign in again.")
        body = self.body_json()
        log_event(auth[0], body.get("type", ""), body.get("cid", ""), body.get("label", ""))
        return self.send_json(200, {"ok": True})

    # ---- api: admin -----------------------------------------------------

    @staticmethod
    def activity_for(email, events):
        views = saves = clicks = 0
        last = ""
        per = {}
        for event in events:
            if event.get("email") != email:
                continue
            etype = event.get("type", "")
            cid = event.get("cid", "")
            at = event.get("at", "")
            if at > last:
                last = at
            if etype == "profile_view":
                views += 1
            elif etype == "save":
                saves += 1
            elif etype == "website_click":
                clicks += 1
            if cid:
                slot = per.setdefault(cid, [0, 0])
                if etype == "profile_view":
                    slot[0] += 1
                elif etype == "save":
                    slot[1] += 1
        top = sorted(per.items(), key=lambda kv: (-kv[1][0], -kv[1][1]))[:3]
        names = college_names()
        top_json = [{"id": cid, "name": names.get(cid, cid), "views": slot[0]} for cid, slot in top]
        return views, saves, clicks, len(per), last, top_json

    def api_admin_summary(self):
        auth = token_of(self.headers, urlsplit(self.path).query)
        if not auth or auth[1] != "admin":
            return self.json_error(401, "Admin sign-in required.")
        students = read_students()
        events = read_events()
        names = college_names()

        cagg, cwho = {}, {}
        for event in events:
            cid = event.get("cid", "")
            if not cid:
                continue
            slot = cagg.setdefault(cid, [0, 0, 0])
            cwho.setdefault(cid, set())
            etype = event.get("type", "")
            if etype == "profile_view":
                slot[0] += 1
            elif etype == "save":
                slot[1] += 1
            else:
                slot[2] += 1
            if event.get("email"):
                cwho[cid].add(event["email"])

        rows, t_views, t_saves, t_clicks = [], 0, 0, 0
        for email, rec in students.items():
            views, saves, clicks, viewed, last, top = self.activity_for(email, events)
            t_views += views
            t_saves += saves
            t_clicks += clicks
            row = student_json(rec, False)
            row.update({"profileViews": views, "saves": saves, "websiteClicks": clicks,
                        "collegesViewed": viewed, "lastActivity": last, "topColleges": top})
            rows.append((last, row))
        rows.sort(key=lambda item: item[0], reverse=True)

        colleges = []
        with_interest = 0
        for cid, slot in sorted(cagg.items(), key=lambda kv: (-len(cwho[kv[0]]), -kv[1][0])):
            who = len(cwho[cid])
            if who:
                with_interest += 1
            colleges.append({"id": cid, "name": names.get(cid, cid), "views": slot[0],
                             "saves": slot[1], "clicks": slot[2], "students": who})

        today = datetime.now(timezone.utc).date()
        days = []
        for offset in range(6, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            views = saves = clicks = logins = 0
            for event in events:
                if (event.get("at") or "")[:10] != day:
                    continue
                etype = event.get("type", "")
                if etype == "profile_view":
                    views += 1
                elif etype == "save":
                    saves += 1
                elif etype == "login":
                    logins += 1
                else:
                    clicks += 1
            days.append({"date": day, "views": views, "saves": saves,
                         "clicks": clicks, "logins": logins})

        recent = []
        for event in reversed(events[-160:]):
            recent.append({"at": event.get("at", ""), "email": event.get("email", ""),
                           "type": event.get("type", ""), "cid": event.get("cid", ""),
                           "label": event.get("label", "")})

        return self.send_json(200, {
            "ok": True, "days": days, "recent": recent,
            "totals": {"students": len(students), "events": len(events),
                       "profileViews": t_views, "saves": t_saves,
                       "websiteClicks": t_clicks, "collegesWithInterest": with_interest},
            "students": [row for _, row in rows], "colleges": colleges,
        })

    def api_students_csv(self):
        auth = token_of(self.headers, urlsplit(self.path).query)
        if not auth or auth[1] != "admin":
            return self.json_error(401, "Admin sign-in required.")
        cols = ["email", "name", "mobile", "marks", "marks10", "phy", "chem", "math", "stream",
                "want", "degree", "stay", "hostelType", "travel", "town", "consent",
                "created", "updated"]
        lines = [",".join(cols)]
        for rec in read_students().values():
            lines.append(",".join(csv_cell(rec.get(col, "")) for col in cols))
        return self.send_csv("\n".join(lines) + "\n", "students.csv")

    def api_leads_csv(self):
        auth = token_of(self.headers, urlsplit(self.path).query)
        if not auth or auth[1] != "admin":
            return self.json_error(401, "Admin sign-in required.")
        query = parse_qs(urlsplit(self.path).query)
        cid = (query.get("cid") or [""])[0]
        names = {email: rec.get("name", "") for email, rec in read_students().items()}
        lines = ["at,email,name,type,college,label"]
        for event in read_events():
            etype = event.get("type", "")
            event_cid = event.get("cid", "")
            if cid and cid != event_cid:
                continue
            if etype not in ("profile_view", "save", "website_click", "apply_click"):
                continue
            lines.append(",".join([
                csv_cell(event.get("at", "")), csv_cell(event.get("email", "")),
                csv_cell(names.get(event.get("email", ""), "")), csv_cell(etype),
                csv_cell(college_name(event_cid)), csv_cell(event.get("label", "")),
            ]))
        return self.send_csv("\n".join(lines) + "\n", "leads.csv")

    # ---- official-website proxy ----------------------------------------

    def site_proxy(self, path, query):
        rest = path[len("/site/"):]
        cid, _, sub = rest.partition("/")
        base = SITES.get(cid)
        if base is None:
            return self.send_bytes(404, f"unknown college: {cid}", "text/plain; charset=utf-8")
        if sub.replace("/", "") == "__ping":
            return self.send_bytes(200, "ok" if self.health(cid) else "fail",
                                   "text/plain; charset=utf-8")
        target = base.rstrip("/") + "/" + sub.lstrip("/")
        if query:
            target += "?" + query
        try:
            status, ctype, body = http_fetch(target, 20)
        except Exception as exc:
            return self.send_bytes(502, f"The college website could not be reached: {exc}",
                                   "text/plain; charset=utf-8")
        return self.send_bytes(status, body, ctype)

    def health(self, cid):
        base = SITES.get(cid)
        if not base:
            return False
        try:
            return http_fetch(base + "/", 6)[0] < 400
        except Exception:
            return False

    # ---- static files ---------------------------------------------------

    def static_file(self, path):
        rel = "index.html" if path in ("", "/") else path.lstrip("/")
        target = (DIST / rel).resolve()
        if not str(target).startswith(str(DIST)) or not target.is_file():
            target = DIST / "index.html"        # SPA fallback (also covers stale asset hashes)
        if not target.is_file():
            return self.send_bytes(404, "app/dist is missing — run: cd app && npm run build",
                                   "text/plain; charset=utf-8")
        body = target.read_bytes()
        ctype = MIME.get(target.suffix.lower(), "application/octet-stream")
        cache = ("no-store, must-revalidate" if target.suffix == ".html"
                 else "public, max-age=31536000, immutable")
        self.send_bytes(200, body, ctype, {"Cache-Control": cache})


def main():
    seed_demo_student()
    if not (DIST / "index.html").is_file():
        print(f"WARNING: no build found in {DIST} — run: cd app && npm run build", file=sys.stderr)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"CampusConnect (preview) on http://{HOST}:{PORT}")
    print(f"  app    :  /                    (React build from {DIST})")
    print("  api    :  /api/colleges  /api/login  /api/probe/<cid>")
    print("  proxy  :  /site/<college-id>/  e.g. /site/psgcas/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
