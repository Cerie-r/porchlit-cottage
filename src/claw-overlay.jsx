import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Canvas, createPortal, useFrame, useThree} from '@react-three/fiber';
import {Box3, Matrix4, Vector3} from 'three';
import {createClawMachine, DOLL_H} from './claw-machine.js';
import {PALETTES} from './machine-kit.js';
import {cabinetDolls, kindName} from './claw.js';
import {AnimalModel} from './animal-model.jsx';
import {MachineTop, noTicket} from './machine-overlay.jsx';

// Standing in front of the claw machine on a street's plaza. The cabinet is
// filled for the day from this street's week (claw.js); `onPay()` puts a
// ticket in when the claw goes down and says whether there was one;
// `onCatch(doll)` keeps a doll the moment it's sure to come out.
const ARROWS = [['up', '往里', '↑', 0, -1], ['left', '往左', '←', -1, 0], ['right', '往右', '→', 1, 0], ['down', '往外', '↓', 0, 1]];
const KEYS = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};

// A doll from the doll table, about as big as one `height` tall, standing on
// the origin. One lying down (a seal, an otter) goes by its length instead.
function SizedDoll({doll, height}) {
  const outer = useRef(), inner = useRef();
  useLayoutEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    i.position.set(0, 0, 0); i.updateWorldMatrix(true, true);
    const inv = new Matrix4().copy(i.matrixWorld).invert(), m = new Matrix4(), box = new Box3(), b = new Box3();
    i.traverse(n => { if (!n.isMesh || !n.geometry) return; if (!n.geometry.boundingBox) n.geometry.computeBoundingBox(); box.union(b.copy(n.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv, n.matrixWorld))); });
    if (box.isEmpty()) return;
    const mid = box.getCenter(new Vector3()), size = box.getSize(new Vector3());
    i.position.set(-mid.x, -box.min.y, -mid.z);
    o.scale.setScalar(height / Math.max(size.y, .6 * Math.max(size.x, size.z), 1e-6));
  }, [doll, height]);
  return <group ref={outer}><group ref={inner}><AnimalModel item={doll}/></group></group>;
}

// The machine in the canvas, and the dolls drawn into its cabinet.
function ClawStage({machine, dolls, onTap}) {
  const scene = useThree(s => s.scene), camera = useThree(s => s.camera), gl = useThree(s => s.gl);
  const tap = useRef(onTap); tap.current = onTap;
  useLayoutEffect(() => machine.mount(scene, camera, gl.domElement, part => tap.current(part)), [machine, scene, camera, gl]);
  useFrame((s, dt) => machine.update(dt, s.clock.elapsedTime));
  // One steady ref per doll, so each is put on its spot once.
  const refs = useRef(new Map());
  const refFor = (id, spot) => {
    if (!refs.current.has(id)) refs.current.set(id, g => { if (g) machine.place(id, g, spot); });
    return refs.current.get(id);
  };
  return createPortal(<>{dolls.map(d => <group key={d.id} ref={refFor(d.id, d.spot)}><SizedDoll doll={d.doll} height={DOLL_H}/></group>)}</>, machine.dolls);
}

