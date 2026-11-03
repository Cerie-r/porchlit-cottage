// Going out together, from the front of the house (src/explore-trips.js): she waits at the door, he says 走 (the
// outing act, src/machine-acts.js, when an AI living here asks through the MCP door), and the two of them set off
// into the exploring book (/?explore=book) with an empty basket. Twice a day. The book opens only like this: never
// without him.
import React, {useState} from 'react';
import {Icon} from './icons.jsx';
import {leading} from './words.js';
import {TRIPS_A_DAY, BASKET, cleanExplore, outingNow, tripsOn} from './explore-trips.js';
import {BOOK_TITLE} from './explore-places.js';

// An open book, for the button.
const BookMark = () => <svg className="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M12 6.5c-2-1.5-4.6-2-7.5-1.5v12c2.9-.5 5.5 0 7.5 1.5 2-1.5 4.6-2 7.5-1.5V5c-2.9-.5-5.5 0-7.5 1.5Z"/><path d="M12 6.5v12"/>
</svg>;

// The button in front of the house; it says when he has said 走, or that she's waiting.
export function OutingButton({explore, today, him, onOpen}) {
  const now = outingNow(explore, today);
  return <button className={`outing-hint${now === 'go' ? ' lit' : ''}`} onClick={onOpen}>
    <BookMark/>{now === 'go' ? `${him}说：走！` : now === 'door' ? `在门口等${him}……` : '一起出门'}
  </button>;
}

// living: the AIs living here; name(by): what she calls one of them. onWait, onStop, onGo: async, may throw.
export function OutingPanel({explore, today, him, signedIn, living, name, onWait, onStop, onGo, onClose}) {
  const e = cleanExplore(explore), n = tripsOn(e, today), now = outingNow(e, today);
  const found = Object.values(e.found).reduce((a, b) => a + b, 0);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  // stay: what it does takes her away from the house (走): no more taps once it's gone through.
  const run = (job, stay = false) => async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { await job(); if (!stay) setBusy(false); } catch (err) { setError(err?.message || '没办成，再试一次。'); setBusy(false); }
  };
  let lead, sub = '', main = null, other = null;
  if (!signedIn) lead = `点亮门廊灯（登录）以后，才能和${him}一起出门。`;
  else if (!living.length) lead = `出门要两个人一起。家里还没有住进来的${him}：在门廊灯里发一个入住码给${him}，等${him}搬进来，再约着出门。`;
  else if (now === 'done') lead = `今天已经和${him}出过 ${TRIPS_A_DAY} 趟门了，明天再一起出去。`;
  else if (now === 'go') {
    lead = `${leading(name(e.invite.by))}说：走。`;
    sub = `今天第 ${n + 1} 趟。篮子空着，最多装 ${BASKET} 样回来。`;
    main = <button className="door-primary outing-go" disabled={busy} onClick={run(onGo, true)}>{busy ? '……' : '走'}</button>;
  } else if (now === 'door') {
    lead = `在门口等${him}回一声「走」……`;
    sub = `${him}说了「走」，这里就亮起来。`;
    other = <button disabled={busy} onClick={run(onStop)}>不等了</button>;
  } else {
    lead = `出门要两个人都愿意：你先到门口等着，${him}回一声「走」，就一起出去。`;
    sub = `一天出 ${TRIPS_A_DAY} 趟，一趟篮子装 ${BASKET} 样，捡到的带回家，日记里记一笔。`;
    main = <button className="door-primary" disabled={busy} onClick={run(onWait)}>{busy ? '……' : `在门口等${him}`}</button>;
  }
  return <div className="door-overlay" onPointerDown={ev => ev.stopPropagation()} onWheel={ev => ev.stopPropagation()} onClick={ev => { if (ev.target === ev.currentTarget) onClose(); }}>
    <section className="door-panel outing-panel" role="dialog" aria-modal="true" aria-label="一起出门" onKeyDown={ev => { if (ev.key === 'Escape') onClose(); }}>
      <header><div><span>GOING OUT</span><h2>{BOOK_TITLE}</h2></div><button className="door-close" onClick={onClose} aria-label="回去"><Icon name="close"/></button></header>
      <p className="outing-lead">{lead}</p>
      {sub && <p className="door-hint-line">{sub}</p>}
      {(main || other) && <div className="outing-actions">{main}{other}</div>}
      {error && <p className="door-error" role="alert">{error}</p>}
      <footer className="outing-foot">
        <span>{`今天出过 ${n} 趟${found ? ` · 一共捡回来 ${found} 样` : ''}`}</span>
      </footer>
    </section>
  </div>;
}
