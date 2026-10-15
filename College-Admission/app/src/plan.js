/* =============================================================================
   The shortlist plan — application stage, document checklist, reminders.
   The student's bookkeeping is part of the student record (track / checklist /
   remind), so it is saved on the server and mirrored on the device for offline.
   ========================================================================== */
import { cc, set } from './store.js';
import { api } from './api.js';

const key = () => 'cc_plan_v1:' + ((cc.user && cc.user.email) || '');

const encTrack = (t) => JSON.stringify(t || {});
const decTrack = (s) => {
  try {
    const o = typeof s === 'string' ? JSON.parse(s || '{}') : (s || {});
    return o && typeof o === 'object' ? o : {};
  } catch (e) { return {}; }
};
const listOf = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

function push(patch) {
  set(patch);
  const body = {
    track: encTrack(cc.track),
    checklist: cc.checklist.join(','),
    remind: cc.remind.join(','),
  };
  try { localStorage.setItem(key(), JSON.stringify(body)); } catch (e) {}
  api.updateStudent(body).catch(() => {});
}

/* the server record wins; the device copy covers an offline session */
export function hydratePlan(student) {
  const has = student && (student.track || student.checklist || student.remind);
  if (has) {
    set({ track: decTrack(student.track), checklist: listOf(student.checklist), remind: listOf(student.remind) });
    return;
  }
  try {
    const raw = JSON.parse(localStorage.getItem(key()) || 'null');
    if (raw) set({ track: decTrack(raw.track), checklist: listOf(raw.checklist), remind: listOf(raw.remind) });
  } catch (e) {}
}

export function setStage(cid, stage) {
  push({ track: { ...(cc.track || {}), [cid]: stage } });
}

export function toggleDoc(id) {
  const next = cc.checklist.slice();
  const i = next.indexOf(id);
  if (i >= 0) next.splice(i, 1); else next.push(id);
  push({ checklist: next });
}

export function toggleRemind(cid) {
  const next = cc.remind.slice();
  const i = next.indexOf(cid);
  if (i >= 0) next.splice(i, 1); else next.push(cid);
  push({ remind: next });
}

/* removing a college from the shortlist also drops its stage and reminder */
export function forgetCollege(cid) {
  const t = { ...(cc.track || {}) };
  delete t[cid];
  push({ track: t, remind: cc.remind.filter((x) => x !== cid) });
}
