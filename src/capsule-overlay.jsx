import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createCapsuleMachine, PALETTES} from './capsule-machine.js';
import {PRIZE_NAMES, SCRAPS_FOR_ONE, SCRAPS_FOR_RARE, FESTIVAL_SCRAPS, describePrize, openFestivals, scrapsFor, scrapsIn, stillToDraw} from './capsules.js';
import {pictureKey, photoOf, pictured, prizeModel, prizePictures, knownPictures} from './capsule-pictures.js';
import {freshAnimal} from './animal-state.js';
import {QuietCanvas} from './quiet-canvas.jsx';
import {PictureStudio} from './picture-studio.jsx';
import {cachedPictures} from './brick-pictures.js';
import {CreationModel} from './workshop.jsx';
import {MachineTop, noTicket} from './machine-overlay.jsx';

// Standing in front of the capsule machine on a street's plaza. `onTurn()`
// puts a ticket in and says what comes out (capsules.js turnDial); the
// machine then shows it: the ticket going in, the dial, the ball, the opening.
// Scraps put by for things drawn twice show under the title; enough of them,
// and `onExchange(prize, pool)` buys one thing still to be drawn, which then
// comes out of the machine like any other. Around a festival there is a second
// jar to choose, that festival's pool (capsules.js FESTIVALS): `onTurn(pool)`.
const LABELS = {idle: '投一张券', paid: '拧一下', busy: '……', ready: '打开', open: '收下'};
const HINTS = {idle: '先投一张券', paid: '拧前面的圆盘', ready: '点它打开'};

// The balls in a festival's pool, in its colours.
const FESTIVE_BALLS = {christmas: [0xd5525e, 0x6f9a6c, 0xf6efe4], halloween: [0xf0a050, 0x7a5a99, 0x3e3540]};
// What a ball holds, as the machine draws it: for a piece, an outfit or a
// hairstyle, the thing itself in its colourway (a little shape in its colours if
// it can't be made).
const insideOf = prize => {
  const ball = Math.floor(Math.random() * 5), festive = FESTIVE_BALLS[prize.pool];
  if (festive) return {...plainInside(prize, ball), ballColor: festive[ball % festive.length]};
  return plainInside(prize, ball);
};
const plainInside = (prize, ball) => {
  if (pictured(prize)) {
    const d = describePrize(prize);
    let object = null;
    try { object = prizeModel(prize); } catch { object = null; }
    return {kind: prize.kind, shape: object ? null : prize.kind === 'outfit' ? 'outfit' : 'button', object, color: d.color, accent: d.accent, rare: d.rare, ball};
  }
  return {kind: prize.kind === 'doll' ? prize.id : prize.kind, color: 0xffffff, ball};
};
// A bear wearing the accessory, for its picture.
const dollWith = id => ({...freshAnimal(), kind: 'animal', name: PRIZE_NAMES[id] || '', accessory: [id]});
const people = pictured;
// Whose wardrobe it goes into: `partner` is the partner's kind, `him` how they are spoken of.
const whoseOf = (wearers, partner, him) => wearers.length > 1 ? '两个人' : wearers[0] === partner ? him : '你';
const swatch = d => ({background: `linear-gradient(135deg,${d.color} 0 58%,${d.accent} 58% 100%)`});

function Way({d}) {
  return d.way ? <span className="machine-way"><i style={swatch(d)}/>{d.way}</span> : null;
}

function Picture({src, fallback, colors}) {
  const [broken, setBroken] = useState(false);
  const shown = src || (!broken && fallback);
  return shown ? <img src={shown} alt="" onError={() => !src && setBroken(true)}/> : <span style={colors ? swatch(colors) : undefined}/>;
}

