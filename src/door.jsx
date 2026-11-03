import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Box3, Vector3} from 'three';
import {QuietCanvas} from './quiet-canvas.jsx';
import {PictureStudio} from './picture-studio.jsx';
import {cachedPictures} from './brick-pictures.js';
import {CreationModel} from './workshop.jsx';
import {Icon} from './icons.jsx';
import {porchLook} from './street-layout.js';
import {GIFT_KINDS, NOTE_MAX, bookLine, checkGift, giftable, outgoing, welcome} from './door-gifts.js';
import {dayLabel} from './dessert-recipe.js';
import {leading} from './words.js';
import {play} from './sounds.js';
import './door.css';
import {pendingMail} from './mail-receipts.js';

// The door, from both sides (server/doors.mjs). At someone else's: knocking,
// and leaving one thing from the backpack with a note in their mailbox. At
// one's own: a ribbon box on the step and a letter in the mailbox while
// something is waiting, taking it in or not, and the guestbook.

const KIND_NAMES = {animal: '玩偶', bouquet: '花束', build: '拼搭', dessert: '甜品', photo: '相纸'};
const nameOf = from => from?.nickname || from?.name || '一位邻居';
// A name ending in a letter or digit gets a space before the Chinese that follows it.
const spaced = name => /[A-Za-z0-9]$/.test(name) ? name + ' ' : name;
const called = home => home?.nickname || home?.name || '';

// ---- At someone's door ----

// What this visitor has done at this door today, and doing it. `onLeft`
// takes the thing that went into the mailbox out of the visitor's backpack.
export function useVisit({visiting, porch, accountId, day, onLeft, say}) {
  const [today, setToday] = useState(null), [mailOpen, setMailOpen] = useState(false), [busy, setBusy] = useState(false);
  const sendingNow = useRef(false);
  const [draft, setDraft] = useState(null);
  const open = visiting?.porch === 'on';
  const where = visiting && {street: visiting.street, lot: visiting.lot, day};
  useEffect(() => {
    setToday(null); setMailOpen(false);
    if (!visiting) return;
    try {setDraft(JSON.parse(localStorage.getItem('porchlit-mail-pending:' + accountId + ':' + visiting.street + ':' + visiting.lot)));} catch {setDraft(null);}
    let gone = false;
    porch.door({street: visiting.street, lot: visiting.lot, day}).then(d => {if (!gone) setToday(d);}).catch(() => {if (!gone) setToday({});});
    return () => {gone = true;};
  }, [visiting?.street, visiting?.lot, day, accountId]);
  const knock = useCallback(async () => {
    if (!visiting) return;
    if (!open) return say(visiting.porch === 'dim' ? '主人只留了一盏小灯，就不敲门了。' : '这家现在不接待。');
    if (today?.knocked) return say('今天已经敲过这扇门了。');
    if (busy) return;
    setBusy(true);
    play('knock');
    try {
      await porch.knock(where);
      setToday(t => ({...t, knocked: true}));
      say(`敲了敲门。${spaced(called(visiting))}回家会看到。`);
    } catch (e) {
      if (e.code === 'already') setToday(t => ({...t, knocked: true}));
      say(e.message || '没敲上，过一会儿再试。');
    } finally {
      setBusy(false);
    }
  }, [visiting, open, today, busy, day]);
  const openMail = useCallback(() => {
    if (!visiting) return;
    let pending;
    try {pending=JSON.parse(localStorage.getItem('porchlit-mail-pending:' + accountId + ':' + visiting.street + ':' + visiting.lot));} catch {return say('上一份投递记录读不出来，先别再寄。');}
    if (!open && !pending) return say('这家现在不接待。');
    if (today?.left && !pending) return say('今天已经往这家的邮箱里放过东西了，明天再来。');
    setDraft(pending);setMailOpen(true);
  }, [visiting, open, today, accountId]);
  const leave = useCallback(async ({item, note}) => {
    if (sendingNow.current) return;
    sendingNow.current = true;
    try {
      const {key, request} = pendingMail(localStorage, accountId, `${where.street}:${where.lot}`, {note, item: item ? outgoing(item) : undefined, sourceId: item?.id});
      setDraft(request);
      try { await porch.leaveMail({...where, ...request}); } catch (e) {
        if ([400, 403, 404, 413].includes(e.status) || ['already', 'mailbox_full'].includes(e.code)) {localStorage.removeItem(key);setDraft(null);}
        throw e;
      }
      if (request.sourceId) await onLeft(request.sourceId);
      localStorage.removeItem(key);setDraft(null);
    } finally { sendingNow.current = false; }
    setToday(t => ({...t, left: true}));
    setMailOpen(false);
    play('boxRibbon', {volume: .7});
    say(`放进${/^[A-Za-z0-9]/.test(called(visiting)) ? ' ' : ''}${spaced(called(visiting))}的邮箱了。`);
  }, [visiting, day, onLeft, accountId]);
  return {today, open, knock, openMail, closeMail: () => setMailOpen(false), mailOpen, leave, draft};
}

