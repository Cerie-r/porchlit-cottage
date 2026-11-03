import {notes,houseTaste} from './dessert-taste.js';
import {cleanTasteWords,TASTE_WORD_MAX} from './dessert-state.js';
import React,{useContext,useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {QuietCanvas} from './quiet-canvas.jsx';
import {Icon as NavigationIcon} from './icons.jsx';
import {DessertModel} from './dessert-model.jsx';
import {DishModel} from './cooking-tools.jsx';
import {dishTaste} from './cooking-recipe.js';
import {DessertContext} from './dessert-dining.jsx';
import {makerLabel,dayLabel} from './dessert-recipe.js';
import {play} from './sounds.js';
import './dessert.css';

// The dessert book: a little clothbound book lying on the kitchen island's
// counter, and its pages, one for every dessert the two of them have eaten.

const cover = new THREE.MeshStandardMaterial({color: '#d7a7b3', roughness: .62});
const pages = new THREE.MeshStandardMaterial({color: '#fbf5ea', roughness: .8});
const goldLine = new THREE.MeshStandardMaterial({color: '#cfae6c', roughness: .3, metalness: .55});
// Built standing on its foot with the spine facing out (+z); lying, it is laid
// on its back cover with the spine still towards the room, like a notebook
// left out on the counter. A clear box around it makes it easy to tap on a phone.
const hitMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false});
export function DessertBookModel({p = [0, 0, 0], r = [0, 0, 0], lying = false, size = 1.25}) {
  const ctx = useContext(DessertContext);
  const book = <group scale={size}>
      {[-1, 1].map(s => <mesh key={s} position={[s * .0165, .085, 0]} material={cover} castShadow receiveShadow><boxGeometry args={[.006, .17, .125]}/></mesh>)}
      <mesh position={[0, .085, .0595]} material={cover} castShadow><boxGeometry args={[.039, .17, .008]}/></mesh>
      <mesh position={[0, .085, -.004]} material={pages}><boxGeometry args={[.027, .162, .118]}/></mesh>
      {[.03, .14].map(y => <mesh key={y} position={[0, y, .064]} material={goldLine}><boxGeometry args={[.036, .005, .002]}/></mesh>)}
      <mesh position={[.0198, .1, 0]} rotation={[0, Math.PI / 2, 0]} material={goldLine}><torusGeometry args={[.022, .0025, 6, 24]}/></mesh>
      <mesh position={[.0198, .1, 0]} rotation={[0, Math.PI / 2, 0]} material={goldLine}><circleGeometry args={[.008, 12]}/></mesh>
    </group>;
  return <group position={p} rotation={r} onClick={e => {if (ctx.decorMode || e.delta > 5 || !ctx.onBook) return; e.stopPropagation(); ctx.onBook();}} onPointerOver={() => {if (!ctx.decorMode) document.body.style.cursor = 'pointer';}} onPointerOut={() => {document.body.style.cursor = 'default';}}>
    {lying ? <group position={[.085 * size, .0195 * size, 0]} rotation={[0, 0, Math.PI / 2]}>{book}</group> : book}
    {lying ? <mesh position={[0, .04, 0]} material={hitMaterial}><boxGeometry args={[.25 * size, .1, .2 * size]}/></mesh> : <mesh position={[0, .11, .02]} material={hitMaterial}><boxGeometry args={[.22, .24, .24]}/></mesh>}
  </group>;
}

