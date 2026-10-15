/* =============================================================================
   CampusConnect — API layer for the backend (server/Server.java)
   -----------------------------------------------------------------------------
   Every call returns parsed JSON. `track()` is deliberately fire-and-forget:
   a missing server must never block a student from browsing colleges.

   The backend stores student accounts in server/data/students.json and their
   activity in server/data/student-events.jsonl; the platform admin reads the
   same data through /api/admin/*.
   ============================================================================= */

const TOKEN_KEY = 'cc_token_v1';

function readToken() {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch (e) { return null; }
}
function writeToken(v) {
  try { v ? localStorage.setItem(TOKEN_KEY, JSON.stringify(v)) : localStorage.removeItem(TOKEN_KEY); } catch (e) {}
}

export const session = {
  get() { return readToken(); },
  set(token, info) { writeToken({ token, ...info }); },
  clear() { writeToken(null); },
  token() { const s = readToken(); return s && s.token ? s.token : ''; },
  role() { const s = readToken(); return s && s.role ? s.role : ''; },
};

async function request(path, opts) {
  const res = await fetch(path, opts);
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) {
    const msg = data && data.error ? data.error : ('Request failed (' + res.status + ')');
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data || {};
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const t = session.token();
  if (t) h['X-CC-Token'] = t;
  return h;
}

export const api = {
  /* ---- auth ---- */
  login(email, password) {
    return request('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  },
  registerStudent(details) {
    return request('/api/students/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    });
  },
  me() { return request('/api/students/me', { headers: headers() }); },
  updateStudent(patch) {
    return request('/api/students/update', {
      method: 'POST', headers: headers(), body: JSON.stringify(patch),
    });
  },

  /* ---- activity (fire and forget) ---- */
  track(type, cid, label) {
    if (!session.token()) return;
    fetch('/api/track', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ type, cid: cid || '', label: label || '' }),
    }).catch(() => {});
  },

  /* ---- platform admin ---- */
  adminSummary() { return request('/api/admin/summary', { headers: headers() }); },
  studentsCsvUrl(cid) {
    const base = cid ? '/api/admin/leads.csv?cid=' + encodeURIComponent(cid) : '/api/admin/students.csv';
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(session.token());
  },

  /* ---- dataset ---- */
  colleges() { return request('/api/colleges'); },
};

export default api;
