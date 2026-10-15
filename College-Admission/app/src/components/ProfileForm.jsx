/* Shared details form — one component, two modes:
   · mode="edit"  → inline editing inside My Profile (no dark modal)
   · mode="setup" → first-login "complete your profile" page
   Light theme, grouped sections, inline validation, sticky action bar. */
import { useState } from 'react';
import {
  STREAMS, WANT, STAY, HOSTELTYPE, TRAVEL, degreesFor, ANY_DEGREE, NOT_SURE,
} from '../core.js';
import '../profile-form.css';

const Chip = ({ on, children, ...rest }) => (
  <button type="button" className={'chip' + (on ? ' chip--on' : '')} aria-pressed={on} {...rest}>{children}</button>
);

const Sec = ({ icon, title, children }) => (
  <section className="psec">
    <h4>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      {title}
    </h4>
    {children}
  </section>
);

const I = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>,
  cap: <><path d="M2 9.5 12 5l10 4.5-10 4.5Z" /><path d="M6 12v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4" /></>,
  home: <><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></>,
};

/* ------------------------------------------------------- subject marks ----
   Maths + Physics/2 + Chemistry/2 — the same formula the TNEA card uses, so
   the student can set the three marks while filling the profile. */

const blank = (v) => v === '' || v === null || v === undefined;
const numOrNull = (v) => (blank(v) ? null : Number(v));

