/* Platform admin workspace — sidebar shell with the nine business desks.
   Stage 1 live: Dashboard (KPI + 7-day charts), Students/Leads (search + 360
   drawer), Analytics (funnel + top colleges), Audit log (live 30s feed),
   Colleges (view-only). Stage 2/3 desks (notifications, users, subscriptions,
   settings) show as locked "coming soon" cards.
   Reads /api/admin/summary (totals, students, colleges, days, recent). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cc, useCC } from '../store.js';
import { api } from '../api.js';
import { COLLEGES, collegeById, initials, BUILD_TAG } from '../core.js';

const NAV = [
  { id: 'dash', ic: '📊', t: 'Dashboard' },
  { id: 'colleges', ic: '🏫', t: 'Colleges' },
  { id: 'students', ic: '👨‍🎓', t: 'Students / Leads' },
  { id: 'analytics', ic: '📈', t: 'Analytics' },
  { id: 'subs', ic: '💰', t: 'Subscriptions', lock: 3 },
  { id: 'notif', ic: '🔔', t: 'Notifications', lock: 2 },
  { id: 'users', ic: '👥', t: 'Admin users', lock: 3 },
  { id: 'audit', ic: '🧾', t: 'Audit log' },
  { id: 'settings', ic: '⚙️', t: 'Settings', lock: 2 },
];

const fmtWhen = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};
const ago = (iso) => {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso)) / 1000;
  if (isNaN(s)) return '—';
  if (s < 60) return Math.max(1, s | 0) + 's ago';
  if (s < 3600) return (s / 60 | 0) + 'm ago';
  if (s < 86400) return (s / 3600 | 0) + 'h ago';
  return (s / 86400 | 0) + 'd ago';
};
const EVIC = { login: '🔑', profile_view: '👁', save: '♥', website_click: '🌐', update: '✏️', register: '🆕' };
const cname = (cid) => (collegeById(cid) || {}).shortName || cid || '—';

function useCountUp(target) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf; const t0 = (typeof performance !== 'undefined' ? performance.now() : 0); const dur = 750;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(Math.round((target || 0) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

/* ------------------------------------------------------------ dashboard */
function Donut({ parts }) {
  const tot = Math.max(1, parts.reduce((a, p) => a + p.v, 0));
  const R = 42, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg viewBox="0 0 120 120" className="admdonut" role="img" aria-label="Action split">
      {parts.map((p) => {
        const len = (p.v / tot) * C;
        const el = (
          <circle key={p.label} cx="60" cy="60" r={R} fill="none" stroke={p.color} strokeWidth="15"
            strokeDasharray={len + ' ' + (C - len)} strokeDashoffset={-acc} transform="rotate(-90 60 60)" />
        );
        acc += len;
        return el;
      })}
      <text x="60" y="58" textAnchor="middle" className="admdonut__n">{tot}</text>
      <text x="60" y="73" textAnchor="middle" className="admdonut__l">actions</text>
    </svg>
  );
}

