/* CampusConnect guide bot — rule-based, runs fully on the college dataset.
   No external AI / no server calls: answers come from core.js (eligibility,
   fees, events, hostel, steps), so it works offline and never leaks data. */
import { useEffect, useRef, useState } from 'react';
import { cc } from '../store.js';
import { COLLEGES, eligFor, fitScore, upcomingEvents } from '../core.js';

const CHIPS = ['College suggest pannu', 'Hostel?', 'Fees?', 'Apply epdi?', 'Documents?', 'Events?'];

function topMatches(n) {
  if (cc.marks === null || cc.marks === undefined) return null;
  const elig = COLLEGES.filter((c) => eligFor(c, cc.marks, cc.stuStream).rank === 0)
    .sort((a, b) => fitScore(a) - fitScore(b));
  const list = elig.length ? elig : COLLEGES.slice().sort((a, b) => fitScore(a) - fitScore(b));
  return list.slice(0, n);
}

function botReply(raw) {
  const t = String(raw || '').toLowerCase().replace(/[?!.]/g, '').trim();
  const has = (...ws) => ws.some((w) => t.includes(w));

  if (has('hi', 'hello', 'hey', 'vanakkam', 'namaste'))
    return 'Vanakkam! 👋 Naan CampusConnect guide bot. Colleges, cutoff, hostel, fees, application steps — edhu venum nu keluunga; quick chips-ayum tap pannalam.';

  if (has('hostel', 'vasathi', 'stay', 'room')) {
    const withH = COLLEGES.filter((c) => (c.facilities || []).join(' ').toLowerCase().includes('hostel'));
    return 'Hostel topic! 🏠 ' + (withH.length ? withH.slice(0, 4).map((c) => c.shortName).join(', ') +
      ' — ithilella hostel irukku (boys/girls separate). Details: college page → Campus & facilities. Ungal stay preference-ah My Profile-la set pannunga.'
      : 'College page → Campus & facilities-la hostel details irukum.');
  }

  if (has('fee', 'cost', 'kattanam', 'price'))
    return 'Fees 💰: government/TNEA quota ≈ ₹0.6–1.5 L/year; management quota ≈ ₹1.5–3 L/year; hostel ≈ ₹45k/year (college-ku maatum). Exact table: college page → "Quota & fees" section.';

  if (has('apply', 'application', 'admission epdi', 'how to apply', 'register'))
    return 'Apply steps 📝: 1) TNEA portal-la register (govt quota) / college portal (mgmt quota) · 2) Form + Class 10 & 12 marksheets upload · 3) Counselling / merit process attend · 4) Fee katti originals-oda report. Full steps: college page → Admission & counselling.';

  if (has('document', 'certificate', 'paper', 'originals'))
    return 'Documents 📄: Class 10 & 12 marksheets + passing certificates · Transfer certificate · Community/nativity certificate (if applicable) · Entrance scorecard (if applicable) · 4 passport photos. Originals counselling-ku venum!';

  if (has('event', 'fest', 'symposium', 'open house', 'visit')) {
    const evs = [];
    COLLEGES.forEach((c) => upcomingEvents(c).forEach((e) => evs.push({ c, e })));
    evs.sort((a, b) => String(a.e.date).localeCompare(String(b.e.date)));
    const top = evs.slice(0, 2).map((x) => x.e.title + ' @ ' + x.c.shortName + ' (' + String(x.e.date).slice(0, 10) + ')');
    return 'Upcoming events 🎪: ' + (top.join(' · ') || 'check college page') + '. Full list: college page → Events.';
  }

  if (has('cutoff', 'eligible', 'match', 'chance', 'rank', 'cutoff')) {
    if (cc.marks === null || cc.marks === undefined)
      return 'Ungal Class 12 % therinja dhaan cutoff chance solla mudiyum 🙏 — My Profile → pencil icon-la marks add pannunga.';
    const m = topMatches(3);
    return 'Ungal ' + cc.marks + '% (' + (cc.stuStream || 'stream') + ')-ku: ' +
      (m && m.length ? m.map((c) => c.shortName).join(', ') + ' — strongest match. "Eligible for me" chip-la full list paakalam.'
        : 'colleges-um ungal profile-oda compare panni list kattum.');
  }

  if (has('college', 'suggest', 'recommend', 'which clg', 'kalluri', 'best')) {
    const m = topMatches(3);
    if (!m) return 'Modhalla ungal Class 12 % + stream venum 🙏 — My Profile → pencil icon-la add pannunga; appuram best colleges list kuduven.';
    return 'Ungal profile-ku best colleges 🎓: ' + m.map((c) => c.shortName + ' (' + c.city + ')').join(' · ') +
      '. Full list-ku home page; details-ku college-ah touch pannunga.';
  }

  if (has('contact', 'phone', 'call', 'email', 'office'))
    return 'Contact ☎️: each college page → "Help & contact" section-la admissions phone, email, office hours + Google map irukku. College page top-la "Official website" button official site-ku koopittum.';

  if (has('save', 'shortlist'))
    return 'Save pannalam ❤️: college page-la "Save college" button tap pannunga; home-la "Saved" chip-la list irukum.';

  return 'Puriyala 🙏 — colleges / cutoff / hostel / fees / apply / documents / events pathi kekalam. Chips-ah tap pannunga; illa college page → Help & contact / official website try pannunga.';
}

export default function ChatBot({ autoOpen = false }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ who: 'bot', text: 'Hi! Naan CampusConnect guide bot 🤖 — college selection, cutoff, hostel, fees, apply steps… edhu venum?' }]);
  const [val, setVal] = useState('');
  const box = useRef(null);
  const auto = useRef(false);

  /* the login page passes autoOpen: the panel slides in once, shortly after the
     page settles, so a first-time visitor notices the bot exists. Closing it
     keeps it closed - the guard makes sure it never reopens on this mount. */
  useEffect(() => {
    if (!autoOpen || auto.current) return undefined;
    auto.current = true;
    const t = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(t);
  }, [autoOpen]);

  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs, open]);

  function send(text) {
    const q = (text ?? val).trim();
    if (!q) return;
    setVal('');
    setMsgs((m) => m.concat([{ who: 'me', text: q }]));
    setTimeout(() => setMsgs((m) => m.concat([{ who: 'bot', text: botReply(q) }])), 420);
  }

  return (
    <>
      <button type="button" className={'botfab' + (open ? ' hide' : '')} onClick={() => setOpen(true)}
        title="Chat with the guide bot" aria-label="Open chat bot">💬</button>
      {open && (
        <div className="botpanel" role="dialog" aria-label="CampusConnect guide bot">
          <div className="botpanel__head">
            <span className="botpanel__av">🤖</span>
            <div><b>CampusConnect Guide</b><small>online · answers from college data</small></div>
            <button type="button" className="botpanel__x" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>
          <div className="botpanel__msgs" ref={box}>
            {msgs.map((m, i) => <div key={i} className={'botmsg botmsg--' + m.who}>{m.text}</div>)}
          </div>
          <div className="botpanel__chips">
            {CHIPS.map((c) => <button key={c} type="button" onClick={() => send(c)}>{c}</button>)}
          </div>
          <div className="botpanel__in">
            <input value={val} placeholder="Type a question…" onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            <button type="button" className="btn btn--gold btn--sm" onClick={() => send()}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
