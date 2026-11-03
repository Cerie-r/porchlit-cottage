// The drift bottle on the study computer (src/bottles.js; the sea is server/bottles.mjs): a few words for someone not
// met yet, sealed and thrown into the sea, one a day; and what has been thrown from this home, whether each was found
// (never where). Finding one isn't here: it's the glass bottle by the lake, brought home from a walk.
// sea: {signedIn, thrownToday (as this home knows it), list() → {thrown, wait}, throwBottle({words, requestId})}; wait:
// 'today' (today's is thrown), 'soon' (the last went less than twenty hours ago), or null.
import React, {useContext, useEffect, useRef, useState} from 'react';
import {WORDS_MAX, wordsProblem} from './bottles.js';
import {dayLabel} from './dessert-recipe.js';
import {CalledContext} from './machine-names.js';
import {leading} from './words.js';
import {play} from './sounds.js';
import './bottle-desk.css';

export function BottleDesk({data, patch, sea, icon}) {
  const call = useContext(CalledContext);
  const draft = typeof data.bottleDraft === 'string' ? data.bottleDraft : '';
  const [sent, setSent] = useState({thrown: [], wait: null});
  const [busy, setBusy] = useState(false), [said, setSaid] = useState(''), [error, setError] = useState('');
  // A throw whose answer may have been lost goes again as the same throw, while the words are the same.
  const request = useRef(null);
  const signedIn = !!sea?.signedIn;
  // Thrown here a moment ago stays thrown, whatever an answer on its way says.
  const load = () => sea.list().then(r => setSent(s => ({thrown: r.thrown, wait: s.wait === 'today' ? 'today' : r.wait || null})), () => {});
  useEffect(() => {if (signedIn) load(); else setSent({thrown: [], wait: null});}, [signedIn]);
  const words = draft.trim(), problem = words ? wordsProblem(draft) : null;
  const wait = sea?.thrownToday ? 'today' : sent.wait;
  const toss = async () => {
    if (busy || !words || problem || wait) return;
    setBusy(true); setError(''); setSaid('');
    const req = request.current?.words === words ? request.current : {words, requestId: crypto.randomUUID()};
    request.current = req;
    try {
      await sea.throwBottle(req);
      request.current = null;
      patch({bottleDraft: ''});
      play('note', {volume: .7});
      setSaid('瓶子投出去了。漂到哪一家，就是哪一家的。');
      setSent(s => ({...s, wait: 'today'}));
      load();
    } catch (err) {
      // Not time for another yet: said where the button was.
      if (err?.code === 'already' || err?.code === 'too_soon') {request.current = null; setSent(s => ({...s, wait: err.code === 'already' ? 'today' : 'soon'}));}
      else setError(err?.message || '没投出去，再点一次。');
    } finally {
      setBusy(false);
    }
  };
  return <>
    <div className="desk-app-title"><small>LET THE TIDE CARRY IT</small><h2>写给还不认识的人</h2><p>不填收件人，也不用署名。封好投进海里，它会漂到别人家的湖边。</p></div>
    <div className="bottle-writing">
      {icon}
      <label>瓶中的纸条<textarea value={draft} onChange={e => patch({bottleDraft: e.target.value})} maxLength={WORDS_MAX} rows={7} placeholder="今天路过一棵开花的树，想分一点春天给你。"/></label>
      <small>{[...draft].length}/{WORDS_MAX} · 草稿留在家里</small>
      <div className="bottle-sea">
        {!signedIn ? <p>点亮门廊灯（登录）以后，海路才接通。</p>
          : wait === 'today' ? <p>今天这一只已经投出去了，明天再投一只。草稿先留着。</p>
          : wait ? <p>离上一只还不到二十个小时，晚些再投。草稿先留着。</p>
          : <button className="desk-primary" disabled={busy || !words || !!problem} onClick={toss}>{busy ? '正在封瓶子……' : '封好投向海里'}</button>}
        {problem && <p className="bottle-alert" role="alert">{problem}</p>}
        {error && <p className="bottle-alert" role="alert">{error}</p>}
        {said && <p className="bottle-said" role="status">{said}</p>}
        <p className="bottle-how">捞瓶子不在这里：两个人一起出门去湖边，芦苇丛里、小船边，偶尔漂来一只。带回家，就能拆开。</p>
      </div>
      {sent.thrown.length > 0 && <section className="bottle-thrown" aria-label="投出去的瓶子">
        <h3>投出去的<small>{sent.thrown.length} 只</small></h3>
        <ul>{sent.thrown.map(b => <li key={b.id}>
          <p className="bottle-thrown-head"><span>{dayLabel(b.day)}{b.byMachine && b.by ? ` · ${leading(call(b.by))}投的` : ''}</span><em className={b.found ? 'found' : ''}>{b.found ? '被人捞起来了' : '还在海上漂着'}</em></p>
          <p className="bottle-thrown-words">{b.words}</p>
        </li>)}</ul>
      </section>}
    </div>
  </>;
}
