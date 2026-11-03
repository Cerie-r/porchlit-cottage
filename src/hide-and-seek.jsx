// The scene side of hide-and-seek: the little giveaways where he hides (a
// coat corner caught in the wardrobe doors, a lump under the quilt with his
// shoes poking out), and the hearts when he kisses her. Drawn in the walking
// frame of the area on screen (see hide-and-seek-spots.js).
import React, {useEffect, useMemo, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as T from 'three';
import {FabricMaterial} from './surfaces.jsx';
import {colorwaysOf, sewnOutfit} from '../body/outfit-registry.js';

// The corner of what he has on that peeks out of the wardrobe: the main colour of
// the colourway he wears it in, or of one sewn at home its own; the two base outfits
// keep their own colours.
const outfitColor = (outfit, colorway) => {
  const sewn = sewnOutfit(outfit);
  if (sewn) return sewn.colors.main;
  const ways = colorwaysOf(outfit), way = ways.find(w => w.id === colorway) || ways[0];
  return way?.colors?.main || (outfit === 'coat' ? '#353439' : '#eee5d6');
};
const shoeColor = '#29282c';

// Fidgeting: a short wobble every few seconds. Frames are only asked for
// while it wobbles, so a hiding spot doesn't keep a phone busy.
function useWobble(on, period, length) {
  const invalidate = useThree(s => s.invalidate), started = useRef(-1), value = useRef(0);
  useEffect(() => {
    if (!on) return;
    const kick = () => {
      started.current = performance.now();
      invalidate();
    };
    const timer = setInterval(kick, period * 1000);
    kick();
    return () => clearInterval(timer);
  }, [on, period, length, invalidate]);
  useFrame(() => {
    if (started.current < 0) {
      value.current = 0;
      return;
    }
    const u = (performance.now() - started.current) / 1000 / length;
    if (u >= 1) {
      started.current = -1;
      value.current = 0;
    } else value.current = Math.sin(u * Math.PI * 4) * Math.sin(u * Math.PI);
    invalidate();
  });
  return value;
}

// A big, invisible box around a small hint, so a finger can find it.
function TapTarget({size, position, onTap}) {
  return <mesh position={position} onClick={onTap}>
    <boxGeometry args={size}/>
    <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>;
}

// The corner of his coat, pinched between the wardrobe's doors.
function CoatCorner({color, fidget}) {
  const flap = useRef(), wobble = useWobble(fidget, 7, .9);
  const geometry = useMemo(() => {
    // A soft corner of cloth, hanging from where the doors pinch it.
    const s = new T.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(.08, -.02, .135, -.08);
    s.quadraticCurveTo(.115, -.17, .05, -.27);
    s.quadraticCurveTo(.02, -.15, 0, -.11);
    s.lineTo(0, 0);
    const g = new T.ExtrudeGeometry(s, {depth: .012, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 2, curveSegments: 8});
    g.translate(0, 0, -.006);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (flap.current) flap.current.rotation.y = -Math.PI / 2 + wobble.current * .35;
  });
  // The flap stands in the doors' seam, sticking out towards the room.
  return <group ref={flap} position={[.012, .74, .43]} rotation={[0, -Math.PI / 2, 0]}>
    <mesh geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={.9} side={T.DoubleSide}/></mesh>
  </group>;
}

// The quilt's own surface (bedroom-textiles.jsx), so the lump matches it.
const QUILT = {width: 3.05, depth: 2.7, x: 0, y: .84, z: .45};
const drapeHeight = (x, z) => -Math.max(0, Math.abs(x) - 1.11) * 1.45 + .018 * Math.sin(x * 22 + z * 3) + .018 * Math.cos(z * 11);
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// Someone lying on his back under the quilt, head towards the pillows: a
// round bump for the head, a long one for the body, toes up at the end.
// Off to the front side of the bed, clear of what already sits on it.
const LUMP = {x: -.3, head: .15, feet: 1.55};
function bump(x, z) {
  const dx = x - LUMP.x;
  const head = .34 * (1 - smooth(0, .38, Math.hypot(dx, (z - LUMP.head) * .95)));
  const along = smooth(LUMP.head + .1, LUMP.head + .35, z) * (1 - smooth(LUMP.feet - .05, LUMP.feet + .25, z));
  const body = (.25 - .07 * smooth(LUMP.head + .5, LUMP.feet, z)) * along * (1 - smooth(.08, .36, Math.abs(dx)));
  const toes = .13 * (1 - smooth(0, .2, Math.hypot(Math.abs(dx) - .09, z - LUMP.feet + .05)));
  return Math.max(head, body, toes);
}

function QuiltLump({color, fidget}) {
  const lump = useRef(), shoes = useRef(), wobble = useWobble(fidget, 7.5, 1);
  // Only the patch of quilt that rises, laid over the real one with the same
  // pattern coordinates, so the print carries on across it.
  const geometry = useMemo(() => {
    const x0 = LUMP.x - .45, x1 = LUMP.x + .45, z0 = LUMP.head - .45, z1 = QUILT.z + QUILT.depth / 2;
    const nx = 36, nz = 64, positions = [], uvs = [], index = [];
    for (let j = 0; j <= nz; j++) {
      for (let i = 0; i <= nx; i++) {
        const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz, lz = z - QUILT.z;
        positions.push(x, QUILT.y + drapeHeight(x, lz) + bump(x, z) + .004, z);
        uvs.push((x + QUILT.width / 2) / QUILT.width, (-lz + QUILT.depth / 2) / QUILT.depth);
      }
    }
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        index.push(a, c, b, b, c, d);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (lump.current) lump.current.scale.y = 1 + wobble.current * .12;
    if (shoes.current) shoes.current.rotation.z = wobble.current * .28;
  });
  // His shoes stick out where the quilt ends, toes up.
  const end = QUILT.z + QUILT.depth / 2;
  return <group>
    {/* Breathing grows the lump up from the quilt, not from the floor. */}
    <group ref={lump} position={[0, QUILT.y, 0]}>
      <mesh geometry={geometry} position={[0, -QUILT.y, 0]} castShadow receiveShadow><FabricMaterial owner="bedroomBed" slot="quilt" color={color} side={T.DoubleSide}/></mesh>
    </group>
    <group ref={shoes} position={[LUMP.x, QUILT.y + .02, end - .02]}>
      {[-1, 1].map(side => <group key={side} position={[side * .1, .09, .02]} rotation={[-.35, 0, side * .32]}>
        <mesh castShadow scale={[1, 1.35, .85]}><sphereGeometry args={[.055, 16, 12]}/><meshStandardMaterial color={shoeColor} roughness={.62}/></mesh>
        {/* The sole, a little lighter, turned to the room. */}
        <mesh position={[0, .004, .04]} scale={[.92, 1.28, .3]}><sphereGeometry args={[.055, 16, 10]}/><meshStandardMaterial color="#7d6f69" roughness={.85}/></mesh>
      </group>)}
    </group>
  </group>;
}

export function HideHint({spot, fidget, outfit, colorway, onFound, enabled}) {
  if (!spot || (spot.kind !== 'inside' && spot.kind !== 'under')) return null;
  const tap = e => {
    if (!enabled || e.delta > 5) return;
    e.stopPropagation();
    onFound();
  };
  return <group position={[spot.origin[0], 0, spot.origin[1]]} rotation={[0, spot.yaw, 0]}>
    {spot.kind === 'inside' ? <>
      <CoatCorner color={outfitColor(outfit, colorway)} fidget={fidget}/>
      <TapTarget size={[.34, .4, .26]} position={[0, .62, .5]} onTap={tap}/>
    </> : <>
      <QuiltLump color="#f7eee0" fidget={fidget}/>
      <TapTarget size={[.8, .5, 1.95]} position={[LUMP.x, 1.02, .85]} onTap={tap}/>
    </>}
  </group>;
}

// Little pictures for the kiss: a heart, and the sound of it.
let pictures;
function kissPictures() {
  if (pictures) return pictures;
  const draw = (paint) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    paint(c.getContext('2d'));
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  };
  const heart = draw(x => {
    x.translate(64, 70);
    x.beginPath();
    x.moveTo(0, 38);
    x.bezierCurveTo(-58, 2, -44, -46, 0, -20);
    x.bezierCurveTo(44, -46, 58, 2, 0, 38);
    x.fillStyle = '#e48aa3';
    x.fill();
    x.lineWidth = 7;
    x.strokeStyle = '#fff6f2';
    x.stroke();
    x.beginPath();
    x.ellipse(-20, -14, 9, 6, -.6, 0, Math.PI * 2);
    x.fillStyle = 'rgba(255,255,255,.55)';
    x.fill();
  });
  const word = draw(x => {
    x.font = 'bold 76px "PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineWidth = 12;
    x.strokeStyle = '#fff6f2';
    x.strokeText('啵', 64, 66);
    x.fillStyle = '#c2768d';
    x.fillText('啵', 64, 66);
  });
  return (pictures = {heart, word});
}

