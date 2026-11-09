import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useThree} from '@react-three/fiber';
import {QuietCanvas} from './quiet-canvas.jsx';
import {Icon as NavigationIcon} from './icons.jsx';
import {Picture,PictureStudio} from './picture-studio.jsx';
import {cachedPictures} from './brick-pictures.js';
import {costOf,short as stockShort,left as stockLeft,shown as stockShown} from './bench-stock.js';
import {Egg} from './dessert-tools.jsx';
import {Raw} from './cooking-tools.jsx';
import {ServedDish,RiceBowl} from './cooking-pot-food.jsx';
import {INGREDIENTS,MAINS,ITEMS_MAX,EXTRAS,EXTRA_PRODUCE,dishName,dishProblems,heatWords} from './cooking-recipe.js';
import {mishapWords} from './cooking-mishaps.js';
import {localDay,NAME_MAX,NOTE_MAX} from './dessert-recipe.js';
import {CookingSteps} from './cooking-steps.jsx';
import './dessert.css';
import './cooking.css';

// The stove: nothing is picked off a menu. What is taken out of the fridge and put on the counter is what gets
// cooked (src/cooking-steps.jsx); the dish is called after what went into the wok, a name that can be changed,
// with a line for its tag, and it goes into the backpack. Laid out like the dessert table: the counter on the left,
// the card on the right, and below, the fridge: what came in from going out, and the eggs that are always there.
const VIEW = [0, 3.3, 3.6];
const pictureKey = id => 'cook-raw:' + id;

// What is on the counter, on a wooden board the way it will go to the sink; afterwards, the dish on its plate.
function View({zoomTo}) {
  const {camera, size} = useThree();
  useEffect(() => {camera.position.set(...VIEW); camera.lookAt(0, .15, 0); camera.zoom = Math.min(size.width / zoomTo, size.height / (zoomTo * .82)); camera.updateProjectionMatrix();}, [camera, size.width, size.height, zoomTo]);
  return null;
}
function RawThing({id}) {
  if (id === 'rice') return <group scale={1.5}><RiceBowl/></group>;
  if (id === 'egg') return <group>{[-.13, .13].map((x, i) => <group key={x} position={[x, .17, 0]} rotation={[0, i ? .3 : -.2, Math.PI / 2]} scale={1.2}><Egg brown={i === 1}/></group>)}</group>;
  return <Raw id={id}/>;
}
const SPACE = {tomato: .75, greens: 1.0, pumpkin: .85, pea: .75, egg: .7, rice: .8, taro: .7, bamboo: .9, wheat: .9, tea: .65};
function OnTheCounter({picked}) {
  const widths = picked.map(id => SPACE[id]), total = widths.reduce((a, b) => a + b, 0);
  let x = -total / 2;
  return <group>
    <mesh position={[0, -.04, 0]} receiveShadow castShadow><boxGeometry args={[Math.max(2.4, total + .5), .08, 1.5]}/><meshStandardMaterial color="#e2c39d" roughness={.7}/></mesh>
    {picked.map((id, i) => {const at = x + widths[i] / 2; x += widths[i]; return <group key={id} position={[at, 0, id === 'greens' ? -.45 : 0]} rotation={[0, id === 'greens' ? .15 : 0, 0]} scale={id === 'greens' ? .8 : 1}><RawThing id={id}/></group>;})}
  </group>;
}

