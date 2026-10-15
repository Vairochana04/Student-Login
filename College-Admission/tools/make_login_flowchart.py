#!/usr/bin/env python3
"""
Renders docs/student-login-flow.png — the proposed CampusConnect student-login
flow, drawn in the app's own palette (navy / gold).

    python3 tools/make_login_flowchart.py        # needs Pillow
    (or: /tmp/venv/bin/python tools/make_login_flowchart.py)

The chart is generated, not hand-drawn, so wording tweaks are one edit away.
"""

import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "student-login-flow.png")
FONT_DIR = "/usr/share/fonts/truetype/dejavu"

W, H = 1560, 2000
NAVY = (18, 29, 56)
NAVY_2 = (28, 43, 78)
GOLD = (199, 143, 34)
GOLD_L = (240, 182, 74)
GOLD_SOFT = (253, 246, 230)
BG = (245, 247, 252)
CARD = (255, 255, 255)
LINE = (225, 233, 242)
INK = (13, 22, 38)
BODY = (66, 80, 107)
MUTED = (116, 130, 157)
GREEN = (21, 128, 61)
GREEN_SOFT = (236, 253, 243)
RED = (180, 35, 24)
RED_SOFT = (254, 242, 242)
AMBER = (180, 83, 9)
AMBER_SOFT = (255, 247, 237)

F = lambda name, size: ImageFont.truetype(os.path.join(FONT_DIR, name), size)
f_title = F("DejaVuSans-Bold.ttf", 40)
f_sub = F("DejaVuSans.ttf", 21)
f_box = F("DejaVuSans-Bold.ttf", 21)
f_small = F("DejaVuSans.ttf", 17)
f_tiny = F("DejaVuSans.ttf", 15)
f_chip = F("DejaVuSans-Bold.ttf", 18)
f_h = F("DejaVuSans-Bold.ttf", 22)
f_legend = F("DejaVuSans.ttf", 16)

img = Image.new("RGB", (W, H), CARD)
d = ImageDraw.Draw(img)


def rbox(x0, y0, x1, y1, r=14, fill=CARD, outline=LINE, width=2):
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=fill, outline=outline, width=width)


def text_at(cx, y, text, font, color, anchor="mm"):
    d.text((cx, y), text, font=font, fill=color, anchor=anchor)


def lines_at(cx, y0, lines, gap=7):
    """lines: [(text, font, color)] vertically stacked, centred on cx."""
    heights = [f.size + 6 for _, f, _ in lines]
    y = y0
    for (text, font, color), h in zip(lines, heights):
        d.text((cx, y + h / 2), text, font=font, fill=color, anchor="mm")
        y += h + gap
    return y


def box(x0, y0, x1, y1, lines, fill=CARD, outline=LINE, width=2, dashed=False, r=14):
    if dashed:
        _dashed_round_rect(x0, y0, x1, y1, r, outline, width)
    else:
        rbox(x0, y0, x1, y1, r, fill, outline, width)
    lines_at((x0 + x1) / 2, (y0 + y1) / 2 - sum(f.size + 6 for _, f, _ in lines) / 2 + 3, lines)


def _dashed_round_rect(x0, y0, x1, y1, r, color, width):
    """approximate a dashed rounded rect with dashed straight edges + corner arcs"""
    dash, gap = 9, 7
    for (ax, ay, bx, by) in ((x0 + r, y0, x1 - r, y0), (x1, y0 + r, x1, y1 - r),
                             (x1 - r, y1, x0 + r, y1), (x0, y1 - r, x0, y0 + r)):
        if ay == by:
            x = ax
            while x < bx:
                d.line([x, ay, min(x + dash, bx), by], fill=color, width=width)
                x += dash + gap
        else:
            y = ay
            while y < by:
                d.line([ax, y, bx, min(y + dash, by)], fill=color, width=width)
                y += dash + gap
    for (cx, cy, a0, a1) in ((x0 + r, y0 + r, 180, 270), (x1 - r, y0 + r, 270, 360),
                             (x1 - r, y1 - r, 0, 90), (x0 + r, y1 - r, 90, 180)):
        d.arc([cx - r, cy - r, cx + r, cy + r], a0, a1, fill=color, width=width)


def arrow(points, color=NAVY_2, width=3, head=13):
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        d.line([x0, y0, x1, y1], fill=color, width=width)
    (x0, y0), (x1, y1) = points[-2], points[-1]
    if x1 == x0:                                   # vertical
        s = 1 if y1 > y0 else -1
        d.polygon([(x1, y1), (x1 - head * 0.62, y1 - s * head), (x1 + head * 0.62, y1 - s * head)], fill=color)
    else:                                          # horizontal
        s = 1 if x1 > x0 else -1
        d.polygon([(x1, y1), (x1 - s * head, y1 - head * 0.62), (x1 - s * head, y1 + head * 0.62)], fill=color)


