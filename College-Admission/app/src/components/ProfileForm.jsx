/* Shared details form — one component, two modes:
   · mode="edit"  → inline editing inside My Profile (no dark modal)
   · mode="setup" → first-login "complete your profile" page
   Light theme, grouped sections, inline validation, sticky action bar. */
import { useState } from 'react';
import {
  STREAMS, WANT, STAY, HOSTELTYPE, TRAVEL, degreesFor, ANY_DEGREE, NOT_SURE, initials,
} from '../core.js';

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

/* ------------------------------------------------------------------ photo ---
   The photo lives on the student record (the same JSON as the rest of the
   profile), so it is scaled down to a small square before it is sent — a full
   phone photo would be several megabytes of base64 in students.json. */
const PHOTO_MAX = 256;
const PHOTO_LIMIT = 8 * 1024 * 1024;

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) {
      return reject(new Error('Please pick an image file (JPG, PNG or WebP).'));
    }
    if (file.size > PHOTO_LIMIT) {
      return reject(new Error('That photo is too big — please pick one under 8 MB.'));
    }
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Could not read that file.'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a usable image.'));
      img.onload = () => {
        try {
          const side = Math.min(img.width, img.height);          /* centre square */
          const c = document.createElement('canvas');
          c.width = c.height = Math.min(PHOTO_MAX, side);
          const ctx = c.getContext('2d');
          ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side,
            0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        } catch (err) {
          reject(new Error('Could not process that photo.'));
        }
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

const blank = (v) => v === '' || v === null || v === undefined;
const numOrNull = (v) => (blank(v) ? null : Number(v));

export default function ProfileForm({ initial, mode, saveLabel, onSave, onCancel }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState('');
  const setup = mode === 'setup';

  const upd = (k, v) => {
    setF((o) => ({ ...o, [k]: v, ...(k === 'want' ? { degree: ANY_DEGREE } : {}) }));
    setErr((e) => (e[k] ? { ...e, [k]: undefined } : e));
    if (k === 'photo') setPhotoErr('');
  };
  const chg = (k) => (!setup && f[k] !== initial[k] ? ' chg' : '');

  /* the student picks a photo — it is scaled down, then kept in the form
     until "Save" puts it on the server together with the rest of the profile */
  async function onPhoto(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    setPhotoErr('');
    try {
      upd('photo', await readPhoto(file));
    } catch (ex) {
      setPhotoErr(ex.message || 'Could not read that photo.');
    } finally {
      setPhotoBusy(false);
    }
  }

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
      photo: f.photo || '',
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
        <div className="pf__photo">
          <span className="pf__pic">
            {f.photo
              ? <img className="avatar avatar--xl" src={f.photo} alt="Your profile photo" />
              : <span className="avatar avatar--xl">{initials(f.name || 'SS')}</span>}
          </span>
          <span className="pf__photoact">
            <b>Profile photo</b>
            <span className="mut">Optional — a small square picture. Only you can see it.</span>
            <span className="pf__photobtns">
              <label className="btn btn--ghost btn--sm">
                {f.photo ? 'Replace photo' : 'Upload photo'}
                <input type="file" accept="image/*" className="pf__file" onChange={onPhoto} />
              </label>
              {f.photo && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => upd('photo', '')}>
                  Remove
                </button>
              )}
            </span>
            {photoBusy && <em className="pf__hint">Processing the photo…</em>}
            {photoErr && <em className="pf__err" role="alert">{photoErr}</em>}
          </span>
        </div>
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
