#!/usr/bin/env python3
"""
PSG Campus Compass — demo backend
=================================

Serves the single-file site and stores student details in a JSON file, so the
"login -> fill details -> save -> colleges" flow really survives a logout.

    python3 psg-compass/server.py            # http://localhost:8090
    PORT=9000 python3 psg-compass/server.py

API (all POST, JSON in / JSON out)
----------------------------------
    /api/login   {email, pw}              -> {ok, profile|null, created}
    /api/save    {email, pw, profile}     -> {ok, profile}
    /api/health                           -> {ok, students}

Storage: psg-compass/data/students.json
    <email>: {profile..., password: "<salt>:sha256(salt+pw)", created, updated}

The password hashing matches server/data/students.json and
tools/preview_server.py, so the demo data stays consistent across backends.

NOTE: this is a demo. No TLS, no rate limiting, no session tokens — it exists so
the student details survive a logout instead of living only in localStorage.
"""

import hashlib
import json
import os
import secrets
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, "index.html")
DATA_DIR = os.path.join(HERE, "data")
DATA_FILE = os.path.join(DATA_DIR, "students.json")

DEMO_EMAIL = "student@demo.edu"
DEMO_PW = "student123"
# The demo account starts empty on purpose: first login -> Profile details ->
# Save and submit -> colleges. Log in again with the same email + password and
# the saved details are used straight away (no second registration).

PROFILE_KEYS = ["name", "phone", "marks10", "marks12", "town",
                "stay", "hostelType", "travel"]
MAX_LEN = 120


# ------------------------------------------------------------------ helpers --
def sha256hex(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def hash_pw(pw):
    salt = secrets.token_hex(8)
    return salt + ":" + sha256hex(salt + pw)


def check_pw(stored, pw):
    if ":" not in stored:
        return False
    salt, digest = stored.split(":", 1)
    return sha256hex(salt + pw) == digest


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def clean_profile(raw):
    out = {}
    for k in PROFILE_KEYS:
        v = raw.get(k, "")
        v = str(v).strip()
        v = "".join(ch for ch in v if ch.isprintable())
        out[k] = v[:MAX_LEN]
    return out


def load():
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, dict) else {}
    except (ValueError, OSError):
        return {}


def save(data):
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=1, sort_keys=True)
    os.replace(tmp, DATA_FILE)


def seed():
    """Make sure the demo account exists (empty profile -> register on first login)."""
    data = load()
    changed = False
    if DEMO_EMAIL not in data:
        entry = {"email": DEMO_EMAIL, "password": hash_pw(DEMO_PW),
                 "created": now(), "updated": now()}
        data[DEMO_EMAIL] = entry
        changed = True
    if changed:
        save(data)
    return data


def public(entry):
    """Profile without the password hash."""
    return {k: v for k, v in entry.items() if k != "password"}


# ------------------------------------------------------------------ server ---
class Handler(BaseHTTPRequestHandler):
    server_version = "PSGCompass/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    # -- plumbing --
    def _send(self, code, payload, ctype="application/json"):
        body = payload if isinstance(payload, bytes) else json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 65536:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except ValueError:
            return {}

    # -- routes --
    def do_OPTIONS(self):
        self._send(204, b"", "text/plain")

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html"):
            try:
                with open(INDEX, "rb") as fh:
                    self._send(200, fh.read(), "text/html; charset=utf-8")
            except OSError:
                self._send(404, {"ok": False, "error": "index.html missing"})
            return
        if path == "/api/health":
            self._send(200, {"ok": True, "students": len(load())})
            return
        self._send(404, {"ok": False, "error": "not found"})

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        body = self._json_body()
        email = str(body.get("email", "")).strip().lower()
        pw = str(body.get("pw", ""))

        if path == "/api/login":
            if not email or not pw:
                self._send(400, {"ok": False, "error": "email and password required"})
                return
            data = load()
            entry = data.get(email)
            if entry is None:
                data[email] = {"email": email, "password": hash_pw(pw),
                               "created": now(), "updated": now()}
                save(data)
                self._send(200, {"ok": True, "created": True, "profile": None})
                return
            if not check_pw(entry.get("password", ""), pw):
                self._send(200, {"ok": False, "error": "password does not match this email"})
                return
            filled = bool(entry.get("name"))
            self._send(200, {"ok": True, "created": False,
                             "profile": public(entry) if filled else None})
            return

        if path == "/api/save":
            data = load()
            entry = data.get(email)
            if entry is None:
                self._send(200, {"ok": False, "error": "unknown email — sign in first"})
                return
            if not check_pw(entry.get("password", ""), pw):
                self._send(200, {"ok": False, "error": "password does not match this email"})
                return
            profile = clean_profile(body.get("profile") or {})
            if not profile.get("name"):
                self._send(200, {"ok": False, "error": "name is required"})
                return
            entry.update(profile)
            entry["email"] = email
            entry["updated"] = now()
            data[email] = entry
            save(data)
            self._send(200, {"ok": True, "profile": public(entry)})
            return

        self._send(404, {"ok": False, "error": "not found"})


def main():
    port = int(os.environ.get("PORT", "8090"))
    seed()
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print("PSG Campus Compass — http://0.0.0.0:%d  (data: %s)" % (port, DATA_FILE))
    print("demo login: %s / %s" % (DEMO_EMAIL, DEMO_PW))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