// stock: what the benches have (src/bench-stock.js); start: what was taken out of the backpack to cook with.
export function CookingTable({stock = null, start = [], look = 'cream', onFinish, onClose}) {
  const panel = useRef();
  const [picked, setPicked] = useState(() => start.filter(id => MAINS.includes(id)).slice(0, ITEMS_MAX));
  const [cooking, setCooking] = useState(false), [made, setMade] = useState(null), [saved, setSaved] = useState(false);
  const [name, setName] = useState(''), [note, setNote] = useState('');
  const left = id => INGREDIENTS[id].staple ? Infinity : stock ? stockLeft(stock, 'produce', INGREDIENTS[id].produce) : Infinity;
  const lack = stock && picked.length ? stockShort(stock, costOf({kind: 'dish', items: picked})) : null;
  const [message, setMessage] = useState(start.length ? '想再拿点什么，就在下面点；都拿好了，点「炒一盘」或者「煮一锅」。' : '从下面的冰箱里拿菜，摆到台子上。');
  useEffect(() => {const previous = document.activeElement; panel.current?.focus(); return () => previous?.focus?.();}, []);
  // The fridge: each thing, as itself, with how many are left.
  const fridge = useMemo(() => MAINS.map(id => {
    const n = left(id), info = INGREDIENTS[id], seen = info.staple || !stock || stockShown(stock, 'produce', info.produce);
    return {id, label: info.name, n, note: info.staple ? (info.pot ? '米缸里一直有' : '冰箱里一直有') : !seen ? '还没摘到' : n ? `还有 ${n} 份` : '用完了'};
  }), [stock]);
  const wanted = useMemo(() => MAINS.map(id => ({key: pictureKey(id), node: <RawThing id={id}/>})), []);
  const [pictures, setPictures] = useState(() => cachedPictures(wanted.map(w => w.key)));
  const toggle = c => {
    if (made) return;
    if (picked.includes(c.id)) {setPicked(p => p.filter(i => i !== c.id)); return;}
    if (c.n < 1) {setMessage(stockShort(stock, costOf({kind: 'dish', items: [c.id]}))?.words || `${c.label}用完了`); return;}
    if (picked.length >= ITEMS_MAX) {setMessage(`台子上最多摆 ${ITEMS_MAX} 样。`); return;}
    setPicked(p => [...p, c.id]); setMessage(`${c.label}摆上台子了。`);
  };
  // Two ways to cook what is on the counter: stir-fried in the wok, or simmered in the little pot (rice only that way).
  const [method, setMethod] = useState('wok');
  const potOnly = picked.some(id => INGREDIENTS[id].pot);
  // What can be thrown in: spring onion and garlic always, honey and the nuts once brought home and not used up.
  const extrasOk = Object.keys(EXTRAS).filter(e => !EXTRA_PRODUCE[e] || !stock || stockLeft(stock, 'produce', EXTRA_PRODUCE[e]) > 0);
  const begin = (way = 'wok') => {
    if (!picked.length) {setMessage('先从冰箱里拿点什么出来。'); return;}
    if (lack) {setMessage(lack.words); return;}
    if (way === 'wok' && potOnly) {setMessage(picked.includes('rice') ? '米得用小锅熬粥，点「煮一锅」。' : '茶叶得用小锅煮，点「煮一锅」。'); return;}
    setMethod(way); setSaved(false); setCooking(true);
  };
  const cooked = ({items, extras, heat, cuts, mishaps = [], method: way = method}) => {
    setCooking(false);
    if (!items.length) {setMessage('锅里什么也没下，菜还在台子上，想做再来。'); return;}
    setMade({items, extras, heat, cuts, mishaps, method: way}); setName(dishName(items, way, extras)); setNote('');
    setMessage(`做好啦，${[heatWords({items, heat, method: way}), ...mishapWords(mishaps)].join('，')}。起个名字，收进背包吧。`);
  };
  const dish = made ? {kind: 'dish', v: 1, items: made.items, ...(made.method === 'pot' ? {method: 'pot'} : {}), ...(made.extras.length ? {extras: made.extras} : {}), name, note, ...(made.heat !== 'just' ? {heat: made.heat} : {}), ...(Object.entries(made.cuts).some(([id, n]) => n !== INGREDIENTS[id].cuts) ? {cuts: Object.fromEntries(Object.entries(made.cuts).filter(([id, n]) => n !== INGREDIENTS[id].cuts))} : {}), ...(made.mishaps?.length ? {mishaps: made.mishaps} : {})} : null;
  const problems = dish ? dishProblems(dish) : [];
  const save = () => {
    if (!dish) {begin(); return;}
    if (problems.length) {setMessage(problems[0]); return;}
    const cost = stockShort(stock, costOf(dish));
    if (stock && cost) {setMessage(cost.words); return;}
    onFinish({...dish, name: name.trim(), note: note.trim(), by: {kind: 'self'}, madeOn: localDay()});
    setSaved(true); setMade(null); setPicked([]);
    setMessage('收进背包了。在背包里点「端上桌」，就摆到餐桌上，两个人一起吃。');
  };
  const back = () => cooking ? setCooking(false) : onClose();
  return <div className="atelier-overlay" onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
    <section className="atelier dessert-atelier cooking-atelier" ref={panel} role="dialog" aria-modal="true" aria-label="小小厨房" tabIndex={-1} onKeyDown={e => {
      if (e.key === 'Escape') back();
      if (e.key === 'Tab') {const els = [...panel.current.querySelectorAll('button,input,select')].filter(n => !n.disabled), a = els[0], b = els.at(-1); if (e.shiftKey && (document.activeElement === a || document.activeElement === panel.current)) {e.preventDefault(); b?.focus();} else if (!e.shiftKey && (document.activeElement === b || document.activeElement === panel.current)) {e.preventDefault(); a?.focus();}}
    }}>
      <header className="atelier-header"><button className="atelier-back" onClick={back} aria-label={cooking ? '不做了，回到台子前' : '返回厨房'}><NavigationIcon name="back"/></button><div><span className="atelier-wordmark">porchlit</span><p>小小厨房</p></div><span className="atelier-autosave">{cooking ? '一步一步做' : saved ? '已收进背包' : made ? '做好了，还没收' : '从冰箱拿菜'}</span></header>
      <div className="bench dessert-bench">
        {cooking ? <CookingSteps items={picked} method={method} look={look} extrasOk={extrasOk} onDone={cooked} onQuit={() => {setCooking(false); setMessage('不做了也没关系，菜还在台子上，想做再来。');}}/> : <>
        <div className="atelier-top">
          <div className="atelier-stage bench-stage dessert-stage cooking-plate-stage">
            <div className="atelier-wall"/>
            <QuietCanvas orthographic shadows camera={{position: VIEW, zoom: 120}} dpr={[1, 1.5]}>
              <View zoomTo={dish ? 3.6 : Math.max(3.2, picked.length * .95 + 1.2)}/>
              <ambientLight intensity={1.15}/><hemisphereLight args={['#fff8e9', '#c3ac9b', .9]}/><directionalLight position={[-4, 8, 6]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]}/>
              {dish ? <>
                {/* A linen placemat with a stitched edge, the way it will sit on the table. */}
                <mesh position={[0, -.035, 0]} receiveShadow><boxGeometry args={[3.1, .03, 2.3]}/><meshStandardMaterial color="#efdcc6" roughness={.9}/></mesh>
                <mesh position={[0, -.018, 0]}><boxGeometry args={[2.9, .006, 2.1]}/><meshStandardMaterial color="#f6e9d8" roughness={.9}/></mesh>
                <group position={[0, -.02, 0]}><ServedDish item={dish} look={look}/></group>
              </> : <OnTheCounter picked={picked}/>}
              <PictureStudio items={wanted.filter(w => !pictures[w.key])} view={[0, 3.3, 3.6]} onPictures={got => setPictures(p => ({...p, ...got}))}/>
            </QuietCanvas>
          </div>
          <aside className="atelier-card bench-card dessert-card">
            {dish ? <>
              <label>给它起个名字<input value={name} maxLength={NAME_MAX} onChange={e => setName(e.target.value)}/></label>
              <label>小签上写一句话<input value={note} maxLength={NOTE_MAX} placeholder="可以空着" onChange={e => setNote(e.target.value)}/></label>
              <button className="atelier-save" disabled={saved || problems.length > 0} onClick={save}>{saved ? '已收进背包' : '做好了 · 收进背包'}</button>
            </> : <>
              <p className="cooking-counter-list"><b>台子上</b>{picked.length ? picked.map(id => INGREDIENTS[id].name).join('、') : '还空着'}</p>
              <div className="cooking-ways">
                <button className="atelier-save" disabled={!picked.length || !!lack || potOnly} onClick={() => begin('wok')}>炒一盘</button>
                <button className="atelier-save" disabled={!picked.length || !!lack} onClick={() => begin('pot')}>煮一锅</button>
              </div>
            </>}
            <p role="status">{lack && !dish ? lack.words : message}</p>
          </aside>
        </div>
        <div className="atelier-tray">
          <nav><button className="active">冰箱</button></nav>
          <div className="atelier-tray-content bench-tray">
            <div className="bench-chips dessert-chips">{fridge.map(c => <button key={c.id} className={`with-picture${picked.includes(c.id) ? ' picked' : ''}`} disabled={!!made || (!picked.includes(c.id) && c.n < 1)} aria-pressed={picked.includes(c.id)} onClick={() => toggle(c)}><Picture big src={pictures[pictureKey(c.id)]}/><span>{c.label}<small>{picked.includes(c.id) ? '在台子上' : c.note}</small></span></button>)}</div>
          </div>
          <p className="cooking-tray-note">葱、蒜、油、盐厨房里一直有，{extrasOk.some(e => EXTRA_PRODUCE[e]) ? `${extrasOk.filter(e => EXTRA_PRODUCE[e]).map(e => EXTRAS[e]).join('、')}也带回来了，` : ''}到了锅前想放就放。</p>
        </div>
        </>}
      </div>
    </section>
  </div>;
}
