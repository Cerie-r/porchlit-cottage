import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {CalledContext} from './machine-names.js';
import {QuietCanvas} from './quiet-canvas.jsx';
import {LetterSurface} from './letter-surface.jsx';
import {Modal, SlotArrows, CreationModel} from './workshop.jsx';
import {Icon} from './icons.jsx';
import {AnimalModel} from './animal-model.jsx';
import {DessertModel} from './dessert-model.jsx';
import {Blossom} from './florist.jsx';
import {PictureStudio} from './picture-studio.jsx';
import {cachedPictures} from './brick-pictures.js';
import {partCount} from './brick-recipe.js';
import {DESSERT_LABELS, makerLabel, dayLabel} from './dessert-recipe.js';
import {HEAT_WORDS, heatOf} from './cooking-recipe.js';
import {normalizeAnimal} from './animal-state.js';
import {speciesName} from './album.js';
import {leading} from './words.js';
import {dateLabel} from './diary-days.js';
import {cleanHideSeek, lasted, streak} from './hide-and-seek.js';
import {play} from './sounds.js';
import {ReportAsk} from './door.jsx';
import {BOTTLE_ART} from './bottles.js';
import './backpack.css';
import './cooking.css';

// The backpack is everything the home has, on four pages: the things
// themselves (物品), what came in from the fields to cook with (食材), the
// album of what has been made, eaten and learned (图鉴), and the diary (日记).
// The tickets sit at the top of them all.

const TABS = [['items', '物品'], ['pantry', '食材'], ['album', '图鉴'], ['diary', '日记']];

export function Backpack({tab: firstTab = 'items', items, pantry = [], onCook, tickets, album, finds = [], days, hideSeek, today, him = '他', hiding = false, focusId, onOpenLetter, onPlace, onDome, onMove, onShift, onTurn, onReportBottle, onDrop, onClose}) {
  const [tab, setTab] = useState(firstTab);
  const [reading, setReading] = useState(null);
  const letter = reading && items.find(i => i.id === reading && i.kind === 'note');
  if (letter) return <Modal title={letter.puzzleId ? '线索卡' : letter.bottle ? '漂流瓶' : '一封小小来信'} onClose={() => setReading(null)} className="backpack">
    <LetterSurface key={letter.id} letter={letter} onOpen={onOpenLetter} onBack={() => setReading(null)}/>
  </Modal>;
  const choose = next => {
    if (next === tab) return;
    play(next === 'diary' ? 'page' : 'tap', {volume: next === 'diary' ? .8 : .6});
    setTab(next);
  };
  return <Modal title="随身背包" onClose={onClose} className="backpack">
    <Tickets tickets={tickets} him={him}/>
    <nav className="bag-tabs" role="tablist" aria-label="背包的四页">
      {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'chosen' : ''} onClick={() => choose(id)}>{label}{id === 'items' && items.length > 0 && <small>{items.length}</small>}</button>)}
    </nav>
    {tab === 'items' && <ItemsPage items={items} focusId={focusId} onRead={setReading} onPlace={onPlace} onDome={onDome} onMove={onMove} onShift={onShift} onTurn={onTurn} onReportBottle={onReportBottle} onDrop={onDrop}/>}
    {tab === 'pantry' && <PantryPage pantry={pantry} onCook={onCook}/>}
    {tab === 'album' && <AlbumPage album={album} finds={finds}/>}
    {tab === 'diary' && <DiaryPage days={days} hideSeek={hideSeek} today={today} him={him} hiding={hiding}/>}
  </Modal>;
}

