import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Canvas, createPortal, useFrame, useThree} from '@react-three/fiber';
import {createBlindBoxMachine, icon, PRIZE_SIZE} from './blindbox-machine.js';
import {PALETTES} from './machine-kit.js';
import {SEASON, boxThing} from './blind-box.js';
import {BuildObject} from './brick-model.jsx';
import {MachineTop, noTicket} from './machine-overlay.jsx';

// Standing in front of the blind box machine on a street's plaza. A ticket
// goes in when a box is chosen: `onChoose(id)` spends it and keeps what's in
// that box, and says whether there was a ticket.
const HINTS = {pick: '点一个盒子摇一摇，再点一下就要它', ready: '点盒子摇一摇，听听里面是什么'};

// The machine in the canvas, and what's in the chosen box, drawn into it.
function Stage({machine, prize, onTap}) {
  const scene = useThree(s => s.scene), camera = useThree(s => s.camera), gl = useThree(s => s.gl);
  const tap = useRef(onTap); tap.current = onTap;
  useLayoutEffect(() => machine.mount(scene, camera, gl.domElement, part => tap.current(part)), [machine, scene, camera, gl]);
  useFrame((s, dt) => machine.update(dt, s.clock.elapsedTime));
  return prize ? createPortal(<BuildObject item={prize} fill={PRIZE_SIZE}/>, machine.prize) : null;
}

// This season's row: what this home has found, the secret one a question mark till then.
function SeasonIcon({thing, got, secret, ink}) {
  const ref = useRef();
  useEffect(() => {
    const x = ref.current?.getContext('2d');
    if (!x) return;
    x.clearRect(0, 0, 48, 48); x.globalAlpha = got ? 1 : .5;
    icon(x, secret && !got ? '?' : thing.id, 24, 24, 40, got ? ink : '#a79ba3');
  }, [thing.id, got, secret, ink]);
  const label = secret && !got ? '隐藏款，还没拆到' : `${thing.name}${got ? '，拆到了' : '，还没拆到'}`;
  return <li className={`box-slot${got ? ' got' : ''}${secret ? ' secret' : ''}`} title={label} aria-label={label}><canvas ref={ref} width={48} height={48} aria-hidden="true"/></li>;
}

export function BlindBoxMachine({street, tickets, found = [], night = false, him = '他', onChoose, onClose}) {
  const palette = Math.abs(Math.trunc(Number(street?.seed) || 0)) % 4, look = PALETTES[palette];
  const count = Number.isSafeInteger(tickets?.n) ? tickets.n : 0;
  const [state, setState] = useState('idle'), [hint, setHint] = useState(''), [problem, setProblem] = useState('');
  const [thing, setThing] = useState(null), [prize, setPrize] = useState(null), [picking, setPicking] = useState(null);
  const live = useRef({}), made = useRef(null);
  live.current = {onChoose, him, found};
  const [machine] = useState(() => createBlindBoxMachine({
    palette, night,
    onState: (s, h) => { setState(s); setHint(h || ''); setPicking(made.current?.chosen?.name || null); },
    onChoose: id => {
      const ok = !!live.current.onChoose?.(id);
      if (!ok) { setProblem(noTicket(live.current.him)); return false; }
      const t = boxThing(id);
      setThing({...t, fresh: !live.current.found.includes(id)}); setPrize(t.recipe());
      return true;
    }
  }));
  made.current = machine;
  useEffect(() => () => machine.dispose(), [machine]);
  useEffect(() => { machine.setNight(night); }, [machine, night]);
  const go = () => {
    if (machine.state === 'idle') {
      if (count < 1) return setProblem(noTicket(him));
      setProblem(''); setThing(null); setPrize(null); machine.insert();
    } else if (machine.state === 'pick') machine.choose();
    else if (machine.state === 'ready') machine.open();
    else if (machine.state === 'open') machine.collect();
  };
  const tap = part => { if (part === 'ticket' || part === 'collect') go(); };
  const shown = state === 'pick' ? Math.max(0, count - 1) : count;
  // Something new stays a secret on the row until its box is open.
  const have = new Set(found.filter(id => !(thing?.fresh && state !== 'open' && id === thing.id))), got = SEASON.items.filter(t => have.has(t.id)).length;
  const secret = thing?.id === SEASON.hidden.id;
  const words = problem || (state === 'idle' ? (count < 1 ? noTicket(him) : hint || '先投一张券') : state === 'pick' ? (hint ? `${hint} · 再点一下就要它` : HINTS.pick) : state === 'ready' ? hint || HINTS.ready : '');
  const label = {idle: '投一张券', pick: picking ? '就要这个' : '随便挑一个', ready: '拆开', open: '收下'}[state] || '……';
  return <div className={`machine-overlay${night ? ' night' : ''}`} onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="盲盒机">
    <div className="machine-stage">
      <Canvas shadows dpr={[1, 2]} camera={{fov: 30, near: .1, far: 50, position: [0, 1.2, 4]}} gl={{antialias: true}} onCreated={({gl}) => { gl.toneMappingExposure = .95; }} aria-label="小门廊盲盒机，拖着能转着看">
        <Stage machine={machine} prize={prize} onTap={tap}/>
      </Canvas>
    </div>
    <MachineTop look={look} title="盲盒机" count={shown} onClose={onClose}/>
    <div className="box-season" aria-label="这一季">
      <span>这一季</span>
      <ul>{[...SEASON.items, SEASON.hidden].map(t => <SeasonIcon key={t.id} thing={t} got={have.has(t.id)} secret={t === SEASON.hidden} ink={look.ink}/>)}</ul>
      <small>{got}/{SEASON.items.length}</small>
    </div>
    <footer className="machine-bottom">
      {state === 'open' && thing && <section className="machine-result" aria-live="polite">
        <h3>{secret ? '隐藏款！' : ''}拆到了：{thing.name}</h3>
        <p>收进背包了，从背包里取出来就能摆在屋里，也能送人。</p>
      </section>}
      {words && state !== 'open' && <p className="machine-hint" role="status">{words}</p>}
      <div className="box-actions">
        {state === 'ready' && <button type="button" className="machine-go quiet" onClick={() => machine.shake()}>摇一摇</button>}
        <button type="button" className="machine-go" disabled={state === 'busy' || (state === 'idle' && count < 1)} onClick={go}>{label}</button>
      </div>
    </footer>
  </div>;
}
