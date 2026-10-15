/* =============================================================================
   My Colleges — the student's own page.
   Saved colleges are compared side by side, each one gets an application stage
   on a five-step tracker, the document checklist is a tick list and the
   upcoming deadlines from the shortlist become reminders.
   ========================================================================== */
import { cc, set, toast, useCC } from '../store.js';
import {
  collegeById, matchPct, nearYou, fmtShort, fmtLong, nextAdmissionDate, esc,
  APP_STAGES, DOC_ITEMS, stageOf, stageLabel, seatsOf, feeRow, placementOf,
  hostelOf, womenOnly, planDeadlines, checklistPct,
} from '../core.js';
import { setStage, toggleDoc, toggleRemind, forgetCollege } from '../plan.js';

const yes = (b) => (b ? 'Yes' : 'No');

export default function MyColleges({ onOpen, onBrowse }) {
  useCC();
  const saved = cc.saved.map(collegeById).filter(Boolean);
  const deadlines = planDeadlines(true).slice(0, 8);
  const docs = cc.checklist;

  if (!saved.length) {
    return (
      <div className="planwrap">
        <header className="planhead">
          <span className="kicker">My Colleges</span>
          <h2>Your shortlist is empty</h2>
          <p>Open any college and tap <b>Save college</b> — it lands here with its fees, distance,
            your match score and a five-step application tracker.</p>
        </header>
        <button type="button" className="btn btn--gold" onClick={onBrowse}>Browse colleges</button>
      </div>
    );
  }

  const rows = [
    ['Your match', (c) => matchPct(c) + '%'],
    ['Distance from home', (c) => { const n = nearYou(c); return n ? n.label : '—'; }],
    ['Tuition · govt quota', (c) => feeRow(c, 0)],
    ['Tuition · management', (c) => feeRow(c, 1)],
    ['UG seats', (c) => { const s = seatsOf(c); return s ? s + ' seats' : '—'; }],
    ['Placement rate', (c) => placementOf(c)],
    ['Hostel', (c) => yes(hostelOf(c))],
    ['Women only', (c) => yes(womenOnly(c))],
    ['Next deadline', (c) => { const n = nextAdmissionDate(c.admission); return n ? fmtShort(n.date) : '—'; }],
    ['Stage', (c) => stageLabel(stageOf(c.id))],
  ];

  const done = docs.length;

  return (
    <div className="planwrap">
      <header className="planhead">
        <span className="kicker">My Colleges</span>
        <h2>{saved.length} college{saved.length === 1 ? '' : 's'} on your shortlist</h2>
        <p>Compare them, move each one along the five-step tracker, tick off the documents and
          keep an eye on the deadlines. Everything here saves to your profile.</p>
      </header>

      {/* ---- side-by-side compare ---- */}
      <section className="plancard">
        <h3>Compare side by side</h3>
        <div className="cmpt__scroll">
          <table className="cmpt">
            <thead>
              <tr>
                <th scope="col">What</th>
                {saved.map((c) => (
                  <th scope="col" key={c.id}>
                    <button type="button" className="cmpt__open" onClick={() => onOpen(c.id)}>{c.shortName || c.name}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, fn]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {saved.map((c) => <td key={c.id}>{fn(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="planfoot">Indicative values for this demo — the college's own admission office is the authority on fees, seats and quota.</p>
      </section>

      {/* ---- the tracker ---- */}
      <section className="plancard">
        <h3>Where each application stands</h3>
        <div className="track">
          {saved.map((c) => {
            const cur = stageOf(c.id);
            const n = nextAdmissionDate(c.admission);
            const near = nearYou(c);
            return (
              <article className="track__row" key={c.id}>
                <div className="track__top">
                  <button type="button" className="track__name" onClick={() => onOpen(c.id)}>{c.name}</button>
                  <span className="track__meta">
                    {matchPct(c)}% match{near ? ' · ' + near.label : ''}{n ? ' · next ' + fmtShort(n.date) : ''}
                  </span>
                </div>
                <div className="track__steps" role="group" aria-label={'Application stage for ' + c.name}>
                  {APP_STAGES.map((s) => (
                    <button key={s.id} type="button" title={s.hint}
                      className={'stp' + (cur === s.id ? ' on' : '') + (cur && APP_STAGES.findIndex((x) => x.id === cur) > APP_STAGES.findIndex((x) => x.id === s.id) ? ' past' : '')}
                      onClick={() => setStage(c.id, s.id)}>
                      <span className="stp__dot" aria-hidden="true" />{s.label}
                    </button>
                  ))}
                </div>
                <div className="track__act">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => onOpen(c.id)}>Open profile</button>
                  <label className="bell" title="Remind me about this college's deadlines">
                    <input type="checkbox" checked={cc.remind.includes(c.id)} onChange={() => toggleRemind(c.id)} />
                    <span aria-hidden="true">{cc.remind.includes(c.id) ? '🔔' : '🔕'}</span> Remind me
                  </label>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => {
                    set({ saved: cc.saved.filter((x) => x !== c.id) });
                    forgetCollege(c.id);
                    toast('Removed from your shortlist');
                  }}>Remove</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="plan2col">
        {/* ---- documents ---- */}
        <section className="plancard">
          <h3>Documents to keep ready <span className="plancount">{done}/{DOC_ITEMS.length}</span></h3>
          <div className="planbar"><i style={{ width: checklistPct() + '%' }} /></div>
          <ul className="tick">
            {DOC_ITEMS.map((d) => (
              <li key={d.id}>
                <label className={docs.includes(d.id) ? 'on' : ''}>
                  <input type="checkbox" checked={docs.includes(d.id)} onChange={() => toggleDoc(d.id)} />
                  <span className="tick__box" aria-hidden="true">{docs.includes(d.id) ? '✓' : ''}</span>
                  {d.label}
                </label>
              </li>
            ))}
          </ul>
          <p className="planfoot">Most colleges ask for originals plus two photocopies at reporting time.</p>
        </section>

        {/* ---- reminders ---- */}
        <section className="plancard">
          <h3>Deadlines coming up</h3>
          {deadlines.length === 0 ? (
            <p className="planfoot">No upcoming dates on your shortlist right now.</p>
          ) : (
            <ul className="remlist">
              {deadlines.map((d) => (
                <li key={d.cid + d.label} className={cc.remind.includes(d.cid) ? 'on' : ''}>
                  <span className={'remlist__days' + (d.days <= 14 ? ' soon' : '')}>
                    {d.days === 0 ? 'Today' : d.days === 1 ? 'Tomorrow' : 'In ' + d.days + ' days'}
                  </span>
                  <span className="remlist__what">
                    <b>{d.label}</b>
                    <em>{d.name} · {fmtLong(d.date)}</em>
                  </span>
                  <button type="button" className={'btn btn--ghost btn--sm' + (cc.remind.includes(d.cid) ? ' on' : '')}
                    onClick={() => toggleRemind(d.cid)}>
                    {cc.remind.includes(d.cid) ? '🔔 On' : '🔕 Off'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="planfoot">Reminders show on your home page and stay with your profile.</p>
        </section>
      </div>
    </div>
  );
}
