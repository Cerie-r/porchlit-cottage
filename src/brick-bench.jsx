import React,{useState,useMemo,useRef,useEffect} from 'react';
import * as THREE from 'three';
import {QuietCanvas} from './quiet-canvas.jsx';
import {useThree} from '@react-three/fiber';
import {PARTS,ROLES,MATERIALS,SCALES,BASE,PLATE,MAX_PARTS,expand,footprint,mirrored,placementProblem,hangingLevel,recipeProblems,stillHolds,freshBuild,normalizeBuild,partCount,starters} from './brick-recipe.js';
import {BuildModel,PartMesh,placeOf} from './brick-model.jsx';
import {drawPictures,partLook,turnedLook} from './brick-pictures.js';
import {Picture} from './picture-studio.jsx';

// The brick bench in the craft room: pick a part, tap the baseplate or another
// part to put it there (on top, or beside it; cloth hangs from what is above),
// or switch to choosing and change a part already placed. Everything is a
// recipe in the brick language, so what is built here is what a home's AI can
// write too.

const ghostMaterial = ok => new THREE.MeshBasicMaterial({color: ok ? '#8fb59a' : '#d4505a', transparent: true, opacity: .45, depthWrite: false});
const GHOST = {ok: ghostMaterial(true), bad: ghostMaterial(false)};
const HANGS = new Set(['drape']);
const NEAR = [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
const sizeLabel = ([w, d]) => `${w}×${d}`;
const SCALE_NOTE = {small: '做成小摆件：放进屋里，刚好摆在桌上、柜子上。', furniture: '做成家具：放进屋里，和别的家具一样大。'};
let seq = 0;
const newId = () => `b${Date.now().toString(36)}${(++seq).toString(36)}`;

function Zoom({zoom}) {const {camera, invalidate} = useThree(); useEffect(() => {camera.zoom = zoom; camera.updateProjectionMatrix(); invalidate();}, [camera, zoom, invalidate]); return null;}

// Keys for the buttons' little pictures.
const pictureKey = {
  part: (id, role, mat, profile) => `part:${id}:${role}:${mat}:${PARTS[id].profiles ? profile : ''}`,
  turned: (id, role, mat) => `turned:${id}:${role}:${mat}`,
  start: id => `start:${id}`
};

// A thin box around the chosen part (and its mirror image).
function Outline({part, faint}) {
  const f = footprint(part), [x, y, z] = placeOf(part);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(f.w + .1, f.h * PLATE + .12, f.d + .1)), [f.w, f.h, f.d]);
  useEffect(() => () => edges.dispose(), [edges]);
  return <lineSegments geometry={edges} position={[x, y + f.h * PLATE / 2, z]} raycast={() => null}><lineBasicMaterial color={faint ? '#d3aebd' : '#a3506f'}/></lineSegments>;
}

function Baseplate({onPointerMove, onClick}) {
  const studs = useMemo(() => {const g = new THREE.CylinderGeometry(.3, .3, .17, 12).translate(0, .085, 0); return g;}, []);
  const ref = useRef();
  useEffect(() => {const m = new THREE.Matrix4(); let i = 0; for (let x = 0; x < BASE; x++) for (let z = 0; z < BASE; z++) ref.current.setMatrixAt(i++, m.makeTranslation(x - BASE / 2 + .5, 0, z - BASE / 2 + .5)); ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere();}, []);
  return <group>
    <mesh position={[0, -.2, 0]} receiveShadow onPointerMove={onPointerMove} onClick={onClick} userData={{baseplate: true}}><boxGeometry args={[BASE, .4, BASE]}/><meshStandardMaterial color="#efe2d1" roughness={.6}/></mesh>
    <instancedMesh ref={ref} args={[studs, undefined, BASE * BASE]} raycast={() => null}><meshStandardMaterial color="#e6d6c2" roughness={.6}/></instancedMesh>
  </group>;
}

