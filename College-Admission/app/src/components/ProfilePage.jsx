/* My Profile — one page, three modes (the agreed redesign):
   · VIEW  — grouped, grid-laid sections read back from the server record
   · EDIT  — the same page switches to inline editing (light theme, sticky bar)
   · SETUP — first-login fill (exported as <ProfileSetup/>), same form component
   No dark modal anywhere; one shared ProfileForm keeps fill/view/edit consistent. */
import { useEffect, useState } from 'react';
import { cc, set, toast, useCC } from '../store.js';
import {
  studentColleges, eligFor, fitScore, initials, fmtLong, nextAdmissionDate, collegeById, ANY_DEGREE,
  nearYou, matchPct, cutoffOf,
} from '../core.js';
import CutoffCard from './CutoffCard.jsx';
import { api } from '../api.js';
import ProfileForm from './ProfileForm.jsx';

const pctOf = (s) => Math.max(35, Math.min(98, Math.round(96 - s * 18)));

const snap = () => ({
  name: cc.user?.name || '', mobile: cc.user?.mobile || '',
  marks: cc.marks === null || cc.marks === undefined ? '' : String(cc.marks),
  marks10: cc.marks10 === null || cc.marks10 === undefined ? '' : String(cc.marks10),
  stream: cc.stuStream, want: cc.stuWant, degree: cc.stuDegree || ANY_DEGREE,
  stay: cc.stuStay, hostelType: cc.stuHostelType, travel: cc.stuTravel,
  town: cc.stuTown || '', consent: true,
});

function applyToStore(f) {
  Object.assign(cc, {
    user: { ...cc.user, name: f.name, mobile: f.mobile, savedServer: true },
    marks: f.marks, marks10: (f.marks10 === '' || f.marks10 === null || f.marks10 === undefined) ? null : Number(f.marks10),
    stuStream: f.stream, stuWant: f.want, stuDegree: f.degree,
    stuStay: f.stay, stuHostelType: f.hostelType, stuTravel: f.travel, stuTown: f.town,
  });
  set({});
}