export default function ProfileForm({ initial, mode, saveLabel, onSave, onCancel }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const setup = mode === 'setup';

  const upd = (k, v) => {
    setF((o) => ({ ...o, [k]: v, ...(k === 'want' ? { degree: ANY_DEGREE } : {}) }));
    setErr((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };
  const chg = (k) => (!setup && f[k] !== initial[k] ? ' chg' : '');

  /* Maths + Physics/2 + Chemistry/2 — the same formula the TNEA card uses */
  const cut = (() => {
    const m = numOrNull(f.math), p = numOrNull(f.phy), c = numOrNull(f.chem);
    if (m === null || p === null || c === null) return null;
    if ([m, p, c].some((x) => isNaN(x))) return null;
    return m + p / 2 + c / 2;
  })();

  function submit() {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Please tell us your name (2+ letters).';
    if (f.mobile.replace(/\D/g, '').length !== 10) e.mobile = 'Mobile number should be 10 digits.';
    const m = Number(f.marks);
    if (!f.marks || isNaN(m) || m < 30 || m > 100) e.marks = 'Class 12 % should be between 30 and 100.';
    if (!blank(f.marks10)) {
      const m10 = Number(f.marks10);
      if (isNaN(m10) || m10 < 30 || m10 > 100) e.marks10 = 'Class 10 % should be between 30 and 100 (or leave it blank).';
    }
    const subs = [['math', 'Maths'], ['phy', 'Physics'], ['chem', 'Chemistry']];
    const given = subs.filter(([k]) => !blank(f[k]));
    for (const [k, label] of subs) {
      if (blank(f[k])) continue;
      const v = Number(f[k]);
      if (isNaN(v) || v < 0 || v > 100) { e[k] = label + ' mark should be between 0 and 100.'; break; }
    }
    if (!e.math && !e.phy && !e.chem && given.length && given.length < 3) {
      e[given[0][0]] = 'Enter Maths, Physics and Chemistry together (or leave all three blank).';
    }
    setErr(e);
    if (e.name || e.mobile || e.marks || e.marks10 || e.math || e.phy || e.chem) return;
    setBusy(true);
    Promise.resolve(onSave({
      ...f, name: f.name.trim(), mobile: f.mobile.replace(/\D/g, ''), marks: m,
      marks10: numOrNull(f.marks10), town: (f.town || '').trim(),
      math: numOrNull(f.math), phy: numOrNull(f.phy), chem: numOrNull(f.chem),
    })).finally(() => setBusy(false));
  }

  const field = (key, label, input, hint) => (
    <div className={'pf__f' + chg(key)}>
      <label htmlFor={'pf' + key}>{label}</label>
      {input}
      {err[key] ? <em className="pf__err" role="alert">{err[key]}</em> : (hint ? <em className="pf__hint">{hint}</em> : null)}
    </div>
  );

  return (
    <div className="pform">
      <Sec icon={I.user} title="About you">
        <div className="pf">
          {field('name', 'Full name',
            <input id="pfname" type="text" autoComplete="name" value={f.name} onChange={(e) => upd('name', e.target.value)} />)}
          {field('mobile', 'Mobile number',
            <span className="pf__pre"><b>+91</b><input id="pfmobile" type="tel" inputMode="numeric" maxLength={10} value={f.mobile} onChange={(e) => upd('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} /></span>)}
          {field('town', 'Your location — town / city',
            <input id="pftown" type="text" placeholder="e.g. Tiruppur, Coimbatore, Salem" value={f.town} onChange={(e) => upd('town', e.target.value)} />,
            'Used to show how far each campus is from home, and to sort colleges for you')}
        </div>
      </Sec>

      <Sec icon={I.cap} title="Academic">
        <div className="pf">
          {field('marks', 'Class 12 percentage',
            <span className="pf__pre"><input id="pfmarks" type="number" min="30" max="100" step="0.1" inputMode="decimal" value={f.marks} onChange={(e) => upd('marks', e.target.value)} /><b>%</b></span>,
            'Decides your eligibility and cut-off match')}
          {field('marks10', 'Class 10 percentage (optional)',
            <span className="pf__pre"><input id="pfmarks10" type="number" min="30" max="100" step="0.1" inputMode="decimal" value={f.marks10 || ''} onChange={(e) => upd('marks10', e.target.value)} /><b>%</b></span>,
            'Used only to break ties between close colleges')}
        </div>
        <div className={'pf__row pf__row--subs' + chg('math')}>
          <span className="pf__lab">Subject marks (out of 100)</span>
          <span className="pf__subs">
            {[['math', 'Maths'], ['phy', 'Physics'], ['chem', 'Chemistry']].map(([k, label]) => (
              <label className="pf__sub" key={k}>
                <span>{label}</span>
                <input id={'pf' + k} type="number" min="0" max="100" step="0.5" inputMode="decimal"
                  placeholder="—" value={f[k] === null || f[k] === undefined ? '' : f[k]}
                  onChange={(e) => upd(k, e.target.value.replace(/[^\d.]/g, ''))} />
                {err[k] && <em className="pf__err" role="alert">{err[k]}</em>}
              </label>
            ))}
            <span className="pf__cut">
              <b>{cut === null ? '—' : cut.toFixed(1)}</b>
              <span>cutoff / 200</span>
            </span>
          </span>
          <em className="pf__hint">Maths + Physics/2 + Chemistry/2 — this is your TNEA cutoff, and it
            decides the High / Borderline / Tough badge on every branch.</em>
        </div>
        <div className={'pf__row' + chg('stream')}>
          <span className="pf__lab">Stream</span>
          <span className="chips">{STREAMS.map((x) => <Chip key={x} on={f.stream === x} onClick={() => upd('stream', x)}>{x}</Chip>)}</span>
        </div>
        <div className={'pf__row' + chg('want')}>
          <span className="pf__lab">Course wanted</span>
          <span className="chips">{WANT.map((x) => <Chip key={x} on={f.want === x} onClick={() => upd('want', x)}>{x}</Chip>)}</span>
        </div>
        {f.want !== NOT_SURE && (
          <div className={'pf__row' + chg('degree')}>
            <span className="pf__lab">Degree</span>
            <span className="chips">{degreesFor(f.want).map((x) => <Chip key={x} on={f.degree === x} onClick={() => upd('degree', x)}>{x}</Chip>)}</span>
          </div>
        )}
      </Sec>

      <Sec icon={I.home} title="Stay & travel">
        <div className={'pf__row' + chg('stay')}>
          <span className="pf__lab">Stay</span>
          <span className="chips">{STAY.map((x) => <Chip key={x} on={f.stay === x} onClick={() => upd('stay', x)}>{x}</Chip>)}</span>
        </div>
        {f.stay === 'Hostel needed' && (
          <div className={'pf__row' + chg('hostelType')}>
            <span className="pf__lab">Hostel type</span>
            <span className="chips">{HOSTELTYPE.map((x) => <Chip key={x} on={f.hostelType === x} onClick={() => upd('hostelType', x)}>{x}</Chip>)}</span>
          </div>
        )}
        <div className={'pf__row' + chg('travel')}>
          <span className="pf__lab">Travel</span>
          <span className="chips">{TRAVEL.map((x) => <Chip key={x} on={f.travel === x} onClick={() => upd('travel', x)}>{x}</Chip>)}</span>
        </div>
      </Sec>

      {setup && (
        <label className="pf__consent">
          <input type="checkbox" checked={!!f.consent} onChange={(e) => upd('consent', e.target.checked)} />
          <span>I agree that CampusConnect may store these details on the server to build my
            college list and lead reports (DPDP consent). Passwords are stored hashed; my photo
            and details are never shown to other students.</span>
        </label>
      )}

      <div className="pbar">
        <button className="btn btn--gold" type="button" onClick={submit} disabled={busy}>
          {busy ? 'Saving…' : saveLabel}
        </button>
        {!setup && <button className="btn btn--ghost" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}