const VIEW = [7, 6, 9];
// What a page shows: the dessert itself, drawn when the page is turned to.
function PagePicture({recipe}) {
  return <QuietCanvas orthographic camera={{position: VIEW, zoom: 78}} dpr={[1, 1.5]} gl={{alpha: true}}>
    <ambientLight intensity={1.15}/><hemisphereLight args={['#fff8e9', '#c3ac9b', .9]}/><directionalLight position={[-4, 8, 6]} intensity={2.4}/>
    <group position={[0, -.45, 0]}>{recipe?.kind === 'dish' ? <DishModel item={recipe}/> : <DessertModel item={recipe}/>}</group>
  </QuietCanvas>;
}
function useWide() {
  const [wide, setWide] = useState(() => window.innerWidth > 700);
  useEffect(() => {const f = () => setWide(window.innerWidth > 700); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f);}, []);
  return wide;
}
function Page({page, number, onWords, startWriting = false}) {
  const [editing,setEditing]=useState(startWriting),[draft,setDraft]=useState(page?.words?.self||'');

  if (!page) return <div className="dessert-page blank"/>;
  // A dish has no scent strip; its page says what it tasted like.
  const r = page.recipe, dish = r?.kind === 'dish', aroma = dish ? null : page.notes||notes(r), taste = page.taste || (dish ? dishTaste(r) : houseTaste({...r,madeOn:page.madeOn},{eatenOn:page.eatenOn}));
  return <article className="dessert-page">
    <div className="dessert-page-picture"><PagePicture recipe={r}/></div>
    <h3>{r.name}</h3>
    <p className="dessert-page-who">{makerLabel(page.by)} · {dayLabel(page.eatenOn)}</p>
    {page.note && <blockquote>「{page.note}」</blockquote>}
    {aroma && <dl className="dessert-scent-strip">{[['top','前调'],['heart','中调'],['base','尾调']].map(([key,label])=><div key={key}><dt>{label}</dt><dd>{aroma[key]}</dd></div>)}</dl>}
    <p className="dessert-house-taste">{taste}</p>
    {page.words?.machine&&<p className="dessert-inscription machine">{page.words.machine}</p>}
    {editing ? <form className="dessert-write" onSubmit={e=>{e.preventDefault();onWords?.(page.id,draft);setEditing(false);}} onKeyDown={e=>e.stopPropagation()}>
      <textarea aria-label={dish ? '给这一盘菜写一句' : '给这一份甜品写一句'} autoFocus rows={3} value={draft} placeholder="这一口，想记住什么？" onChange={e=>setDraft(cleanTasteWords(e.target.value))}/>
      <div><small>{[...draft].length} / {TASTE_WORD_MAX}</small><button type="button" onClick={()=>{setDraft(page.words?.self||'');setEditing(false);}}>收起</button><button type="submit">写好啦</button></div>
    </form> : <div className="dessert-written">{page.words?.self&&<p className="dessert-inscription">{page.words.self}</p>}{onWords&&<button onClick={()=>setEditing(true)}>{page.words?.self?'改一句':'写一句'}</button>}</div>}
    <small className="dessert-page-number">{number}</small>
  </article>;
}

// The book open on the table: two pages side by side on a wide screen, one on
// a phone. It opens at the newest page and turns back from there.
export function DessertBook({pages: entries = [], onClose, onWords, writingId = null}) {
  const wide = useWide(), per = wide ? 2 : 1, count = Math.max(1, Math.ceil(entries.length / per));
  const [spread, setSpread] = useState(()=>{const at=entries.findIndex(p=>p.id===writingId);return at<0?count-1:Math.floor(at/per);}), panel = useRef();
  useEffect(() => setSpread(s => Math.min(s, count - 1)), [count]);
  useEffect(() => {const previous = document.activeElement; const target=writingId?panel.current?.querySelector('textarea'):panel.current;target?.focus(); return () => previous?.focus?.();}, []);
  const shown = entries.slice(spread * per, spread * per + per);
  // A page turned is heard; at the first or the last page nothing turns.
  const turn = by => {const next = Math.max(0, Math.min(count - 1, spread + by)); if (next === spread) return; play('page', {volume: .8}); setSpread(next);};
  return <div className="atelier-overlay dessert-book-overlay" onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
    <section className="dessert-book" ref={panel} role="dialog" aria-modal="true" aria-label="甜品簿" tabIndex={-1} onKeyDown={e => {if (e.target.closest('textarea,input,form')) return; if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') turn(-1); if (e.key === 'ArrowRight') turn(1);}}>
      <header><button className="dessert-book-close" onClick={onClose} aria-label="合上甜品簿"><NavigationIcon name="back"/></button><div><span>Le carnet sucré</span><h2>甜品簿</h2></div><small>{entries.length ? `吃过 ${entries.length} 份` : ''}</small></header>
      {entries.length ? <div className={`dessert-spread${wide ? ' wide' : ''}`}>
        {Array.from({length: per}, (_, i) => <Page key={shown[i]?.id || i} page={shown[i]} onWords={onWords} startWriting={shown[i]?.id===writingId} number={shown[i] ? spread * per + i + 1 : ''}/>)}
      </div> : <div className="dessert-spread empty"><article className="dessert-page"><h3>还是空白的一页</h3><p>做一份甜品或者一盘菜，放进餐桌的玻璃罩，两个人一起吃掉，它就会记在这里。</p></article></div>}
      {entries.length > per && <nav className="dessert-book-turn"><button onClick={() => turn(-1)} disabled={spread === 0} aria-label="往前翻">‹ 往前翻</button><span>{spread + 1} / {count}</span><button onClick={() => turn(1)} disabled={spread === count - 1} aria-label="往后翻">往后翻 ›</button></nav>}
    </section>
  </div>;
}