// The tickets: how many, and (opened) the newest lines of where they came from.
const reasons = {seek: him => `找到${him}`, puzzle: () => '解开谜题文件夹', gift: () => '收下门口的东西', before: him => `以前找到${him}的那几次`, capsule: () => '投进扭蛋机', again: () => '扭蛋里的「再来一次」', twice: () => '抽重了，退回一张', claw: () => '投进抓娃娃机', blindbox: () => '投进盲盒机'};
function Tickets({tickets, him}) {
  const [open, setOpen] = useState(false);
  const t = tickets || {n: 0, log: []}, log = [...t.log].reverse().slice(0, 8);
  return <section className={`bag-tickets${open ? ' open' : ''}`} aria-label="券">
    <button className="bag-ticket-row" aria-expanded={open} onClick={() => setOpen(v => !v)}>
      <TicketMark/>
      <strong>{t.n}<small> 张券</small></strong>
      <span>{`找到${him}、解开谜题、收下邻居放在门口的东西，都会得一张。拿到街上的小广场，投进那几台机器里。`}</span>
      <Icon name={open ? 'up' : 'down'}/>
    </button>
    {open && (log.length ? <ol className="bag-ticket-log">{log.map((l, i) => <li key={i}><span>{l.day ? dayLabel(l.day) : ''}</span>{reasons[l.why]?.(him) || ''}<b>{l.n > 0 ? `+${l.n}` : l.n}</b></li>)}</ol> : <p className="bag-ticket-empty">{`还没有券。今天找到${him}，就有第一张。`}</p>)}
  </section>;
}
function TicketMark() {
  return <svg className="bag-ticket-mark" viewBox="0 0 44 30" aria-hidden="true">
    <path d="M4 3h36a2 2 0 0 1 2 2v6a4 4 0 0 0 0 8v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a4 4 0 0 0 0-8V5a2 2 0 0 1 2-2Z"/>
    <path className="perforation" d="M30 6v18"/>
    <path className="star" d="M16 9.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5Z"/>
  </svg>;
}

// 食材: what came in from the fields, how much is left, and taking one to the stove (src/cooking-table.jsx).
function PantryPage({pantry, onCook}) {
  return <div className="bag-pantry">
    {!pantry.length && <p>还没有食材。出门去田里，番茄架、青菜地、小推车里都能找到。</p>}
    {pantry.map(p => <div key={p.id} className="bag-pantry-row">
      <img src={p.art} alt="" draggable={false}/>
      <div><strong>{p.name}</strong><small>{p.left ? `还有 ${p.left} 份` : '用完了，出门再去田里找'}</small></div>
      {onCook && <button disabled={!p.left} onClick={() => onCook(p.id)}>拿去做饭</button>}
    </div>)}
    <p className="bag-pantry-note">鸡蛋、葱、蒜、油、盐厨房里一直有。</p>
  </div>;
}