// The plate at the bottom of someone's door: whose it is, and what can be done.
export function VisitPlate({visiting, visit, onBack, onReport}) {
  const look = porchLook(visiting.porch), t = visit.today || {};
  const [reporting, setReporting] = useState(false), [busy, setBusy] = useState(false), [reported, setReported] = useState(false), [error, setError] = useState('');
  const send = async (reason, words) => {
    setBusy(true);
    setError('');
    try {
      await onReport(reason, words);
      setReporting(false);
      setReported(true);
    } catch (e) {
      setError(e.message || '没办成，再试一次。');
    } finally {
      setBusy(false);
    }
  };
  // Reporting, the plate turns into the question.
  if (reporting) return <div className="visit-plate reporting"><ReportAsk name={nameOf(visiting)} busy={busy} onSend={send} onNo={() => {setReporting(false); setError('');}}/>{error && <span className="visit-said" role="alert">{error}</span>}</div>;
  return <div className="visit-plate">
    <p><strong>{visiting.name}</strong><small>{visiting.nickname ? visiting.nickname + ' · ' : ''}{look.label}</small></p>
    {(visit.open || visit.draft) && <>
      <button disabled={!visit.open} type="button" className={t.knocked ? 'done' : ''} onClick={visit.knock}>{t.knocked ? '敲过门了' : '敲门'}</button>
      <button type="button" className={t.left ? 'done' : ''} onClick={visit.openMail}>{visit.draft ? '确认投递' : t.left ? '放过东西了' : '放点东西'}</button>
    </>}
    <button type="button" onClick={onBack}>回街上</button>
    {reported ? <span className="visit-said" role="status">举报了，也拉黑了。</span> : onReport && <button type="button" className="visit-report" onClick={() => setReporting(true)}>举报</button>}
  </div>;
}