def diamond(cx, cy, hw, hh, label_lines, fill=GOLD_SOFT, outline=GOLD):
    d.polygon([(cx - hw, cy), (cx, cy - hh), (cx + hw, cy), (cx, cy + hh)], fill=fill, outline=outline, width=3)
    lines_at(cx, cy - sum(f.size + 6 for _, f, _ in label_lines) / 2 + 2, label_lines, gap=3)


def pill(x0, y0, x1, y1, lines, fill=NAVY, text_color=(255, 255, 255)):
    rbox(x0, y0, x1, y1, (y1 - y0) / 2, fill, fill, 0)
    lines = [(t, f, text_color if c == (255, 255, 255) else c) for t, f, c in lines]
    lines_at((x0 + x1) / 2, (y0 + y1) / 2 - sum(f.size + 6 for _, f, _ in lines) / 2 + 2, lines, gap=2)


# ---------------------------------------------------------------- header
d.text((60, 40), "CampusConnect — Student login: proposed flow", font=f_title, fill=NAVY)
d.text((60, 96), "Draft v2.34 · approve this and I build it · College & Admin tabs stay exactly as they are",
       font=f_sub, fill=MUTED)

# ---------------------------------------------------------------- entry
pill(500, 156, 1060, 214, [("Open CampusConnect  →  login page loads", f_box, (255, 255, 255))])
arrow([(780, 214), (780, 248)])
box(570, 248, 990, 312, [("Student tab is the default", f_box, INK), ("(College / Admin are separate tabs)", f_small, MUTED)])
arrow([(780, 312), (780, 336)])

diamond(780, 398, 212, 62, [("Already have an account?", f_box, INK)])

# branch labels
text_at(430, 372, "No · first time here", f_small, GOLD if False else AMBER, anchor="mm")
d.line([570, 398, 300, 398], fill=GOLD, width=3)
d.line([300, 398, 300, 392], fill=GOLD, width=3)
text_at(1030, 372, "Yes · returning", f_small, NAVY_2, anchor="mm")

# ---------------------------------------------------------------- left: create
xs0, xs1 = 90, 470
rbox(xs0, 470, xs1, 518, 12, GOLD, GOLD, 0)
text_at((xs0 + xs1) / 2, 494, "NEW STUDENT · create account", f_chip, (58, 38, 6))
arrow([(300, 398), (300, 462)], color=GOLD)

box(xs0, 532, xs1, 606, [("Step 1 of 3 — You", f_box, INK), ("name · email · mobile", f_small, BODY)], outline=GOLD_L)
box(xs0, 622, xs1, 696, [("Step 2 of 3 — Academics", f_box, INK), ("Class 12 % (30–100) · stream", f_small, BODY)], outline=GOLD_L)
box(xs0, 712, xs1, 798, [("Step 3 of 3 — Preferences", f_box, INK),
                         ("course · degree · hostel · bus", f_small, BODY),
                         ("town · password + consent", f_small, BODY)], outline=GOLD_L)
box(xs0, 814, xs1, 872, [("Account created → auto sign-in", f_small, (255, 255, 255))], fill=GREEN, outline=GREEN)
arrow([(280, 872), (280, 998)], color=GREEN)

# progress hint
text_at((xs0 + xs1) / 2, 900, "progress bar 1 → 2 → 3 · Back / Next on every step", f_tiny, MUTED)

# ---------------------------------------------------------------- right: sign in
xr0, xr1 = 1090, 1470
rbox(xr0, 470, xr1, 518, 12, NAVY, NAVY, 0)
text_at((xr0 + xr1) / 2, 494, "RETURNING STUDENT · sign in", f_chip, (255, 255, 255))
arrow([(990, 398), (1280, 398), (1280, 462)], color=NAVY_2)

box(xr0, 532, xr1, 606, [("Email + password", f_box, INK), ("show / hide · Caps-lock hint", f_small, BODY)])
box(xr0, 622, xr1, 692, [("Remember me on this device", f_small, INK), ("auto sign-in on the next visit", f_small, MUTED)])
box(xr0, 708, xr1, 800, [("No match? clear message +", f_small, RED),
                         ("one-tap “Create an account”", f_small, RED),
                         ("and a Forgot-password hint", f_small, RED)], fill=RED_SOFT, outline=(253, 227, 225))
# retry loop back to the fields
arrow([(xr0, 754), (1052, 754), (1052, 569), (xr0, 569)], color=RED, width=2)
text_at(1040, 640, "fix & retry", f_tiny, RED, anchor="rm")
box(xr0, 816, xr1, 872, [("Token saved → session starts", f_small, INK)])
arrow([(1280, 872), (1280, 998)], color=NAVY_2)