export function Floating({texture, delay, rise, size, from, life}) {
  const sprite = useRef(), material = useRef(), started = useRef(null), invalidate = useThree(s => s.invalidate);
  // Timed on the page's clock: the canvas's own clock starts over whenever it pauses.
  useFrame(() => {
    const now = performance.now() / 1000;
    if (started.current === null) started.current = now;
    const t = now - started.current - delay;
    if (!sprite.current) return;
    const u = Math.min(1, Math.max(0, t / life));
    sprite.current.visible = t >= 0 && u < 1;
    sprite.current.position.set(from[0], from[1] + rise * (1 - (1 - u) ** 2), from[2]);
    const pop = Math.min(1, Math.max(0, t / .18));
    sprite.current.scale.setScalar(size * (.6 + .4 * pop + .12 * Math.sin(Math.min(1, t / .3) * Math.PI)));
    material.current.opacity = u < .6 ? 1 : 1 - (u - .6) / .4;
    if (u < 1) invalidate();
  });
  return <sprite ref={sprite} visible={false} renderOrder={20}>
    <spriteMaterial ref={material} map={texture} transparent depthTest={false} depthWrite={false}/>
  </sprite>;
}

// Hearts over the two of them, and a 「啵」. `burst` is {x, z, y, long}: y is
// about where their faces meet.
export function KissBurst({burst}) {
  const {heart, word} = kissPictures();
  const base = burst.y ?? 1.18, at = (dx, dy = 0) => [burst.x + dx, base + dy, burst.z];
  const hearts = burst.long ? [[0, 0], [-.12, .55], [.13, 1.1]] : [[0, 0]];
  return <group>
    {hearts.map(([dx, delay], i) => <Floating key={i} texture={heart} delay={delay} rise={.42} size={.2} from={at(dx)} life={1.5}/>)}
    <Floating texture={word} delay={.05} rise={.28} size={.26} from={at(.2, .18)} life={burst.long ? 2.2 : 1.3}/>
  </group>;
}
