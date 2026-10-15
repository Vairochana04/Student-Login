// ---------------- checks ----------------
const R = [];
const __css = (await import('node:fs')).readFileSync('/home/user/College-Admission/psg-compass/index.html', 'utf8');
const scriptSrc = (await import('node:fs')).readFileSync('/home/user/College-Admission/psg-compass/index.html', 'utf8');
const bad = (h, where) => ['undefined', 'NaN', '[object Object]'].forEach(w => { if (String(h).includes(w)) R.push(where + ' contains "' + w + '"'); });
const appEl = document.getElementById('app');
const tick = (ms) => new Promise(r => setTimeout(r, ms || 5));

/* ---------------- fake backend ---------------- */
let back = { login: { ok: true, created: false, profile: null }, save: null, mode: 'ok' };
globalThis.fetch = function (url, opts) {
  if (back.mode === 'down') return Promise.reject(new Error('no server'));
  const body = JSON.parse(opts.body);
  if (url === '/api/login') return Promise.resolve({ ok: true, json: async () => back.login });
  if (url === '/api/save') return Promise.resolve({ ok: true, json: async () => (back.save || { ok: true, profile: body.profile }) });
  return Promise.reject(new Error('bad url ' + url));
};

/* ---------------- 1. login of a student who already filled details -------------- */
back.login = { ok: true, created: false, profile: { name: 'Aarav S.', phone: '9876543210', marks10: '94.9', marks12: '95', town: 'Peelamedu, Coimbatore', stay: 'Day scholar', travel: 'College bus', hostelType: '' } };
document.getElementById('em').value = 'student@demo.edu';
document.getElementById('pw').value = 'student123';
__listeners['submit'][0]({ target: { id: 'loginForm' }, preventDefault() {} });
await tick();
if (S.view !== 'list') R.push('login with a filled profile should go straight to the list (view=' + S.view + ')');
if (!appEl.innerHTML.includes('Aarav S.')) R.push('profile name missing on the list page');
if (!/Sorted by your chance and your place/.test(appEl.innerHTML)) R.push('chance-sorted heading missing');
if (/Sorted by your chance \(cutoff/.test(appEl.innerHTML)) R.push('heading should not show the cutoff any more');
if (/pstrip/.test(appEl.innerHTML)) R.push('profile strip should be gone from the list page');
// groups page first, then the PSG group page for the chance sort
if (!/Two groups, in one list/.test(appEl.innerHTML)) R.push('groups page heading missing');
if (COLLEGES.some(c => appEl.innerHTML.includes(esc(c.name)))) R.push('colleges should not be listed on the groups page');
const tap = (attr, val) => ({ hasAttribute: a => a === attr, getAttribute: a => (a === attr ? val : null) });
__listeners['click'][0]({ target: { closest: () => tap('data-grp', 'psg') }, stopPropagation() {} });
if (S.grp !== 'psg') R.push('tapping the PSG card did not open the group (grp=' + S.grp + ')');
const psgHTML = appEl.innerHTML;
const iTechAt = psgHTML.indexOf('data-open="psgitech"');
const techAt = psgHTML.indexOf('data-open="psg"');
if (iTechAt < 0 || techAt < 0 || iTechAt > techAt) R.push('PSG group is not sorted by chance');
if (!/Near your place/.test(psgHTML)) R.push('near-your-place tag missing for a Peelamedu student');
if (!/pill--mid/.test(psgHTML)) R.push('chance bands missing');
__listeners['click'][0]({ target: { id: 'allGroups' }, stopPropagation() {} });
if (S.grp !== null) R.push('back to the groups page failed')

/* ---------------- 2. new email -> details form ---------------- */
back.login = { ok: true, created: true, profile: null };
document.getElementById('em').value = 'karthik@test.edu';
document.getElementById('pw').value = 'karthik123';
__listeners['submit'][0]({ target: { id: 'loginForm' }, preventDefault() {} });
await tick();
if (S.view !== 'details') R.push('new student should land on the details form');
const form = appEl.innerHTML;
['f_name', 'f_phone', 'f_marks10', 'f_marks12', 'f_town', 'data-stay="Day scholar"', 'data-stay="Hostel"', 'saveProfile'].forEach(k => {
  if (!form.includes(k)) R.push('details form missing ' + k);
});
['f_phy', 'f_chem', 'f_math', 'Physics (100)', 'Maths (100)'].forEach(k => {
  if (form.includes(k)) R.push('subject-wise boxes should be gone: ' + k);
});
if (!/Class 12 marks \(%\)/.test(form)) R.push('12th percentage field missing');
if (/cutNow|TNEA cutoff/.test(form)) R.push('cutoff line should be gone from the form');
if (/data-travel=/.test(form)) R.push('travel options should appear only after picking Day scholar');

/* ---------------- 3. validation blocks a bad save ---------------- */
__listeners['click'][0]({ target: { id: 'saveProfile' }, stopPropagation() {} });
await tick();
if (S.view !== 'details') R.push('invalid form should stay on the details step');
if (!/10-digit mobile number/.test(appEl.innerHTML)) R.push('phone validation message missing');

/* ---------------- 4. day scholar + travel, hostel switch ---------------- */
const segEl = (attr, val) => ({ hasAttribute: a => a === attr, getAttribute: a => (a === attr ? val : null) });
__listeners['click'][0]({ target: { closest: () => segEl('data-stay', 'Day scholar') }, stopPropagation() {} });
if (!/data-travel=/.test(appEl.innerHTML)) R.push('travel options missing for a day scholar');
__listeners['click'][0]({ target: { closest: () => segEl('data-travel', 'College bus') }, stopPropagation() {} });
if (!/seg__b on"[^>]*>College bus/.test(appEl.innerHTML) && !/College bus<\/button>/.test(appEl.innerHTML)) R.push('travel choice not kept');
__listeners['click'][0]({ target: { closest: () => segEl('data-stay', 'Hostel') }, stopPropagation() {} });
if (!/data-hostel="Boys hostel"/.test(appEl.innerHTML)) R.push('hostel type missing once Hostel is picked');
if (/data-travel=/.test(appEl.innerHTML)) R.push('travel options should hide when Hostel is picked');
__listeners['click'][0]({ target: { closest: () => segEl('data-hostel', 'Girls hostel') }, stopPropagation() {} });

/* ---------------- 5. a good save -> backend + colleges ---------------- */
document.getElementById('f_name').value = 'Karthik R.';
document.getElementById('f_phone').value = '9876501234';
document.getElementById('f_marks10').value = '94.9';
document.getElementById('f_marks12').value = '95';
document.getElementById('f_town').value = 'Erode';
__listeners['input'][0]({ target: { id: 'f_marks12' } });
document.getElementById('f_marks12').value = '101';
__listeners['input'][0]({ target: { id: 'f_marks12' } });
__listeners['click'][0]({ target: { id: 'saveProfile' }, stopPropagation() {} });
if (/0 \u2013 100 madhiri podunga/.test(appEl.innerHTML) === false) R.push('12th % range validation missing');
document.getElementById('f_marks12').value = '95';
__listeners['input'][0]({ target: { id: 'f_marks12' } });
__listeners['click'][0]({ target: { id: 'saveProfile' }, stopPropagation() {} });
await tick();
if (S.view !== 'list') R.push('save should move to the colleges list (view=' + S.view + ')');
if (!S.profile || S.profile.stay !== 'Hostel' || S.profile.hostelType !== 'Girls hostel') R.push('hostel details not kept');
if (S.profile.travel) R.push('travel must be cleared for a hosteller');
if (!Object.keys(localStorage._s).includes('pcc_profile')) R.push('profile not kept for the next visit');
if (S.offline) R.push('a successful backend save must not flag offline');

/* ---------------- 6. later / edit details / sign out ---------------- */
__listeners['click'][0]({ target: { id: 'editProfile' }, stopPropagation() {} });
if (S.view !== 'details') R.push('Edit details should open the form again');
if (!appEl.innerHTML.includes('value="Karthik R."')) R.push('edit form should be pre-filled');
__listeners['click'][0]({ target: { id: 'skipProfile' }, stopPropagation() {} });
if (S.view !== 'list') R.push('Later should return to the list');
__listeners['click'][0]({ target: { id: 'signout2' }, stopPropagation() {} });
if (S.view !== 'login' || S.profile) R.push('sign out should clear the session');

/* ---------------- 7. offline mode still works ---------------- */
back.mode = 'down';
localStorage.setItem('pcc_profile', JSON.stringify({ name: 'Offline Student', phone: '9876500000', marks10: '90', marks12: '90', town: 'Coimbatore', stay: 'Day scholar', travel: 'Own vehicle', hostelType: '' }));
document.getElementById('em').value = 'offline@test.edu';
document.getElementById('pw').value = 'offline123';
__listeners['submit'][0]({ target: { id: 'loginForm' }, preventDefault() {} });
await tick();
if (S.view !== 'list') R.push('offline login with a saved profile should reach the list');
if (!S.offline) R.push('offline flag not set');
if (!/this device la mattum save/.test(appEl.innerHTML)) R.push('offline notice missing');
back.mode = 'ok';

/* ---------------- 8. everything else still stands ---------------- */
back.login = { ok: true, created: false, profile: { name: 'Aarav S.', marks12: '95', town: 'Coimbatore' } };
S.profile = back.login.profile; S.user = { email: 'student@demo.edu', pw: 'student123', name: 'Aarav S.' }; S.view = 'list'; S.offline = false; render();
S.grp = null; S.q = ''; S.savedOnly = false; render();
__listeners['click'][0]({ target: { closest: () => tap('data-grp', 'psg') }, stopPropagation() {} });
let shown = COLLEGES.filter(c => appEl.innerHTML.includes(esc(c.name))).length;
if (shown !== inGrp('psg').length) R.push('PSG group page shows ' + shown + ' campuses, expected ' + inGrp('psg').length);
__listeners['click'][0]({ target: { id: 'allGroups' }, stopPropagation() {} });
__listeners['click'][0]({ target: { closest: () => tap('data-grp', 'karpagam') }, stopPropagation() {} });
shown = COLLEGES.filter(c => appEl.innerHTML.includes(esc(c.name))).length;
if (shown !== inGrp('karpagam').length) R.push('Karpagam group page shows ' + shown + ' campuses, expected ' + inGrp('karpagam').length);
if (!/Karpagam Faculty of Medical Sciences/.test(appEl.innerHTML)) R.push('Karpagam Medical missing from its group page');
__listeners['click'][0]({ target: { id: 'allGroups' }, stopPropagation() {} });
if (!/Two groups, in one list/.test(appEl.innerHTML)) R.push('did not return to the groups page');
__listeners['input'][0]({ target: { id: 'q', value: 'nursing' } });
if (!/PSG College of Nursing/.test(appEl.innerHTML)) R.push('search misses the PSG nursing campus');
if (!/Karpagam College of Nursing/.test(appEl.innerHTML)) R.push('search misses the Karpagam nursing campus');
__listeners['input'][0]({ target: { id: 'q', value: '' } });
if (!/Two groups, in one list/.test(appEl.innerHTML)) R.push('clearing the search should return to the groups page');
S.saved = [COLLEGES[0].id, COLLEGES[3].id]; render();
if (!appEl.innerHTML.includes('cnt">2<')) R.push('saved chip broken');
S.saved = []; render();

const tabs = [['overview', tabOverview], ['courses', tabCourses], ['placements', tabPlacements], ['location', tabLocation], ['reviews', tabReviews], ['qa', tabQA]];
let renders = 0;
COLLEGES.forEach(c => {
  bad(viewDetail(c), 'DETAIL ' + c.id);
  tabs.forEach(([n, fn]) => { const h = fn(c); if (!h || h.length < 200) R.push(c.id + '/' + n + ' thin'); bad(h, c.id + '/' + n); renders++; });
  if (!LOC[c.id] || !LOC[c.id].addr) R.push(c.id + ': no location data');
  if (!/mq__track/.test(tabPlacements(c))) R.push(c.id + ': recruiter strip missing');
  if (c.recruiters.length >= 3 && !/mq__track/.test(tabOverview(c))) R.push(c.id + ': overview recruiter strip missing');
  if (/pill--fee/.test(tabOverview(c))) R.push(c.id + ': old pill row still in the overview');
  if (/Bosch|TCS|Zoho|Deloitte|Infosys|Wipro/.test(c.recruiters.join(' '))) {
    const rec = tabPlacements(c);
    if (!/s2\/favicons\?domain=/.test(rec)) R.push(c.id + ': brand logos missing from the strip');
    if (!/logoFallback\(this\)/.test(rec)) R.push(c.id + ': logo fallback missing');
    const first = c.recruiters.find(r => /Bosch|TCS|Zoho/.test(r));
    if (first && rec.split(first).length - 1 < 2) R.push(c.id + ': marquee does not repeat the track (' + first + ')');
  }
});
['ALL', 'UG', 'PG'].forEach(l => { S.lvl = l; COLLEGES.forEach(c => bad(tabCourses(c), 'COURSES ' + c.id + '/' + l)); });
S.lvl = 'ALL';

const QUESTIONS = ['fees evlo?', 'hostel irukka?', 'CSE cutoff?', 'placement epdi?', 'documents enna venum?', 'which college for MBA?', 'PSG la evlo campus?', 'best CSE campus?', 'address kudu', 'random zzz'];
[COLLEGES[0], COLLEGES[4], COLLEGES[9]].forEach(c => QUESTIONS.forEach(q => {
  const a = botAnswer(c, q);
  if (!a || !a.text || a.text.length < 40) R.push('thin answer: ' + q);
  bad(a.text, 'ANSWER ' + q);
  if (!a.chips || a.chips.length !== 3) R.push('chips missing: ' + q);
}));
if (/askInput|askBtn|qalist|data-qa/.test(scriptSrc)) R.push('removed blocks came back');

if (!/animation:mqRun \d+s linear infinite/.test(__css)) R.push('marquee animation missing');
if (!/icons\.duckduckgo\.com\/ip3/.test(__css)) R.push('second logo source missing');
console.log(R.length ? 'ISSUES (' + R.length + '):\n - ' + R.join('\n - ') : 'HEADLESS RUN: ALL CLEAN');
console.log('stats: colleges=' + COLLEGES.length + ' | tab renders=' + renders + ' | file=' + Math.round(scriptSrc.length / 1024) + 'KB');
