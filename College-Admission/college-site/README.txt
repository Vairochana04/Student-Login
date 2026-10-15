CampusConnect — standalone college site
=======================================

WHAT THIS IS
------------
A single-folder website covering 12 Coimbatore colleges (the PSG group of
institutions + Government College of Technology). Every college has six
sections:

  1. Overview              stats, about, highlights, facilities, recruiters
  2. Departments & Courses each department opens to its courses with level
                           (UG / PG / Diploma / Certificate / Doctorate),
                           duration, SEATS and eligibility; filter by level,
                           search by course name
  3. Admission             cycle, status, mode, indicative fee, eligibility,
                           how-to-apply steps, documents checklist and every
                           important date with a live countdown
  4. Events                upcoming and past campus events (date, time, venue,
                           description, tag) + campus photo gallery
  5. Map & Location        the campus on a Google Map, one-tap directions,
                           copy address
  6. Contact & Website     phone, email, office hours, address, useful pages
                           and the college's OFFICIAL WEBSITE (new tab)

Plus: college search (name, course, department, field), category filters,
dark mode, mobile layout, and direct links between colleges for comparing.


HOW TO RUN
----------
No install, no server, no internet needed for the app itself:

  * extract the zip anywhere
  * double-click index.html

Works in Chrome, Edge, Firefox and Safari. The Google Map embed and the
official-website links obviously need an internet connection; everything
else is offline.

Optional — serve it locally instead (nicer for the map):

  python3 -m http.server 8080        then open http://localhost:8080
  npx serve .                        (if you have Node)


FILES
-----
  index.html   page shell (header, footer, theme button)
  app.js       all logic: hash router, home list, the six college tabs
  style.css    light + dark theme, layout, components
  data.js      the dataset (12 colleges, 44 departments, 115 courses,
               60 events) — GENERATED, see below
  media/       campus photos, college logos, PSG group mark
  README.txt   this file


CHANGING THE DATA
-----------------
data.js is generated from the project dataset, never edited by hand:

  server/data/colleges.json      colleges, departments, courses, seats,
                                 admission dates/steps/docs, events, contact
  app/src/core.js                media map, indicative cut-offs, hostel/bus

Regenerate from the repository root:

  python3 college-site/tools/build_data.py
  python3 college-site/tools/package_site.py     # rebuild folder + zip

Hand-editing data.js also works if you do not have the repository — keep the
same shape (window.CC_DATA = { colleges: [ ... ], media: {...}, ... }).


HONEST NOTES
------------
* Cut-off percentages, fees, seat counts and event dates are INDICATIVE SAMPLE
  VALUES for demonstration, not official announcements. The site says so in
  the footer and on every admission tab.
* Official college websites open in a NEW TAB on purpose: they send
  X-Frame-Options / CSP headers that forbid embedding, so framing them would
  show a blank box. New tab always works and lands on the real source.
* Nothing is tracked, stored on a server, or sent anywhere. The only browser
  storage used is localStorage for your light/dark choice.
