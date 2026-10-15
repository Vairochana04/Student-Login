import { useLayoutEffect, useReducer } from 'react';
import { flushSync } from 'react-dom';
import { S, college, startPortal } from './portal.js';
import Login from './components/Login.jsx';
import Profile from './components/Profile.jsx';
import CollegeList from './components/CollegeList.jsx';
import CollegePage from './components/CollegePage.jsx';
import './App.css';
let started = false;
export default function App() {
 const [, update] = useReducer(n => n + 1, 0);
 useLayoutEffect(() => {
   if (!started) {
     started = true;
     // Boot after the initial React commit; synchronous updates preserve focus/chat scrolling.
     queueMicrotask(() => startPortal(() => flushSync(() => update())));
   }
 }, []);
 const selected = S.id ? college(S.id) : null;
 return <><div id="app">{S.view === 'login' ? <Login /> : S.view === 'details' ? <Profile /> : S.view === 'detail' && selected ? <CollegePage college={selected} /> : <CollegeList />}</div><div id="toast" className="toast" role="status" /></>;
}