export function ClawMachine({street, tickets, day, caught = [], night = false, him = '他', onPay, onCatch, onClose}) {
  const palette = Math.abs(Math.trunc(Number(street?.seed) || 0)) % 4, look = PALETTES[palette];
  const count = Number.isSafeInteger(tickets?.n) ? tickets.n : 0;
  // The cabinet for the day; caught empty, it's filled again.
  const [batch, setBatch] = useState(0), [gone, setGone] = useState([]);
  const cabinet = useMemo(() => cabinetDolls(day, Number(street?.seed) || 0), [day, street?.seed, batch]);
  const dolls = cabinet.dolls.map((doll, i) => ({id: `${batch}-${i}`, spot: i, doll})).filter(d => !gone.includes(d.id));
  const [state, setState] = useState('idle'), [hint, setHint] = useState(''), [problem, setProblem] = useState(''), [won, setWon] = useState(null);
  const live = useRef({});
  live.current = {dolls, caught, onPay, onCatch, him};
  const [machine] = useState(() => createClawMachine({
    palette, night,
    onState: (s, h) => { setState(s); setHint(h || ''); },
    onGrab: () => {
      const ok = !!live.current.onPay?.();
      if (!ok) setProblem(noTicket(live.current.him));
      return ok;
    },
    onWin: id => {
      const d = live.current.dolls.find(x => x.id === id);
      if (!d) return;
      const species = d.doll.species;
      setWon({species, fresh: species !== 'bear' && !live.current.caught.includes(species)});
      live.current.onCatch?.(d.doll);
    },
    onGone: id => setGone(g => [...g, id])
  }));
  useEffect(() => () => machine.dispose(), [machine]);
  useEffect(() => { machine.setNight(night); }, [machine, night]);
  // All caught: the cabinet is filled again.
  useEffect(() => { if (!dolls.length && state === 'idle') { setGone([]); setBatch(b => b + 1); } }, [dolls.length, state]);
  const go = () => {
    if (machine.state === 'idle') {
      if (count < 1) return setProblem(noTicket(him));
      setProblem(''); setWon(w => (machine.state === 'idle' ? null : w)); machine.insert();
    } else if (machine.state === 'play') machine.grab();
    else if (machine.state === 'won') machine.collect();
  };
  const tap = part => { if (part === 'doll' || part === 'ticket') go(); };
  // Arrow keys steer while held; space or enter grabs.
  useEffect(() => {
    const down = e => {
      if (KEYS[e.key] && machine.state === 'play') { machine.steer(...KEYS[e.key]); e.preventDefault(); }
      else if ((e.key === ' ' || e.key === 'Enter') && machine.state === 'play' && (document.activeElement === document.body || document.activeElement?.closest?.('.machine-stage'))) { e.preventDefault(); machine.grab(); }
    };
    const up = e => { if (KEYS[e.key]) machine.steer(0, 0); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [machine]);
  const shown = state === 'play' ? Math.max(0, count - 1) : count;
  const words = problem || (state === 'idle' ? (count < 1 ? noTicket(him) : hint || '先投一张券') : state === 'play' ? '按箭头把爪子挪到玩偶头上，再按「抓」' : '');
  return <div className={`machine-overlay${night ? ' night' : ''}`} onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="抓娃娃机">
    <div className="machine-stage">
      <Canvas shadows dpr={[1, 2]} camera={{fov: 30, near: .1, far: 50, position: [0, 1.2, 4]}} gl={{antialias: true}} onCreated={({gl}) => { gl.toneMappingExposure = .95; }} aria-label="抓娃娃机，拖着能转着看">
        <ClawStage machine={machine} dolls={dolls} onTap={tap}/>
      </Canvas>
    </div>
    <MachineTop look={look} title="抓娃娃机" note={`这周的娃娃：${kindName(cabinet.featured)}`} count={shown} onClose={onClose}/>
    <footer className="machine-bottom">
      {state === 'won' && won && <section className="machine-result" aria-live="polite">
        <h3>抓到了：{kindName(won.species)}</h3>
        <p>{won.fresh ? `收进背包了。从今天起，玩偶台也能做${kindName(won.species)}了。` : '收进背包了。'}</p>
      </section>}
      {words && state !== 'won' && <p className="machine-hint" role="status">{words}</p>}
      {state === 'play'
        ? <div className="claw-pad">
          <div className="claw-arrows" role="group" aria-label="挪爪子">{ARROWS.map(([dir, label, mark, x, z]) => <button key={dir} type="button" className={`claw-arrow ${dir}`} aria-label={label}
            onPointerDown={e => { e.preventDefault(); e.currentTarget.classList.add('on'); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not every pointer can be held */ } machine.steer(x, z); }}
            onPointerUp={e => { e.currentTarget.classList.remove('on'); machine.steer(0, 0); }}
            onPointerCancel={e => { e.currentTarget.classList.remove('on'); machine.steer(0, 0); }}
            onLostPointerCapture={e => { e.currentTarget.classList.remove('on'); machine.steer(0, 0); }}>{mark}</button>)}</div>
          <button type="button" className="claw-grab" onClick={() => machine.grab()}>抓</button>
        </div>
        : <button className="machine-go" disabled={state === 'busy' || (state === 'idle' && count < 1)} onClick={go}>{state === 'won' ? '收下' : state === 'idle' ? '投一张券' : '……'}</button>}
    </footer>
  </div>;
}