// 物品: the things themselves, where each is, and what can be done with it.
const whereIs = i => i.location === 'bag' ? '在背包里' : i.location === 'dome' ? '在餐桌的玻璃罩里' : i.location === 'table' ? '在茶几上' : i.location === 'room' ? '摆在' + i.floor : i.location.startsWith('frame:') ? '装在相框里' : '藏在屋里';
function describe(item) {
  if (item.kind === 'note') return item.puzzleId ? '谜题线索卡' : item.bottle ? '湖边捞回来的漂流瓶' : '折好的信';
  if (item.kind === 'photo') return '打印相纸 · ' + (item.mode === 'pixel' ? '像素画' : '自由画');
  if (item.kind === 'keepsake') return '家里的玩具';
  if (item.kind === 'animal') return '玩偶 · ' + speciesName(normalizeAnimal(item).species);
  if (item.kind === 'bouquet') return `${item.stems.length} 枝花 · 自选搭配`;
  if (item.kind === 'build') return `${partCount(item)} 块积木 · 拼搭`;
  if (item.kind === 'dessert') return `${DESSERT_LABELS.base[item.base] || '甜品'} · ${makerLabel(item.by)}`;
  if (item.kind === 'dish') return `${HEAT_WORDS[heatOf(item)]} · ${makerLabel(item.by)}`;
  return `${item.bricks.length} 片积木`;
}
function ItemsPage({items, focusId, onRead, onPlace, onDome, onMove, onShift, onTurn, onReportBottle, onDrop}) {
  const call = useContext(CalledContext);
  const [selected, setSelected] = useState(focusId || items[0]?.id);
  // Reporting a drift bottle (src/bottles.js): asked about here, sent by the page, the bottle then gone.
  const [asking, setAsking] = useState(null), [reportBusy, setReportBusy] = useState(false), [reportError, setReportError] = useState('');
  // Throwing a thing away (删掉): asked once, here, before it goes.
  const [dropping, setDropping] = useState(null);
  useEffect(() => {setAsking(null); setReportError(''); setDropping(null);}, [selected]);
  const drop = id => {
    const at = items.findIndex(i => i.id === id), next = items[at + 1] || items[at - 1];
    onDrop(id); setDropping(null); setSelected(next?.id);
  };
  const report = async (bottle, reason, words) => {
    setReportBusy(true); setReportError('');
    try {await onReportBottle(bottle, reason, words); setAsking(null);} catch (err) {setReportError(err?.message || '没举报成，再试一次。');} finally {setReportBusy(false);}
  };
  const item = items.find(i => i.id === selected);
  const readable = item?.kind === 'note' && ['bag', 'room', 'table'].includes(item.location);
  return <div className="bag-layout">
    <div className="bag-list">
      {!items.length && <p>还没有小物件。去二楼拼一件吧。</p>}
      {items.map(i => <button key={i.id} className={selected === i.id ? 'chosen' : ''} onClick={() => setSelected(i.id)}>{i.name}<small>{whereIs(i)}</small></button>)}
    </div>
    <div className="bag-detail">{item && <>
      {/* A drift bottle is shown as the bottle it came in, not an envelope. */}
      <div className="bag-model">{item.bottle ? <img className="bag-bottle" src={BOTTLE_ART} alt="一只漂来的玻璃瓶" draggable={false}/> : <QuietCanvas orthographic camera={{position: [10, 12, 12], zoom: 28}} dpr={[1, 1.5]}><ambientLight intensity={1.5}/><directionalLight position={[4, 9, 6]} intensity={2}/><group rotation={[0, item.location === 'room' ? item.rotationY || 0 : 0, 0]}><CreationModel item={item} fill={6}/></group></QuietCanvas>}</div>
      <h3>{item.name}</h3>
      <p>{describe(item)}</p>
      {item.gift && <div className="bag-gift-tag"><p>{leading(item.gift.from)}放在门口的{item.gift.on ? ` · ${dayLabel(item.gift.on)}` : ''}</p>{item.gift.note && item.kind !== 'note' && <blockquote>{item.gift.note}</blockquote>}</div>}
      {(item.caught?.on || item.capsule?.on || item.blindbox?.on) && <div className="bag-gift-tag"><p>{item.caught ? '在小广场的抓娃娃机抓到的' : item.blindbox ? '小广场的盲盒里拆出来的' : '小广场的扭蛋里拧出来的'} · {dayLabel(item.caught?.on || item.blindbox?.on || item.capsule.on)}</p></div>}
      {item.folder?.on && <div className="bag-gift-tag"><p>电脑里的谜题文件夹打开时得到的 · {dayLabel(item.folder.on)}</p></div>}
      {/* Written by an AI living here, or hidden by one and found (src/machine-acts.js). */}
      {item.by?.kind === 'machine' && item.by.name && <div className="bag-gift-tag"><p>{leading(call(item.by))}{item.kind === 'note' ? '写的' : '做的'}{item.writtenOn || item.madeOn ? ` · ${dayLabel(item.writtenOn || item.madeOn)}` : ''}</p>{item.kind !== 'note' && typeof item.by.note === 'string' && item.by.note && <blockquote>{item.by.note}</blockquote>}</div>}
      {item.hid?.found && item.hid.by?.name && <div className="bag-gift-tag"><p>{leading(call(item.hid.by))}藏起来、你找到的 · {dayLabel(item.hid.found)}</p></div>}
      {/* A drift bottle brought home from the lake and opened: whose it was isn't known (src/bottles.js). */}
      {item.bottle && <div className="bag-gift-tag"><p>湖边捞回来的漂流瓶{item.bottle.on ? ` · ${dayLabel(item.bottle.on)}拆开的` : ''}</p>{(item.bottle.thrownOn || item.bottle.byMachine) && <p>{[item.bottle.thrownOn && `${dayLabel(item.bottle.thrownOn)}投进海里`, item.bottle.byMachine && '是一只机写的'].filter(Boolean).join(' · ')}</p>}</div>}
      {item.kind === 'dessert' && onDome && item.location !== 'dome' && <button onClick={() => onDome(item.id)}>放进玻璃罩</button>}
      {item.kind === 'dish' && onDome && item.location !== 'dome' && <button onClick={() => onDome(item.id)}>端上桌</button>}
      {readable && <button onClick={() => onRead(item.id)}>{item.puzzleId ? '再读一遍' : item.bottle ? '打开瓶子' : '查看信封'}</button>}
      <button disabled={item.kind === 'note' && !readable} onClick={() => onPlace(item.id)}>{item.location === 'bag' ? '取出 · 自由摆放' : '重新摆放'}</button>
      {item.location !== 'bag' && (item.kind !== 'note' || ['room', 'table'].includes(item.location)) && <button onClick={() => onMove(item.id, 'bag')}>收回背包</button>}
      {item.location === 'table' && <SlotArrows id={item.id} onShift={onShift}/>}
      {item.location === 'room' && onTurn && <button onClick={() => onTurn(item.id)}>转一转 ↻</button>}
      {item.bottle && onReportBottle && (asking === item.id
        ? <ReportAsk bottle busy={reportBusy} onSend={(reason, words) => report(item, reason, words)} onNo={() => setAsking(null)}/>
        : <button className="bag-quiet" onClick={() => setAsking(item.id)}>举报这只瓶子</button>)}
      {reportError && <p className="bag-error" role="alert">{reportError}</p>}
      {onDrop && (dropping === item.id
        ? <div className="bag-drop-ask" role="group" aria-label="删掉这一样"><p>删掉「{item.name}」？删了就找不回来了。</p><div><button className="bag-drop-yes" onClick={() => drop(item.id)}>删掉</button><button onClick={() => setDropping(null)}>留着</button></div></div>
        : <button className="bag-quiet" onClick={() => setDropping(item.id)}>删掉这一样</button>)}
      <p className="bag-hint">相纸可装进相框；藏进柜子时，先打开藏点，再从背包放入。</p>
    </>}</div>
  </div>;
}

