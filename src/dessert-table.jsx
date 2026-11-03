import {flavourLabel} from './dessert-taste.js';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {MOUSE,TOUCH,Vector3} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {QuietCanvas} from './quiet-canvas.jsx';
import {Icon as NavigationIcon} from './icons.jsx';
import {Picture,PictureStudio} from './picture-studio.jsx';
import {cachedPictures} from './brick-pictures.js';
import {ROLES} from './brick-recipe.js';
import {costOf,short as stockShort,left as stockLeft,shown as stockShown,BASE_FLAVOURS} from './bench-stock.js';
import {DessertModel} from './dessert-model.jsx';
import {DESSERT_OPTIONS,DESSERT_LABELS,DESSERT_TONES,toneLabel,normalizeDessert,dessertProblems,dessertRecipe,dessertStarters,availableBases,learnedLabel,localDay,BAKE_WORDS,NAME_MAX,NOTE_MAX} from './dessert-recipe.js';
import {DessertSteps} from './dessert-steps.jsx';
import './dessert.css';

// The dessert table, on the kitchen island. Laid out like the craft room's
// tables: the dessert on a turntable on the left, a card with its name and the
// words for its tag, and a tray below where each choice shows a little picture
// of this very dessert with that choice made. 跟着做 swaps the stage for the
// kitchen and makes it by hand, a step at a time (dessert-steps.jsx).
const WhiskIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5 9 15"/><path d="M9 15C6.3 10.4 9 3.4 15 3.2c5-.2 7.3 4.9 5.2 8.6C18.3 15.4 12.6 17.3 9 15z"/><path d="M9 15c1.1-4.4 4.3-8 9-9.3M9 15c3.3-.9 7.5-3.4 11.1-7.6"/></svg>;

const VIEW = [7, 6, 9];
const TABS = [['base', '种类'], ['cream', '奶油'], ['fruit', '水果'], ['sprinkles', '糖粒'], ['plate', '盘子'], ['color', '颜色'], ['start', '底稿']];
const keyOf = d => 'dessert:' + JSON.stringify(dessertRecipe({...d, name: ''}));

// Drag to turn round it, right-drag or two fingers to slide, wheel or pinch to
// zoom; the buttons turn, zoom and come back to the front.
function TableCamera({api}) {
  const {camera, gl, size, invalidate} = useThree(), controls = useRef();
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement); controls.current = c;
    Object.assign(c, {enableDamping: true, dampingFactor: .12, minZoom: 30, maxZoom: 320, minPolarAngle: .1, maxPolarAngle: Math.PI * .47, screenSpacePanning: true});
    c.mouseButtons.LEFT = MOUSE.ROTATE; c.mouseButtons.RIGHT = MOUSE.PAN; c.touches.ONE = TOUCH.ROTATE; c.touches.TWO = TOUCH.DOLLY_PAN;
    c.addEventListener('change', invalidate);
    return () => {c.removeEventListener('change', invalidate); c.dispose(); controls.current = null; api.current = null;};
  }, [camera, gl, invalidate, api]);
  useEffect(() => {
    const c = controls.current; if (!c) return;
    const reset = () => {camera.position.set(...VIEW); c.target.set(0, .45, 0); camera.zoom = Math.max(40, Math.min(size.width / 3.4, size.height / 2.7)); camera.updateProjectionMatrix(); c.update(); invalidate();};
    api.current = {reset, zoom: f => {camera.zoom = Math.max(c.minZoom, Math.min(c.maxZoom, camera.zoom * f)); camera.updateProjectionMatrix(); c.update(); invalidate();}, turn: a => {const o = camera.position.clone().sub(c.target).applyAxisAngle(new Vector3(0, 1, 0), a); camera.position.copy(c.target).add(o); c.update(); invalidate();}};
    reset();
  }, [camera, size.width, size.height, invalidate, api]);
  useFrame(() => controls.current?.update());
  return null;
}