export default function ProfilePage() {
  useCC();
  const [rec, setRec] = useState(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    api.me().then((d) => { if (d && d.student) setRec(d.student); }).catch(() => {});
  }, []);

  const u = cc.user || {};
  const all = studentColleges();
  const eligCount = all.filter((c) => eligFor(c).rank === 0).length;
  const top = all.map((c) => ({ c, s: fitScore(c) })).sort((a, b) => a.s - b.s).slice(0, 3);
  const savedNames = cc.saved.map((id) => (collegeById(id) || {}).shortName).filter(Boolean);
  let next = null;
  all.forEach((c) => {
    const n = nextAdmissionDate(c.admission);
    if (n && (!next || String(n.date) < String(next.date))) next = n;
  });

  function saveEdit(data) {
    return api.updateStudent(data).then(() => {
      applyToStore(data);
      setEditing(false);
      toast('Saved — your profile is updated ✅');
    }).catch(() => toast('Could not save right now. Try again?'));
  }

  const v = (x, d) => (x === null || x === undefined || x === '' ? (d || '—') : x);
  const groups = [
    ['About you', [
      ['Name', v(u.name)],
      ['Email id (login)', v(u.email)],
      ['Mobile', u.mobile ? '+91 ' + u.mobile : '—'],
      ['Location', v(cc.stuTown)],
      ['Travel to campus', nearYou(all[0]) ? nearYou(all[0]).label + ' — ' + nearYou(all[0]).note : 'Add your town to see this'],
    ]],
    ['Academic', [
      ['Class 12 %', cc.marks === null || cc.marks === undefined ? '—' : cc.marks + '%'],
      ['Class 10 %', cc.marks10 === null || cc.marks10 === undefined ? 'Not added' : cc.marks10 + '%'],
      ['Maths / Physics / Chemistry',
        (cc.stuMath === null || cc.stuMath === undefined) ? 'Not added'
          : cc.stuMath + ' / ' + cc.stuPhy + ' / ' + cc.stuChem],
      ['TNEA cutoff', cutoffOf(cc.stuPhy, cc.stuChem, cc.stuMath) === null
        ? 'Add your subject marks'
        : cutoffOf(cc.stuPhy, cc.stuChem, cc.stuMath).toFixed(1) + ' / 200'],
      ['Stream', v(cc.stuStream)],
      ['Course wanted', v(cc.stuWant)],
      ['Degree', v(cc.stuDegree)],
    ]],
    ['Stay & travel', [
      ['Stay', (cc.stuStay || '—') + (cc.stuStay === 'Hostel needed' && cc.stuHostelType ? ' · ' + cc.stuHostelType : '')],
      ['Travel', v(cc.stuTravel)],
      ['Consent', rec ? (rec.consent === 'true' ? 'Given (DPDP) ✓' : 'Not given')
        : (cc.user?.savedServer ? 'Given (DPDP) ✓' : '—')],
    ]],
  ];

  return (
    <div className="wrap prof" style={{ paddingTop: 20, paddingBottom: 46 }}>
      <section className="prof__head">
        <span className="prof__pic">
          {u.photo
            ? <img className="avatar avatar--xl" src={u.photo} alt="Your profile" />
            : <span className="avatar avatar--xl">{initials(u.name || 'SS')}</span>}
          {u.savedServer && (
            <span className="stu__tick" title="All done — profile saved on server">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
            </span>
          )}
        </span>
        <div className="prof__hello">
          <h1>Hi {String(u.name || 'Student').split(/\s+/)[0]} 👋</h1>
          <p>CampusConnect welcomes you — choose your college and shine your future.
            {' '}This profile was created from the details you filled.</p>
        </div>
        <div className="prof__meta">
          <b>{rec && rec.created ? 'Member since ' + fmtLong(String(rec.created).slice(0, 10)) : 'Your profile'}</b>
          <span>{u.savedServer ? 'Profile saved on the server ✓' : 'Saved on this device'}</span>
        </div>
      </section>

      <div className="prof__grid">
        <section className="card prof__card">
          <h3><span className="dot" />Your details
            {!editing && (
              <button className="card__edit" type="button" onClick={() => setEditing(true)} title="Edit your details" aria-label="Edit your details">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4.5-.9L19.6 8a2.1 2.1 0 0 0-3-3L5.5 16.1Z" /><path d="m14.5 6.5 3 3" /></svg>
              </button>
            )}
          </h3>
          {editing ? (
            <ProfileForm initial={snap()} mode="edit" saveLabel="Save changes"
              onSave={saveEdit} onCancel={() => setEditing(false)} />
          ) : (
            <div className="psecs">
              {groups.map(([title, rows]) => (
                <section className="psec" key={title}>
                  <h4>{title}</h4>
                  <dl className="pgrid">
                    {rows.map(([k, val]) => (
                      <div key={k}><dt>{k}</dt><dd>{val}</dd></div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          )}
        </section>

        <div className="prof__side">
          <section className="card prof__card">
            <h3><span className="dot" />Your match</h3>
            <div className="prof__stat">
              <div><b>{all.length}</b><span>Colleges for you</span></div>
              <div><b>{eligCount}</b><span>Eligible</span></div>
              <div><b>{cc.saved.length}</b><span>Saved</span></div>
            </div>
            <div className="prof__fits">
              {top.map(({ c, s }) => (
                <div className="prof__fit" key={c.id}>
                  <b>{c.name}</b>
                  <span className="prof__bar"><i style={{ width: pctOf(s) + '%' }} /></span>
                  <em>{pctOf(s)}%</em>
                </div>
              ))}
            </div>
          </section>

          <section className="card prof__card">
            <h3><span className="dot" />Your TNEA cutoff</h3>
            <CutoffCard compact />
          </section>

          <section className="card prof__card">
            <h3><span className="dot" />Right now</h3>
            <div className="prof__tags">
              {savedNames.length
                ? <span className="tag tag--gold">Saved: {savedNames.join(' · ')}</span>
                : <span className="tag">No saved colleges yet</span>}
              {next && <span className="tag">Next: {next.label}</span>}
              <span className="tag">Filled once · edit with the pencil</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* first-login fill — same form, setup mode: welcome header + consent + CTA */
export function ProfileSetup({ onDone }) {
  function save(data) {
    return api.updateStudent({ ...data, consent: data.consent ? 'true' : 'false' }).then((res) => {
      const s = res.student || {};
      applyToStore(data);
      Object.assign(cc, { onboarding: false, user: { ...cc.user, name: s.name || data.name, mobile: s.mobile || data.mobile } });
      set({});
      toast('Saved on the server — here are the colleges that fit your ' + data.marks + '%');
      if (onDone) onDone();
    }).catch((e) => { toast(e.message || 'Could not save right now. Try again?'); });
  }

  return (
    <section className="view active" id="view-setup">
      <div className="wrap psetup">
        <div className="card">
          <h2>Your details, once</h2>
          <p className="psetup__sub">Saved on the server (not just this browser), so your profile
            follows you and the colleges that fit you pop up straight away.</p>
          <ProfileForm initial={snap()} mode="setup" saveLabel="Save & see my colleges" onSave={save} />
        </div>
      </div>
    </section>
  );
}