// 图鉴: a shelf for each kind of thing, a picture for each one this home has.
// The pictures are drawn once each, by one hidden canvas, and kept.
const VIEWS = {dessert: [7, 6, 9], doll: [3.2, 2, 10], flower: [8, 6.5, 10]};
const SIZE = 168;
// A doll's looks don't change once it is made; a dessert is its recipe; a
// flower is its colour.
const lookKey = (shelf, x) => `album:${shelf}:${x.id}:${shelf === 'doll' ? x.look?.id : shelf === 'flower' ? x.color : JSON.stringify(x.look)}`;
function AlbumPage({album, finds}) {
  const wanted = useMemo(() => ({
    dessert: [...album.desserts.filter(d => d.look), ...album.learned].map(d => ({key: lookKey('dessert', d), node: <DessertModel item={d.look}/>})),
    doll: album.dolls.filter(d => d.look).map(d => ({key: lookKey('doll', d), node: <AnimalModel item={d.look}/>})),
    flower: album.flowers.filter(f => f.have).map(f => ({key: lookKey('flower', f), node: <group rotation={[.6, 0, 0]}><Blossom type={f.id} color={f.color}/></group>}))
  }), [album]);
  const all = Object.values(wanted).flat();
  const [pictures, setPictures] = useState(() => cachedPictures(all.map(w => w.key)));
  const missing = Object.fromEntries(Object.entries(wanted).map(([shelf, list]) => [shelf, list.filter(w => !pictures[w.key])]));
  const drawing = Object.values(missing).some(list => list.length);
  const got = p => setPictures(old => ({...old, ...p}));
  const picture = (shelf, x) => pictures[lookKey(shelf, x)];
  // Only what this home has: a kind not made yet isn't shown at all, and a
  // shelf with nothing on it isn't either.
  const desserts = album.desserts.filter(d => d.have), dolls = album.dolls.filter(d => d.have), flowers = album.flowers.filter(f => f.have);
  const empty = !desserts.length && !album.learned.length && !dolls.length && !flowers.length && !finds.length;
  return <div className="bag-album">
    {empty && <p className="bag-album-empty">还空着呢。做过的甜品、玩偶，插过的花，出门捡回来的，会一样一样收在这里。</p>}
    {desserts.length > 0 && <Shelf title="甜品" count={desserts.length}>
      {desserts.map(d => <Tile key={d.id} name={d.name} src={picture('dessert', d)} note={d.eaten ? `一起吃过 ${d.eaten} 次` : d.made ? `做了 ${d.made} 份，还没吃` : `曾经做过或收到过`}/>)}
    </Shelf>}
    {album.learned.length > 0 && <Shelf title="学会的甜品" count={album.learned.length}>
      {album.learned.map(d => <Tile key={d.id} name={d.name} src={picture('dessert', d)} note={`跟 ${d.from} 学的`}/>)}
    </Shelf>}
    {dolls.length > 0 && <Shelf title="玩偶" count={dolls.length}>
      {dolls.map(d => <Tile key={d.id} name={d.name} src={picture('doll', d)} note={d.n ? `有 ${d.n} 只` : `曾经拥有过`}/>)}
    </Shelf>}
    {flowers.length > 0 && <Shelf title="花" count={flowers.length}>
      {flowers.map(f => <Tile key={f.id} name={f.name} src={picture('flower', f)} note={f.n ? `插过 ${f.n} 枝` : `曾经收在家里`}/>)}
    </Shelf>}
    {/* What the two of them brought home from going out (src/explore-trips.js): the book's own pictures. */}
    {finds.length > 0 && <Shelf title="出门捡回来的" count={finds.length}>
      {finds.map(f => <Tile key={`${f.place}:${f.id}`} name={f.name} src={f.picture} note={`${f.from} · 带回 ${f.n} 次`}/>)}
    </Shelf>}
    <p className="bag-album-note">图鉴只有自己看得见，不跟别人比。</p>
    {drawing && <div className="bag-album-studio" aria-hidden="true"><QuietCanvas orthographic camera={{position: [0, 0, 10], zoom: 1}} dpr={1}>
      {Object.entries(missing).map(([shelf, list]) => list.length > 0 && <PictureStudio key={shelf} items={list} view={VIEWS[shelf]} size={SIZE} onPictures={got}/>)}
    </QuietCanvas></div>}
  </div>;
}
function Shelf({title, count, children}) {
  return <section className="bag-shelf">
    <h3>{title}<small>{count} 种</small></h3>
    <div className="bag-tiles">{children}</div>
  </section>;
}
function Tile({name, src, note}) {
  return <figure className="bag-tile have">
    <div className="bag-tile-picture">{src ? <img src={src} alt="" draggable={false}/> : <span className="drawing"/>}</div>
    <figcaption><strong>{name}</strong><small>{note}</small></figcaption>
  </figure>;
}