// stock: what the benches have to work with (src/bench-stock.js): the flavours of the cream, the sponge and the
// sprinkles come out of bottles of essence, fruit by the handful; the plate's colour is only a colour.
export function DessertTable({draft, learned = [], stock = null, onDraft, onFinish, onClose}) {
  const d = normalizeDessert(draft?.kind === 'dessert' ? draft : undefined), panel = useRef(), view = useRef(null);
  const [tab, setTab] = useState('base'), [tone, setTone] = useState('body'), [saved, setSaved] = useState(false), [cooking, setCooking] = useState(false);
  const [message, setMessage] = useState('在下面挑种类、奶油和水果；拖动台面转一转。');
  const problems = dessertProblems(d);
  useEffect(() => {const previous = document.activeElement; panel.current?.focus(); return () => previous?.focus?.();}, []);
  const patch = delta => {onDraft({...d, ...delta}); setSaved(false);};
  // The choices on this tab, each as this dessert with that choice made.
  const choices = useMemo(() => {
    // Only the kinds this kitchen can make (see availableBases).
    const bases = availableBases();
    if (tab === 'start') return [...Object.entries(dessertStarters).map(([id, s]) => ({id, label: s.label, recipe: s.recipe()})).filter(c => bases.includes(c.recipe.base)), ...learned.map(r => ({id: r.id, label: r.recipe.name, note: learnedLabel(r.from), recipe: {...r.recipe, note: ''}}))];
    if (tab === 'color') return [];
    if (tab === 'fruit' && stock) return DESSERT_OPTIONS.fruit.filter(id => id === 'none' || stockShown(stock, 'fruit', id)).map(id => {
      const n = id === 'none' ? Infinity : stockLeft(stock, 'fruit', id);
      return {id, label: DESSERT_LABELS.fruit[id], note: n === Infinity ? '' : n ? `还剩 ${n} 捧` : '用完了', out: n < 1 && d.fruit !== id, recipe: {...d, fruit: id}};
    });
    return (tab === 'base' ? bases : DESSERT_OPTIONS[tab]).map(id => ({id, label: DESSERT_LABELS[tab][id], recipe: {...d, [tab]: id}}));
  }, [tab, JSON.stringify(dessertRecipe(d)), learned, stock]);
  const wanted = useMemo(() => choices.map(c => ({key: keyOf(c.recipe), node: <DessertModel item={c.recipe}/>})), [choices]);
  const [pictures, setPictures] = useState(() => cachedPictures(wanted.map(w => w.key)));
  const save = () => {
    if (problems.length) {setMessage(problems[0]); return;}
    const lack = stock && stockShort(stock, costOf(d));
    if (lack) {setMessage(lack.words); return;}
    onFinish({...d, name: d.name.trim(), note: d.note.trim(), by: {kind: 'self'}, madeOn: localDay()});
    setSaved(true); setMessage('做好啦，收进背包了。在背包里点「放进玻璃罩」，它就摆到餐桌上。');
  };
  const chosen = c => tab === 'start' ? false : d[tab] === c.id;
  const free = id => BASE_FLAVOURS.includes(id) || (tone === 'body' && id === 'gold');
  const pick = c => {
    if (tab === 'start') {patch({...c.recipe, note: d.note, bake: c.recipe.bake, hand: c.recipe.hand, burst: c.recipe.burst}); setMessage(c.note ? `${c.note}的「${c.label}」，每一样都能改。` : `换成了「${c.label}」，每一样都能改。`); return;}
    // Another kind is another bake, and nothing placed on the last one carries over;
    // another kind of piping, fruit or sprinkles goes back to the usual layout.
    if (tab === 'base') {patch({base: c.id, bake: undefined, hand: undefined, burst: undefined}); return;}
    const layer = {cream: 'cream', fruit: 'fruit', sprinkles: 'sprinkles'}[tab];
    if (layer && d.hand?.[layer] && d[tab] !== c.id) {const {[layer]: _, ...rest} = d.hand; patch({[tab]: c.id, hand: Object.keys(rest).length ? rest : undefined}); return;}
    patch({[tab]: c.id});
  };
  // Back from the kitchen with how long it baked (golden is the plain recipe),
  // where the piping, fruit and sprinkles were put, and which cream puffs were
  // filled till they ran over. Anything she left off on the way (no piping, no
  // fruit, no sprinkles) is left off.
  const made = ({bake, hand, left, burst}) => {patch({...(left || {}), bake: bake === 'golden' ? undefined : bake, hand: hand && Object.keys(hand).length ? hand : undefined, burst: burst?.length ? burst : undefined}); setCooking(false); setMessage(`做好啦，${BAKE_WORDS[bake]}。起个名字，收进背包吧。`);};
  const back = () => cooking ? setCooking(false) : onClose();
  return <div className="atelier-overlay" onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
    <section className="atelier dessert-atelier" ref={panel} role="dialog" aria-modal="true" aria-label="小小甜品台" tabIndex={-1} onKeyDown={e => {
      if (e.key === 'Escape') back();
      if (e.key === 'Tab') {const els = [...panel.current.querySelectorAll('button,input,select')].filter(n => !n.disabled), a = els[0], b = els.at(-1); if (e.shiftKey && (document.activeElement === a || document.activeElement === panel.current)) {e.preventDefault(); b?.focus();} else if (!e.shiftKey && (document.activeElement === b || document.activeElement === panel.current)) {e.preventDefault(); a?.focus();}}
    }}>
      <header className="atelier-header"><button className="atelier-back" onClick={back} aria-label={cooking ? '不做了，回去挑' : '返回厨房'}><NavigationIcon name="back"/></button><div><span className="atelier-wordmark">porchlit</span><p>小小甜品台</p></div><span className="atelier-autosave">{cooking ? '跟着做' : saved ? '已收进背包' : '甜品草稿 · 自动保存'}</span></header>
      <div className="bench dessert-bench">
        {cooking ? <DessertSteps draft={d} onDone={made} onQuit={() => setCooking(false)}/> : <>
        <div className="atelier-top">
          <div className="atelier-stage bench-stage dessert-stage">
            <div className="atelier-wall"/>
            <button className="dessert-cook" onClick={() => setCooking(true)}><WhiskIcon/>跟着做</button>
            <QuietCanvas orthographic shadows camera={{position: VIEW, zoom: 90}} dpr={[1, 1.5]}>
              <TableCamera api={view}/>
              <ambientLight intensity={1.15}/><hemisphereLight args={['#fff8e9', '#c3ac9b', .9]}/><directionalLight position={[-4, 8, 6]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]}/>
              <DessertModel item={d}/>
              <mesh position={[0, -.07, 0]} receiveShadow><cylinderGeometry args={[1.38, 1.38, .14, 64]}/><meshStandardMaterial color="#fff4e3" roughness={.48}/></mesh>
              <mesh position={[0, -.15, 0]}><cylinderGeometry args={[1.43, 1.43, .04, 64]}/><meshStandardMaterial color="#cf9fab"/></mesh>
              <PictureStudio items={wanted.filter(w => !pictures[w.key])} view={VIEW} onPictures={got => setPictures(p => ({...p, ...got}))}/>
            </QuietCanvas>
            <div className="atelier-camera">
              <button onClick={() => view.current?.turn(-Math.PI / 4)} aria-label="向左转">↶</button><span>拖动转一转</span><button onClick={() => view.current?.turn(Math.PI / 4)} aria-label="向右转">↷</button>
              <button onClick={() => view.current?.zoom(1 / 1.2)} aria-label="缩小">−</button><button onClick={() => view.current?.zoom(1.2)} aria-label="放大">＋</button><button onClick={() => view.current?.reset()} aria-label="回到正面">归位</button>
            </div>
          </div>
          <aside className="atelier-card bench-card dessert-card">
            <label>给它起个名字<input value={d.name} maxLength={NAME_MAX} onChange={e => patch({name: e.target.value})}/></label>
            <label>小签上写一句话<input value={d.note} maxLength={NOTE_MAX} placeholder="可以空着" onChange={e => patch({note: e.target.value})}/></label>
            <button className="atelier-save" disabled={saved || problems.length > 0} onClick={save}>{saved ? '已收进背包' : '做好了 · 收进背包'}</button>
            <p role="status">{message}</p>
          </aside>
        </div>
        <div className="atelier-tray">
          <nav>{TABS.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
          <div className="atelier-tray-content bench-tray">
            {tab === 'color' ? <div className="bench-colors dessert-colors">
              <div className="bench-chips">{DESSERT_TONES.map(t => <button key={t} className={tone === t ? 'active' : ''} onClick={() => setTone(t)}>{toneLabel(t, d.base)}</button>)}</div>
              <div className="dessert-flavours">{Object.entries(ROLES).filter(([id]) => tone === 'plate' || !stock || free(id) || stockShown(stock, 'essence', id)).map(([id, r]) => {const n = tone === 'plate' || !stock || free(id) ? Infinity : stockLeft(stock, 'essence', id); return <button key={id} aria-label={tone === 'plate' ? r.label : n === Infinity ? flavourLabel(id,tone) : `${flavourLabel(id,tone)}，还能做 ${n} 份`} aria-pressed={d.c[tone] === id} disabled={n < 1 && d.c[tone] !== id} data-left={n === Infinity ? undefined : n} onClick={() => patch({c: {...d.c, [tone]: id}})}><i style={{background:r.color}}/><span>{tone === 'plate' ? r.label : flavourLabel(id,tone)}</span></button>;})}</div>
            </div> : <div className="bench-chips dessert-chips">{choices.map(c => <button key={c.id} className={`with-picture${chosen(c) ? ' active' : ''}`} disabled={!!c.out} onClick={() => pick(c)}><Picture big src={pictures[keyOf(c.recipe)]}/><span>{c.label}{c.note && <small>{c.note}</small>}</span></button>)}</div>}
          </div>
        </div>
        </>}
      </div>
    </section>
  </div>;
}

