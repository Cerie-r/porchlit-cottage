import React,{useEffect,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {easeOut,buzz} from './dessert-motion.js';
import {play} from './sounds.js';
import {STATION as S,BLOCK_H} from './cooking-tools.jsx';
import {Dough,DoughSheet,RollingPin} from './cooking-pantry-food.jsx';

// An ear of wheat becomes a bowl of noodles on the block, a tap at a time (src/cooking-recipe.js, prep 'dough'):
// kneaded (flour and water pressed and folded till the ball is smooth), rolled out flat under the pin, and then cut
// into noodles with the cleaver like anything else (src/cooking-steps.jsx CutStep, with the sheet as the whole).

// Where the dough lies on the block.
export const DOUGH_AT = [S.block[0] + .3, BLOCK_H, S.block[2]];
export const KNEADS = 6, ROLLS = 3;

// ---- step: knead ----
// Each tap presses it down and folds it over; it comes up a little smoother every time.
export function KneadStep({taps, onHint, onDone}) {
  const invalidate = useThree(s => s.invalidate), ball = useRef();
  const st = useRef({k: 0, t0: 0, pressing: false, queued: 0}), seen = useRef(taps), [k, setK] = useState(0);
  const say = left => onHint(left > 1 ? `点一下，揉一揉（还有 ${left} 下）` : '点一下，再揉最后一下');
  useEffect(() => {say(KNEADS);}, []);
  useEffect(() => {
    if (taps === seen.current) return; seen.current = taps;
    const s = st.current; if (s.k >= KNEADS) return;
    if (s.pressing) {s.queued = Math.min(2, s.queued + 1); return;}
    s.pressing = true; s.t0 = performance.now(); invalidate();
  }, [taps]);
  useFrame(() => {
    const s = st.current, g = ball.current;
    if (!g) return;
    if (s.pressing) {
      const t = (performance.now() - s.t0) / 1000, down = t < .12 ? easeOut(t / .12) : Math.max(0, 1 - (t - .12) / .28);
      g.scale.set(1 + .18 * down, 1 - .3 * down, 1 + .14 * down);
      if (t >= .12 && !s.hit) {s.hit = true; s.k++; setK(s.k); buzz(12); play('cloth', {volume: .35}); g.rotation.y += Math.PI / 3;}
      if (t >= .4) {
        s.pressing = false; s.hit = false; g.scale.set(1, 1, 1);
        if (s.k >= KNEADS) {onHint('面揉好了，光溜溜的'); s.doneAt = performance.now();}
        else {say(KNEADS - s.k); if (s.queued) {s.queued--; s.pressing = true; s.t0 = performance.now();}}
      }
      invalidate();
    } else if (s.doneAt && !s.told && performance.now() - s.doneAt > 700) {s.told = true; onDone();}
    else if (s.doneAt && !s.told) invalidate();
  });
  return <group position={DOUGH_AT}><group ref={ball}><Dough k={k / KNEADS}/></group></group>;
}

// ---- step: roll ----
// Each tap sends the pin rolling across it and back; it spreads out flatter every time.
export function RollStep({taps, look, onHint, onDone}) {
  const invalidate = useThree(s => s.invalidate), pin = useRef();
  const st = useRef({k: 0, t0: 0, rolling: false, queued: 0}), seen = useRef(taps), [flat, setFlat] = useState(0);
  const say = left => onHint(left > 1 ? `点一下，擀一擀（还有 ${left} 下）` : '点一下，再擀最后一下');
  useEffect(() => {say(ROLLS);}, []);
  useEffect(() => {
    if (taps === seen.current) return; seen.current = taps;
    const s = st.current; if (s.k >= ROLLS) return;
    if (s.rolling) {s.queued = Math.min(2, s.queued + 1); return;}
    s.rolling = true; s.t0 = performance.now(); invalidate();
  }, [taps]);
  useFrame(() => {
    const s = st.current, p = pin.current;
    if (!p) return;
    const rest = () => p.position.set(DOUGH_AT[0], BLOCK_H + .5, DOUGH_AT[2] - .55);
    if (s.rolling) {
      const t = (performance.now() - s.t0) / 1000, u = Math.min(1, t / .6), z = DOUGH_AT[2] - .45 + Math.sin(u * Math.PI) * .9, y = BLOCK_H + .1 + .05 * (1 - Math.sin(u * Math.PI));
      p.position.set(DOUGH_AT[0], y, z); p.rotation.x = -z * 4;
      const f = Math.min(ROLLS, s.k + u) / ROLLS; if (Math.abs(f - flat) > .04) setFlat(f);
      if (t >= .6) {
        s.rolling = false; s.k++; setFlat(s.k / ROLLS); buzz(10); play('wood', {volume: .25}); rest();
        if (s.k >= ROLLS) {onHint('擀好了，薄薄的一张'); s.doneAt = performance.now();}
        else {say(ROLLS - s.k); if (s.queued) {s.queued--; s.rolling = true; s.t0 = performance.now();}}
      }
      invalidate();
    } else {
      rest();
      if (s.doneAt && !s.told && performance.now() - s.doneAt > 700) {s.told = true; onDone();}
      else if (s.doneAt && !s.told) invalidate();
    }
  });
  return <group>
    <group position={DOUGH_AT}><DoughSheet flat={flat}/></group>
    <group ref={pin}><RollingPin look={look}/></group>
  </group>;
}