// Putting something into someone's mailbox: one thing from the backpack (or
// none) and a note (or none), one of the two at least.
function MailPanelContent({visiting, items, onLeave, onClose, draft}) {
  const things = useMemo(() => giftable(items), [items]);
  const [chosen, setChosen] = useState(draft?.sourceId ?? null), [note, setNote] = useState(draft?.note || ''), [error, setError] = useState(''), [sending, setSending] = useState(false);
  useEffect(() => {if(draft){setChosen(draft.sourceId ?? null);setNote(draft.note || '');}}, [draft]);
  const thing = draft?.item ? {...draft.item, id: draft.sourceId} : things.find(i => i.id === chosen) || null, words = [...note.trim()].length;
  const send = async () => {
    if (!thing && !note.trim()) return setError('放一样东西，或者写一张纸条。');
    if (words > NOTE_MAX) return setError(`纸条最多 ${NOTE_MAX} 个字。`);
    setSending(true); setError('');
    try {
      await onLeave({item: thing, note: note.trim() || undefined});
    } catch (e) {
      setError(e.message || '没放进去，再试一次。');
      setSending(false);
    }
  };
  return <div className="door-overlay" onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} onClick={e => {if (e.target === e.currentTarget && !sending) onClose();}}>
    <section className="door-panel mail" role="dialog" aria-modal="true" aria-label={`${spaced(called(visiting))}的邮箱`} onKeyDown={e => {if (e.key === 'Escape' && !sending) onClose();}}>
      <header><div><span>A LITTLE SOMETHING</span><h2>{spaced(called(visiting))}的邮箱</h2></div><button className="door-close" onClick={onClose} disabled={sending} aria-label="关上邮箱"><Icon name="close"/></button></header>
      <p className="door-lead">放一样背包里的东西，写一张纸条，或者都放。每天只能给这家放一次；主人回家会决定收不收。</p>
      {draft && <p className="door-hint-line">先确认上一份投递，重试不会再寄一份。</p>}
      <h3>放什么</h3>
      <div className="mail-things">
        <button className={!thing ? 'chosen' : ''} disabled={sending || !!draft} onClick={() => setChosen(null)}>只放纸条<small>不放东西</small></button>
        {things.map(i => <button key={i.id} className={chosen === i.id ? 'chosen' : ''} disabled={sending || !!draft} onClick={() => setChosen(i.id)}>{i.name}<small>{KIND_NAMES[i.kind]}</small></button>)}
      </div>
      {!things.length && <p className="door-hint-line">背包里没有能送的东西（玩偶、花束、拼搭、甜品、相纸）。也可以只写一张纸条。</p>}
      {thing && <p className="door-hint-line">放进去以后，「{thing.name}」就从你的背包里拿走了。</p>}
      <h3>纸条</h3>
      <label className="mail-note"><textarea disabled={sending || !!draft} value={note} maxLength={NOTE_MAX * 2} rows={4} placeholder="写一句话给主人……" onChange={e => {setNote(e.target.value); setError('');}}/><small className={words > NOTE_MAX ? 'over' : ''}>{words} / {NOTE_MAX}</small></label>
      {error && <p className="door-error" role="alert">{error}</p>}
      <footer><button className="door-primary" onClick={send} disabled={sending}>{sending ? '正在放进去……' : draft ? '确认上一份投递' : '放进邮箱'}</button></footer>
    </section>
  </div>;
}

// ---- At one's own door ----