# ---------------------------------------------------------------- merge
d.line([280, 998, 1280, 998], fill=NAVY_2, width=3)
arrow([(780, 998), (780, 1014)], color=NAVY_2)

# shortcuts
box(xs0, 1014, xs1, 1084, [("Returning visit", f_small, INK),
                           ("session restored — skips", f_tiny, MUTED),
                           ("straight to the dashboard", f_tiny, MUTED)], dashed=True, outline=MUTED)
arrow([(470, 1049), (566, 1049)], color=MUTED, width=2)
box(xr0, 1014, xr1, 1084, [("Quick demo", f_small, GOLD),
                           ("one-tap “Continue as demo student”", f_tiny, BODY),
                           ("— no typing during a review", f_tiny, MUTED)], dashed=True, outline=GOLD)
arrow([(1090, 1049), (994, 1049)], color=GOLD, width=2)
text_at(1042, 1032, "1 tap", f_tiny, GOLD)

box(570, 1014, 990, 1090, [("STUDENT DASHBOARD", f_h, (255, 255, 255)),
                           ("personalised, marks-aware", f_small, GOLD_L)], fill=NAVY, outline=NAVY)
arrow([(780, 1090), (780, 1120)])

diamond(780, 1180, 202, 60, [("Profile complete?", f_box, INK)])
text_at(430, 1154, "No", f_small, AMBER)
text_at(1130, 1154, "Yes", f_small, GREEN)
arrow([(578, 1180), (300, 1180), (300, 1244)], color=AMBER)
arrow([(982, 1180), (1280, 1180), (1280, 1244)], color=GREEN)

box(xs0, 1244, xs1, 1330, [("Profile-setup nudge", f_small, AMBER),
                           ("3 quick fields: marks ·", f_tiny, BODY),
                           ("course · hostel", f_tiny, BODY)], fill=AMBER_SOFT, outline=(250, 222, 200))
arrow([(280, 1330), (280, 1372), (500, 1372)], color=AMBER)

box(xr0, 1244, xr1, 1330, [("Personalised college list", f_small, INK),
                           ("marks + course fit · saved", f_tiny, BODY),
                           ("colleges tracked for admin", f_tiny, BODY)], fill=GREEN_SOFT, outline=(200, 232, 213))
arrow([(1280, 1330), (1280, 1372), (1060, 1372)], color=GREEN)

pill(500, 1344, 1060, 1400, [("Explore → save colleges · open official website", f_small, (255, 255, 255))])
d.line([780, 1330, 780, 1344], fill=NAVY_2, width=3)   # all paths meet at Explore

# ---------------------------------------------------------------- legend
text_at(60, 1430, "▭ screen / action     ◆ decision     ▭ dashed = shortcut or automatic     "
                  "green = success     red = error / retry", f_legend, MUTED, anchor="lm")

# ---------------------------------------------------------------- bottom cards
card_y0, card_y1 = 1470, 1846


def card(x0, x1, title, items, accent=NAVY):
    rbox(x0, card_y0, x1, card_y1, 18, BG, LINE, 2)
    d.text((x0 + 26, card_y0 + 26), title, font=f_h, fill=accent)
    y = card_y0 + 78
    for it in items:
        if it.startswith("* "):
            d.text((x0 + 30, y + 2), "\u25b8", font=f_small, fill=accent)
            d.text((x0 + 56, y), it[2:], font=f_small, fill=BODY)
            y += 40
        else:
            d.text((x0 + 56, y), it, font=f_tiny, fill=MUTED)
            y += 30


card(90, 770, "Validation & errors", [
    "* Email checked as you type — a clear message if it is wrong",
    "* Password: 6+ characters, with a show / hide toggle",
    "* Mobile: exactly 10 digits — spaces and +91 accepted",
    "* Class 12 marks: 30–100, with a live \u201ccolleges that fit\u201d hint",
    "* Consent tick required — colleges see interest only with consent",
    "Errors appear under the field that needs fixing; today they all",
    "stack at the top as one message. Same values, same API.",
], accent=GOLD)

card(790, 1470, "What's new vs today", [
    "* 3-step create-account wizard with a progress bar (1 \u2192 2 \u2192 3)",
    "* One-tap \u201cContinue as demo student\u201d on the login card",
    "* \u201cNo account for this email\u201d error carries a Create button",
    "* Show / hide password + Caps-lock hint (today: neither)",
    "* After sign-in: a checklist strip for the profile fields left",
    "Same demo logins, same /api/login + /api/students/register API,",
    "same College and Admin tabs — the admin lead reports keep working.",
], accent=NAVY)

d.text((60, H - 34), "Approve this flow and I build it in Login.jsx + styles.css, then rebuild app/dist "
                     "and show you the result in the preview.", font=f_legend, fill=MUTED)

img.save(OUT)
print("wrote", os.path.abspath(OUT), img.size)