function Result({prize, picture, scraps, partner, him, pool}) {
  if (prize.kind === 'again') return <><h3>再来一次！</h3><p>券自己飞回券口了，再拧一下。</p></>;
  if (prize.kind === 'note') return <><h3>一张纸条</h3><blockquote>{prize.text}</blockquote><p>收进背包了，背包里能再读。</p></>;
  const d = describePrize(prize), doll = prize.kind === 'doll', whose = whoseOf(d.wearers, partner, him);
  const where = doll ? '玩偶台的配饰栏里多了这一样，哪只玩偶都能戴。' : `放进${whose}的衣柜了。`;
  const [small, big] = pool ? [FESTIVAL_SCRAPS.piece, FESTIVAL_SCRAPS.outfit] : [SCRAPS_FOR_ONE, SCRAPS_FOR_RARE], rareWord = pool ? '衣服' : '衣服或发型';
  const kept = scraps >= big ? `布头攒了${scraps}块，够换一件${rareWord}了。` : scraps >= small ? `布头攒了${scraps}块，够换一样配饰了；攒到${big}块能换${rareWord}。` : `布头 ${scraps} / ${small}，攒够了能换一样还没扭到的。`;
  const words = prize.twice
    ? <><h3>又是{d.name}<Way d={d}/></h3><p>已经有了，换成一块布头。{kept}</p></>
    : prize.exchanged
      ? <><h3>换到了：{d.name}<Way d={d}/></h3><p>用{scrapsFor(prize)}块布头换的，{where}</p></>
      : d.hair
        ? <><h3>稀有！{d.name}</h3><p>一个新发型，{where}</p></>
      : d.rare
        ? <><h3>稀有！{d.name}<Way d={d}/></h3><p>这一季才有的衣服，{where}</p></>
        : <><h3>抽到了：{d.name}<Way d={d}/></h3><p>{where}</p></>;
  return <div className={`machine-doll${d.rare ? ' rare' : ''}`}>
    <div className="machine-doll-picture">{doll ? (picture ? <img src={picture} alt=""/> : <span/>) : <Picture src={picture} fallback={picture === null ? photoOf(prize) : ''} colors={d}/>}</div>
    <div>{words}</div>
  </div>;
}

// The patch of cloth the scraps are counted in.
const ScrapMark = () => <svg className="scrap-mark" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5 13 2l.8 10.3L3.2 14Z"/><path className="stitch" d="M4.4 5 11.6 4l.5 6.9-7.1 1.2Z"/></svg>;

// Choosing what the scraps buy: each thing in the jar this season with a
// colourway not drawn yet, those colourways to pick from.
function Swap({list, scraps, pool, dollPictures, partner, him, onSwap, onCancel}) {
  const things = useMemo(() => {
    const out = new Map();
    for (const p of list) {
      const key = `${p.kind}:${p.id}`;
      if (!out.has(key)) out.set(key, {key, kind: p.kind, id: p.id, ways: [], ...(p.pool ? {pool: p.pool} : {})});
      if (p.way) out.get(key).ways.push(p.way);
    }
    return [...out.values()];
  }, [list]);
  const [chosen, setChosen] = useState(null), [pictures, setPictures] = useState({});
  const chosenKey = chosen && people(chosen) ? pictureKey(chosen) : '';
  // The one chosen, drawn in its colourway.
  useEffect(() => {
    if (!chosenKey) return;
    const frame = requestAnimationFrame(() => setPictures(p => ({...p, ...prizePictures([chosen])})));
    return () => cancelAnimationFrame(frame);
  }, [chosenKey]);
  // The hairstyles have no photographs: all of them drawn at once.
  const hairs = useMemo(() => things.filter(t => t.kind === 'hair').map(t => ({kind: 'hair', id: t.id, way: 'base'})), [things]);
  useEffect(() => {
    if (!hairs.length) return;
    const frame = requestAnimationFrame(() => setPictures(p => ({...p, ...prizePictures(hairs)})));
    return () => cancelAnimationFrame(frame);
  }, [hairs]);
  const [small, big] = pool ? [FESTIVAL_SCRAPS.piece, FESTIVAL_SCRAPS.outfit] : [SCRAPS_FOR_ONE, SCRAPS_FOR_RARE];
  const groups = [[pool ? `衣服 · ${big}块` : `这一季的衣服 · 稀有 · ${big}块`, 'outfit'], [`发型 · 稀有 · ${big}块`, 'hair'], [`配饰 · ${small}块`, 'piece'], [`玩偶的配饰 · ${small}块`, 'doll']].map(([title, kind]) => [title, things.filter(t => t.kind === kind)]).filter(([, list]) => list.length);
  const pick = (t, way) => setChosen({kind: t.kind, id: t.id, ...(t.ways.length ? {way: way || t.ways[0]} : {}), ...(t.pool ? {pool: t.pool} : {})});
  const d = chosen && describePrize(chosen);
  return <section className="capsule-swap" aria-label="用布头换一件">
    <header><h3>用布头换一件</h3><p>{pool ? '限定罐里' : '这一季罐子里'}还没扭到的：配饰{small}块，{pool ? '衣服' : '衣服和发型'}{big}块。你有{scraps}块。</p></header>
    <div className="capsule-swap-list">
      {groups.map(([title, list]) => <div key={title}>
        <h4>{title}</h4>
        <ul>{list.map(t => {
          const on = chosen?.kind === t.kind && chosen.id === t.id, first = describePrize({kind: t.kind, id: t.id, way: t.ways[0]}), short = scraps < scrapsFor(t);
          const who = t.kind === 'doll' ? '' : whoseOf(first.wearers, partner, him);
          const picture = t.kind === 'doll' ? dollPictures['capsule:' + t.id] : t.kind === 'hair' ? pictures[pictureKey({kind: 'hair', id: t.id, way: 'base'})] || '' : on ? pictures[chosenKey] : '';
          return <li key={t.key} className={`capsule-swap-item${on ? ' on' : ''}${short ? ' short' : ''}`}>
            <button type="button" className="capsule-swap-pick" aria-pressed={on} disabled={short} onClick={() => pick(t, on ? chosen.way : null)}>
              {t.kind === 'doll' ? (picture ? <img src={picture} alt=""/> : <i className="blank"/>) : <Picture key={picture || t.key} src={picture} fallback={photoOf(t)}/>}
              <span>{first.name}</span>
            </button>
            {t.ways.some(w => w !== 'base') && <div className="capsule-swap-ways">{t.ways.map(w => {const way = describePrize({kind: t.kind, id: t.id, way: w}); return <button key={w} type="button" title={way.way} aria-label={`${first.name}，配色：${way.way}`} aria-pressed={on && chosen.way === w} disabled={short} style={swatch(way)} onClick={() => pick(t, w)}/>;})}</div>}
            {who && <em>{who}</em>}
          </li>;
        })}</ul>
      </div>)}
    </div>
    <div className="box-actions">
      <button type="button" className="machine-go quiet" onClick={onCancel}>再想想</button>
      <button type="button" className="machine-go" disabled={!chosen} aria-label={d ? `换${d.name}${d.way ? '，' + d.way : ''}，${scrapsFor(chosen)}块布头` : undefined} onClick={() => onSwap(chosen)}>{d ? `换这一件 · ${scrapsFor(chosen)}块` : '挑一件'}</button>
    </div>
  </section>;
}

