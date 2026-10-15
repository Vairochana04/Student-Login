# Student Portal — My-Project

React 19 + Vite student portal, converted from the existing PSG Campus Compass portal.

## Requirements

- Node.js LTS (20.19+; Node 22 LTS recommended), including npm.
- JDK 17+ for the original Java API backend (recommended).
- Alternatively Python 3: the backend launcher uses the equivalent Python API if `javac` is unavailable.

## Windows: run locally

Extract the ZIP first. Open PowerShell **inside My-Project**, where package.json is located.

### Terminal 1 — API backend

```powershell
npm install
npm run backend
```

Keep this terminal open. The backend runs on port **8092**. Its root page is only an API-server notice, not the React app.

### Terminal 2 — React website

Open another PowerShell window in **the same My-Project folder**:

```powershell
npm run dev
```

Open **http://localhost:5173** (or the actual URL Vite prints if that port is busy).
Keep both terminals open. Use Ctrl+C to stop each process.

**Demo login:** student@demo.edu / student123

New emails register automatically in this demonstration portal. First sign-in opens the profile form. Save the profile to browse colleges; subsequent sign-ins restore it. Profile data is stored under `server/data/students.json`, created automatically. No existing students or passwords are bundled in this ZIP.

Do not open index.html by double-clicking it; use the Vite URL. Do not open port 8090 from the old project. If an old portal is already open, use a new tab at the new Vite URL.

## Production build / local preview

```powershell
npm run build
npm run preview
```

With the API backend still running in the other terminal, open the preview URL Vite prints (normally http://localhost:4173).
The `dist/` directory is created by the build. It and `node_modules/` are intentionally excluded from the ZIP. Run `npm ci` to install exact locked versions on subsequent installations.

For production hosting, serve `dist/` with a reverse proxy routing `/api` to the API backend. The development/preview proxy is not bundled into the static build. This demo is not production-hardened; use HTTPS and review authentication, rate limiting, privacy and deployment configuration before public use.

## Folder map

```text
My-Project/
├── public/                  Static public assets (never put student records here)
├── src/
│   ├── assets/              Bundled asset folder
│   ├── components/          Login, Profile, CollegeList, CollegePage,
│   │                        Overview, Courses, Fees, Placements,
│   │                        Location, Reviews, QA, Markup
│   ├── App.jsx              React app and page switching
│   ├── App.css              Preserved portal styling and responsive changes
│   ├── main.jsx             React entry point
│   └── portal.js            Complete college dataset and retained portal behavior
├── server/                  Java API + equivalent Python fallback
├── scripts/backend.mjs      Cross-platform backend launcher
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── README.md
└── .gitignore
```

The additional `server/`, `scripts/` and `src/portal.js` files are intentional: they preserve the existing backend, dataset and portal behavior rather than replacing it with a frontend-only mock.

## Conversion details

React mounts the application, selects page components, and renders the retained HTML templates as React elements using html-react-parser. `Markup.jsx` bridges those templates to React; the original validation and document-level event delegation remain in `portal.js`. This is a compatibility-focused migration, not a complete rewrite of every existing handler into React hooks. Images use a React onError callback to preserve the original logo fallback. Form inputs remain uncontrolled to preserve the existing collection/validation logic. Do not add StrictMode without first refactoring initialization and listener cleanup.

## Included features

- Student registration/sign-in and profile persistence through the API.
- Existing class 10 / class 12 marks, location, stay/travel, plus stream, course wanted and degree fields. No photo upload added.
- All original PSG and Karpagam campus records, group browsing, search and saved colleges.
- Overview: facts/highlights above recruiter/fee/next-step sections on every screen.
- Courses and cutoff: All / UG / PG filters; a clear message when no PG data is listed.
- Fee structure: all listed departments, counselling/management comparison, profile-based hostel/bus/other travel defaults, expandable breakdowns and scholarship guidance.
- Placements: recruiter section below yearly results.
- Reviews: student comments below ratings.
- Location, official links, maps, reminders and rule-based Q&A chat.
- Offline browser-local fallback retained from the original demo. This is not secure authentication and is not a substitute for server-side sign-in.

## Important data limitations

Fees, seats, cutoffs, reviews, ratings, placement statistics and reminders are retained sample/indicative content, not current verified admissions advice. The fee calculator uses explicitly labelled **generic illustrative B.E./B.Tech inputs**, the same across campuses/departments. Other programmes display “Confirm with college”. Scholarships are not guaranteed and are not deducted. No donation/capitation estimate is included. Check official fee schedules and quota availability before making financial decisions.

Recruiter logos and maps require internet. Logo errors use monogram fallback. Remote resources are not downloaded/bundled or guaranteed to remain available. Existing icons are inline SVG; asset directories contain placeholders for future local images.

## Troubleshooting

- `npm` not recognized: install Node.js LTS and reopen PowerShell.
- `javac` not found: install a JDK, reopen PowerShell, or install Python 3 for the fallback.
- Connection refused: make sure both terminals are still running; open the Vite URL, not the backend URL.
- API port 8092 is busy: stop the older backend or set a different port. In terminal 1: `$env:PORT="8094"; npm run backend`. In terminal 2: `$env:API_TARGET="http://127.0.0.1:8094"; npm run dev`.
- Demo looks different from an older copy: profile storage is browser-origin-specific; the new Vite origin has separate local fallback/saved state. No old local student database is shipped.
- Reset demo data: stop the backend and delete `server/data/` only if you intentionally want to remove its saved student accounts.
