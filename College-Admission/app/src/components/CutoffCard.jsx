/* =============================================================================
   Your TNEA cutoff
   -----------------------------------------------------------------------------
   cutoff (out of 200) = Maths + Physics/2 + Chemistry/2
   Three optional marks on the student record. With them in, every TNEA branch
   on every college page carries a High / Borderline / Tough badge; without
   them, this card is the one place that asks for them.
   ========================================================================== */
import { useState } from 'react';
import { cc, set, toast } from '../store.js';
import { cutoffOf } from '../core.js';
import { api } from '../api.js';

const str = (v) => (v === null || v === undefined ? '' : String(v));
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

export default function CutoffCard({ compact }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ phy: str(cc.stuPhy), chem: str(cc.stuChem), math: str(cc.stuMath) });

  const cut = cutoffOf(cc.stuPhy, cc.stuChem, cc.stuMath);
  const draft = cutoffOf(num(f.phy), num(f.chem), num(f.math));
  const fill = () => { setF({ phy: str(cc.stuPhy), chem: str(cc.stuChem), math: str(cc.stuMath) }); setOpen(true); };

  function apply() {
    const p = num(f.phy), c = num(f.chem), m = num(f.math);
    const bad = (x) => x !== null && (isNaN(x) || x < 0 || x > 100);
    if (bad(p) || bad(c) || bad(m)) return toast('Each subject mark should be between 0 and 100');
    if (p === null || c === null || m === null) return toast('Enter Maths, Physics and Chemistry to get your cutoff');
    set({ stuPhy: p, stuChem: c, stuMath: m });
    try { localStorage.setItem('cc_cutoff_v1:' + (cc.user?.email || ''), JSON.stringify({ p, c, m })); } catch (e) {}
    api.updateStudent({ phy: p, chem: c, math: m })
      .then(() => toast('Cutoff saved — branch chances updated'))
      .catch(() => toast('Saved on this device only (server not reachable)'));
    setOpen(false);
  }

  if (!open) {
    return (
      <div className={'cutcard' + (compact ? ' cutcard--mini' : '') + (cut === null ? ' cutcard--ask' : '')}>
        <div className="cutcard__l">
          <span className="cutcard__kick">Your TNEA cutoff</span>
          {cut === null ? (
            <p>Add your <b>Maths, Physics and Chemistry</b> marks to see your cutoff — and your chance
              for every branch of every college.</p>
          ) : (
            <>
              <b className="cutcard__big">{cut.toFixed(1)}<em>/ 200</em></b>
              <span className="cutcard__eq">Maths {cc.stuMath} + Physics {cc.stuPhy}/2 + Chemistry {cc.stuChem}/2</span>
            </>
          )}
        </div>
        <button type="button" className={'btn ' + (cut === null ? 'btn--gold' : 'btn--ghost') + ' btn--sm'} onClick={fill}>
          {cut === null ? 'Add subject marks' : 'Edit cutoff'}
        </button>
      </div>
    );
  }

  const field = (key, label) => (
    <label className="cutf">
      <span>{label}</span>
      <input type="number" min="0" max="100" step="0.5" inputMode="decimal" value={f[key]}
        placeholder="—" autoFocus={key === 'phy'}
        onChange={(e) => setF({ ...f, [key]: e.target.value.replace(/[^\d.]/g, '') })} />
    </label>
  );

  return (
    <div className={'cutcard cutcard--form' + (compact ? ' cutcard--mini' : '')}>
      <div className="cutcard__l">
        <span className="cutcard__kick">Your TNEA cutoff</span>
        <p className="cutcard__hint">Each subject is out of 100. Cutoff = Maths + Physics/2 + Chemistry/2.</p>
        <div className="cutcard__row">
          {field('math', 'Maths')}
          {field('phy', 'Physics')}
          {field('chem', 'Chemistry')}
          <div className="cutcard__out">
            <b>{draft === null ? '—' : draft.toFixed(1)}</b>
            <span>cutoff / 200</span>
          </div>
        </div>
        <div className="cutcard__act">
          <button type="button" className="btn btn--gold btn--sm" onClick={apply}>Save cutoff</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