function Line7({ days }) {
  if (!days || !days.length) return null;
  const vals = days.map((d) => d.views);
  const max = Math.max(1, ...vals);
  const W = 560, H = 150, P = 14;
  const pts = vals.map((v, i) => [P + (i * (W - 2 * P)) / (vals.length - 1), H - P - (v / max) * (H - 2 * P - 14)]);
  let dpath = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
  for (let i = 1; i < pts.length; i++) {
    const dx = (pts[i][0] - pts[i - 1][0]) / 2;
    dpath += ' C' + (pts[i - 1][0] + dx).toFixed(1) + ' ' + pts[i - 1][1].toFixed(1)
      + ' ' + (pts[i][0] - dx).toFixed(1) + ' ' + pts[i][1].toFixed(1)
      + ' ' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
  }
  const area = dpath + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (H - P) + ' L' + pts[0][0].toFixed(1) + ' ' + (H - P) + ' Z';
  return (
    <svg viewBox={'0 0 ' + W + ' ' + (H + 22)} className="admline" role="img" aria-label="7 day views trend">
      <defs>
        <linearGradient id="lg7" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#121d38" /><stop offset=".45" stopColor="#f0b64a" /><stop offset="1" stopColor="#2e7d5b" />
        </linearGradient>
        <linearGradient id="ag7" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0b64a" stopOpacity=".28" /><stop offset="1" stopColor="#f0b64a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ag7)" />
      <path d={dpath} fill="none" stroke="url(#lg7)" strokeWidth="3.4" strokeLinecap="round" />
      {pts.map((pt, i) => (
        <g key={i}>
          <circle cx={pt[0]} cy={pt[1]} r="3.6" fill="#fff" stroke="#121d38" strokeWidth="2" />
          <text x={pt[0]} y={H + 16} textAnchor="middle">{new Date(days[i].date + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short' })}</text>
        </g>
      ))}
    </svg>
  );
}

function Chart7({ days }) {
  if (!days || !days.length) return null;
  const max = Math.max(1, ...days.map((d) => Math.max(d.views, d.saves)));
  const W = 560, H = 132, bw = 24, gap = (W - 7 * (bw * 2 + 4)) / 8;
  return (
    <svg viewBox={'0 0 ' + W + ' ' + (H + 26)} className="admchart" role="img" aria-label="Last 7 days activity">
      {days.map((d, i) => {
        const x = gap + i * (bw * 2 + 4 + gap);
        const hv = Math.max(2, (d.views / max) * H);
        const hs = Math.max(2, (d.saves / max) * H);
        return (
          <g key={d.date}>
            <rect x={x} y={H - hv} width={bw} height={hv} rx="4" fill="#f0b64a" />
            <rect x={x + bw + 4} y={H - hs} width={bw} height={hs} rx="4" fill="#121d38" />
            <text x={x + bw + 2} y={H + 18} textAnchor="middle">{new Date(d.date + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short' })}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Kpi({ k, v, ic, i }) {
  const n = useCountUp(v);
  return (
    <div className={'admkpi admkpi--c' + (i % 4)}>
      <span className="admkpi__ic">{ic}</span><b>{n}</b><span>{k}</span>
    </div>
  );
}

function Dash({ d }) {
  const t = d.totals || {};
  const today = (d.days || []).slice(-1)[0] || {};
  const kpis = [
    ['Students registered', t.students ?? 0, '👨‍🎓'],
    ['College profile views', t.profileViews ?? 0, '👁'],
    ['Colleges saved', t.saves ?? 0, '♥'],
    ['Official-site clicks', t.websiteClicks ?? 0, '🌐'],
    ['Colleges with interest', t.collegesWithInterest ?? 0, '🏫'],
    ['Logins today', today.logins ?? 0, '🔑'],
  ];
  const week = (d.days || []).reduce((a, x) => ({ v: a.v + x.views, s: a.s + x.saves }), { v: 0, s: 0 });
  return (
    <>
      <div className="admbanrow">
        <section className="admban">
          <div>
            <h2>Hi {String(cc.user?.name || 'Admin').split(/\s+/)[0]}! Welcome back 👋</h2>
            <p>{t.students ?? 0} students · {week.v} profile views & {week.s} saves this week ·
              {' '}{t.websiteClicks ?? 0} official-site clicks overall. The feed below ticks every 30 seconds.</p>
          </div>
          <svg viewBox="0 0 120 90" className="admban__art" aria-hidden="true">
            <circle cx="88" cy="26" r="17" fill="rgba(240,182,74,.9)" />
            <circle cx="60" cy="52" r="26" fill="rgba(255,255,255,.14)" />
            <rect x="18" y="44" width="52" height="34" rx="6" fill="rgba(255,255,255,.22)" />
            <rect x="26" y="52" width="36" height="4" rx="2" fill="rgba(255,255,255,.55)" />
            <rect x="26" y="60" width="26" height="4" rx="2" fill="rgba(255,255,255,.4)" />
          </svg>
        </section>
        <section className="card admtoday">
          <h3><span className="dot" />Today</h3>
          <ul>
            <li><i>🔑</i>{today.logins ?? 0} logins</li>
            <li><i>👁</i>{today.views ?? 0} profile views</li>
            <li><i>♥</i>{today.saves ?? 0} saves</li>
            <li><i>🌐</i>{today.clicks ?? 0} site clicks</li>
          </ul>
          <a className="admnote" href="#adm-audit">Open live audit feed →</a>
        </section>
      </div>
      <div className="admkpis">
        {kpis.map(([k, v, ic], i) => <Kpi key={k} k={k} v={v} ic={ic} i={i} />)}
      </div>
      <div className="admcharts">
        <section className="card admpad">
          <h3><span className="dot" />Action split</h3>
          <div className="admdonutwrap">
            <Donut parts={[
              { label: 'views', v: t.profileViews ?? 0, color: '#f0b64a' },
              { label: 'saves', v: t.saves ?? 0, color: '#121d38' },
              { label: 'clicks', v: t.websiteClicks ?? 0, color: '#2e7d5b' },
            ]} />
            <ul className="admdonutlg">
              <li><i style={{ background: '#f0b64a' }} />Profile views<b>{t.profileViews ?? 0}</b></li>
              <li><i style={{ background: '#121d38' }} />Saves<b>{t.saves ?? 0}</b></li>
              <li><i style={{ background: '#2e7d5b' }} />Site clicks<b>{t.websiteClicks ?? 0}</b></li>
            </ul>
          </div>
        </section>
        <section className="card admpad">
          <h3><span className="dot" />7-day views trend
            <span className="admlegend"><i style={{ background: '#f0b64a' }} />views<i style={{ background: '#121d38' }} />saves (bars)</span>
          </h3>
          <Line7 days={d.days} />
          <Chart7 days={d.days} />
        </section>
      </div>
      <section className="card admpad">
        <h3><span className="dot" />College-wise interest
          <span className="admtools">
            <a className="btn btn--sm" href={api.studentsCsvUrl()} target="_blank" rel="noopener noreferrer">Students CSV</a>
            <a className="btn btn--sm" href={api.studentsCsvUrl('all')} target="_blank" rel="noopener noreferrer">Leads CSV</a>
          </span>
        </h3>
        <div className="admtable">
          <table>
            <thead><tr><th>College</th><th>Students</th><th>Views</th><th>Saves</th><th>Site clicks</th><th>Leads</th></tr></thead>
            <tbody>
              {(d.colleges || []).map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td><td>{c.students}</td><td>{c.views}</td><td>{c.saves}</td><td>{c.clicks}</td>
                  <td><a href={api.studentsCsvUrl(c.id)} target="_blank" rel="noopener noreferrer">CSV ↓</a></td>
                </tr>
              ))}
              {!(d.colleges || []).length && <tr><td colSpan="6">No activity recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------ students */
function Students({ d }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = d.students || [];
    if (!s) return list;
    return list.filter((r) => [r.name, r.email, r.mobile, r.town, r.stream, r.want]
      .some((f) => String(f || '').toLowerCase().includes(s)));
  }, [d, q]);
  return (
    <>
      <div className="admbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, mobile, town…" aria-label="Search students" />
        <span className="admbar__n">{rows.length} of {(d.students || []).length}</span>
        <a className="btn btn--sm" href={api.studentsCsvUrl()} target="_blank" rel="noopener noreferrer">Export CSV</a>
      </div>
      <div className="admtable">
        <table>
          <thead><tr><th>Student</th><th>Marks / stream</th><th>Course</th><th>Status</th><th>Saves</th><th>Views</th><th>Last activity</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email} onClick={() => setOpen(r)} className="admrow">
                <td><span className="admav">{initials(r.name || r.email)}</span><b>{r.name || r.email}</b><small>{r.email}</small></td>
                <td>{r.marks ?? '—'}% · {r.stream || '—'}</td>
                <td>{r.want || '—'}</td>
                <td><span className={'pill ' + ((r.saves ?? 0) > 0 ? 'pill--g' : (Date.now() - new Date(r.lastActivity || r.created)) / 86400000 <= 7 ? 'pill--b' : 'pill--y')}>
                  {(r.saves ?? 0) > 0 ? 'Saved' : (Date.now() - new Date(r.lastActivity || r.created)) / 86400000 <= 7 ? 'Active' : 'New'}</span></td>
                <td>{r.saves ?? 0}</td><td>{r.profileViews ?? 0}</td>
                <td>{ago(r.lastActivity)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="7">No students match.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="admdraw__ov" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <aside className="admdraw" role="dialog" aria-label="Student 360">
            <header>
              <span className="admav admav--xl">{initials(open.name || open.email)}</span>
              <div><b>{open.name || open.email}</b><small>{open.email}</small></div>
              <button className="modal__x" type="button" onClick={() => setOpen(null)} aria-label="Close">×</button>
            </header>
            <div className="admdraw__grid">
              <div><dt>Mobile</dt><dd><a href={'tel:+91' + (open.mobile || '')}>+91 {open.mobile || '—'}</a></dd></div>
              <div><dt>Class 12 %</dt><dd>{open.marks ?? '—'}%</dd></div>
              <div><dt>Stream</dt><dd>{open.stream || '—'}</dd></div>
              <div><dt>Course</dt><dd>{open.want || '—'}</dd></div>
              <div><dt>Degree</dt><dd>{open.degree || '—'}</dd></div>
              <div><dt>Stay</dt><dd>{(open.stay || '—') + (open.hostelType ? ' · ' + open.hostelType : '')}</dd></div>
              <div><dt>Travel</dt><dd>{open.travel || '—'}</dd></div>
              <div><dt>Town</dt><dd>{open.town || '—'}</dd></div>
              <div><dt>Consent</dt><dd>{open.consent === 'true' ? 'Given (DPDP) ✓' : 'Not given'}</dd></div>
              <div><dt>Member since</dt><dd>{fmtWhen(open.created)}</dd></div>
            </div>
            <h4>Most viewed colleges</h4>
            <div className="admdraw__tops">
              {(open.topColleges || []).map((c) => <span className="tag" key={c.id}>{c.name} · {c.views}×</span>)}
              {!(open.topColleges || []).length && <span className="tag">No college views yet</span>}
            </div>
            <h4>Quick actions</h4>
            <div className="admdraw__act">
              <a className="btn btn--sm" href={'mailto:' + open.email}>✉️ Email</a>
              <a className="btn btn--sm" href={'tel:+91' + (open.mobile || '')}>📞 Call</a>
              <a className="btn btn--sm" href={api.studentsCsvUrl('all')} target="_blank" rel="noopener noreferrer">Leads CSV</a>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------ analytics */
function Analytics({ d }) {
  const t = d.totals || {};
  const steps = [
    ['College profiles viewed', t.profileViews ?? 0, '#f0b64a'],
    ['Colleges saved (shortlist)', t.saves ?? 0, '#121d38'],
    ['Official-site clicks (apply intent)', t.websiteClicks ?? 0, '#2e7d5b'],
  ];
  const max = Math.max(1, steps[0][1]);
  const tops = (d.colleges || []).slice(0, 8);
  const tmax = Math.max(1, ...tops.map((c) => c.students));
  return (
    <>
      <section className="card admpad">
        <h3><span className="dot" />Interest funnel</h3>
        {steps.map(([k, v, col]) => (
          <div className="admfunnel" key={k}>
            <span>{k}</span>
            <div className="admfunnel__track"><i style={{ width: Math.max(3, (v / max) * 100) + '%', background: col }} /></div>
            <b>{v}</b>
          </div>
        ))}
        <p className="admnote">Save-to-view rate: {t.profileViews ? Math.round(((t.saves ?? 0) / t.profileViews) * 100) : 0}%
          {' '}· click-to-view rate: {t.profileViews ? Math.round(((t.websiteClicks ?? 0) / t.profileViews) * 100) : 0}%</p>
      </section>
      <section className="card admpad">
        <h3><span className="dot" />Top colleges by interested students</h3>
        {tops.map((c) => (
          <div className="admfunnel" key={c.id}>
            <span>{c.name}</span>
            <div className="admfunnel__track"><i style={{ width: Math.max(3, (c.students / tmax) * 100) + '%', background: '#f0b64a' }} /></div>
            <b>{c.students}</b>
          </div>
        ))}
        {!tops.length && <p className="admnote">No college activity yet.</p>}
      </section>
    </>
  );
}

/* ------------------------------------------------------------ audit */
function Audit({ d }) {
  return (
    <section className="card admpad">
      <h3><span className="dot" />Live activity<span className="admlegend"><i className="admlive" />auto-refresh 30s</span></h3>
      <div className="admfeed">
        {(d.recent || []).map((e, i) => (
          <div className="admfeed__i" key={i}>
            <span className="admfeed__ic">{EVIC[e.type] || '•'}</span>
            <div>
              <b>{e.email || 'someone'}</b>{' '}
              {e.type === 'profile_view' ? 'viewed' : e.type === 'save' ? 'saved' : e.type === 'website_click' ? 'opened the official site of' : e.type === 'login' ? 'signed in' : e.type === 'update' ? 'updated their profile' : e.type}
              {e.cid ? <> <b>{cname(e.cid)}</b></> : null}
              <small>{fmtWhen(e.at)} · {ago(e.at)}</small>
            </div>
          </div>
        ))}
        {!(d.recent || []).length && <p className="admnote">No activity recorded yet.</p>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ colleges */
function Colleges() {
  return (
    <section className="card admpad">
      <h3><span className="dot" />Colleges on the platform<span className="admlegend">{COLLEGES.length} listed · editor comes in stage 2</span></h3>
      <div className="admtable">
        <table>
          <thead><tr><th>College</th><th>City</th><th>Group</th><th>Courses</th><th>Official site</th></tr></thead>
          <tbody>
            {COLLEGES.map((c) => (
              <tr key={c.id}>
                <td><b>{c.shortName || c.name}</b><small>{c.name}</small></td>
                <td>{c.city}</td><td>{c.group || '—'}</td><td>{(c.courses || []).length}</td>
                <td><a href={c.site} target="_blank" rel="noopener noreferrer">↗</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Locked({ n }) {
  return (
    <section className="card admpad admlock">
      <span className="admlock__ic">{n.ic}</span>
      <h3>{n.t}</h3>
      <p>Stage {n.lock} desk — needs the roles / payments backend. Demo data mature aana
        pira inge full management varum; ippo safe-a lock panni vechirukom.</p>
    </section>
  );
}

/* ------------------------------------------------------------ footer */
const IX_TELS = [
  { n: '90439 19570' },
  { n: '89257 47659' },
  { n: '63856 14942' },
  { n: '72004 56323', note: 'Coimbatore office' },
];
const IX_MAP_EMBED = 'https://www.google.com/maps?q=' + encodeURIComponent(
  'Infolexus Solutions, 63/54-55, Dhamu Nagar, Puliyakulam Road, Ramanathapuram, Coimbatore, Tamil Nadu 641045, India') + '&output=embed';
const IX_MAP_LINK = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(
  'Infolexus Solutions, 63/54-55, Dhamu Nagar, Puliyakulam Road, Ramanathapuram, Coimbatore, Tamil Nadu 641045, India');

function InfolexusFooter() {
  return (
    <div className="ixfoot">
      <div className="wrap"><h3 className="ixfoot__title">Help and Support</h3></div>
      <div className="wrap ixfoot__in">
        <div>
          <div className="ixfoot__brand">
            <span className="ixfoot__mark">iX</span>
            <div><b>Infolexus Solutions</b><small>Software &amp; IT services · Coimbatore</small></div>
          </div>
          <div className="ixfoot__line">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
            <span>63/54-55, Dhamu Nagar, Puliyakulam Road,<br />Ramanathapuram, Coimbatore,<br />Tamil Nadu – 641045, India</span>
          </div>
          <div className="ixfoot__line">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>
            <a href={IX_MAP_LINK} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
          </div>
        </div>
        <div className="ixfoot__map">
          <h4 className="ixfoot__mapt">Google Map</h4>
          <iframe title="Infolexus Solutions — Google Map" src={IX_MAP_EMBED} loading="lazy"
            referrerPolicy="no-referrer-when-downgrade" allowFullScreen></iframe>
          <a className="ixfoot__larger" href={IX_MAP_LINK} target="_blank" rel="noopener noreferrer">View larger map ↗</a>
          <div className="ixfoot__line">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
            <span className="ixfoot__tels">
              <b>Contact us · Phone / WhatsApp</b>
              {IX_TELS.map((t) => (
                <span className="ixfoot__tel" key={t.n}>
                  <a href={'tel:+91' + t.n.replace(/\s/g, '')}>+91 {t.n}</a>
                  <a className="ixfoot__wa" title="WhatsApp" href={'https://wa.me/91' + t.n.replace(/\s/g, '')} target="_blank" rel="noopener noreferrer">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z" /><path d="M9 10.5c.5 2 2.5 4 4.5 4.5l1-1.5 2 .8-.3 1.7c-2.8.6-6.9-2.6-7.7-5.6l1.5-.9Z" /></svg>
                  </a>
                  {t.note && <em>{t.note}</em>}
                </span>
              ))}
            </span>
          </div>
        </div>
        <div>
          <h4>Platform credit</h4>
          <p>CampusConnect — college admission portal for Tamil Nadu students.
            Designed &amp; developed by <b>Infolexus Solutions</b>, Coimbatore.</p>
          <p className="ixfoot__note">Addresses &amp; map © Google · college data is indicative
            demo content; confirm details with each institution.</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ leads desk */
function Leads({ d }) {
  const crows = d.colleges || [];
  const [cid, setCid] = useState(crows[0] ? crows[0].id : '');
  const cur = crows.find((c) => c.id === cid) || crows[0];
  const list = useMemo(() => (d.students || []).filter((r) =>
    (r.topColleges || []).some((c) => c.id === (cur || {}).id)), [d, cur]);
  if (!crows.length) return <section className="card admpad"><p className="admnote">No lead activity yet.</p></section>;
  return (
    <>
      <div className="admbar admbar--wrap">
        {(crows).map((c) => (
          <button key={c.id} type="button" className={'chip' + (cur && c.id === cur.id ? ' chip--on' : '')}
            onClick={() => setCid(c.id)}>{c.name} · {c.students}</button>
        ))}
      </div>
      {cur && (
        <>
          <div className="admkpis">
            <div className="admkpi admkpi--c1"><span className="admkpi__ic">👨‍🎓</span><b>{cur.students}</b><span>Students interested</span></div>
            <div className="admkpi admkpi--c0"><span className="admkpi__ic">👁</span><b>{cur.views}</b><span>Profile views</span></div>
            <div className="admkpi admkpi--c2"><span className="admkpi__ic">♥</span><b>{cur.saves}</b><span>Saves</span></div>
            <div className="admkpi admkpi--c3"><span className="admkpi__ic">🌐</span><b>{cur.clicks}</b><span>Site clicks</span></div>
          </div>
          <section className="card admpad">
            <h3><span className="dot" />{cur.name} — interested students
              <span className="admtools">
                <a className="btn btn--sm" href={api.studentsCsvUrl(cur.id)} target="_blank" rel="noopener noreferrer">Leads CSV ↓</a>
              </span>
            </h3>
            <div className="admtable">
              <table>
                <thead><tr><th>Student</th><th>Marks / stream</th><th>Views of this college</th><th>Contact</th></tr></thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.email}>
                      <td><span className="admav">{initials(r.name || r.email)}</span><b>{r.name || r.email}</b><small>{r.email}</small></td>
                      <td>{r.marks ?? '—'}% · {r.stream || '—'}</td>
                      <td>{((r.topColleges || []).find((c) => c.id === cur.id) || {}).views || '—'}</td>
                      <td><a href={'tel:+91' + (r.mobile || '')}>📞</a> <a href={'mailto:' + r.email}>✉️</a></td>
                    </tr>
                  ))}
                  {!list.length && <tr><td colSpan="4">No named students yet — activity only. Exact list in the CSV.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------ shell: separate pages + sidebar */
export default function AdminView({ onLogout }) {
  useCC();
  const [page, setPage] = useState('dash');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [upd, setUpd] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    setBusy(true);
    api.adminSummary().then((x) => { setD(x); setUpd(new Date()); })
      .catch((e) => setErr(e.message || 'Could not load the summary.'))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const PAGES = [
    ['dash', '📊', 'Dashboard'],
    ['colleges', '🏫', 'Colleges'],
    ['students', '👨‍', 'Students'],
    ['leads', '🎯', 'Leads'],
    ['analytics', '📈', 'Analytics'],
    ['audit', '🧾', 'Audit log'],
    ['roadmap', '🚧', 'Roadmap'],
  ];
  const curt = (PAGES.find(([id]) => id === page) || [])[2] || '';

  return (
    <section className="view active" id="view-admin">
      <header className="admhero">
        <div className="wrap">
          <div className="admhero__in">
            <div>
              <h1>Platform admin · {curt}</h1>
              <p>CampusConnect business desk · signed in as <b>{cc.user?.email || 'admin'}</b> · auto-refresh 30s
                {upd ? <> · updated <b>{upd.toLocaleTimeString('en-IN')}</b></> : null} · build {BUILD_TAG}</p>
            </div>
            <span className="admhero__act">
              <button className="btn btn--gold btn--sm admrefbtn" type="button" onClick={load} disabled={busy}>
                <span className={'admref' + (busy ? ' admref--spin' : '')}>⟳</span> {busy ? 'Refreshing…' : 'Refresh'}
              </button>
              <button className="btn btn--ghost btn--sm" type="button" onClick={onLogout}>Sign out</button>
            </span>
          </div>
        </div>
      </header>

      <div className="wrap admwrap">
        {err && (
          <div className="auth__alert" role="alert" style={{ margin: '0 0 14px' }}>
            <span>{err} Sign in again from the front page as admin.</span>
          </div>
        )}
        <div className="admshell">
          <nav className="admn" aria-label="Admin pages">
            {PAGES.map(([id, ic, t]) => (
              <button key={id} type="button" className={'admn__i' + (page === id ? ' admn__i--on' : '')}
                onClick={() => setPage(id)}>
                <span className="admn__ic">{ic}</span>{t}
              </button>
            ))}
            <div className="admn__foot">
              {NAV.filter((n) => n.lock).map((n) => (
                <span key={n.id} title={'Stage ' + n.lock}>{n.ic} {n.t} 🔒</span>
              ))}
            </div>
          </nav>
          <div className="admc">
            {!d && !err && <p className="admnote">Loading summary…</p>}
            {d && page === 'dash' && <Dash d={d} />}
            {page === 'colleges' && <Colleges />}
            {d && page === 'students' && <Students d={d} />}
            {d && page === 'leads' && <Leads d={d} />}
            {d && page === 'analytics' && <Analytics d={d} />}
            {d && page === 'audit' && <Audit d={d} />}
            {page === 'roadmap' && (
              <div className="admroad">
                {NAV.filter((n) => n.lock).map((n) => (
                  <section className="card admlock" key={n.id}>
                    <span className="admlock__ic">{n.ic}</span>
                    <h3>{n.t}</h3>
                    <p>Stage {n.lock} — roles / payments backend venum; demo data mature aana pira inge full management varum.</p>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <InfolexusFooter />
    </section>
  );
}