export function BrickBench({draft, onDraft, onFinish}) {
  const d = useMemo(() => normalizeBuild(draft?.kind === 'build' ? draft : freshBuild()), [draft]);
  const [tool, setTool] = useState('place'), [tab, setTab] = useState('parts');
  const [kind, setKind] = useState('brick'), [size, setSize] = useState([1, 2]), [height, setHeight] = useState(3), [profile, setProfile] = useState('vase');
  const [role, setRole] = useState('cream'), [mat, setMat] = useState('plain'), [turn, setTurn] = useState(0);
  const [selected, setSelected] = useState(null), [ghost, setGhost] = useState(null), [undo, setUndo] = useState([]);
  const [message, setMessage] = useState('选一个零件，点底板放上去；点在零件顶上就叠上去，点在侧面就贴着它放。布会挂在上面伸出来的零件底下。');
  const [angle, setAngle] = useState(-.5), [zoom, setZoom] = useState(() => window.innerWidth < 600 ? 19 : 27);
  const [saved, setSaved] = useState(false), [pictures, setPictures] = useState({});
  const model = useRef(), drag = useRef(null);
  // Pictures follow the colour and material about to be used; drawn just
  // after the bench shows up, not before.
  useEffect(() => {
    const timer = setTimeout(() => {
      const wanted = {};
      for (const id of Object.keys(PARTS)) wanted[pictureKey.part(id, role, mat, profile)] = partLook(id, role, mat, profile);
      for (const id of Object.keys(PARTS.lathe.profiles)) wanted[pictureKey.turned(id, role, mat)] = turnedLook(id, role, mat);
      for (const [id, s] of Object.entries(starters)) wanted[pictureKey.start(id)] = s.recipe();
      setPictures(drawPictures(wanted));
    }, 30);
    return () => clearTimeout(timer);
  }, [role, mat, profile]);
  const drawn = useMemo(() => expand(d), [d]);
  const chosen = d.parts.find(p => p.id === selected);

  const commit = next => {setUndo(u => [...u.slice(-39), d]); onDraft(next); setSaved(false);};
  const chooseKind = id => {const spec = PARTS[id]; setKind(id); setSize(spec.sizes[0]); setHeight(spec.heights[0]); setTool('place'); setSelected(null); setTab('size');};

  // What would be wrong with adding this part, or null.
  const problemWith = part => {
    let why = placementProblem(drawn, part);
    // With mirroring on, its image has to fit too (and not run into it).
    if (!why && d.mirror) why = recipeProblems({...d, name: '·', parts: [...d.parts, part]})[0] || null;
    if (!why && partCount({...d, parts: [...d.parts, part]}) > MAX_PARTS) why = `最多 ${MAX_PARTS} 块零件`;
    return why;
  };
  // Where a tap would put the current part: on the baseplate, on top of a
  // part, or beside it, on the studs nearest the tap. Beside a part it lines
  // up with that part's bottom or else its top, whichever holds on. Cloth
  // first looks for something to hang from. (The camera never looks up, so
  // the bottom of a part can't be tapped.)
  const target = (e, hitPart) => {
    const local = model.current.worldToLocal(e.point.clone());
    const normal = e.face ? e.face.normal.clone().transformDirection(e.object.matrixWorld).applyQuaternion(model.current.getWorldQuaternion(new THREE.Quaternion()).invert()) : new THREE.Vector3(0, 1, 0);
    let px = local.x, pz = local.z;
    const levels = [];
    if (!hitPart) levels.push(0);
    else {
      const f = footprint(hitPart);
      if (normal.y > .5) levels.push(f.y + f.h);
      else if (normal.y < -.5) levels.push(f.y - height);
      else {levels.push(f.y, f.y + f.h - height); px += normal.x * .5; pz += normal.z * .5;}
    }
    const odd = turn % 2 === 1, fw = odd ? size[1] : size[0], fd = odd ? size[0] : size[1];
    const cx = Math.floor(px + BASE / 2), cz = Math.floor(pz + BASE / 2);
    const x = Math.max(0, Math.min(BASE - fw, cx - Math.floor((fw - 1) / 2))), z = Math.max(0, Math.min(BASE - fd, cz - Math.floor((fd - 1) / 2)));
    const part = {id: newId(), p: kind, x, y: levels[0], z, w: size[0], d: size[1], h: height, turn, c: role, ...(mat !== 'plain' ? {mat} : {}), ...(PARTS[kind].profiles ? {profile} : {})};
    // Cloth looks for something to hang from right above it, or one stud
    // away: the space under a ledge is half hidden behind the ledge.
    if (HANGS.has(kind)) for (const [dx, dz] of NEAR) {
      const moved = {...part, x: x + dx, z: z + dz};
      if (moved.x < 0 || moved.z < 0 || moved.x + fw > BASE || moved.z + fd > BASE) continue;
      const y = hangingLevel(drawn, moved, Math.max(0, levels[0]));
      if (y !== null && !problemWith({...moved, y})) return {part: {...moved, y}, why: null};
    }
    let first = null;
    for (const y of new Set(levels)) {
      const t = {part: {...part, y}, why: problemWith({...part, y})};
      if (!t.why) return t;
      if (!first) first = t;
    }
    return first;
  };
  const hover = (e, hitPart) => {if (tool !== 'place') return; e.stopPropagation(); setGhost(target(e, hitPart));};
  const tap = (e, hitPart) => {
    if (e.delta > 5) return; e.stopPropagation();
    if (tool === 'choose') {setSelected(hitPart ? hitPart.mirrorOf || hitPart.id : null); if (hitPart) setMessage('选中了。可以换颜色、转一转、挪一格，或者拆下来。'); return;}
    const t = target(e, hitPart);
    if (t.why) {setMessage(t.why); setGhost(t); return;}
    commit({...d, parts: [...d.parts, t.part]}); setGhost(null);
    const twin = d.mirror && expand({...d, parts: [t.part]}).length > 1;
    setMessage(`放好了一块${PARTS[kind].label}。${twin ? '对面也有一块。' : d.mirror ? '它正好在中线上，只有一块。' : ''}`);
  };

  // Changing the chosen part: it has to fit where it ends up.
  const change = delta => {
    if (!chosen) return;
    const next = {...chosen, ...delta}, parts = d.parts.map(p => p.id === chosen.id ? next : p), problems = recipeProblems({...d, name: '·', parts});
    if (problems.length) {setMessage(problems[0].includes('叠') ? '那里放不下。' : problems[0]); return;}
    commit({...d, parts});
  };
  const remove = () => {
    if (!chosen) return;
    if (!stillHolds(d, chosen.id)) {setMessage('先拆掉靠它撑着的零件。'); return;}
    commit({...d, parts: d.parts.filter(p => p.id !== chosen.id)}); setSelected(null); setMessage('拆下来了。');
  };
  const toggleMirror = () => {
    const next = {...d, mirror: !d.mirror}, problems = next.mirror && d.parts.length ? recipeProblems({...next, name: '·'}) : [];
    if (problems.length) {setMessage(`现在还对称不了：${problems[0]}`); return;}
    commit(next); setMessage(next.mirror ? '左右对称开着：放在一边，另一边跟着长出来。' : '对称关了。');
  };
  const problems = recipeProblems(d), count = partCount(d);
  const save = () => {if (problems.length) {setMessage(problems[0]); return;} onFinish(d); setSaved(true); setMessage('收进背包了，可以拿出来摆在屋里。');};
  const spec = PARTS[kind];

  return <div className="bench">
    <div className="atelier-top">
      <div className="atelier-stage bench-stage"
        onPointerDown={e => {drag.current = {x: e.clientX, a: angle, moved: false};}}
        onPointerMove={e => {const g = drag.current; if (g && (g.moved || Math.abs(e.clientX - g.x) > 6)) {g.moved = true; setAngle(g.a + (e.clientX - g.x) * .008);}}}
        onPointerUp={() => {drag.current = null;}} onPointerLeave={() => {drag.current = null; setGhost(null);}}>
        <div className="atelier-wall"/>
        <QuietCanvas shadows orthographic camera={{position: [11, 13, 13], zoom: 27}} dpr={[1, 1.5]}>
          <Zoom zoom={zoom}/>
          <ambientLight intensity={1.1}/><hemisphereLight args={['#fff8e9', '#c3ac9b', .9]}/>
          <directionalLight position={[-5, 12, 7]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12}/>
          <group ref={model} rotation={[0, angle, 0]} position={[0, -2.2, 0]}>
            <Baseplate onPointerMove={e => hover(e, null)} onClick={e => tap(e, null)}/>
            <BuildModel recipe={d} onPart={(e, p) => tap(e, p)} onPartMove={(e, p) => hover(e, p)}/>
            {tool === 'place' && ghost && <>
              <PartMesh part={ghost.part} material={ghost.why ? GHOST.bad : GHOST.ok}/>
              {d.mirror && <PartMesh part={mirrored(ghost.part)} material={ghost.why ? GHOST.bad : GHOST.ok}/>}
            </>}
            {tool === 'choose' && chosen && drawn.filter(p => p.id === chosen.id || p.mirrorOf === chosen.id).map(p => <Outline key={p.id} part={p} faint={!!p.mirrorOf}/>)}
            {d.mirror && <mesh position={[0, .02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}><planeGeometry args={[.06, BASE]}/><meshBasicMaterial color="#c98f9f" transparent opacity={.7}/></mesh>}
          </group>
        </QuietCanvas>
        <div className="atelier-camera">
          <button onClick={() => setAngle(a => a - Math.PI / 4)} aria-label="向左转">↶</button><span>拖动转一转</span>
          <button onClick={() => setAngle(a => a + Math.PI / 4)} aria-label="向右转">↷</button>
          <button onClick={() => setZoom(z => Math.max(12, z - 4))} aria-label="缩小">−</button><button onClick={() => setZoom(z => Math.min(60, z + 4))} aria-label="放大">＋</button>
        </div>
      </div>
      <aside className="atelier-card bench-card">
        <label>给它一个名字<input value={d.name} maxLength={30} onChange={e => {onDraft({...d, name: e.target.value}); setSaved(false);}}/></label>
        <div className="bench-scale" role="group" aria-label="做成多大">
          <span>做成</span>
          {Object.entries(SCALES).map(([id, label]) => <button key={id} className={d.scale === id ? 'active' : ''} aria-pressed={d.scale === id} onClick={() => {if (d.scale === id) return; commit({...d, scale: id}); setMessage(SCALE_NOTE[id]);}}>{label}</button>)}
        </div>
        <div className="bench-row">
          <button className={tool === 'place' ? 'active' : ''} onClick={() => {setTool('place'); setSelected(null);}}>放零件</button>
          <button className={tool === 'choose' ? 'active' : ''} onClick={() => {setTool('choose'); setGhost(null); setMessage('点一块零件选中它。');}}>选中修改</button>
        </div>
        <div className="bench-row">
          <button onClick={() => tool === 'choose' && chosen ? change({turn: ((chosen.turn || 0) + 1) % 4}) : setTurn(t => (t + 1) % 4)}>转 90° ↻</button>
          <button className={d.mirror ? 'active' : ''} aria-pressed={d.mirror} onClick={toggleMirror}>左右对称</button>
        </div>
        {tool === 'choose' && chosen && <div className="bench-edit">
          <div className="bench-arrows">
            {[['←', {x: chosen.x - 1}], ['→', {x: chosen.x + 1}], ['↑', {z: chosen.z - 1}], ['↓', {z: chosen.z + 1}], ['升', {y: chosen.y + 1}], ['降', {y: chosen.y - 1}]].map(([label, delta]) => <button key={label} onClick={() => change(delta)} aria-label={`挪 ${label}`}>{label}</button>)}
          </div>
          <button onClick={remove}>拆下</button>
        </div>}
        <div className="bench-row">
          <button disabled={!undo.length} onClick={() => {onDraft(undo.at(-1)); setUndo(u => u.slice(0, -1)); setSelected(null); setSaved(false);}}>撤销</button>
          <button disabled={!d.parts.length} onClick={() => {commit({...d, parts: []}); setSelected(null); setMessage('底板清空了，可以撤销。');}}>清空</button>
        </div>
        <button className="atelier-save" disabled={saved || problems.length > 0} onClick={save}>{saved ? '已收进背包' : '收进背包'}</button>
        <p role="status">{message}</p>
        <small className="bench-count">{count} / {MAX_PARTS} 块{problems.length && d.parts.length ? ` · ${problems[0]}` : ''}</small>
      </aside>
    </div>
    <div className="atelier-tray">
      <nav>{[['parts', '零件'], ['size', '尺寸'], ['color', '颜色'], ['start', '底稿']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
      <div className="atelier-tray-content bench-tray">
        {tab === 'parts' && <div className="bench-chips">{Object.entries(PARTS).map(([id, p]) => <button key={id} className={`with-picture${kind === id ? ' active' : ''}`} onClick={() => chooseKind(id)}><Picture src={pictures[pictureKey.part(id, role, mat, profile)]}/>{p.label}</button>)}</div>}
        {tab === 'size' && <div className="bench-sizes">
          <div><span>{spec.label} · 尺寸</span><div className="bench-chips">{spec.sizes.map(s => <button key={sizeLabel(s)} className={s[0] === size[0] && s[1] === size[1] ? 'active' : ''} onClick={() => {setSize(s); setTool('place');}}>{sizeLabel(s)}</button>)}</div></div>
          {spec.heights.length > 1 && <div><span>高度 · 几片薄板</span><div className="bench-chips">{spec.heights.map(h => <button key={h} className={h === height ? 'active' : ''} onClick={() => setHeight(h)}>{h}</button>)}</div></div>}
          {spec.profiles && <div><span>车削的样子</span><div className="bench-chips">{Object.entries(spec.profiles).map(([id, label]) => <button key={id} className={`with-picture${id === profile ? ' active' : ''}`} onClick={() => setProfile(id)}><Picture src={pictures[pictureKey.turned(id, role, mat)]}/>{label}</button>)}</div></div>}
        </div>}
        {tab === 'color' && <div className="bench-colors">
          <div className="atelier-palette bench-palette"><div>{Object.entries(ROLES).map(([id, r]) => <button key={id} style={{background: r.color}} aria-label={r.label} title={r.label} aria-pressed={(chosen && tool === 'choose' ? chosen.c : role) === id} onClick={() => {setRole(id); if (tool === 'choose' && chosen) change({c: id});}}/>)}</div></div>
          <div className="bench-chips">{Object.entries(MATERIALS).map(([id, label]) => <button key={id} className={(chosen && tool === 'choose' ? chosen.mat || 'plain' : mat) === id ? 'active' : ''} onClick={() => {setMat(id); if (tool === 'choose' && chosen) change({mat: id === 'plain' ? undefined : id});}}>{label}</button>)}</div>
        </div>}
        {tab === 'start' && <div className="bench-chips">{Object.entries(starters).map(([id, s]) => <button key={id} className="with-picture" onClick={() => {commit(s.recipe()); setSelected(null); setMessage(`换成了「${s.label}」的底稿，每一块都能改；不想要可以撤销。`);}}><Picture big src={pictures[pictureKey.start(id)]}/>{s.label}</button>)}</div>}
      </div>
    </div>
  </div>;
}
