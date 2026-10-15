/* =============================================================================
   CampusConnect — standalone college site · app logic
   -----------------------------------------------------------------------------
   Zero dependencies, no build step, works from file:// (double-click index.html).
   Data comes from data.js (generated from server/data/colleges.json).

   Routes (hash based, so they work offline too):
     #/                        home — search + filter + college grid
     #/about                   how it works
     #/college/<id>/<tab>      college profile
       tabs: overview · courses · admission · events · map · contact
   ============================================================================= */

(function () {
  'use strict';

  var D = window.CC_DATA;
  var COLLEGES = D.colleges;
  var app = document.getElementById('app');

  /* ------------------------------------------------------------------- icons */
  function svg(inner, size) {
    return '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  var ICONS = {
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>'),
    pin: svg('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>'),
    cal: svg('<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M8 3v3M16 3v3M3 10h18"/>'),
    globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>', 17),
    link: svg('<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>'),
    phone: svg('<path d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z"/>'),
    mail: svg('<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>'),
    users: svg('<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.4 3-5.2 6.5-5.2s6.5 1.8 6.5 5.2"/><path d="M17 5.5a3 3 0 0 1 0 6M18.5 20c0-2.2-.7-3.8-2-4.8 3 .2 5 1.9 5 4.8"/>', 17),
    brief: svg('<rect x="3" y="7.5" width="18" height="12" rx="3"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 12.5h18"/>', 17),
    lab: svg('<path d="M9 3v6.5L4.6 17A2.4 2.4 0 0 0 6.8 20.5h10.4A2.4 2.4 0 0 0 19.4 17L15 9.5V3"/><path d="M8 3h8M7.5 14h9"/>', 17),
    award: svg('<circle cx="12" cy="9" r="5.2"/><path d="m8.5 13.5-1 8 4.5-2.4 4.5 2.4-1-8"/>', 17),
    book: svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M8 7.5h8M8 11h6"/>', 17),
    leaf: svg('<path d="M20 4c-9 0-14 4-14 10a6 6 0 0 0 6 6c6 0 8-6 8-16Z"/><path d="M6 20c2-5 5-8 10-10"/>', 17),
    star: svg('<path d="m12 3.5 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9Z"/>', 17),
    home: svg('<path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/>', 17),
    check: svg('<path d="m5 13 4 4L19 7"/>', 15),
    chev: svg('<path d="m6 9 6 6 6-6"/>', 17),
    back: svg('<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>', 16),
    dir: svg('<path d="m12 2 9 9-9 9-9-9Z"/><path d="M9 12h6M13 9.5 15.5 12 13 14.5"/>', 17),
    copy: svg('<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>', 16),
    ext: svg('<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>', 16),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', 17),
    seat: svg('<rect x="4" y="4" width="16" height="7" rx="2"/><path d="M6 11v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/>', 17),
    file: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>', 17),
    spark: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>', 17)
  };
  function icon(name) { return ICONS[name] || ICONS.star; }

  /* ----------------------------------------------------------------- helpers */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function byId(id) { for (var i = 0; i < COLLEGES.length; i++) if (COLLEGES[i].id === id) return COLLEGES[i]; return null; }
  function media(c) { return D.media[c && c.id] || null; }
  function categoryOf(c) { return D.categories[c.id] || 'Other'; }
  function noteOf(c) { return D.notes[c.id] || ''; }
  function facilOf(c) { return D.facilities[c.id] || {}; }
  function cutoffOf(c) { return D.cutoffs[c.id] || null; }

  function allCourses(c) {
    var out = [];
    (c.departments || []).forEach(function (dep) {
      (dep.courses || []).forEach(function (co) { out.push({ dep: dep, course: co }); });
    });
    return out;
  }
  function seatsNum(s) { var m = String(s || '').match(/([\d,]+)/); return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0; }
  function totalSeats(c) { return allCourses(c).reduce(function (n, x) { return n + seatsNum(x.course.seats); }, 0); }
  function levels(c) {
    var seen = [], out = [];
    allCourses(c).forEach(function (x) {
      var l = x.course.level || 'Other';
      if (seen.indexOf(l) < 0) { seen.push(l); out.push(l); }
    });
    var order = ['UG', 'PG', 'Diploma', 'Certificate', 'Doctorate'];
    return out.sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }
  function levelClass(l) {
    return l === 'PG' ? 'lvl lvl--pg' : l === 'Doctorate' ? 'lvl lvl--phd'
      : (l === 'Diploma' || l === 'Certificate') ? 'lvl lvl--dip' : 'lvl';
  }

  /* ---- dates ---- */
  var TODAY = (function () { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); })();
  function dObj(iso) { var p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtLong(iso) {
    return dObj(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtDay(iso) { return dObj(iso).toLocaleDateString('en-IN', { day: '2-digit' }); }
  function fmtMon(iso) { return dObj(iso).toLocaleDateString('en-IN', { month: 'short' }); }
  function diffDays(iso) { return Math.round((dObj(iso) - TODAY) / 86400000); }
  function countdown(iso) {
    var n = diffDays(iso);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n > 1) return 'in ' + n + ' days';
    if (n === -1) return 'Yesterday';
    return Math.abs(n) + ' days ago';
  }
  function isUpcoming(e) { return diffDays(e.end || e.date) >= 0; }

  /* ---- maps ---- */
  function placeOf(c) { return c.name + ', ' + c.address + ', ' + c.city; }
  function mapEmbed(c) {
    return 'https://maps.google.com/maps?q=' + encodeURIComponent(placeOf(c)) + '&z=15&output=embed';
  }
  function mapOpen(c) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(placeOf(c));
  }
  function mapDir(c) {
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(placeOf(c));
  }

  /* ---- storage (wrapped: file:// and private mode can throw) ---- */
  function storeGet(k, dflt) {
    try { var v = localStorage.getItem('cc-site:' + k); return v == null ? dflt : JSON.parse(v); }
    catch (e) { return dflt; }
  }
  function storeSet(k, v) { try { localStorage.setItem('cc-site:' + k, JSON.stringify(v)); } catch (e) { } }

  /* ------------------------------------------------------------------- state */
  var state = {
    q: '',
    cat: 'All',
    level: 'All',
    cq: '',
    etag: 'All',
    openDept: {}          /* collegeId -> { index: true } */
  };

  var TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'courses', label: 'Departments & Courses' },
    { id: 'admission', label: 'Admission' },
    { id: 'events', label: 'Events' },
    { id: 'map', label: 'Map & Location' },
    { id: 'contact', label: 'Contact & Website' }
  ];

  /* ------------------------------------------------------------------ router */
  function parseHash() {
    var h = (location.hash || '#/').replace(/^#/, '');
    var parts = h.split('/').filter(Boolean);
    if (parts[0] === 'college' && parts[1]) {
      var c = byId(decodeURIComponent(parts[1]));
      if (!c) return { view: 'missing', id: parts[1] };
      var tab = parts[2] ? decodeURIComponent(parts[2]) : 'overview';
      if (!TABS.some(function (t) { return t.id === tab; })) tab = 'overview';
      return { view: 'college', college: c, tab: tab };
    }
    if (parts[0] === 'about') return { view: 'about' };
    return { view: 'home' };
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  /* ------------------------------------------------------------------- theme */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    storeSet('theme', t);
  }
  function initTheme() { applyTheme(storeGet('theme', 'light')); }

  /* =========================================================== HOME (list) */
  function matches(c) {
    if (state.cat !== 'All' && categoryOf(c) !== state.cat) return false;
    var q = state.q.trim().toLowerCase();
    if (!q) return true;
    var hay = [c.name, c.shortName, c.city, c.type, c.tagline, categoryOf(c), noteOf(c), c.naac, c.nirfBadge]
      .concat((c.departments || []).map(function (d) { return d.name; }))
      .concat(allCourses(c).map(function (x) { return x.course.name + ' ' + x.course.level; }))
      .join(' ').toLowerCase();
    return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
  }

  function collegeCard(c) {
    var m = media(c);
    var seats = totalSeats(c);
    var courses = allCourses(c).length;
    var soon = (c.events || []).filter(isUpcoming).length;
    var note = noteOf(c);
    return '' +
      '<article class="ccard">' +
        '<div class="ccard__ph">' +
          (m && m.photo ? '<img src="' + esc(m.photo) + '" alt="' + esc(c.shortName) + ' campus" loading="lazy">' : '') +
          '<div class="ccard__logo">' +
            (m && m.logo ? '<img src="' + esc(m.logo) + '" alt="' + esc(c.shortName) + ' logo" loading="lazy">'
                         : '<span class="mono">' + esc(c.mono) + '</span>') +
          '</div>' +
        '</div>' +
        '<div class="ccard__bd">' +
          '<h3 class="ccard__ttl">' + esc(c.name) + '</h3>' +
          '<p class="ccard__sub">' + esc(c.type) + ' · ' + esc(c.city) + ' · estd ' + esc(c.estd) + '</p>' +
          '<div class="tagrow">' +
            '<span class="tag tag--gold">' + esc(categoryOf(c)) + '</span>' +
            (c.naac ? '<span class="tag">' + esc(c.naac) + '</span>' : '') +
            (note ? '<span class="tag tag--info">' + esc(note) + '</span>' : '') +
          '</div>' +
          '<div class="facts">' +
            '<div class="fact"><b>' + courses + '</b><span>Courses</span></div>' +
            '<div class="fact"><b>' + (seats ? seats.toLocaleString('en-IN') : '—') + '</b><span>Seats</span></div>' +
            '<div class="fact"><b>' + soon + '</b><span>Upcoming</span></div>' +
          '</div>' +
          '<div class="ccard__ft">' +
            '<a class="btn btn--primary btn--sm" href="#/college/' + esc(c.id) + '/overview" data-nav>View details</a>' +
            '<a class="btn btn--sm" href="' + esc(c.website) + '" target="_blank" rel="noopener noreferrer">Website ' + ICONS.ext + '</a>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderHome() {
    var cats = ['All'].concat(D.groups);
    var list = COLLEGES.filter(matches);
    var seats = list.reduce(function (n, c) { return n + totalSeats(c); }, 0);
    var courses = list.reduce(function (n, c) { return n + allCourses(c).length; }, 0);

    return '' +
    '<div class="wrap">' +
      '<section class="hero">' +
        '<h1>Every PSG-group college in Coimbatore, one honest page each.</h1>' +
        '<p>Departments and courses with seat counts, admission dates and steps, campus events, ' +
          'the location on a map, and the college\u2019s own official website — all without signing up.</p>' +
        '<div class="hero__stats">' +
          '<div class="hstat"><b>' + COLLEGES.length + '</b><span>Colleges</span></div>' +
          '<div class="hstat"><b>' + COLLEGES.reduce(function (n, c) { return n + (c.departments || []).length; }, 0) + '</b><span>Departments</span></div>' +
          '<div class="hstat"><b>' + COLLEGES.reduce(function (n, c) { return n + allCourses(c).length; }, 0) + '</b><span>Courses</span></div>' +
          '<div class="hstat"><b>' + COLLEGES.reduce(function (n, c) { return n + (c.events || []).filter(isUpcoming).length; }, 0) + '</b><span>Upcoming events</span></div>' +
        '</div>' +
      '</section>' +

      '<div class="controls">' +
        '<label class="search">' + ICONS.search +
          '<input id="q" type="search" placeholder="Search a college, course or department — e.g. nursing, B.E. CSE, MBA" ' +
            'value="' + esc(state.q) + '" aria-label="Search colleges and courses">' +
        '</label>' +
      '</div>' +
      '<div class="chips" id="cats">' +
        cats.map(function (g) {
          return '<button class="chip" type="button" data-cat="' + esc(g) + '" aria-pressed="' +
            (state.cat === g) + '">' + esc(g) + '</button>';
        }).join('') +
      '</div>' +
      '<p class="countline">' + list.length + ' of ' + COLLEGES.length + ' colleges' +
        (list.length ? ' · ' + courses + ' courses · ' + seats.toLocaleString('en-IN') + ' seats listed' : '') +
        (state.q ? ' for \u201c' + esc(state.q) + '\u201d' : '') + '</p>' +

      (list.length
        ? '<div class="grid">' + list.map(collegeCard).join('') + '</div>'
        : '<div class="empty"><b>No college matches that search</b>' +
          'Try a course name (B.Pharm, M.C.A.), a field (nursing, textile) or clear the filters.' +
          '<div class="row" style="justify-content:center;margin-top:14px">' +
          '<button class="btn btn--sm" type="button" data-clear>Clear search & filters</button></div></div>') +
    '</div>';
  }

  /* ================================================================ ABOUT */
  function renderAbout() {
    return '' +
    '<div class="wrap">' +
      '<a class="cback" href="#/" data-nav>' + ICONS.back + ' All colleges</a>' +
      '<section class="hero"><h1>How this site works</h1>' +
        '<p>CampusConnect collects the public admission information of the PSG group of institutions ' +
          '(plus GCT Coimbatore) into one consistent format, so a student can compare them without ' +
          'opening twelve different websites.</p></section>' +
      '<div class="two" style="margin-top:18px">' +
        '<div class="card"><h2 class="secttl">' + ICONS.spark + ' What you get on every college page</h2>' +
          '<div class="steps">' +
            step('Overview', 'Stats, about the institution, highlights, facilities and recruiters.') +
            step('Departments & Courses', 'Each department opens to its courses with UG / PG level, duration, seats and eligibility. Filter by level or search a course.') +
            step('Admission', 'Cycle, status, mode, indicative fees, eligibility, how to apply, documents needed and every important date with a live countdown.') +
            step('Events', 'Upcoming and past campus events with date, time, venue and what happens there.') +
            step('Map & Location', 'The campus on a Google Map, plus one-tap directions.') +
            step('Contact & Website', 'Phone, email, office hours and the college\u2019s official website, opened in a new tab.') +
          '</div></div>' +
        '<div class="stack">' +
          '<div class="card"><h3>Honest about the numbers</h3>' +
            '<p class="lede" style="margin:0 0 10px">Cut-off percentages, fees, seat counts and event dates here are ' +
            '<strong>indicative sample values</strong> put together for this demo. They are not an official announcement.</p>' +
            '<div class="note">' + ICONS.info + '<span>Before applying, confirm on the college\u2019s official website or call their admission office. ' +
            'Every college page has a direct button for both.</span></div></div>' +
          '<div class="card"><h3>Why official websites open in a new tab</h3>' +
            '<p class="lede" style="margin:0">Most college websites send security headers (X-Frame-Options / CSP) that forbid showing them ' +
            'inside another site\u2019s frame. Opening them in a new tab always works and takes you to the real source.</p></div>' +
          '<div class="card"><h3>Data behind the site</h3>' +
            '<p class="lede" style="margin:0 0 8px">One generated file, <code>data.js</code>, built from the project dataset ' +
            '(<code>server/data/colleges.json</code>). No server, no database, no tracking — the whole site runs offline from a folder.</p>' +
            '<p class="muted" style="margin:0;font-size:13px">Dataset build: ' + esc(D.build) + '</p></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function step(t, d) { return '<div class="step"><div><b>' + esc(t) + '</b><p>' + esc(d) + '</p></div></div>'; }

  /* ============================================================== COLLEGE */
  function collegeHeader(c) {
    var m = media(c);
    var f = facilOf(c);
    var note = noteOf(c);
    return '' +
    '<section class="chead">' +
      '<div class="chead__ph">' + (m && m.photo ? '<img src="' + esc(m.photo) + '" alt="">' : '') + '</div>' +
      '<div class="chead__in">' +
        '<div class="chead__logo">' +
          (m && m.logo ? '<img src="' + esc(m.logo) + '" alt="' + esc(c.shortName) + ' logo">'
                       : '<span class="mono">' + esc(c.mono) + '</span>') +
        '</div>' +
        '<div class="chead__t">' +
          '<h1>' + esc(c.name) + '</h1>' +
          '<p>' + esc(c.tagline) + '</p>' +
          '<div class="chead__meta">' +
            '<span class="pill">' + esc(c.type) + '</span>' +
            '<span class="pill">' + esc(c.affiliation) + '</span>' +
            '<span class="pill">' + ICONS.pin.replace('<svg ', '<svg style="vertical-align:-2px" ') + ' ' + esc(c.city) + ', ' + esc(c.state) + '</span>' +
            '<span class="pill">Established ' + esc(c.estd) + '</span>' +
            (c.naac ? '<span class="pill">' + esc(c.naac) + '</span>' : '') +
            (c.nirfBadge ? '<span class="pill">' + esc(c.nirfBadge) + '</span>' : '') +
            (note ? '<span class="pill">' + esc(note) + '</span>' : '') +
            (f.hostel ? '<span class="pill">Hostel available</span>' : '') +
            (f.bus ? '<span class="pill">Bus: ' + esc(f.busNote || 'college transport') + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="chead__act">' +
          '<a class="btn btn--gold" href="' + esc(c.website) + '" target="_blank" rel="noopener noreferrer">' + ICONS.globe + ' Official website</a>' +
          '<a class="btn btn--ghost" href="' + esc(c.admissionsUrl || c.website) + '" target="_blank" rel="noopener noreferrer">' + ICONS.ext + ' Apply / admissions</a>' +
          '<a class="btn btn--ghost" href="' + esc(mapDir(c)) + '" target="_blank" rel="noopener noreferrer">' + ICONS.dir + ' Get directions</a>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function tabBar(c, active) {
    var counts = {
      courses: allCourses(c).length,
      events: (c.events || []).filter(isUpcoming).length
    };
    return '<div class="tabs" role="tablist" aria-label="College sections">' +
      TABS.map(function (t) {
        var n = counts[t.id];
        return '<a class="tab" role="tab" href="#/college/' + esc(c.id) + '/' + t.id + '" data-nav ' +
          'aria-selected="' + (t.id === active) + '">' + esc(t.label) +
          (n ? '<b>' + n + '</b>' : '') + '</a>';
      }).join('') + '</div>';
  }

  /* ---- overview ---- */
  function tabOverview(c) {
    var f = facilOf(c);
    var seats = totalSeats(c);
    var ug = allCourses(c).filter(function (x) { return x.course.level === 'UG'; }).length;
    var pg = allCourses(c).filter(function (x) { return x.course.level === 'PG'; }).length;
    var co = cutoffOf(c);

    return '' +
    '<div class="two">' +
      '<div class="stack">' +
        '<div class="card">' +
          '<h2 class="secttl">' + ICONS.spark + ' At a glance</h2>' +
          '<div class="statgrid">' +
            (c.stats || []).map(function (s) {
              return '<div class="stat"><b>' + esc(s.v) + '</b><span>' + esc(s.k) + '</span></div>';
            }).join('') +
            '<div class="stat"><b>' + seats.toLocaleString('en-IN') + '</b><span>Seats listed</span></div>' +
            '<div class="stat"><b>' + allCourses(c).length + '</b><span>Programmes</span></div>' +
          '</div>' +
          '<div class="row" style="margin-top:14px">' +
            '<span class="tag tag--info">' + ug + ' UG programmes</span>' +
            '<span class="tag tag--gold">' + pg + ' PG programmes</span>' +
            '<span class="tag">' + (c.departments || []).length + ' departments</span>' +
          '</div>' +
        '</div>' +

        '<div class="card about"><h2 class="secttl">' + ICONS.book + ' About ' + esc(c.shortName) + '</h2>' +
          (c.about || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
        '</div>' +

        (c.highlights && c.highlights.length ? '<div class="card"><h2 class="secttl">' + ICONS.star + ' Highlights</h2>' +
          '<div class="hl">' + c.highlights.map(function (h) {
            return '<div class="hl__i">' + icon(h.icon) + '<div><b>' + esc(h.title) + '</b><span>' + esc(h.text) + '</span></div></div>';
          }).join('') + '</div></div>' : '') +
      '</div>' +

      '<div class="stack">' +
        '<div class="card"><h3>' + ICONS.home + ' Campus facilities</h3>' +
          '<ul class="list">' + (c.facilities || []).map(function (x) {
            return '<li>' + ICONS.check + esc(x) + '</li>';
          }).join('') + '</ul>' +
          '<hr class="hr">' +
          '<dl class="kv">' +
            '<dt>Hostel</dt><dd>' + (f.hostel ? 'Available' + (f.bus ? '' : ' · own transport needed') : 'Not listed — check with the college') + '</dd>' +
            '<dt>Transport</dt><dd>' + (f.bus ? esc(f.busNote || 'college transport') : 'Not listed') + '</dd>' +
            '<dt>Location</dt><dd>' + esc(c.city) + ', ' + esc(c.state) + '</dd>' +
          '</dl>' +
          '<a class="btn btn--sm btn--full" style="margin-top:12px" href="#/college/' + esc(c.id) + '/map" data-nav>' + ICONS.pin + ' See on map</a>' +
        '</div>' +

        (c.recruiters && c.recruiters.length ? '<div class="card"><h3>' + ICONS.brief + ' Recruiters</h3>' +
          '<ul class="list list--plain">' + c.recruiters.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
          '<p class="muted" style="margin:12px 0 0;font-size:12.5px">Names published by the college for recent placement drives.</p></div>' : '') +

        '<div class="card"><h3>' + ICONS.award + ' Admission snapshot</h3>' +
          '<dl class="kv">' +
            '<dt>Cycle</dt><dd>' + esc(c.admission.cycle) + '</dd>' +
            '<dt>Status</dt><dd>' + esc(c.admission.status) + '</dd>' +
            '<dt>Mode</dt><dd>' + esc(c.admission.mode) + '</dd>' +
            (co && co.min ? '<dt>Indicative cut-off</dt><dd>' + co.min + '% ' +
              (co.exam ? '(' + esc(co.exam) + ' considered)' : '') + '</dd>' : '') +
          '</dl>' +
          (co ? '<div class="note" style="margin-top:12px">' + ICONS.info + '<span>' + esc(cutLine(c)) + '</span></div>' : '') +
          '<a class="btn btn--sm btn--full" style="margin-top:12px" href="#/college/' + esc(c.id) + '/admission" data-nav>' + ICONS.cal + ' Admission details & dates</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function cutLine(c) {
    var co = cutoffOf(c);
    if (!co) return '';
    if (co.min) return 'Indicative sample value: about ' + co.min + '% ' +
      (co.basis === 'exam' ? 'plus ' + (co.exam || 'entrance') + ' score decides admission' :
       co.basis === 'engineering' ? 'for government-quota engineering counselling (TNEA)' : 'on merit') +
      (co.stream ? ' · expects ' + co.stream : '') + '. Confirm with the college.';
    return (co.note || 'Admission is after a qualifying degree or Class 10, as applicable') + '. Confirm with the college.';
  }

  /* ---- departments & courses ---- */
  function courseRow(co) {
    return '<div class="course">' +
      '<div><div class="course__n">' + esc(co.name) + '</div>' +
        '<div class="course__e">' + ICONS.check.replace('<svg ', '<svg style="vertical-align:-2px" ') +
        ' Eligibility: ' + esc(co.eligibility) + '</div></div>' +
      '<div class="course__m">' +
        '<span class="' + levelClass(co.level) + '">' + esc(co.level) + '</span>' +
        '<span class="dur">' + ICONS.clock.replace('<svg ', '<svg style="vertical-align:-2px" ') + ' ' + esc(co.duration) + '</span>' +
        '<span class="seat">' + ICONS.seat.replace('<svg ', '<svg style="vertical-align:-2px;width:14px;height:14px" ') + ' ' + esc(co.seats) + '</span>' +
      '</div>' +
    '</div>';
  }

  function tabCourses(c) {
    var lv = levels(c);
    var q = state.cq.trim().toLowerCase();
    var filtered = state.level !== 'All' || !!q;
    var openMap = state.openDept[c.id] || (state.openDept[c.id] = { 0: true });

    var depts = (c.departments || []).map(function (dep, i) {
      var list = (dep.courses || []).filter(function (co) {
        if (state.level !== 'All' && co.level !== state.level) return false;
        if (!q) return true;
        return (co.name + ' ' + co.level + ' ' + co.eligibility + ' ' + dep.name).toLowerCase().indexOf(q) >= 0;
      });
      return { dep: dep, i: i, list: list };
    }).filter(function (d) { return !filtered || d.list.length > 0; });

    var shown = depts.reduce(function (n, d) { return n + d.list.length; }, 0);

    return '' +
    '<div class="card">' +
      '<div class="spread">' +
        '<h2 class="secttl" style="margin:0">' + ICONS.lab + ' Departments & courses</h2>' +
        '<span class="muted" style="font-size:13px">' + shown + ' of ' + allCourses(c).length + ' programmes · ' +
          totalSeats(c).toLocaleString('en-IN') + ' seats</span>' +
      '</div>' +
      '<div class="controls" style="margin:14px 0 0">' +
        '<label class="search">' + ICONS.search +
          '<input id="cq" type="search" placeholder="Search a course — e.g. B.Sc. Computer Science, M.Pharm" ' +
            'value="' + esc(state.cq) + '" aria-label="Search courses"></label>' +
      '</div>' +
      '<div class="chips" id="levels">' +
        ['All'].concat(lv).map(function (l) {
          var n = l === 'All' ? allCourses(c).length : allCourses(c).filter(function (x) { return x.course.level === l; }).length;
          return '<button class="chip chip--sm" type="button" data-level="' + esc(l) + '" aria-pressed="' +
            (state.level === l) + '">' + esc(l) + ' (' + n + ')</button>';
        }).join('') +
      '</div>' +
    '</div>' +

    (depts.length ? depts.map(function (d) {
      var open = filtered ? true : !!openMap[d.i];
      var seats = d.list.reduce(function (n, co) { return n + seatsNum(co.seats); }, 0);
      return '<section class="dept" data-open="' + (open ? 1 : 0) + '" data-dept="' + d.i + '">' +
        '<button class="dept__hd" type="button" data-toggle-dept="' + d.i + '" aria-expanded="' + open + '">' +
          '<span class="dept__ic">' + icon(d.dep.icon) + '</span>' +
          '<span class="dept__t"><b>' + esc(d.dep.name) + '</b><span>' + esc(d.dep.blurb) + '</span></span>' +
          '<span class="dept__n">' + d.list.length + ' course' + (d.list.length === 1 ? '' : 's') +
            (seats ? ' · ' + seats.toLocaleString('en-IN') + ' seats' : '') + '</span>' +
          '<span class="dept__cv">' + ICONS.chev + '</span>' +
        '</button>' +
        '<div class="dept__bd">' + d.list.map(courseRow).join('') + '</div>' +
      '</section>';
    }).join('')
    : '<div class="empty"><b>No course matches that filter</b>' +
      'Try clearing the level filter or searching a broader term.' +
      '<div class="row" style="justify-content:center;margin-top:14px">' +
      '<button class="btn btn--sm" type="button" data-clear-courses>Clear course filters</button></div></div>') +

    '<div class="note" style="margin-top:4px">' + ICONS.info +
      '<span>Seat counts and eligibility are indicative sample values for this demo. ' +
      'Government-quota seats are normally allotted through state counselling; confirm with the college before applying.</span></div>';
  }

  /* ---- admission ---- */
  function tabAdmission(c) {
    var a = c.admission;
    var co = cutoffOf(c);
    var tone = a.tone === 'open' ? 'open' : 'soon';
    return '' +
    '<div class="two">' +
      '<div class="stack">' +
        '<div class="card">' +
          '<div class="spread" style="margin-bottom:14px">' +
            '<h2 class="secttl" style="margin:0">' + ICONS.cal + ' Admission ' + esc(a.cycle) + '</h2>' +
            '<span class="badge badge--' + tone + '">' + (tone === 'open' ? ICONS.check : ICONS.clock) + esc(a.status) + '</span>' +
          '</div>' +
          '<dl class="kv">' +
            '<dt>How seats are filled</dt><dd>' + esc(a.mode) + '</dd>' +
            '<dt>Eligibility</dt><dd>' + esc(a.eligibility) + '</dd>' +
            '<dt>Indicative fee</dt><dd>' + esc(a.fee) + '</dd>' +
            (co && co.min ? '<dt>Indicative cut-off</dt><dd>around ' + co.min + '%' +
              (co.exam ? ' + ' + esc(co.exam) + ' score' : '') + '</dd>' : '') +
            (a.contactPhone ? '<dt>Admission helpline</dt><dd><a href="tel:' + esc(a.contactPhone.replace(/\s/g, '')) + '">' + esc(a.contactPhone) + '</a></dd>' : '') +
            (a.contactEmail ? '<dt>Admission email</dt><dd><a href="mailto:' + esc(a.contactEmail) + '">' + esc(a.contactEmail) + '</a></dd>' : '') +
          '</dl>' +
          (a.note ? '<div class="note note--ok" style="margin-top:14px">' + ICONS.star + '<span>' + esc(a.note) + '</span></div>' : '') +
          '<div class="row" style="margin-top:16px">' +
            '<a class="btn btn--primary" href="' + esc(c.admissionsUrl || c.website) + '" target="_blank" rel="noopener noreferrer">' + ICONS.ext + ' Apply on the official site</a>' +
            '<a class="btn" href="' + esc(c.website) + '" target="_blank" rel="noopener noreferrer">' + ICONS.globe + ' Official website</a>' +
          '</div>' +
        '</div>' +

        '<div class="card"><h2 class="secttl">' + ICONS.clock + ' Important dates</h2>' +
          '<ul class="tl">' + (a.dates || []).map(function (d) {
            var past = diffDays(d.date) < 0;
            return '<li class="' + (past ? 'past' : '') + '">' +
              '<b>' + esc(d.label) + '</b>' +
              '<div class="when">' + esc(fmtLong(d.date)) + '<span class="cd">' + esc(countdown(d.date)) + '</span></div>' +
              (d.note ? '<div class="nt">' + esc(d.note) + '</div>' : '') +
            '</li>';
          }).join('') + '</ul>' +
        '</div>' +
      '</div>' +

      '<div class="stack">' +
        (a.steps && a.steps.length ? '<div class="card"><h3>How to apply</h3><div class="steps">' +
          a.steps.map(function (s) { return '<div class="step"><div><p style="margin:0">' + esc(s) + '</p></div></div>'; }).join('') +
          '</div></div>' : '') +
        (a.docs && a.docs.length ? '<div class="card"><h3>' + ICONS.file + ' Documents to keep ready</h3>' +
          '<ul class="list">' + a.docs.map(function (d) { return '<li>' + ICONS.check + esc(d) + '</li>'; }).join('') + '</ul></div>' : '') +
        '<div class="card"><h3>' + ICONS.info + ' Before you apply</h3>' +
          '<div class="note">' + ICONS.info + '<span>Fees, cut-offs and dates shown here are indicative sample values. ' +
          'The college\u2019s official admission portal is the only authority — open it with the button above.</span></div></div>' +
      '</div>' +
    '</div>';
  }

  /* ---- events ---- */
  function eventCard(e) {
    var soon = isUpcoming(e);
    var range = e.end && e.end !== e.date ? ' · ' + esc(fmtLong(e.date)) + ' → ' + esc(fmtLong(e.end)) : '';
    return '<article class="ev ' + (soon ? 'ev--soon' : '') + '">' +
      '<div class="ev__d"><b>' + esc(fmtDay(e.date)) + '</b><span>' + esc(fmtMon(e.date)) + '</span></div>' +
      '<div class="ev__t">' +
        '<b>' + esc(e.title) + '</b>' +
        '<div class="ev__m">' +
          '<span>' + ICONS.cal + esc(fmtLong(e.date)) + range + '</span>' +
          (e.time ? '<span>' + ICONS.clock + esc(e.time) + '</span>' : '') +
          (e.venue ? '<span>' + ICONS.pin + esc(e.venue) + '</span>' : '') +
          (soon ? '<span class="evtag">' + esc(countdown(e.date)) + '</span>' : '') +
        '</div>' +
        (e.desc ? '<p class="ev__d2" style="margin:0">' + esc(e.desc) + '</p>' : '') +
        (e.tag ? '<div class="row" style="margin-top:8px"><span class="tag tag--info">' + esc(e.tag) + '</span></div>' : '') +
      '</div>' +
    '</article>';
  }

  function tabEvents(c) {
    var all = (c.events || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var soon = all.filter(isUpcoming);
    var past = all.filter(function (e) { return !isUpcoming(e); }).reverse();
    var tags = ['All'];
    all.forEach(function (e) { if (e.tag && tags.indexOf(e.tag) < 0) tags.push(e.tag); });
    var byTag = function (e) { return state.etag === 'All' || e.tag === state.etag; };
    var m = media(c);
    var gal = (m && (m.eventGallery || m.gallery)) || [];

    return '' +
    '<div class="card">' +
      '<div class="spread">' +
        '<h2 class="secttl" style="margin:0">' + ICONS.cal + ' Campus events</h2>' +
        '<span class="muted" style="font-size:13px">' + soon.length + ' upcoming · ' + past.length + ' past</span>' +
      '</div>' +
      '<div class="chips" id="etags" style="margin-top:12px">' +
        tags.map(function (t) {
          return '<button class="chip chip--sm" type="button" data-etag="' + esc(t) + '" aria-pressed="' +
            (state.etag === t) + '">' + esc(t) + '</button>';
        }).join('') +
      '</div>' +
    '</div>' +

    '<div class="evsplit">' +
      '<div class="card"><h3>Upcoming</h3>' +
        (soon.filter(byTag).length ? soon.filter(byTag).map(eventCard).join('')
          : '<p class="muted" style="margin:0">Nothing upcoming under this filter.</p>') +
      '</div>' +
      '<div class="card"><h3>Past events</h3>' +
        (past.filter(byTag).length ? past.filter(byTag).map(eventCard).join('')
          : '<p class="muted" style="margin:0">No past events under this filter.</p>') +
        (gal.length ? '<div class="gal">' + gal.map(function (g) {
            return '<img src="' + esc(g) + '" alt="Campus event photograph" loading="lazy">';
          }).join('') + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  /* ---- map ---- */
  function tabMap(c) {
    return '' +
    '<div class="two">' +
      '<div class="card" style="padding:0;overflow:hidden">' +
        '<div class="mapframe"><iframe title="Map of ' + esc(c.name) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" ' +
          'src="' + esc(mapEmbed(c)) + '"></iframe></div>' +
      '</div>' +
      '<div class="stack">' +
        '<div class="card"><h3>' + ICONS.pin + ' Address</h3>' +
          '<p class="addr">' + ICONS.pin + '<span>' + esc(c.address) + '<br>' + esc(c.city) + ', ' + esc(c.state) + '</span></p>' +
          '<div class="row" style="margin-top:14px">' +
            '<a class="btn btn--primary btn--sm" href="' + esc(mapDir(c)) + '" target="_blank" rel="noopener noreferrer">' + ICONS.dir + ' Get directions</a>' +
            '<a class="btn btn--sm" href="' + esc(mapOpen(c)) + '" target="_blank" rel="noopener noreferrer">' + ICONS.globe + ' Open in Google Maps</a>' +
            '<button class="btn btn--sm" type="button" data-copy="' + esc(c.address + ', ' + c.city + ', ' + c.state) + '">' + ICONS.copy + ' Copy address</button>' +
          '</div>' +
        '</div>' +
        '<div class="card"><h3>' + ICONS.home + ' Getting there</h3>' +
          '<dl class="kv">' +
            '<dt>City</dt><dd>' + esc(c.city) + ', ' + esc(c.state) + '</dd>' +
            '<dt>Hostel</dt><dd>' + (facilOf(c).hostel ? 'Available on campus' : 'Not listed') + '</dd>' +
            '<dt>Transport</dt><dd>' + (facilOf(c).bus ? esc(facilOf(c).busNote || 'college transport') : 'Not listed — plan your own commute') + '</dd>' +
          '</dl>' +
          '<div class="note note--info" style="margin-top:14px">' + ICONS.info +
            '<span>The map needs an internet connection. If it stays blank, use “Open in Google Maps”.</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---- contact ---- */
  function tabContact(c) {
    var links = c.links || [];
    return '' +
    '<div class="two">' +
      '<div class="stack">' +
        '<div class="card"><h2 class="secttl">' + ICONS.phone + ' Contact ' + esc(c.shortName) + '</h2>' +
          '<div class="ct">' +
            '<div class="ct__i">' + ICONS.phone + '<div><span>Phone</span>' +
              '<a href="tel:' + esc(String(c.phone || '').replace(/\s/g, '')) + '">' + esc(c.phone) + '</a></div></div>' +
            '<div class="ct__i">' + ICONS.mail + '<div><span>Email</span>' +
              '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></div></div>' +
            '<div class="ct__i">' + ICONS.clock + '<div><span>Office hours</span><b>' + esc(c.officeHours) + '</b></div></div>' +
            '<div class="ct__i">' + ICONS.pin + '<div><span>Address</span><b>' + esc(c.address) + '</b></div></div>' +
          '</div>' +
          (c.admission.contactPhone || c.admission.contactEmail ? '<hr class="hr"><dl class="kv">' +
            (c.admission.contactPhone ? '<dt>Admission helpline</dt><dd><a href="tel:' + esc(c.admission.contactPhone.replace(/\s/g, '')) + '">' + esc(c.admission.contactPhone) + '</a></dd>' : '') +
            (c.admission.contactEmail ? '<dt>Admission email</dt><dd><a href="mailto:' + esc(c.admission.contactEmail) + '">' + esc(c.admission.contactEmail) + '</a></dd>' : '') +
            '</dl>' : '') +
        '</div>' +

        '<div class="card"><h2 class="secttl">' + ICONS.globe + ' Official website</h2>' +
          '<p class="lede" style="margin:0 0 14px">The college\u2019s own site is the authoritative source for admissions, fees and dates. ' +
            'It opens in a new tab.</p>' +
          '<div class="row">' +
            '<a class="btn btn--primary" href="' + esc(c.website) + '" target="_blank" rel="noopener noreferrer">' + ICONS.globe + ' Visit ' + esc(shortHost(c.website)) + '</a>' +
            (c.admissionsUrl && c.admissionsUrl !== c.website
              ? '<a class="btn" href="' + esc(c.admissionsUrl) + '" target="_blank" rel="noopener noreferrer">' + ICONS.ext + ' Admission portal</a>' : '') +
          '</div>' +
          '<div class="note note--info" style="margin-top:14px">' + ICONS.info +
            '<span>College websites set security headers that block being shown inside another page, so we never frame them — ' +
            'you always land on the real site.</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="stack">' +
        (links.length ? '<div class="card"><h3>' + ICONS.link + ' Useful pages on their site</h3>' +
          '<div class="links">' + links.map(function (l) {
            return '<a class="btn btn--sm" href="' + esc(l.u) + '" target="_blank" rel="noopener noreferrer">' + esc(l.t) + ICONS.ext + '</a>';
          }).join('') + '</div></div>' : '') +
        '<div class="card"><h3>' + ICONS.cal + ' Next steps</h3>' +
          '<div class="steps">' +
            step('Check the dates', 'Open the Admission tab for this college — every important date has a countdown.') +
            step('Shortlist courses', 'Departments & Courses lists level, duration, seats and eligibility for each programme.') +
            step('Visit the campus', 'Events lists open houses and info sessions; the Map tab gives one-tap directions.') +
            step('Confirm officially', 'Call or email the admission office, then apply on the official portal.') +
          '</div></div>' +
      '</div>' +
    '</div>';
  }

  function shortHost(u) { return String(u || '').replace(/^https?:\/\//, '').replace(/\/.*$/, ''); }

  function renderCollege(c, tab) {
    var body = tab === 'courses' ? tabCourses(c)
      : tab === 'admission' ? tabAdmission(c)
      : tab === 'events' ? tabEvents(c)
      : tab === 'map' ? tabMap(c)
      : tab === 'contact' ? tabContact(c)
      : tabOverview(c);

    /* other colleges, for quick switching */
    var others = COLLEGES.filter(function (x) { return x.id !== c.id; });

    return '<div class="wrap wrap--tight">' +
      '<a class="cback" href="#/" data-nav>' + ICONS.back + ' All colleges</a>' +
      collegeHeader(c) +
      tabBar(c, tab) +
      '<div class="panel">' + body + '</div>' +
      '<div class="card"><h3>Other colleges you can compare</h3><div class="links">' +
        others.map(function (o) {
          return '<a class="btn btn--sm" href="#/college/' + esc(o.id) + '/overview" data-nav>' + esc(o.shortName) + '</a>';
        }).join('') + '</div></div>' +
    '</div>';
  }

  /* ================================================================= render */
  function render() {
    var r = parseHash();
    if (r.view === 'college') {
      app.innerHTML = renderCollege(r.college, r.tab);
      document.title = r.college.name + ' — CampusConnect';
    } else if (r.view === 'about') {
      app.innerHTML = renderAbout();
      document.title = 'How it works — CampusConnect';
    } else if (r.view === 'missing') {
      app.innerHTML = '<div class="wrap"><div class="empty"><b>That college is not in this dataset</b>' +
        'Unknown id: ' + esc(r.id) + '<div class="row" style="justify-content:center;margin-top:14px">' +
        '<a class="btn btn--sm" href="#/" data-nav>Back to all colleges</a></div></div></div>';
      document.title = 'Not found — CampusConnect';
    } else {
      app.innerHTML = renderHome();
      document.title = 'CampusConnect — Coimbatore college admissions';
    }
    markNav();
    var focusId = r.view === 'college' && r.tab === 'courses' ? 'cq' : (r.view === 'home' ? 'q' : null);
    if (focusId) {
      var inp = document.getElementById(focusId);
      if (inp && state.restoreFocus === focusId) {
        inp.focus();
        var v = inp.value; inp.value = ''; inp.value = v;      /* caret to end */
      }
    }
    state.restoreFocus = null;
    window.scrollTo(0, 0);
  }

  function markNav() {
    var r = parseHash();
    document.querySelectorAll('[data-nav]').forEach(function (a) { a.removeAttribute('aria-current'); });
    var sel = r.view === 'about' ? '#/about' : (r.view === 'college' ? null : '#/');
    if (sel) {
      document.querySelectorAll('.topnav a[href="' + sel + '"]').forEach(function (a) {
        a.setAttribute('aria-current', 'page');
      });
    }
  }

  /* ================================================================ events */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-toggle-dept], [data-cat], [data-level], [data-etag], [data-clear], [data-clear-courses], [data-copy], #themeBtn');
    if (!t) return;

    if (t.id === 'themeBtn') {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      return;
    }
    if (t.hasAttribute('data-toggle-dept')) {
      var r = parseHash();
      if (r.view !== 'college') return;
      var i = t.getAttribute('data-toggle-dept');
      var m = state.openDept[r.college.id] || (state.openDept[r.college.id] = { 0: true });
      m[i] = !m[i];
      var sec = t.closest('.dept');
      sec.setAttribute('data-open', m[i] ? '1' : '0');
      t.setAttribute('aria-expanded', String(!!m[i]));
      return;
    }
    if (t.hasAttribute('data-cat')) {
      state.cat = t.getAttribute('data-cat');
      app.innerHTML = renderHome(); markNav();
      return;
    }
    if (t.hasAttribute('data-level')) {
      state.level = t.getAttribute('data-level');
      rerenderCollege('courses');
      return;
    }
    if (t.hasAttribute('data-etag')) {
      state.etag = t.getAttribute('data-etag');
      rerenderCollege('events');
      return;
    }
    if (t.hasAttribute('data-clear')) {
      state.q = ''; state.cat = 'All';
      app.innerHTML = renderHome(); markNav();
      return;
    }
    if (t.hasAttribute('data-clear-courses')) {
      state.cq = ''; state.level = 'All';
      rerenderCollege('courses');
      return;
    }
    if (t.hasAttribute('data-copy')) {
      copyText(t.getAttribute('data-copy'), t);
    }
  });

  function rerenderCollege(tab) {
    var r = parseHash();
    if (r.view !== 'college') return;
    var keep = window.scrollY;
    app.innerHTML = renderCollege(r.college, tab);
    markNav();
    window.scrollTo(0, keep);
    if (tab === 'courses') {
      var inp = document.getElementById('cq');
      if (inp && state.restoreFocus) { inp.focus(); var v = inp.value; inp.value = ''; inp.value = v; }
    }
    state.restoreFocus = null;
  }

  document.addEventListener('input', function (ev) {
    var id = ev.target.id;
    if (id === 'q') {
      state.q = ev.target.value;
      var keep = window.scrollY;
      var r = parseHash();
      if (r.view !== 'home') return;
      /* re-render only the list area to keep typing smooth */
      var list = COLLEGES.filter(matches);
      var gridHost = app.querySelector('.grid, .empty');
      var html = list.length ? '<div class="grid">' + list.map(collegeCard).join('') + '</div>'
        : '<div class="empty"><b>No college matches that search</b>Try a course name (B.Pharm, M.C.A.), a field (nursing, textile) or clear the filters.' +
          '<div class="row" style="justify-content:center;margin-top:14px"><button class="btn btn--sm" type="button" data-clear>Clear search & filters</button></div></div>';
      if (gridHost) gridHost.outerHTML = html;
      var cl = app.querySelector('.countline');
      if (cl) cl.textContent = list.length + ' of ' + COLLEGES.length + ' colleges · ' +
        list.reduce(function (n, c) { return n + allCourses(c).length; }, 0) + ' courses · ' +
        list.reduce(function (n, c) { return n + totalSeats(c); }, 0).toLocaleString('en-IN') + ' seats listed' +
        (state.q ? ' for \u201c' + state.q + '\u201d' : '');
      window.scrollTo(0, keep);
      ev.target.focus();
    } else if (id === 'cq') {
      state.cq = ev.target.value;
      state.restoreFocus = 'cq';
      rerenderCollege('courses');
    }
  });

  function copyText(text, btn) {
    var done = function () {
      var old = btn.innerHTML;
      btn.innerHTML = ICONS.check + ' Copied';
      setTimeout(function () { btn.innerHTML = old; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { prompt(text); });
    } else { prompt(text); }
  }
  function prompt(text) { window.prompt('Copy this address:', text); }

  window.addEventListener('hashchange', function () {
    state.level = 'All'; state.cq = ''; state.etag = 'All';
    render();
  });

  /* ------------------------------------------------------------------- boot */
  initTheme();
  var gm = document.getElementById('groupMark');
  if (gm) { gm.src = D.groupMark; gm.onerror = function () { gm.style.display = 'none'; }; }
  var fb = document.getElementById('footBuild');
  if (fb) fb.textContent = 'Dataset build ' + D.build + ' · generated ' + new Date().toISOString().slice(0, 10) +
    ' · CampusConnect standalone college site';
  if (!location.hash) location.hash = '#/';
  render();
})();