// What is waiting at this home's door, read when the owner comes up to it.
export function useOwnDoor({porch, signedIn, scene}) {
  const [door, setDoor] = useState(null);
  const refresh = useCallback(() => {
    if (!signedIn) {setDoor(null); return Promise.resolve(null);}
    return porch.ownDoor().then(d => {setDoor(d); return d;}).catch(() => null);
  }, [signedIn]);
  useEffect(() => {if (scene === 'exterior') refresh();}, [scene, refresh]);
  useEffect(() => {
    const back = () => {if (!document.hidden && scene === 'exterior') refresh();};
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, [scene, refresh]);
  const waiting = door?.waiting || [];
  return {
    door, refresh,
    letters: waiting.filter(w => w.kind === 'mail').length,
    gifts: waiting.filter(w => w.kind === 'mail' && w.item).length,
    knocks: waiting.filter(w => w.kind === 'knock')
  };
}

// Asked once before blocking someone: what blocking does, in plain words.
function BlockAsk({name, busy, onYes, onNo}) {
  return <div className="door-block-ask" role="group" aria-label={`拉黑${name}`}>
    <p>拉黑以后，{name}在街上看你家只是一块空地，也走不到你门口；放在门口的东西一并不收。</p>
    <div><button className="door-block-yes" disabled={busy} onClick={onYes}>{busy ? '……' : '拉黑'}</button><button disabled={busy} onClick={onNo}>算了</button></div>
  </div>;
}

// Reporting someone: a reason, a few words if wanted, and what it does. It blocks them too.
const REASONS = [['harass', '骚扰'], ['adult', '色情'], ['spam', '广告'], ['other', '别的']];
// A drift bottle (bottle): whose it was isn't known here, and stays so; the bottle is thrown away.
export function ReportAsk({name, busy, onSend, onNo, emptied = false, bottle = false}) {
  const [reason, setReason] = useState(null), [words, setWords] = useState('');
  return <div className="door-block-ask door-report-ask" role="group" aria-label={bottle ? '举报这只漂流瓶' : `举报${name}`}>
    <p>{bottle ? '举报会交给管这条街的人看。这只瓶子会扔掉，写它的人以后的瓶子也不会再漂来你家；是谁写的，你这边还是不知道。' : `举报会交给管这条街的人看，${spaced(name)}也会一起被拉黑。`}{emptied ? '这一样那时没收，纸条和东西都没留下，写一句是怎么回事吧。' : ''}为什么举报？</p>
    <div className="door-report-reasons" role="radiogroup" aria-label="原因">{REASONS.map(([id, label]) => <button key={id} type="button" role="radio" aria-checked={reason === id} className={reason === id ? 'chosen' : ''} disabled={busy} onClick={() => setReason(id)}>{label}</button>)}</div>
    <textarea value={words} maxLength={200} rows={2} placeholder="想补一句就写在这儿（可以不写）" disabled={busy} onChange={e => setWords(e.target.value)}/>
    <div><button className="door-block-yes" disabled={busy || !reason} onClick={() => onSend(reason, words.trim())}>{busy ? '……' : bottle ? '举报，扔掉这只瓶子' : '举报并拉黑'}</button><button disabled={busy} onClick={onNo}>算了</button></div>
  </div>;
}

// The door panel: what's waiting (things to take in or not), then the guestbook,
// then whoever the owner has blocked.
function DoorPanelContent({door, day, onTake, onDecline, onSeen, onBlock, onUnblock, onReport, onClose}) {
  const waiting = (door?.waiting || []).filter(w => w.kind === 'mail');
  const knocks = (door?.waiting || []).filter(w => w.kind === 'knock');
  const book = door?.book || [];
  const blocked = door?.blocked || [];
  const [busy, setBusy] = useState(null), [error, setError] = useState(''), [asking, setAsking] = useState(null);
  // Knocks are seen once the door is opened.
  useEffect(() => {if (knocks.length) onSeen();}, []);
  const checked = useMemo(() => Object.fromEntries(waiting.map(w => [w.id, w.item ? checkGift(w.item) : null])), [door]);
  const wanted = useMemo(() => waiting.filter(w => checked[w.id] && checked[w.id].kind !== 'photo').map(w => ({key: 'door:' + w.id, node: <CreationModel item={checked[w.id]} fill={6}/>})), [checked]);
  const [pictures, setPictures] = useState(() => cachedPictures(wanted.map(w => w.key)));
  const missing = wanted.filter(w => !pictures[w.key]);
  const run = async (key, job) => {
    setBusy(key); setError('');
    try {
      await job();
    } catch (e) {
      setError(e.message || '没办成，再试一次。');
    } finally {
      setBusy(null);
    }
  };
  const act = (w, take) => run(w.id, () => take ? onTake(w) : onDecline(w));
  const blockFrom = visit => run('block', async () => {await onBlock(visit); setAsking(null);});
  const askBlock = (key, from, visit) => asking === key && <BlockAsk name={nameOf(from)} busy={busy === 'block'} onYes={() => blockFrom(visit)} onNo={() => setAsking(null)}/>;
  const reportOf = visit => (reason, words) => run('report', async () => {await onReport(visit, reason, words); setAsking(null);});
  const askReport = (key, from, visit) => asking === key && <ReportAsk name={nameOf(from)} busy={busy === 'report'} emptied={visit.kind === 'mail' && visit.status === 'declined'} onSend={reportOf(visit)} onNo={() => setAsking(null)}/>;
  return <div className="door-overlay" onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} onClick={e => {if (e.target === e.currentTarget) onClose();}}>
    <section className="door-panel own" role="dialog" aria-modal="true" aria-label="门口" onKeyDown={e => {if (e.key === 'Escape') onClose();}}>
      <header><div><span>AT THE DOOR</span><h2>门口</h2></div><button className="door-close" onClick={onClose} aria-label="回去"><Icon name="close"/></button></header>
      {knocks.length > 0 && <p className="door-knocks">{leading([...new Set(knocks.map(k => nameOf(k.from)))].join('、'))}来敲过门。</p>}
      {waiting.length ? <div className="door-waiting">{waiting.map(w => {
        const thing = checked[w.id], unreadable = w.item && !thing;
        return <article key={w.id} className="door-gift">
          <div className="door-gift-picture">{thing ? (thing.kind === 'photo' ? <img src={thing.image} alt=""/> : pictures['door:' + w.id] ? <img src={pictures['door:' + w.id]} alt=""/> : <span className="drawing"/>) : w.item ? <span className="unknown">?</span> : <NoteMark/>}</div>
          <div className="door-gift-words">
            <p className="door-gift-from"><strong>{nameOf(w.from)}</strong>{w.from?.nickname && w.from.nickname !== w.from.name ? <small>{w.from.name}</small> : null}<span>{dayLabel(w.day)}</span></p>
            <p className="door-gift-what">{thing ? `${KIND_NAMES[thing.kind]}「${thing.name}」${w.note ? '，和一张纸条' : ''}` : unreadable ? '一样认不出来的东西' : '一张纸条'}</p>
            {w.note && <blockquote>{w.note}</blockquote>}
            <div className="door-gift-actions">
              <button className="door-primary" disabled={!!busy || unreadable} onClick={() => act(w, true)}>{busy === w.id ? '……' : '收下'}</button>
              <button disabled={!!busy} onClick={() => act(w, false)}>不收</button>
              {(onBlock || onReport) && <span className="door-gift-more">
                {onBlock && <button className="door-block" disabled={!!busy} onClick={() => setAsking('w' + w.id)}>拉黑</button>}
                {onReport && <button className="door-block" disabled={!!busy} onClick={() => setAsking('rw' + w.id)}>举报</button>}
              </span>}
            </div>
            {askBlock('w' + w.id, w.from, w)}
            {askReport('rw' + w.id, w.from, w)}
          </div>
        </article>;
      })}</div> : <p className="door-empty">门口现在没有东西。</p>}
      {error && <p className="door-error" role="alert">{error}</p>}
      <h3 className="door-book-title">留言簿 <small>只有你看得见</small></h3>
      {book.length ? <ol className="door-book">{book.map(b => <li key={b.id}>
        {onReport && (b.reported ? <em className="door-blocked">已举报</em> : <button className="door-block" disabled={!!busy} onClick={() => setAsking('rb' + b.id)}>举报</button>)}
        {onBlock && (b.blocked ? <em className="door-blocked">已拉黑</em> : <button className="door-block" disabled={!!busy} onClick={() => setAsking('b' + b.id)}>拉黑</button>)}
        <span>{dayLabel(b.day)}</span>{bookLine(b)}{b.note && b.status !== 'waiting' ? <q>{b.note}</q> : null}
        {askBlock('b' + b.id, b.from, b)}
        {askReport('rb' + b.id, b.from, b)}
      </li>)}</ol> : <p className="door-empty">还没有人来过。门廊灯亮着的时候，散步的邻居能走到门口。</p>}
      {blocked.length > 0 && onUnblock && <>
        <h3 className="door-book-title">拉黑的人 <small>只有你看得见</small></h3>
        <ul className="door-blocked-list">{blocked.map(p => <li key={p.id}>
          <strong>{nameOf(p)}</strong>{p.nickname && p.nickname !== p.name ? <small>{p.name}</small> : null}
          <button disabled={!!busy} onClick={() => run('unblock' + p.id, () => onUnblock(p))}>{busy === 'unblock' + p.id ? '……' : '解除'}</button>
        </li>)}</ul>
      </>}
      {missing.length > 0 && <div className="door-studio" aria-hidden="true"><DoorBoundary fallback={null}><QuietCanvas orthographic camera={{position: [0, 0, 10], zoom: 1}} dpr={1}>
        <PictureStudio items={missing} view={[10, 12, 12]} size={168} onPictures={got => setPictures(p => ({...p, ...got}))}/>
      </QuietCanvas></DoorBoundary></div>}
    </section>
  </div>;
}
function NoteMark() {
  return <svg viewBox="0 0 48 36" aria-hidden="true" className="door-note-mark"><path d="M4 6h40v26H4z"/><path d="m4 6 20 15L44 6"/></svg>;
}