export function CapsuleMachine({street, tickets, capsules, day, night = false, him = '他', partner = 'boy', onTurn, onExchange, onClose}) {
  const holder = useRef(), canvas = useRef(), machine = useRef(), live = useRef({});
  const [state, setState] = useState('idle'), [prize, setPrize] = useState(null), [problem, setProblem] = useState('');
  const [swapping, setSwapping] = useState(false);
  // Which jar: '' the usual one, or an open festival's pool.
  const festivals = useMemo(() => openFestivals(day), [day]), [pool, setPool] = useState('');
  const jar = festivals.some(f => f.pool === pool) ? pool : '';
  const palette = Math.abs(Math.trunc(Number(street?.seed) || 0)) % 4;
  const count = Number.isSafeInteger(tickets?.n) ? tickets.n : 0;
  const scraps = capsules ? scrapsIn(capsules, jar) : 0;
  // A ticket in: what it brings is decided and kept at once, then shown.
  const pay = () => {
    const result = onTurn(live.current.jar || null);
    if (!result || result.problem) { setProblem(noTicket(him)); return null; }
    setProblem(''); setPrize(result.prize);
    return result.prize;
  };
  const next = part => {
    const m = machine.current;
    if (!m || live.current.swapping) return;
    if (m.state === 'idle') {
      if (part && part !== 'ticket') return setProblem('先投一张券，再拧。');
      const p = pay();
      if (p) m.insert(insideOf(p));
    } else if (m.state === 'paid') m.turn();
    else if (m.state === 'ready') m.open();
    else if (m.state === 'open') m.collect({ticketBack: live.current.prize?.kind === 'again'});
  };
  // Scraps for the one chosen: it goes into the slot, ready for the dial.
  const swap = chosen => {
    const m = machine.current;
    if (!m || m.state !== 'idle') return;
    const result = onExchange?.(chosen, jar || null);
    setSwapping(false);
    if (!result || result.problem) { setProblem(result?.problem === 'not_enough' ? `布头还不到${scrapsFor(chosen)}块。` : '这一件已经有了。'); return; }
    setProblem(''); setPrize(result.prize);
    m.load(insideOf(result.prize));
  };
  live.current = {next, pay, prize, swapping, jar};
  useEffect(() => {
    const m = createCapsuleMachine(canvas.current, {
      palette, night,
      onState: s => {
        // A ticket that came back out of a ball is already in the slot: the next one is ready to turn.
        if (s === 'back') { const p = live.current.pay(); if (p) machine.current?.load(insideOf(p)); return; }
        setState(s);
      },
      onTap: part => live.current.next(part)
    });
    machine.current = m;
    const fit = () => {const b = holder.current?.getBoundingClientRect(); if (b) m.resize(b.width, b.height);};
    const watch = new ResizeObserver(fit);
    watch.observe(holder.current);
    fit();
    return () => { watch.disconnect(); m.dispose(); machine.current = null; };
  }, []);
  useEffect(() => { machine.current?.setNight(night); }, [night]);
  // A piece, an outfit or a hairstyle that came out, pictured in its colourway for the card once the ball has opened.
  const [drawn, setDrawn] = useState({});
  const prizeKey = people(prize) ? pictureKey(prize) : '';
  useEffect(() => {
    if (!prizeKey || state !== 'open') return;
    const wait = setTimeout(() => setDrawn(p => ({...p, [prizeKey]: null, ...prizePictures([prize])})), 500);
    return () => clearTimeout(wait);
  }, [prizeKey, state]);
  const swapList = useMemo(() => swapping ? stillToDraw({capsules}, day, jar || null) : [], [swapping, capsules, day, jar]);
  // Pictures of a bear wearing a doll's accessory: the one that came out, or those to choose among.
  const wanted = useMemo(() => {
    const ids = swapping ? swapList.filter(p => p.kind === 'doll').map(p => p.id) : prize?.kind === 'doll' ? [prize.id] : [];
    return ids.map(id => ({key: 'capsule:' + id, node: <CreationModel item={dollWith(id)} fill={6}/>}));
  }, [swapping, swapList, prize?.kind, prize?.id]);
  const [pictures, setPictures] = useState(() => ({}));
  const known = {...cachedPictures(wanted.map(w => w.key)), ...pictures};
  const missing = wanted.filter(w => !known[w.key]);
  const look = PALETTES[palette];
  const hint = problem || (state === 'idle' && count < 1 ? noTicket(him) : HINTS[state] || '');
  const enough = scraps >= (jar ? FESTIVAL_SCRAPS.piece : SCRAPS_FOR_ONE);
  // For a piece, an outfit or a hairstyle: its picture, '' while it is coming, null if it couldn't be drawn.
  const resultPicture = prize?.kind === 'doll' ? known['capsule:' + prize.id] : people(prize) ? (knownPictures([prize])[prizeKey] || (prizeKey in drawn ? drawn[prizeKey] : '')) : null;
  return <div className={`machine-overlay${night ? ' night' : ''}`} onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="扭蛋机">
    <div className="machine-stage" ref={holder}><canvas ref={canvas} aria-label="小熊罐扭蛋机，拖着能转着看"/></div>
    <MachineTop look={look} title="扭蛋机" count={count} onClose={onClose}/>
    {festivals.length > 0 && !swapping && <div className="capsule-pools" role="group" aria-label="选罐子">
      {[{pool: '', name: '罐子'}, ...festivals.map(f => ({...f, name: f.name + '限定'}))].map(f => <button key={f.pool} type="button" aria-pressed={jar === f.pool} disabled={state !== 'idle'} onClick={() => { setPool(f.pool); setProblem(''); }}>{f.name}{f.to && <small>到{Number(f.to.slice(0, 2))}/{Number(f.to.slice(3))}</small>}</button>)}
    </div>}
    {scraps > 0 && !swapping && <button type="button" className={`capsule-scraps${enough ? ' ready' : ''}${festivals.length ? ' below' : ''}`} aria-label={`${scraps} 块布头`} onClick={() => state !== 'idle' ? null : enough ? setSwapping(true) : setProblem(`抽重了会换成布头：${jar ? FESTIVAL_SCRAPS.piece : SCRAPS_FOR_ONE}块换一样配饰，${jar ? FESTIVAL_SCRAPS.outfit : SCRAPS_FOR_RARE}块换一件${jar ? '衣服' : '衣服或发型'}。`)}>
      <ScrapMark/><span>布头</span><strong>{scraps}</strong>{enough ? (state === 'idle' && <span>· 换一件</span>) : <small>/ {SCRAPS_FOR_ONE}</small>}
    </button>}
    <footer className="machine-bottom">
      {swapping
        ? <Swap list={swapList} scraps={scraps} pool={jar} dollPictures={known} partner={partner} him={him} onSwap={swap} onCancel={() => setSwapping(false)}/>
        : <>
          {state === 'open' && prize && <section className="machine-result" aria-live="polite"><Result prize={prize} picture={resultPicture} scraps={scrapsIn(capsules || {}, prize.pool || '')} partner={partner} him={him} pool={prize.pool || ''}/></section>}
          {hint && state !== 'open' && <p className="machine-hint" role="status">{hint}</p>}
          <button className="machine-go" disabled={state === 'busy' || (state === 'idle' && count < 1)} onClick={() => next(null)}>{state === 'open' && prize?.kind === 'again' ? '收下，再拧一次' : LABELS[state] || '……'}</button>
        </>}
    </footer>
    {missing.length > 0 && <div className="machine-studio" aria-hidden="true"><QuietCanvas orthographic camera={{position: [0, 0, 10], zoom: 1}} dpr={1}>
      <PictureStudio items={missing} view={[10, 12, 12]} size={168} onPictures={got => setPictures(p => ({...p, ...got}))}/>
    </QuietCanvas></div>}
  </div>;
}
