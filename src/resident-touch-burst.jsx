// What floats up when the two residents touch (resident-touches.js): a heart and 「啵」 for a kiss, as
// when he's found; a little hand patting her head and 「乖」; two blush strokes on her cheek and 「捏」
// for a pinch; three hearts and 「抱抱」 for a hug; a heart from their hands and 「牵牵」 when they take hands
// (resident-hand.js); 「Zz」 from a sleeping head (resident-bed.js); two hearts and a note when they start to dance
// (resident-dance.js). `burst` is {kind, x, z, face, top, cheek, hand, hold, beats} in the floor's frame: face, top,
// cheek and hand are the heights of the faces, the top of her head, her cheek and their hands.
import React, {useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {Floating, KissBurst} from './hide-and-seek.jsx';
import {blushPicture, handPicture, heartPicture, wordPicture} from './touch-pictures.js';

// The hand comes down onto her head and up again, once a pat, and fades.
function PattingHand({at, hold, beats}) {
  const sprite = useRef(), material = useRef(), started = useRef(null), invalidate = useThree(s => s.invalidate);
  // Timed on the page's clock: the canvas's own clock starts over whenever it pauses.
  useFrame(() => {
    const now = performance.now() / 1000;
    if (started.current === null) started.current = now;
    const t = now - started.current, life = hold + .35;
    if (!sprite.current) return;
    const u = Math.min(1, t / hold) * beats, k = Math.floor(u), press = k < beats ? Math.sin((u - k) * Math.PI) : 0;
    sprite.current.visible = t < life;
    sprite.current.position.set(at[0], at[1] + .09 - press * .07, at[2]);
    sprite.current.scale.setScalar(.42);
    material.current.rotation = -.22 + press * .14;
    material.current.opacity = t < .15 ? t / .15 : t > hold ? Math.max(0, 1 - (t - hold) / .35) : 1;
    if (t < life) invalidate();
  });
  return <sprite ref={sprite} visible={false} renderOrder={21}>
    <spriteMaterial ref={material} map={handPicture()} transparent depthTest={false} depthWrite={false}/>
  </sprite>;
}

export function TouchBurst({burst}) {
  const {kind, x, z} = burst;
  if (kind === 'kiss') return <KissBurst burst={{x, z, y: burst.face, long: false}}/>;
  if (kind === 'hug') return <group>
    {[[0, 0], [-.14, .5], [.15, 1]].map(([dx, delay], i) => <Floating key={i} texture={heartPicture()} delay={delay} rise={.45} size={.2} from={[x + dx, burst.face + .1, z]} life={1.6}/>)}
    <Floating texture={wordPicture('抱抱')} delay={.2} rise={.3} size={.32} from={[x + .25, burst.face + .3, z]} life={2}/>
  </group>;
  if (kind === 'dance') return <group>
    {[[-.16, 0], [.16, .35]].map(([dx, delay], i) => <Floating key={i} texture={heartPicture()} delay={delay} rise={.4} size={.18} from={[x + dx, burst.face + .1, z]} life={1.6}/>)}
    <Floating texture={wordPicture('♪')} delay={.2} rise={.35} size={.3} from={[x, burst.top + .15, z]} life={2.2}/>
  </group>;
  if (kind === 'zz') return <Floating texture={wordPicture('Zz')} delay={0} rise={.45} size={.3} from={[x + .12, burst.top, z]} life={2.6}/>;
  if (kind === 'hand') return <group>
    <Floating texture={heartPicture()} delay={.05} rise={.4} size={.18} from={[x, burst.hand + .06, z]} life={1.6}/>
    <Floating texture={wordPicture('牵牵')} delay={.3} rise={.28} size={.32} from={[x, burst.top + .12, z]} life={2}/>
  </group>;
  if (kind === 'pat') return <group>
    <PattingHand at={[x, burst.top, z]} hold={burst.hold} beats={burst.beats}/>
    <Floating texture={wordPicture('乖')} delay={.35} rise={.3} size={.3} from={[x + .36, burst.top + .22, z]} life={1.6}/>
  </group>;
  return <group>
    <Floating texture={blushPicture()} delay={.05} rise={.05} size={.17} from={[x, burst.cheek, z]} life={1.5}/>
    <Floating texture={wordPicture('捏')} delay={.1} rise={.3} size={.26} from={[x + .15, burst.top + .05, z]} life={1.3}/>
  </group>;
}