// ---- The things at the door, drawn in the house's own model ----

// Where a named part of the house model sits, in the model's own space.
function partBox(model, name) {
  const part = model.getObjectByName(name);
  if (!part) return null;
  model.updateMatrixWorld(true);
  const box = new Box3();
  if (part.isInstancedMesh) {
    part.computeBoundingBox();
    box.copy(part.boundingBox).applyMatrix4(part.matrixWorld);
  } else box.setFromObject(part);
  return box.isEmpty() ? null : box;
}

// The mailbox (always something to tap), a letter peeking out of it while
// something waits, and a ribbon box on the step before the door while a thing
// waits there.
export function DoorThings({model, giftAt, letter = false, gift = false, onMailbox, onGift}) {
  const spots = useMemo(() => {
    const mail = partBox(model, 'mailbox');
    return {mail: mail && {centre: mail.getCenter(new Vector3()), size: mail.getSize(new Vector3()), top: mail.max.y}, step: giftAt};
  }, [model, giftAt]);
  const pointer = on => e => {e.stopPropagation(); document.body.style.cursor = on ? 'pointer' : 'default';};
  // The door behind goes in on pointer-down; these are in front of it, so the press stops here.
  const stop = e => e.stopPropagation();
  return <>
    {spots.mail && onMailbox && <mesh position={spots.mail.centre} onPointerEnter={pointer(true)} onPointerLeave={pointer(false)} onPointerDown={stop} onClick={e => {e.stopPropagation(); onMailbox();}}>
      <boxGeometry args={[spots.mail.size.x + .25, spots.mail.size.y + .2, spots.mail.size.z + .25]}/>
      <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
    </mesh>}
    {spots.mail && letter && <group position={[spots.mail.centre.x, spots.mail.top + .03, spots.mail.centre.z]} rotation={[0, .5, .22]}>
      <mesh castShadow><boxGeometry args={[.2, .14, .012]}/><meshStandardMaterial color="#fbf3e4" roughness={.9}/></mesh>
      <mesh position={[0, -.012, .008]}><boxGeometry args={[.05, .05, .006]}/><meshStandardMaterial color="#c9879a" roughness={.6}/></mesh>
    </group>}
    {spots.step && gift && <group position={spots.step} rotation={[0, .35, 0]} onPointerEnter={pointer(true)} onPointerLeave={pointer(false)} onPointerDown={stop} onClick={e => {e.stopPropagation(); onGift?.();}}>
      <GiftBox/>
    </group>}
  </>;
}

