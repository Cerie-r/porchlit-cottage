// An AI living in the home, as the house sees it (src/machine-acts.js): what it asked to do is fetched while the page
// is open and let in at a quiet moment, then told of on a little card (「<its name>来过」); what it hid waits to be found, with its
// hints one at a time.
import React, {useContext, useEffect, useRef, useState} from 'react';
import {CALL_CHOICES, LIMITS, applyActs, cleanMachine, hintLevels} from './machine-acts.js';
import {CalledContext} from './machine-names.js';
import {leading} from './words.js';
import './machine-visit.css';

// How often an open page asks whether anything is waiting, while someone lives here and the page is in view.
export const LOOK_EVERY = 20000;

// Lets in what the AIs living here asked for. porch: the porch light (src/porch.js), state: its state; home(): the home
// as it is now; commit(next): keeps the home with the acts let in (written here and sent on); quiet: nobody is in the
// middle of arranging things by hand; context(): {day, defaults, available, searching} for applyActs.
// It looks while an AI lives here, or the save's own look has heard that acts wait (an AI that moved in after the page
// opened): every LOOK_EVERY and on coming back to the page. Acts go only into the copy of the home the
// server has: one another device has moved past is brought up to date first, so letting them in never makes the two
// copies quarrel. What can't go in yet is fetched afresh once it can (it may have been taken back meanwhile).
export function useMachineActs({porch, state, home, commit, quiet, context}) {
  const signedIn = !!state.account;
  const watching = signedIn && ((state.residents?.length || 0) > 0 || state.actsWaiting > 0);
  const able = signedIn && ['saved', 'idle', 'dirty'].includes(state.status) && quiet;
  const latest = useRef({});
  latest.current = {able, home, commit, context};
  const running = useRef(false), waiting = useRef(false);
  const look = async () => {
    if (running.current || globalThis.document?.hidden) return;
    running.current = true;
    try {
      const got = await porch.acts();
      const {able, home, commit, context} = latest.current;
      const answered = new Set(cleanMachine(home().machine).acts.map(e => e.key));
      const fresh = got.acts.filter(a => !answered.has(a.key));
      waiting.current = fresh.length > 0;
      if (!fresh.length || !able) return;
      const synced = porch.synced();
      if (!synced || synced.pending || synced.revision !== got.revision || (got.saveId && synced.saveId && got.saveId !== synced.saveId)) {
        porch.look();
        return;
      }
      const {home: next, entries, decor, lights} = applyActs(home(), fresh, {...context(), now: Date.now()});
      waiting.current = false;
      if (entries.length) commit(next, {decor, lights});
    } catch {
      // Not now (offline, signed out): the next look tries again.
    } finally {
      running.current = false;
    }
  };
  useEffect(() => {
    if (!watching) return;
    look();
    const timer = setInterval(look, LOOK_EVERY);
    const seen = () => {
      if (!document.hidden) look();
    };
    document.addEventListener('visibilitychange', seen);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', seen);
    };
  }, [watching]);
  useEffect(() => {
    if (able && waiting.current) look();
  }, [able]);
  useEffect(() => {
    if (!signedIn) waiting.current = false;
  }, [signedIn]);
}

// The AIs among these acts or hidden things, each once ({id, name}).
const peopleOf = bys => [...new Map(bys.filter(b => b?.id).map(b => [b.id, b])).values()];
const what = i => i.kind === 'note' ? '一封信' : '一样东西';

// Who hid it and the hints she has asked for, with a button for the next one.
function Hidden({item, onHint}) {
  const call = useContext(CalledContext);
  const levels = hintLevels(item), asked = Math.min(levels.length, Number.isInteger(item.hid.asked) ? item.hid.asked : 0);
  return <li className="machine-hidden">
    <p>{leading(call(item.hid.by))}藏的{what(item)}</p>
    {asked > 0 && <ol className="machine-hints">{levels.slice(0, asked).map((h, i) => <li key={i}>{h}</li>)}</ol>}
    {asked < levels.length
      ? <button onClick={() => onHint(item.id)}>{asked ? '再要一点提示' : '要一点提示'}</button>
      : <small>提示都在这儿了，去那一格看看。</small>}
  </li>;
}