// 日记: one page a day, two side by side on a wide screen. It opens at the
// newest and turns back from there, with the sound of a page.
function useWide() {
  const [wide, setWide] = useState(() => window.innerWidth > 760);
  useEffect(() => {const f = () => setWide(window.innerWidth > 760); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f);}, []);
  return wide;
}
function DiaryPage({days, hideSeek, today, him, hiding}) {
  const wide = useWide(), per = wide ? 2 : 1, count = Math.max(1, Math.ceil(days.length / per));
  // Pages from the oldest, laid out so the last spread is full and holds the
  // newest day; any blank page is at the very beginning.
  const [spread, setSpread] = useState(count - 1);
  useEffect(() => setSpread(count - 1), [count]);
  const s = cleanHideSeek(hideSeek), run = streak(s.book, today), fastest = s.book.length ? Math.min(...s.book.map(e => e.seconds)) : null;
  const blanks = count * per - days.length, dayAt = i => spread * per + i - blanks;
  const turn = by => {const next = Math.max(0, Math.min(count - 1, spread + by)); if (next === spread) return; play('page', {volume: .8}); setSpread(next);};
  // A page can be turned with a swipe too: right to go back, left to go on.
  const swipe = useRef(null);
  return <div className="bag-diary" tabIndex={-1} onKeyDown={e => {if (e.key === 'ArrowLeft') turn(-1); if (e.key === 'ArrowRight') turn(1);}}
    onPointerDown={e => {swipe.current = {x: e.clientX, y: e.clientY};}}
    onPointerUp={e => {const s = swipe.current; swipe.current = null; if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) turn(dx > 0 ? -1 : 1);}}
    onPointerCancel={() => {swipe.current = null;}}>
    <p className="bag-diary-lead">{hiding ? `${him}今天躲起来了，还没被找到。` : '家里发生的事，一天一页。'}</p>
    <div className="bag-diary-stats" aria-label={`躲猫猫：找到${him}`}>
      <p><strong>{run}</strong><span>连着几天</span></p>
      <p><strong>{s.total}</strong><span>一共找到几次</span></p>
      {fastest !== null && <p><strong>{lasted(fastest)}</strong><span>最快一次</span></p>}
    </div>
    {days.length ? <div className={`bag-diary-spread${wide ? ' wide' : ''}`}>
      {Array.from({length: per}, (_, i) => {
        const n = dayAt(i), day = days[n];
        return day ? <article key={day.day} className="bag-diary-day">
          <h3>{dateLabel(day.day)}</h3>
          <ul>{day.lines.map((l, k) => <li key={k} className={l.kind}>{l.text}</li>)}</ul>
          <small>{n + 1}</small>
        </article> : <article key={'blank' + i} className="bag-diary-day blank"/>;
      })}
    </div> : <div className="bag-diary-spread"><article className="bag-diary-day empty"><p>还空着呢。每天第一次进门，{him}都会躲起来；找到{him}、做了东西、一起吃了甜品，都会记在这里。</p></article></div>}
    {count > 1 && <nav className="bag-diary-turn">
      <button onClick={() => turn(-1)} disabled={spread === 0} aria-label="往前翻">‹ 往前翻</button>
      <span>{spread + 1} / {count}</span>
      <button onClick={() => turn(1)} disabled={spread === count - 1} aria-label="往后翻">往后翻 ›</button>
    </nav>}
  </div>;
}