// A little box tied with a ribbon and a bow.
function GiftBox() {
  const paper = <meshStandardMaterial color="#f6ead9" roughness={.75}/>, ribbon = <meshStandardMaterial color="#c47f93" roughness={.45}/>;
  return <group>
    <mesh position={[0, .12, 0]} castShadow receiveShadow><boxGeometry args={[.3, .24, .3]}/>{paper}</mesh>
    <mesh position={[0, .25, 0]} castShadow><boxGeometry args={[.33, .04, .33]}/>{paper}</mesh>
    <mesh position={[0, .135, 0]}><boxGeometry args={[.06, .29, .335]}/>{ribbon}</mesh>
    <mesh position={[0, .135, 0]}><boxGeometry args={[.335, .29, .06]}/>{ribbon}</mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * .06, .3, 0]} rotation={[Math.PI / 2, 0, s * .5]} scale={[1, .7, 1]}><torusGeometry args={[.05, .016, 8, 18]}/>{ribbon}</mesh>)}
    <mesh position={[0, .29, 0]}><sphereGeometry args={[.025, 10, 8]}/>{ribbon}</mesh>
    <mesh position={[0, .2, 0]}><boxGeometry args={[.5, .5, .5]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
  </group>;
}

export {GIFT_KINDS, welcome};


// A failed thumbnail must never prevent closing the panel or declining a parcel.
class DoorBoundary extends React.Component {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function MailPanel(props) {
  return <DoorBoundary fallback={<div className="door-overlay"><section className="door-panel"><p>这份东西暂时读不出来。</p><button onClick={props.onClose}>关上邮箱</button></section></div>}><MailPanelContent {...props}/></DoorBoundary>;
}
export function DoorPanel(props) {
  const fallback = <div className="door-overlay"><section className="door-panel"><p>有一样东西暂时读不出来。</p>{(props.door?.waiting || []).filter(w => w.kind === 'mail' && w.status !== 'taken').map(w => <button key={w.id} onClick={() => props.onDecline(w).catch(() => {})}>不收这份包裹</button>)}<button onClick={props.onClose}>回去</button></section></div>;
  return <DoorBoundary fallback={fallback}><DoorPanelContent {...props}/></DoorBoundary>;
}