// What she calls one AI here: one of CALL_CHOICES, its own name, or her own word for it. Asked the first time it comes by;
// after that, only when she wants to change it.
function CallChooser({who, called, onCall}) {
  const [writing, setWriting] = useState(false), [draft, setDraft] = useState('');
  const now = called[who.id] || who.name;
  const choices = [...new Set([...CALL_CHOICES, who.name, ...(called[who.id] ? [called[who.id]] : [])])];
  return <div className="machine-call">
    <span>{called[who.id] ? '怎么叫 TA' : `以后这里怎么叫 ${who.name}？`}</span>
    {choices.map(n => <button key={n} aria-pressed={now === n} onClick={() => onCall(who.id, n === who.name ? '' : n)}>{n}</button>)}
    {writing
      ? <form onSubmit={e => {
        e.preventDefault();
        if (draft.trim()) onCall(who.id, draft);
        setWriting(false);
      }}><input autoFocus aria-label="自己写一个叫法" maxLength={LIMITS.called} value={draft} onChange={e => setDraft(e.target.value)} placeholder="最多八个字"/><button>好</button></form>
      : <button className="machine-call-own" onClick={() => setWriting(true)}>自己写</button>}
  </div>;
}

// The card: what came in since she last looked (entries), and what is still hidden. With no entries it's just the
// hidden things (opened from the little tag in the house). called: what she calls each AI here; onCall(id, name)
// changes it. onOuting: to the front door, where an invitation to go out together waits.
export function MachineVisit({entries = [], hidden = [], called = {}, onCall, onHint, onRead, onOuting, onClose}) {
  const call = useContext(CalledContext);
  const people = peopleOf(entries.length ? entries.map(e => e.by) : hidden.map(i => i.hid.by));
  const who = people.map(call);
  const [renaming, setRenaming] = useState(false);
  const card = useRef();
  useEffect(() => {
    card.current?.focus();
  }, []);
  return <section className="machine-visit" role="dialog" aria-modal="false" aria-labelledby="machine-visit-title" tabIndex={-1} ref={card} onKeyDown={e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }} onPointerDown={e => e.stopPropagation()}>
    <div className="machine-visit-body">
    <p className="machine-visit-eyebrow">{entries.length ? 'someone came by' : 'hidden for you'}</p>
    <h2 id="machine-visit-title">{entries.length ? `${leading(who.join('、'))}来过` : `${leading(who.join('、'))}藏的`}{onCall && people.every(p => called[p.id]) && !renaming && <button className="machine-call-again" onClick={() => setRenaming(true)}>改叫法</button>}</h2>
    {onCall && people.filter(p => !called[p.id] || renaming).map(p => <CallChooser key={p.id} who={p} called={called} onCall={(id, name) => {
      onCall(id, name);
      setRenaming(false);
    }}/>)}
    {entries.length > 0 && <ul className="machine-did">
      {entries.map(e => <li key={e.id}>
        <span>{e.what}</span>
        {/* The button beside its line, the why under both. */}
        {e.tool === 'write' && e.action === 'letter' && e.ref && !hidden.some(i => i.id === e.ref) && <button onClick={() => onRead(e.ref)}>拆开读</button>}
        {e.tool === 'make' && e.ref && !hidden.some(i => i.id === e.ref) && <button onClick={() => onRead(e.ref)}>看看</button>}
        {e.tool === 'outing' && onOuting && <button onClick={onOuting}>去门口</button>}
        {e.note && <q>{e.note}</q>}
      </li>)}
    </ul>}
    {hidden.length > 0 && <>
      <h3>{hidden.length > 1 ? `还藏着 ${hidden.length} 样，等你找` : '还藏着一样，等你找'}</h3>
      <ul className="machine-hidden-list">{hidden.map(i => <Hidden key={i.id} item={i} onHint={onHint}/>)}</ul>
    </>}
    </div>
    <footer><button className="machine-visit-close" onClick={onClose}>知道了</button></footer>
  </section>;
}

// A magnifying glass with a little heart in it: something hidden, waiting.
export const HiddenIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/><path d="M10.5 13.2s-2.4-1.4-2.4-3a1.3 1.3 0 0 1 2.4-.7 1.3 1.3 0 0 1 2.4.7c0 1.6-2.4 3-2.4 3Z"/></svg>;
// Whose the hidden things are, for the tag and the menu, the way she calls them: 「(what she calls it)藏的」.
export const hiddenLabel = (hidden, call = by => by.name) => `${leading([...new Set(peopleOf(hidden.map(i => i.hid.by)).map(call))].join('、'))}藏的`;

// The little tag among the house's buttons while something hidden waits to be found (on a phone it is a line in the
// menu instead, src/main.jsx).
export function HiddenTag({hidden, onOpen}) {
  const call = useContext(CalledContext);
  if (!hidden.length) return null;
  return <button className="hidden-tag" onClick={onOpen} aria-label={`${hiddenLabel(hidden, call)} ${hidden.length} 样，等你找`}>
    <HiddenIcon/><span className="hidden-tag-label">{hiddenLabel(hidden, call)}</span><b>{hidden.length}</b>
  </button>;
}
