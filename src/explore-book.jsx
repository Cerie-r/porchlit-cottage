// A page of the exploring book (docs: the project's 探险 design): one place, the woods (explore-woods-layout.js), the
// flower hill (explore-hill-layout.js), the lakeside (explore-lake-layout.js), the tea hill (explore-tea-layout.js) or
// the fields (explore-field-layout.js). The page opens and the painted paper pieces stand up one after another, back to front; the two of them walk in hand in
// hand on the painted paths. Most of what there is to find hides: tapping a piece sends them over to look through
// it. She folds a low clump forward like the flap of a lift-the-flap book, pushes a bush, a rock or the reeds aside,
// or the two of them shake a tree or an arch of flowers; what was there comes up (or falls) and goes into the
// basket. A couple of finds glint to start her off; each walk hides things afresh (explore-place.js hideFinds).
// Reached at /?explore=woods, hill, lake, tea, field, mine or deep, on a trip from the door (src/main.jsx sends anyone
// without one home); without a trip (tests, pictures) nothing is saved and the way out is home.
import React, {Suspense, useEffect, useMemo, useRef, useState} from 'react';
import {useFrame, useLoader, useThree} from '@react-three/fiber';
import * as T from 'three';
import {QuietCanvas} from './quiet-canvas.jsx';
import {createApprovedAvatar, disposeAvatar} from '../body/avatar-model.js';
import {rigAvatar} from '../body/avatar-rig.js';
import {readWardrobe} from '../body/wardrobe-state.js';
import {newMotion, stepResident, angleDelta} from './resident-motion-state.js';
import {residentPosePosition, RESIDENT_GROUND_OFFSET} from './resident-pose.js';
import {HAND, handArms, handReach, handSlots} from './resident-hand.js';
import {play} from './sounds.js';
import {HUG, TOUCHES} from './resident-touches.js';
import {BASKET, markSearched, pick, placeSeed, remember, searchedOn, visit} from './explore-trips.js';
import {readTrip, writeTrip} from './explore-session.js';
import {findName, findPicture} from './explore-places.js';
import {ANIMALS_DIR, ANIMAL_ART, butterfliesOn, meetOn} from './explore-meet.js';
import {kindOf, howOf, searchSpot, findSpot, hideFinds, pathWeb, routeOn, onPath, searchable} from './explore-place.js';
import './explore.css';

// The camera looks from the front and above, and only slides and zooms (the paper is flat: turning round would
// show it edge on).
// Where it looks: the middle of the picture is above the page, as the board at the back stands up into it. From
// there, the camera is up and in front (about 25° down).
const LOOK_Y = 3, VIEW = new T.Vector3(0, 5.2, 11);
// While they look through something the camera leans in this much closer (unless she has zoomed in further
// herself), and closer in it looks lower, at them rather than at the treetops.
const CLOSE = 1.6, LOW_Y = 1;
// How long the page takes to stand up, and when they set off.
const OPEN = {backdrop: .1, first: .35, spread: 1.1, each: .55, walkIn: 2.3};
const easeBack = t => {const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);};
const easeOut = t => 1 - Math.pow(1 - t, 3);

// How a look goes, in seconds from when she sets about it: the piece moves (`move`), what was there shows (`show`),
// she takes it (`take`), the piece springs back (`back`), she stands up (`up`). When there is nothing, it springs
// back EMPTY after showing and she stands a moment later. Under a tree, what falls lands by her; she turns round to
// it at `turn` and crouches for it.
const LOOK = {
  lift: {move: .35, show: .8, take: 1.8, back: 1.95, up: 2.3},
  part: {move: .3, show: .75, take: 1.75, back: 1.9, up: 2.2},
  look: {move: .25, show: .6, take: 1.6, back: 1.6, up: 1.95},
  shake: {move: .2, show: .75, turn: 1.4, take: 2.35, back: 2.35, up: 2.75}
};
const EMPTY = .7;
// How much longer they stand somewhere that is only for looking out from (the pier); at night, when he holds her
// there, longer still.
const VIEW_STAY = 3, VIEW_HUG = 5.5;
const viewStay = k => (k.view ? (k.hug ? VIEW_HUG : VIEW_STAY) : 0);
// How far a piece moves: a low one folds forward right over, to lie face down on the page in front of its foot
// (a flap lifted, its blank back up); a tall one tips aside; a tree sways.
const FOLD = Math.PI / 2 - .05, TIP = .34, SWAY = .075;

function hourWord(h) {
  if (h >= 5 && h < 8) return '清晨';
  if (h >= 8 && h < 11) return '上午';
  if (h >= 11 && h < 13) return '中午';
  if (h >= 13 && h < 17) return '下午';
  if (h >= 17 && h < 19) return '傍晚';
  return '夜里';
}

// What she's told as they go, when there's nothing, when it hides deep (a place may say its own, for a kind of
// piece or for one picture).
const GO = {flower: '去掀开那丛花看看。', mushroom: '去掀开那丛蘑菇看看。', log: '去把那截木头翻过来看看。', rock: '去翻翻那块石头。',
  bush: '去拨开那丛灌木看看。', reed: '去拨开那丛芦苇看看。', tree: '去摇摇那棵树。', arch: '去摇摇那座花架。', fence: '去篱笆那儿看看。',
  dock: '去码头那儿看看。', boat: '去小船那儿看看。', tea: '去拨开那垄茶看看。', basket: '去茶篓那儿看看。', crop: '去拨开那垄庄稼看看。',
  taro: '去拨开那丛芋头叶看看。', hay: '去草垛里翻翻。', cart: '去小推车那儿看看。', well: '去井边看看。', crystal: '去那簇石头那儿看看。',
  crate: '去木箱那儿翻翻。', lamp: '去灯底下站一会儿。', fern: '去拨开那丛蕨看看。', beam: '去那道光里站一会儿。', glow: '去掀开那丛发光的蘑菇看看。'};
const NOTHING = {flower: '花底下什么也没有。', mushroom: '蘑菇底下空空的，只有一点湿土。', log: '木头底下是空的，只长着一点青苔。',
  rock: '石头底下什么也没有。', bush: '拨开看了看，只有几片落叶。', reed: '芦苇沙沙地响，底下只有一汪浅浅的水。',
  tree: '叶子哗啦啦响了一阵，什么也没掉下来。', arch: '花架晃了晃，什么也没掉下来。',
  fence: '篱笆角上挂着一张旧蛛网，露水早干了，一碰就散。清晨再来吧。', dock: '码头边上只有湖水拍着木桩。',
  boat: '小船里只有一点积水，漂着一片柳叶。', tea: '茶垄底下只有几片老叶子和一点湿土。', basket: '茶篓里空空的，只剩一点碎叶子。',
  crop: '庄稼底下只有土。', taro: '芋头叶底下只有湿湿的泥。', hay: '草垛里只有干草。', cart: '小推车里空空的。', well: '井水里映着一小块天。',
  crystal: '亮晶晶的，后面什么也没有。', crate: '箱子里空空的。', lamp: '两个人在灯底下站了一会儿。', fern: '蕨叶底下只有湿湿的落叶。',
  beam: '两个人在那道光里站了一会儿，暖暖的。', glow: '蘑菇底下只有一点青苔，还微微发着光。'};
const deepWords = how => (how === 'shake' ? '树上好像挂着什么，没掉下来，再摇一摇。' : '底下好像压着什么，藏得深，再翻一次。');

// What each of them wears: the wardrobe on this device, or the one kept with the home.
function wardrobeHere() {
  let kept;
  try { kept = JSON.parse(localStorage.getItem('porchlit-home-layout-v1') || 'null')?.residents?.wardrobeV1; } catch {}
  return readWardrobe(kept);
}

const paperTexture = t => { t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; };
// The back of a piece: plain paper in its outline, as the back of a cut-out is (seen when a flap folds over).
const PAPER_BACK = '.9, .86, .79';
function paperBack(texture) {
  const m = new T.MeshLambertMaterial({map: texture, alphaTest: .5, side: T.BackSide});
  m.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>\n\tdiffuseColor.rgb = vec3(${PAPER_BACK});`); };
  m.customProgramCacheKey = () => 'paper-back';
  return m;
}

// Where a picture is paper and where it's clear, coarsely, so a tap on the clear part of a piece goes through to
// whatever is behind it (a raycast only knows the rectangle).
const MASK = 48, masks = new WeakMap();
function opaqueAt(texture, uv) {
  if (!uv || !texture?.image) return true;
  let mask = masks.get(texture);
  if (!mask) {
    try {
      const c = document.createElement('canvas'); c.width = c.height = MASK;
      const x = c.getContext('2d', {willReadFrequently: true}); x.drawImage(texture.image, 0, 0, MASK, MASK);
      mask = x.getImageData(0, 0, MASK, MASK).data;
    } catch { mask = null; }
    masks.set(texture, mask || false);
  }
  if (!mask) return true;
  const i = Math.min(MASK - 1, Math.max(0, Math.floor(uv.x * MASK))), j = Math.min(MASK - 1, Math.max(0, Math.floor((1 - uv.y) * MASK)));
  return mask[(j * MASK + i) * 4 + 3] > 90;
}

// Whether a piece stands between the camera and one of the two of them (`f`, their motion state): in front of
// them, across them, and tall enough that the line from their chest up to the camera (about 25° up) runs into it.
// Hiding their feet doesn't count, nor does the piece she's looking through.
const hides = (piece, f) => kindOf(piece.art) !== 'arch' && f.z < piece.z - .05 && Math.abs(f.x - piece.x) < piece.w * .45 && piece.h > 1 + (piece.z - f.z) * .47;
const SEE_THROUGH = .2;

// One upright piece of paper, standing on its bottom middle; it lies flat on the page until its turn, then
// springs up about its foot. Looked through, it folds forward and springs back (a low one), tips aside about its
// right foot so its left side lifts (a tall one), or sways (a tree). Standing in front of the two of them, it goes
// see-through till they're out from behind it.
function PopPiece({piece, texture, world, onTap}) {
  const hinge = useRef(), front = useRef(), invalidate = useThree(s => s.invalidate);
  const geometry = useMemo(() => new T.PlaneGeometry(piece.w, piece.h).translate(0, piece.h / 2, 0), [piece.w, piece.h]);
  const depth = useMemo(() => new T.MeshDepthMaterial({depthPacking: T.RGBADepthPacking, map: texture, alphaTest: .5}), [texture]);
  const back = useMemo(() => paperBack(texture), [texture]);
  useEffect(() => () => { geometry.dispose(); depth.dispose(); back.dispose(); }, [geometry, depth, back]);
  useFrame((_, dt) => {
    const g = hinge.current;
    if (!g || world.opened == null) return;
    const now = performance.now(), t = (now - world.opened) / 1000 - piece.delay, u = Math.max(0, Math.min(1, t / OPEN.each));
    let fold = 0, tip = 0, busy = u < 1;
    const mat = front.current;
    if (mat && world.motion && piece.id !== 'backdrop' && !piece.glow) {
      const want = world.pair.search?.piece.id !== piece.id && (hides(piece, world.motion.her) || hides(piece, world.motion.him)) ? SEE_THROUGH : 1;
      if (Math.abs(want - mat.opacity) > .004) { mat.opacity += (want - mat.opacity) * (1 - Math.exp(-6 * Math.min(dt, .05))); busy = true; } else mat.opacity = want;
      // Opaque or not is part of the shader (three.js): changing it needs the material redone.
      const clear = mat.opacity < .995;
      if (clear !== mat.transparent) { mat.transparent = clear; mat.needsUpdate = true; }
      mat.alphaTest = .5 * mat.opacity;
    }
    const m = world.moves?.get(piece.id);
    if (m) {
      busy = true;
      const s = (now - m.start) / 1000;
      if (m.how === 'shake') {
        tip = SWAY * Math.exp(-2.4 * s) * Math.sin(s * 15);
        if (s > 1.9) { world.moves.delete(piece.id); tip = 0; }
      } else {
        let e = easeOut(Math.min(1, s / (m.how === 'lift' ? .45 : .35)));
        if (m.back != null && now >= m.back) {
          const r = (now - m.back) / 1000;
          e = Math.exp(-5 * r) * Math.cos(9 * r);
          if (r > 1.4) { world.moves.delete(piece.id); e = 0; }
        }
        if (m.how === 'lift') fold = FOLD * e; else tip = -TIP * e;
      }
    }
    const pivot = m && m.how === 'part' ? piece.w / 2 : 0;
    g.rotation.set(-Math.PI / 2 * (1 - (u > 0 ? easeBack(u) : 0)) + fold, 0, tip);
    g.position.set(piece.x + pivot - pivot * Math.cos(tip), -pivot * Math.sin(tip), piece.z);
    g.visible = t > -.05;
    if (busy) invalidate();
  });
  return <group ref={hinge} position={[piece.x, 0, piece.z]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
    <mesh geometry={geometry} castShadow={!piece.glow} customDepthMaterial={piece.glow ? undefined : depth} userData={{piece: piece.id}}
      onClick={onTap ? e => { if (e.delta > 6 || front.current?.opacity < .6 || !opaqueAt(texture, e.uv)) return; e.stopPropagation(); onTap(piece); } : undefined}>
      {/* Light coming down (a beam through the leaves) is drawn as light: added on, no paper behind it, no shadow. */}
      {piece.glow ? <meshBasicMaterial ref={front} map={texture} transparent depthWrite={false} blending={T.AdditiveBlending} opacity={.85} toneMapped={false}/>
        : piece.unlit ? <meshBasicMaterial ref={front} map={texture} alphaTest={.5} color="#e4e6f0"/> : <meshLambertMaterial ref={front} map={texture} alphaTest={.5} shadowSide={T.DoubleSide}/>}
    </mesh>
    {!piece.glow && <mesh geometry={geometry} material={back}/>}
  </group>;
}

// Someone met on the way (src/explore-meet.js): standing on the page like the pieces. When the two of them come near,
// she's told, the diary keeps it, and it does what it does: curls up, or flies up and away.
function Meet({world}) {
  const m = world.meet, invalidate = useThree(s => s.invalidate), lift = useRef();
  const textures = useLoader(T.TextureLoader, [m.art, ...(m.then ? [m.then] : [])].map(a => ANIMALS_DIR + a + '.webp'));
  useMemo(() => textures.forEach(paperTexture), [textures]);
  const [met, setMet] = useState(false);
  const art = met && m.then ? m.then : m.art, {page} = world.place;
  const piece = useMemo(() => ({id: 'meet', art, x: m.at[0], z: m.at[1], h: m.h, w: m.h * ANIMAL_ART[art][0] / ANIMAL_ART[art][1],
    delay: OPEN.first + (m.at[1] + page.depth / 2) / page.depth * OPEN.spread + (m.at[0] + page.width / 2) * .006}), [art, m, page]);
  useFrame(() => {
    const p = world.pair, now = performance.now();
    if (!world.metAt && p.started && Math.hypot(p.c[0] - m.at[0], p.c[1] - m.at[1]) < m.near) {
      world.metAt = now;
      world.say?.(m.say);
      world.note?.('meet', m.moment);
      setMet(true);
    }
    if (m.flies && world.metAt && lift.current) {
      const s = (now - world.metAt) / 1000;
      lift.current.position.set(s * .7, s * .9 + s * s * 1.4, -s * .6);
      lift.current.visible = s < 1.8;
      if (s < 1.9) invalidate();
    }
  });
  return <group ref={lift}><PopPiece piece={piece} texture={textures[met && m.then ? 1 : 0]} world={world}/></group>;
}

// Butterflies over the flowers by day: each drifts round where it hovers, wings opening and closing.
function Butterflies({world}) {
  const list = world.butterflies, invalidate = useThree(s => s.invalidate), group = useRef();
  const arts = list.flatMap(b => [`butterfly-${b.colour}-open`, `butterfly-${b.colour}-closed`]);
  const textures = useLoader(T.TextureLoader, arts.map(a => ANIMALS_DIR + a + '.webp'));
  useMemo(() => textures.forEach(paperTexture), [textures]);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.visible = world.opened != null && (performance.now() - world.opened) / 1000 > OPEN.first + OPEN.spread;
    const t = performance.now() / 1000;
    g.children.forEach((fly, i) => {
      const b = list[i], u = t * .45 + b.phase, open = Math.sin(t * 20 + b.phase * 3) > 0;
      fly.position.set(b.at[0] + Math.sin(u) * .7, .7 + Math.sin(u * 2.3) * .22, b.at[1] + Math.cos(u * .8) * .45);
      fly.scale.x = Math.cos(u) > 0 ? 1 : -1;
      fly.children[0].visible = open;
      fly.children[1].visible = !open;
    });
    invalidate();
  });
  return <group ref={group} visible={false}>{list.map((b, i) => <group key={i}>
    {[0, 1].map(k => {
      const [w, h] = ANIMAL_ART[arts[i * 2 + k]], H = .38;
      return <mesh key={k} position={[0, H / 2, 0]}><planeGeometry args={[H * w / h, H]}/><meshLambertMaterial map={textures[i * 2 + k]} alphaTest={.5} side={T.DoubleSide}/></mesh>;
    })}
  </group>)}</group>;
}

// A little four-pointed glint, over a clump with something to find to start her off, or over a find come up.
let glintMap;
function glintTexture() {
  if (glintMap) return glintMap;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,253,240,1)'); g.addColorStop(.3, 'rgba(250,214,150,.95)'); g.addColorStop(1, 'rgba(240,190,120,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(32, 0); x.quadraticCurveTo(36, 28, 64, 32); x.quadraticCurveTo(36, 36, 32, 64); x.quadraticCurveTo(28, 36, 0, 32); x.quadraticCurveTo(28, 28, 32, 0); x.fill();
  glintMap = new T.CanvasTexture(c); glintMap.colorSpace = T.SRGBColorSpace; return glintMap;
}
function Glint({piece, world}) {
  const sprite = useRef(), invalidate = useThree(s => s.invalidate), seed = useMemo(() => piece.x * 7.3 + piece.z * 3.1, [piece]);
  useFrame(() => {
    if (!sprite.current) return;
    const shown = world.opened != null && (performance.now() - world.opened) / 1000 > piece.delay + OPEN.each && !world.looked.has(piece.id);
    sprite.current.visible = shown;
    if (!shown) return;
    const t = performance.now() / 1000 + seed, s = .5 + .1 * Math.sin(t * 2.6);
    sprite.current.scale.set(s, s, s); sprite.current.material.opacity = .8 + .2 * Math.sin(t * 2.6);
    invalidate();
  });
  return <sprite ref={sprite} position={[piece.x + piece.w * .18, piece.h + .12, piece.z + .02]} visible={false}>
    <spriteMaterial map={glintTexture()} transparent depthWrite={false}/>
  </sprite>;
}

// What was found: comes up about its foot where it hid, or falls from the branches with a little bounce; glints
// till she takes it, then goes into her hands, smaller and smaller.
function FindPiece({reveal, texture, world, place}) {
  const group = useRef(), glint = useRef(), invalidate = useThree(s => s.invalidate);
  const art = place.finds[reveal.find].art, h = place.findH, w = h * place.art[art][0] / place.art[art][1];
  const geometry = useMemo(() => new T.PlaneGeometry(w, h).translate(0, h / 2, 0), [w, h]);
  const depth = useMemo(() => new T.MeshDepthMaterial({depthPacking: T.RGBADepthPacking, map: texture, alphaTest: .5}), [texture]);
  useEffect(() => () => { geometry.dispose(); depth.dispose(); }, [geometry, depth]);
  useFrame(() => {
    const g = group.current;
    if (!g || !g.visible) return;
    const now = performance.now(), s = (now - reveal.start) / 1000, [tx, ty, tz] = reveal.to;
    let x = tx, y = ty, z = tz, rx = 0, rz = 0, scale = 1;
    if (reveal.from) {
      const fall = .55, u = Math.min(1, s / fall), [fx, fy, fz] = reveal.from;
      x = fx + (tx - fx) * u; z = fz + (tz - fz) * u; y = fy + (ty - fy) * u * u;
      rz = (1 - u) * Math.sin(s * 12) * .5;
      if (u >= 1) { const b = s - fall; y = ty + Math.max(0, Math.sin(b * 14) * .12 * Math.exp(-b * 7)); }
    } else rx = -Math.PI / 2 * (1 - easeBack(Math.min(1, s / .45)));
    if (reveal.takenAt != null) {
      const q = Math.min(1, (now - reveal.takenAt) / 380), her = world.motion.her;
      x += (her.x - x) * q; z += (her.z - z) * q; y += (.55 - y) * q; scale = 1 - q;
      if (q >= 1) { g.visible = false; invalidate(); return; }
    }
    g.position.set(x, y, z); g.rotation.set(rx, 0, rz); g.scale.setScalar(Math.max(.001, scale));
    if (glint.current) { const p = .42 + .07 * Math.sin(now / 1000 * 4); glint.current.scale.set(p, p, p); glint.current.visible = reveal.takenAt == null && s > .35; }
    invalidate();
  });
  return <group ref={group} position={reveal.from || reveal.to}>
    <mesh geometry={geometry} castShadow customDepthMaterial={depth}><meshLambertMaterial map={texture} alphaTest={.5} side={T.DoubleSide}/></mesh>
    <sprite ref={glint} position={[w * .32, h + .06, .02]} visible={false}><spriteMaterial map={glintTexture()} transparent depthWrite={false}/></sprite>
  </group>;
}

// Leaves, petals and bits of bark that fly up when a piece is looked through, or flutter down from a shaken tree.
let leafMap;
function leafTexture() {
  if (leafMap) return leafMap;
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(2, 16); x.quadraticCurveTo(16, 2, 30, 16); x.quadraticCurveTo(16, 30, 2, 16); x.fill();
  leafMap = new T.CanvasTexture(c); leafMap.colorSpace = T.SRGBColorSpace; return leafMap;
}
const BIT_COLOURS = {pink: ['#f2b8c4', '#f8d3da', '#e9a3b3'], white: ['#faf6ee', '#efe8da', '#f6efdf'], mist: ['#d9cfe8', '#ebe5f3', '#cfc2e0'],
  green: ['#8fa66d', '#a9b884', '#7d955e'], earth: ['#a08463', '#8f9b62', '#b49a74'], straw: ['#eadfc2', '#d9c79e', '#bfc795'],
  glow: ['#cdeee4', '#b6e2d6', '#e3f4ef']};
const bitColours = art => BIT_COLOURS[/fluorite|glow/.test(art) ? 'glow' : /pink|rose|cherry/.test(art) ? 'pink' : /white/.test(art) ? 'white' : /lavender|wisteria|bells|blue/.test(art) ? 'mist'
  : /reed|crop|hay|scarecrow/.test(art) ? 'straw' : /moss|fern/.test(art) ? 'green'
  : /log|rock|mushroom|dock|boat|barrow|well|fence|crate|barrel|cart|lamp|root/.test(art) ? 'earth' : 'green'].map(c => new T.Color(c));
// Walking under an arch of flowers: its petals come down over the two of them, like being showered on a wedding day.
const SHOWER = ['#f8f3fb', '#e6daf3', '#d6c4ec', '#f7dbe6'].map(c => new T.Color(c));
// Under an arch of roots, dry leaves instead.
const DUST = ['#b49a74', '#8f7a5e', '#cdb48c'].map(c => new T.Color(c));
const SHOWERS = {'root-arch': ['#c98f4f', '#a9653a', '#d8b36a', '#8fa66d'].map(c => new T.Color(c)), 'timber-frame-1': DUST, 'timber-frame-2': DUST};
const showerFrom = arch => ({x: arch.x, y: arch.h * .74, z: arch.z + .08, w: arch.w * .75, hspan: arch.h * .14, n: 30, kick: .15, fall: .65, spread: 1, size: 1.5,
  start: performance.now(), seed: Math.random() * 100, colours: SHOWERS[arch.art] || SHOWER});
function burstFor(p, how) {
  const at = {x: p.x, z: p.z + .12, start: performance.now(), seed: Math.random() * 100, colours: bitColours(p.art)};
  if (how === 'shake') return {...at, y: p.h * .62, w: p.w * .6, hspan: p.h * .3, n: 12, kick: .1, fall: .9, spread: .8};
  if (how === 'part') return {...at, x: p.x - p.w * .2, y: p.h * .6, w: p.w * .5, hspan: p.h * .5, n: 8, kick: .8, fall: 2.2, spread: 1.4};
  return {...at, y: p.h * .5, w: p.w * .6, hspan: p.h * .4, n: 7, kick: 1.1, fall: 2.6, spread: 1.2};
}
const BITS = 40, fract = v => v - Math.floor(v);
function Bits({world}) {
  const group = useRef(), invalidate = useThree(s => s.invalidate);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const now = performance.now();
    world.bits = world.bits.filter(b => now - b.start < 2200);
    let k = 0;
    for (const b of world.bits) {
      const s = (now - b.start) / 1000;
      for (let i = 0; i < b.n && k < BITS; i++, k++) {
        const sp = g.children[k], r = n => fract(Math.sin((i + 1) * 12.9898 + (b.seed + n) * 78.233) * 43758.5453);
        const x = b.x + (r(4) - .5) * b.w + (r(1) - .5) * b.spread * s + Math.sin(s * 5 + i) * .12, z = b.z + (r(2) - .3) * .7 * s;
        const y = Math.max(.02, b.y + (r(5) - .5) * b.hspan + b.kick * (.6 + r(3) * .7) * s - b.fall * s * s);
        sp.position.set(x, y, z);
        sp.material.rotation = (r(6) - .5) * 6 * s + r(7) * 6;
        sp.material.color.copy(b.colours[i % b.colours.length]);
        sp.material.opacity = Math.min(1, (2.1 - s) / .5, s / .06);
        const size = (.1 + r(8) * .08) * (b.size || 1);
        sp.scale.set(size, size * .7, 1);
        sp.visible = true;
      }
    }
    for (; k < BITS; k++) g.children[k].visible = false;
    if (world.bits.length) invalidate();
  });
  return <group ref={group}>{Array.from({length: BITS}, (_, i) => <sprite key={i} visible={false}><spriteMaterial map={leafTexture()} transparent depthWrite={false}/></sprite>)}</group>;
}

// At night: fireflies drifting over the page, each blinking in its own time.
let glowMap;
function glowTexture() {
  if (glowMap) return glowMap;
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,252,200,1)'); g.addColorStop(.35, 'rgba(236,240,140,.7)'); g.addColorStop(1, 'rgba(210,230,120,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32); glowMap = new T.CanvasTexture(c); glowMap.colorSpace = T.SRGBColorSpace; return glowMap;
}
function Fireflies({count = 24}) {
  const group = useRef(), invalidate = useThree(s => s.invalidate);
  const flies = useMemo(() => Array.from({length: count}, (_, i) => ({x: -7 + 14 * ((i * .618) % 1), z: -3.4 + 6.4 * ((i * .382 + .17) % 1), y: .5 + 1.6 * ((i * .73) % 1), s: i * 1.7})), [count]);
  useFrame(() => {
    if (!group.current) return;
    const t = performance.now() / 1000;
    group.current.children.forEach((sprite, i) => {
      const f = flies[i];
      sprite.position.set(f.x + Math.sin(t * .31 + f.s) * .9, f.y + Math.sin(t * .53 + f.s * 2) * .35, f.z + Math.cos(t * .27 + f.s) * .6);
      sprite.material.opacity = Math.max(0, Math.sin(t * 1.3 + f.s * 3)) ** 2;
    });
    invalidate();
  });
  return <group ref={group}>{flies.map((_, i) => <sprite key={i} scale={[.34, .34, .34]}><spriteMaterial map={glowTexture()} transparent depthWrite={false} blending={T.AdditiveBlending}/></sprite>)}</group>;
}

// On the flower hill: cherry petals drifting across the page on the wind, falling as they go, all the time.
function Petals({colours, page, count = 34}) {
  const group = useRef(), invalidate = useThree(s => s.invalidate);
  const petals = useMemo(() => Array.from({length: count}, (_, i) => ({
    x0: (i * .618 % 1) * (page.width + 4) - page.width / 2 - 2, z: -page.depth / 2 + page.depth * ((i * .382 + .21) % 1),
    y0: 1.2 + 3.2 * ((i * .73) % 1), s: i * 1.7, c: new T.Color(colours[i % colours.length]), size: .13 + .07 * ((i * .57) % 1),
    speed: .35 + .25 * ((i * .29) % 1)
  })), [colours, page, count]);
  useFrame(() => {
    if (!group.current) return;
    const t = performance.now() / 1000, W = page.width + 4;
    group.current.children.forEach((sprite, i) => {
      // How far through its fall it is (0 to 1), round and round.
      const p = petals[i], life = 9 / p.speed, u = ((t + p.s * 3) % life) / life;
      const x = ((p.x0 + u * W * .55 + page.width / 2 + 2) % W) - page.width / 2 - 2;
      sprite.position.set(x + Math.sin(t * .9 + p.s * 2) * .25, Math.max(.03, p.y0 * (1 - u) + Math.sin(t * 1.7 + p.s) * .12), p.z + Math.cos(t * .7 + p.s) * .3);
      sprite.material.rotation = t * (1 + i % 3) * .8 + p.s;
      sprite.material.opacity = Math.min(1, u * 8, (1 - u) * 6);
    });
    invalidate();
  });
  return <group ref={group}>{petals.map((p, i) => <sprite key={i} scale={[p.size, p.size * .7, 1]}><spriteMaterial map={leafTexture()} color={p.c} transparent depthWrite={false}/></sprite>)}</group>;
}

// One of the two, as in the house (body/avatar-model.js, avatar-rig.js), moved by its motion state.
function Figure({kind, look, motion, onTap}) {
  const holder = useRef(), [rig, setRig] = useState(null), invalidate = useThree(s => s.invalidate), signature = JSON.stringify(look);
  useEffect(() => {
    let alive = true, loaded;
    createApprovedAvatar(kind, look).then(root => { if (!alive) { disposeAvatar(root); return; } loaded = rigAvatar(root); setRig(loaded); invalidate(); })
      .catch(error => console.error('Explore figure unavailable', error));
    return () => { alive = false; if (loaded) { loaded.skeleton.dispose(); disposeAvatar(loaded.root); } };
  }, [kind, signature, invalidate]);
  useFrame((_, dt) => {
    if (!holder.current || !rig) return;
    const running = stepResident(motion, dt, rig.seatContact.y + RESIDENT_GROUND_OFFSET);
    holder.current.position.fromArray(residentPosePosition(motion, rig.seatContact));
    holder.current.rotation.set(0, motion.yaw, 0);
    rig.pose({phase: motion.phase, amount: motion.amount, crouch: motion.crouch, lean: motion.lean, tilt: motion.tilt, arms: motion.arms, reach: motion.reach});
    if (running) invalidate();
  });
  return <group ref={holder} onClick={onTap ? e => { if (e.delta > 6) return; e.stopPropagation(); onTap(); } : undefined}>{rig && <primitive object={rig.root}/>}</group>;
}

// A kiss: they stop, he turns to her and steals a kiss on her cheek while she looks out (as in the house,
// resident-touches.js), or kisses the top of her head for doing well; a heart floats up between them, and on they go.
// When he has turned (`turn`), how long he stays (`hold`), when it's over (`end`).
const KISS = {turn: .35, hold: 1.15, end: 1.5};
function startKiss(world, kind = 'cheek') {
  const p = world.pair;
  if (p.kiss) return false;
  p.kiss = {t: 0, kind, route: p.route};
  p.route = [];
  return true;
}
let heartMap;
function heartTexture() {
  if (heartMap) return heartMap;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#f08aa6'; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(6, 38, 2, 20, 16, 12); x.bezierCurveTo(24, 7, 30, 12, 32, 18);
  x.bezierCurveTo(34, 12, 40, 7, 48, 12); x.bezierCurveTo(62, 20, 58, 38, 32, 56); x.fill();
  x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.ellipse(21, 21, 5, 3.5, -.6, 0, Math.PI * 2); x.fill();
  heartMap = new T.CanvasTexture(c); heartMap.colorSpace = T.SRGBColorSpace; return heartMap;
}
// The heart of a kiss, floating up from between them and fading; drawn over everything.
function Heart({world}) {
  const sprite = useRef(), invalidate = useThree(s => s.invalidate);
  useFrame(() => {
    const h = world.heart, sp = sprite.current;
    if (!sp) return;
    if (!h) { sp.visible = false; return; }
    const s = (performance.now() - h.start) / 1000;
    if (s > 1.3) { world.heart = null; sp.visible = false; invalidate(); return; }
    const size = .32 * Math.min(1, s / .15) * (1 + .08 * Math.sin(s * 12));
    sp.visible = true; sp.position.set(h.x, h.y + s * .3, h.z); sp.scale.set(size, size, size);
    sp.material.opacity = Math.min(1, (1.3 - s) / .4);
    invalidate();
  });
  return <sprite ref={sprite} visible={false} renderOrder={10}><spriteMaterial map={heartTexture()} transparent depthWrite={false} depthTest={false}/></sprite>;
}

// The two of them as one: a point between them that walks the route, each standing at their side of it, hands
// held (resident-hand.js). Stopping to look through a piece, hands let go: she crouches to fold a low one forward,
// reaches across to push a tall one aside, or the two of them take hold of a tree and shake it; when something
// falls she turns round and crouches for it. `look` does what happens to the page (the piece moving, the find).
function Pair({world, look}) {
  const invalidate = useThree(s => s.invalidate);
  useFrame((_, seconds) => {
    const dt = Math.min(seconds, .05), p = world.pair, her = world.motion.her, him = world.motion.him;
    if (world.opened == null || (performance.now() - world.opened) / 1000 < OPEN.walkIn) return;
    if (!p.started) { p.started = true; p.route = routeOn(world.web, p.c, world.place.firstStop); }
    let moved = 0;
    const k = p.search;
    if (p.kiss) {
      p.kiss.t += dt;
      // Then on the way they were going, unless she has tapped somewhere else meanwhile.
      if (p.kiss.t >= KISS.end) { if (p.kiss.route.length && !p.route.length) p.route = p.kiss.route; p.kiss = null; }
    } else if (world.kissNext && !p.search) { startKiss(world, world.kissNext); world.kissNext = null; }
    if (p.kiss) {
      // Standing still for it.
    } else if (p.route.length) {
      const goal = p.route[0], dx = goal[0] - p.c[0], dz = goal[1] - p.c[1], dist = Math.hypot(dx, dz);
      const turn = angleDelta(p.yaw, Math.atan2(dx, dz));
      p.yaw += Math.sign(turn) * Math.min(Math.abs(turn), dt * HAND.turn * 1.6);
      const step = Math.min(dist, HAND.speed * dt * Math.max(.25, Math.cos(turn)));
      if (dist > 1e-5) { p.c[0] += dx / dist * step; p.c[1] += dz / dist * step; moved = step; }
      if (dist <= step + .004) { p.c = [...goal]; p.route.shift(); }
    } else if (k) {
      if (k.stage === 'go') {
        const turn = angleDelta(p.yaw, k.yaw);
        p.yaw += Math.sign(turn) * Math.min(Math.abs(turn), dt * 5);
        // Somewhere only to look out from (the pier), they stay hand in hand; at night he lets go to hold her.
        if (Math.abs(turn) < .04) { p.yaw = k.yaw; Object.assign(k, {stage: 'act', t: 0, hy: k.yaw}); p.holding = !!k.view && !k.hug; }
      } else if (k.stage === 'act') {
        const L = LOOK[k.how], had = k.t;
        k.t += dt;
        const past = at => had < at && k.t >= at;
        if (k.how === 'lift') her.crouchTo = .95;
        else if (k.how === 'look' && !k.view) her.crouchTo = .3;
        else if (k.how === 'part') { k.herArms = [-1.3, 0, -1.3, 0]; her.leanTo = .15; }
        else if (k.how === 'shake' && !k.turned) k.herArms = k.himArms = [-1.9, 0, -1.9, 0];
        if (past(L.move)) look.move(k.piece, k.how);
        if (past(L.show)) k.result = look.show(k.piece, k.how);
        if (k.result?.find) {
          if (k.how === 'shake') {
            if (past(L.turn)) { k.turned = true; k.herYaw = 0; k.herArms = k.himArms = null; }
            if (k.t > L.turn + .35) her.crouchTo = .95;
          }
          if (past(L.take)) look.take(k.piece, k.result);
          if (past(L.back)) look.back(k.piece);
          if (k.t >= L.up) k.stage = 'rise';
        } else if (k.result) {
          if (past(L.show + EMPTY)) look.back(k.piece);
          // Looking out over the water they stay a while.
          if (k.t >= L.show + EMPTY + .35 + viewStay(k)) k.stage = 'rise';
        }
        if (k.stage === 'rise') { k.t = 0; her.crouchTo = 0; her.leanTo = 0; k.herArms = k.himArms = null; if (k.herYaw != null) k.herYaw = p.yaw; }
      } else if (k.stage === 'rise') {
        k.t += dt;
        if (k.t > .45) { p.holding = true; p.search = null; }
      }
    }
    const slots = handSlots(p.c, p.yaw, p.side);
    her.x = slots.her[0]; her.z = slots.her[1]; him.x = slots.him[0]; him.z = slots.him[1];
    // Looking, she may turn on her own (round to what fell, and back); otherwise both face the way they go.
    if (p.search && p.search.herYaw != null) { p.search.hy += angleDelta(p.search.hy, p.search.herYaw) * Math.min(1, dt * 7); her.yaw = p.search.hy; }
    else her.yaw = p.yaw;
    him.yaw = p.yaw;
    him.leanTo = 0;
    let kissArms = null;
    if (p.kiss) {
      // She looks out at the camera; he comes round to her side as the camera sees it (never hidden behind her),
      // turns to her and leans in, hands behind his back.
      const kk = p.kiss, u = kk.t < KISS.turn ? kk.t / KISS.turn : kk.t < KISS.hold ? 1 : Math.max(0, 1 - (kk.t - KISS.hold) / (KISS.end - KISS.hold));
      const e = u * u * (3 - 2 * u);
      kk.side = kk.side || Math.sign(him.x - her.x) || 1;
      const to = [her.x + kk.side * .62, her.z + .04];
      him.x += (to[0] - him.x) * e; him.z += (to[1] - him.z) * e;
      him.yaw = p.yaw + angleDelta(p.yaw, Math.atan2(her.x - to[0], her.z - to[1])) * e;
      her.yaw = p.yaw + angleDelta(p.yaw, 0) * e;
      him.leanTo = (kk.kind === 'head' ? .42 : .28) * e;
      kissArms = e > .3 ? [.45, .15, .45, -.15] : null;
      if (!kk.smack && kk.t >= KISS.turn) {
        kk.smack = true;
        play('kiss', {volume: .7});
        world.heart = {start: performance.now(), x: (her.x + him.x) / 2, z: (her.z + him.z) / 2 + .15, y: kk.kind === 'head' ? 1.5 : 1.2};
      }
    }
    // At night, looking out from the pier: he holds her from behind, the two of them turned out towards the camera
    // with the water behind them, him peeking out past her head (as in the house, resident-touches.js HUG).
    const hug = !p.kiss && k?.hug && k.stage === 'act' ? k : null;
    let hugArms = null;
    her.tiltTo = him.tiltTo = 0;
    if (hug) {
      const total = LOOK.look.show + EMPTY + .35 + VIEW_HUG, ramp = v => { const u = Math.max(0, Math.min(1, v / .7)); return u * u * (3 - 2 * u); };
      const e = ramp(hug.t - .3) * ramp(total - hug.t);
      hug.side = hug.side || Math.sign(him.x - her.x) || -1;
      const to = [her.x + hug.side * HUG.side, her.z - HUG.behind];
      him.x += (to[0] - him.x) * e; him.z += (to[1] - him.z) * e;
      her.yaw = p.yaw + angleDelta(p.yaw, 0) * e; him.yaw = p.yaw + angleDelta(p.yaw, 0) * e;
      him.leanTo = TOUCHES.hug.lean * e; him.tiltTo = -HUG.peek * hug.side * e;
      her.leanTo = -.05 * e; her.tiltTo = HUG.lean * hug.side * e;
      hugArms = e > .3 ? HUG.arms : null;
      if (!hug.hearted && e > .95) {
        hug.hearted = true;
        world.note?.('hug', world.place.hugMoment);
        world.heart = {start: performance.now(), x: (her.x + him.x) / 2, z: her.z + .2, y: 1.35};
      }
    }
    // Passing under an arch (from one side of it to the other, between its posts), its petals fall on them.
    for (const arch of world.arches) {
      const side = Math.sign(p.c[1] - arch.z);
      if (moved > 0 && arch.side && side && side !== arch.side && Math.abs(p.c[0] - arch.x) < arch.w * .3) { world.bits.push(showerFrom(arch)); if (startKiss(world)) { world.say?.(world.place.arch?.say || '花瓣落下来，他停下来亲了你一口。'); world.note?.('petals', world.place.arch?.moment || '走过紫藤花架，花瓣落了一身，他停下来亲了你一口'); } }
      if (side) arch.side = side;
    }
    her.inStep = him.inStep = moved > 0;
    her.phase += moved * 16; him.phase += moved * 16;
    if (p.kiss || hug) {
      her.armsTo = null; her.reachTo = null; him.armsTo = p.kiss ? kissArms : hugArms; him.reachTo = null;
    } else {
      her.armsTo = p.holding ? handArms(p.side) : (p.search?.herArms || null); her.reachTo = p.holding ? handReach(p.side) : null;
      him.armsTo = p.holding ? handArms(-p.side) : (p.search?.himArms || null); him.reachTo = p.holding ? handReach(-p.side) : null;
    }
    if (moved > 0 || p.route.length || p.search || p.kiss || world.kissNext) invalidate();
  });
  return null;
}

// Slides and zooms; follows the two of them while they walk, unless she has just moved it herself, and leans in
// while they look through something.
function CameraRig({world, page}) {
  const {camera, size, gl, invalidate} = useThree();
  const view = useRef({x: 0, z: 0, zoom: 1, lean: 0, touched: 0, pointers: new Map(), pinch: 0});
  const base = useMemo(() => {
    const narrow = size.width < 700;
    const fit = Math.min(size.width / (page.width + .6), size.height / 9.9);
    return narrow ? Math.min(size.height / 9.9, 72) : fit;
  }, [size.width, size.height]);
  const reach = zoom => Math.max(0, page.width / 2 - size.width / zoom / 2 + .3);
  useEffect(() => {
    const el = gl.domElement, v = view.current;
    const down = e => { v.pointers.set(e.pointerId, [e.clientX, e.clientY]); v.pinch = 0; };
    const up = e => { v.pointers.delete(e.pointerId); v.pinch = 0; };
    const move = e => {
      if (!v.pointers.has(e.pointerId)) return;
      const last = v.pointers.get(e.pointerId); v.pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (v.pointers.size === 2) {
        const [a, b] = [...v.pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (v.pinch) v.zoom = Math.max(.8, Math.min(2.6, v.zoom * d / v.pinch));
        v.pinch = d;
      } else {
        const z = base * v.zoom;
        v.x -= (e.clientX - last[0]) / z; v.z -= (e.clientY - last[1]) / z * .6;
      }
      v.touched = performance.now(); invalidate();
    };
    const wheel = e => { e.preventDefault(); v.zoom = Math.max(.8, Math.min(2.6, v.zoom * Math.exp(-e.deltaY * .0015))); v.touched = performance.now(); invalidate(); };
    el.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    el.addEventListener('pointermove', move); el.addEventListener('wheel', wheel, {passive: false});
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); el.removeEventListener('pointermove', move); el.removeEventListener('wheel', wheel); };
  }, [gl, base, invalidate]);
  useFrame((_, dt) => {
    const v = view.current, p = world.pair, looking = p.search && p.search.stage !== 'go' && !p.route.length ? 1 : 0;
    if (Math.abs(looking - v.lean) > .002) { v.lean += (looking - v.lean) * (1 - Math.exp(-dt * 3)); invalidate(); } else v.lean = looking;
    const near = Math.max(v.zoom, 1 + (CLOSE - 1) * v.lean), zoom = base * near, r = reach(zoom);
    const y = LOOK_Y - (LOOK_Y - LOW_Y) * Math.min(1, Math.max(0, (near - 1) / (CLOSE - 1)));
    // Start where they come in (on a narrow screen the page is wider than the view).
    if (!v.placed) { v.placed = true; v.x = p.c[0]; }
    if (performance.now() - v.touched > 2500 && (p.route.length || p.search)) { v.x += (p.c[0] - v.x) * Math.min(1, dt * 1.8); invalidate(); }
    // Leaning in on them far up or down the page (the top of the tea hill), it also slides that way, so they aren't
    // at the very edge of the picture.
    if (performance.now() - v.touched > 2500 && looking) {
      const want = Math.max(-1.6, Math.min(1.6, p.c[1] * .6));
      if (Math.abs(want - v.z) > .005) { v.z += (want - v.z) * Math.min(1, dt * 1.8); invalidate(); }
    }
    v.x = Math.max(-r, Math.min(r, v.x)); v.z = Math.max(-1.6, Math.min(1.6, v.z));
    camera.zoom = zoom; camera.position.set(v.x + VIEW.x, y + VIEW.y, v.z + VIEW.z); camera.lookAt(v.x, y, v.z); camera.updateProjectionMatrix();
  });
  return null;
}

// Every picture a page uses: the ground, the sky board (after dark the night one, with the moon, when the place has
// one), the pieces, and what can be found.
const pageArts = place => [...new Set([...place.pieces.map(p => p.art), ...Object.values(place.finds).map(f => f.art)])];
const skyOf = (place, light) => (light === 'night' && place.backdrop.night ? place.backdrop.night : place.backdrop.art);
export const pageUrls = (place, light) => [place.ground.art, skyOf(place, light), ...pageArts(place).map(a => a + '.webp')].map(a => place.dir + a);

// A page that couldn't be opened (a picture that didn't come): nothing drawn, and the page says so (onFail).
class PageCatch extends React.Component {
  constructor(props) { super(props); this.state = {failed: false}; }
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch(error) { this.props.onFail?.(error); }
  render() { return this.state.failed ? null : this.props.children; }
}

// How far along the page's pictures are, as they come: {loaded, total}. Only one page is open at a time; what was
// listening before is listened to again after.
function useLoading() {
  const [progress, setProgress] = useState({loaded: 0, total: 0});
  useEffect(() => {
    const m = T.DefaultLoadingManager, before = {onStart: m.onStart, onProgress: m.onProgress};
    m.onStart = (url, loaded, total) => { before.onStart?.(url, loaded, total); setProgress({loaded, total}); };
    m.onProgress = (url, loaded, total) => { before.onProgress?.(url, loaded, total); setProgress({loaded, total}); };
    return () => { m.onStart = before.onStart; m.onProgress = before.onProgress; };
  }, []);
  return progress;
}

function Page({place, world, light, reveals, onTapPiece, onTapGround, onTapFigure, onOpened}) {
  const {page, ground, backdrop: board} = place, sky = skyOf(place, light);
  const ARTS = useMemo(() => pageArts(place), [place]);
  const textures = useLoader(T.TextureLoader, pageUrls(place, light));
  const map = useMemo(() => {
    textures.forEach(paperTexture);
    const out = {ground: textures[0], backdrop: textures[1]};
    ARTS.forEach((a, i) => { out[a] = textures[i + 2]; });
    return out;
  }, [textures]);
  // The night board is painted dark already: it shows as painted, not dimmed again by the moonlight.
  const backdrop = useMemo(() => ({id: 'backdrop', x: 0, z: board.z, w: board.width, h: board.width * board.size[1] / board.size[0], delay: OPEN.backdrop, unlit: sky === board.night}), [board, sky]);
  const pieces = useMemo(() => place.pieces.map(p => ({...p, delay: OPEN.first + (p.z + page.depth / 2) / page.depth * OPEN.spread + (p.x + page.width / 2) * .006})), [place, page]);
  useEffect(() => { onOpened(); }, [onOpened]);
  const her = world.kinds.her, him = world.kinds.him, night = light === 'night', dawn = light === 'dawn', cave = light === 'cave';
  return <>
    {/* Soft all round, and a sun from the left and a little in front, strong enough that each piece of paper and the
        two of them throw a shadow beside them on the page; at dawn it's low and warm, at night the moon. */}
    {cave ? <>
      <ambientLight intensity={.55} color="#e8cfb2"/>
      <hemisphereLight args={['#bfd8d2', '#3a2f28', .32]}/>
    </> : night ? <>
      <ambientLight intensity={.42} color="#a9b6dd"/>
      <hemisphereLight args={['#8f9ccc', '#3e3a4c', .3]}/>
    </> : dawn ? <>
      <ambientLight intensity={.72} color="#ffe8d6"/>
      <hemisphereLight args={['#ffe0c2', '#c9b6a2', .35]}/>
    </> : <>
      <ambientLight intensity={.85}/>
      <hemisphereLight args={['#fff6ea', '#d8c9b4', .35]}/>
    </>}
    <directionalLight position={cave ? [-6, 9, 8] : night ? [12, 9, 4] : dawn ? [-14, 5, 7] : [-12, 8, 5]} intensity={cave ? 1.5 : night ? .95 : dawn ? 2.2 : 2.4} color={cave ? '#ffd9a8' : night ? '#cdd8ff' : dawn ? '#ffd6ad' : '#ffffff'}
      castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-.0004}
      shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-near={1} shadow-camera-far={40}/>
    {/* The page under the picture: a cream margin round it. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.012, 0]} receiveShadow><planeGeometry args={[page.width + .9, page.depth + .9]}/><meshLambertMaterial color="#efe4d2"/></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={e => { if (e.delta > 6) return; onTapGround([e.point.x, e.point.z]); }}>
      <planeGeometry args={[page.width, page.depth]}/><meshLambertMaterial map={map.ground}/>
    </mesh>
    <PopPiece piece={backdrop} texture={map.backdrop} world={world}/>
    {/* Scenery far off the paths isn't for tapping: a tap there goes to the ground behind. */}
    {pieces.map(p => <PopPiece key={p.id} piece={p} texture={map[p.art]} world={world} onTap={p.still ? undefined : onTapPiece}/>)}
    {pieces.filter(p => world.glints.includes(p.id)).map(p => <Glint key={p.id} piece={p} world={world}/>)}
    {reveals.map(r => <FindPiece key={r.key} reveal={r} texture={map[place.finds[r.find].art]} world={world} place={place}/>)}
    {world.meet && <Meet world={world}/>}
    {world.butterflies.length > 0 && <Butterflies world={world}/>}
    {place.petals && <Petals colours={place.petals} page={page}/>}
    <Bits world={world}/>
    {(night || cave) && <Fireflies/>}
    <Figure kind={her} look={world.looks.her} motion={world.motion.her} onTap={onTapFigure}/>
    <Figure kind={him} look={world.looks.him} motion={world.motion.him} onTap={onTapFigure}/>
    <Heart world={world}/>
  </>;
}

export function ExploreBook({place}) {
  // Out on a trip (src/explore-trips.js, started at the door): this page is one more place on it, hides things by the
  // trip's own seed, fills the trip's basket and keeps what happens on the way. Without one (the page opened by
  // itself), it's only a walk: nothing is kept.
  const trip = useRef(undefined);
  if (trip.current === undefined) {
    const t = readTrip();
    trip.current = t ? visit(t, place.id) : null;
    if (trip.current) writeTrip(trip.current);
  }
  // Dawn, day or night by her clock (?at=dawn, day or night to look at another, only when not out on a trip: on one,
  // what grows at dawn is found at dawn); the walk's own seed (?seed= to see one again).
  const {when, light} = useMemo(() => {
    const at = trip.current ? null : new URLSearchParams(location.search).get('at');
    const hour = at === 'night' ? 22 : at === 'day' ? 15 : at === 'dawn' ? 6 : new Date().getHours();
    // A cave has neither: lamplight and the glow of what grows in there.
    return {when: hourWord(hour), light: place.cave ? 'cave' : hour >= 19 || hour < 5 ? 'night' : hour < 8 ? 'dawn' : 'day'};
  }, []);
  const world = useMemo(() => {
    const wardrobe = wardrobeHere(), her = wardrobe.playerKind === 'boy' ? 'boy' : 'girl', him = her === 'girl' ? 'boy' : 'girl';
    // They come in at the place's start, facing where they first walk to.
    const start = [...place.start], web = pathWeb(place.paths), first = routeOn(web, start, place.firstStop)[0] || place.firstStop;
    const pair = {c: start, yaw: Math.atan2(first[0] - start[0], first[1] - start[1]), route: [], side: 1, holding: true, search: null, started: false};
    const slots = handSlots(start, pair.yaw, pair.side);
    const asked = Number(new URLSearchParams(location.search).get('seed')), seed = trip.current ? placeSeed(trip.current, place.id) : Number.isFinite(asked) && asked > 0 ? asked : (Math.random() * 2 ** 31) >>> 0;
    const {hidden, glints: glinting} = hideFinds(seed, place, {night: light === 'night', dawn: light === 'dawn'});
    // Back on a page on the same trip: what was looked through then is as it was left (and doesn't glint).
    const before = Object.entries(searchedOn(trip.current, place.id)), glints = glinting.filter(id => !before.some(([b]) => b === id));
    const arches = place.pieces.filter(p => kindOf(p.art) === 'arch').map(p => ({...p, side: 0}));
    // Who they might meet on the way, and butterflies by day (src/explore-meet.js).
    const meet = meetOn(seed, place.id, light), butterflies = butterfliesOn(seed, place.id, light);
    return {place, web, arches, kinds: {her, him}, looks: {her: wardrobe[her], him: wardrobe[him]}, pair, seed, hidden, glints, dawn: light === 'dawn', meet, butterflies, metAt: null,
      looked: new Map(before), moves: new Map(), bits: [], opened: null,
      motion: {her: {...newMotion(slots.her), yaw: pair.yaw}, him: {...newMotion(slots.him), yaw: pair.yaw}}};
  }, [light, place]);
  const go = {...GO, ...place.go}, nothing = {...NOTHING, ...place.nothing};
  // On a trip the basket is the trip's, carried from page to page; on a walk by itself, this page's.
  const cap = trip.current ? BASKET : place.basket;
  const start = light === 'cave' ? place.enter : light === 'dawn' ? '清晨，露水还没干。' : light === 'night' ? place.night || `天黑了，${place.name}上飞着萤火虫。` : '翻开了。';
  const [basket, setBasket] = useState(() => (trip.current?.basket || []).map(f => ({place: f.place, id: f.id, name: findName(f.place, f.id), picture: findPicture(f.place, f.id)})));
  const [reveals, setReveals] = useState([]), [open, setOpen] = useState(false);
  // Opening the page: its pictures still coming (and how many have), not come (to try again), or open.
  const [opened, setOpened] = useState(false), [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  // The card shows only if the pictures take a moment (from the browser's cache they don't), and says more if long.
  const [waiting, setWaiting] = useState(false), [slow, setSlow] = useState(false);
  const progress = useLoading();
  useEffect(() => {
    if (opened || failed) return;
    setWaiting(false); setSlow(false);
    const a = setTimeout(() => setWaiting(true), 400), b = setTimeout(() => setSlow(true), 8000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [opened, failed, attempt]);
  const retry = () => { useLoader.clear(T.TextureLoader, pageUrls(place, light)); setFailed(false); setAttempt(a => a + 1); };
  const [hint, setHint] = useState(`${start}${place.tip || '闪光的先摘；别的掀开看看，树就摇一摇。'}`);
  const basketRef = useRef(basket); basketRef.current = basket;
  world.say = setHint;
  // What happens on the way goes into the trip, for the diary; said of him as his figure is (她 where she plays the boy).
  world.note = (kind, text) => {
    if (!trip.current || !text) return;
    const said = world.kinds.her === 'boy' ? text.replace(/[他她]/g, c => (c === '他' ? '她' : '他')) : text;
    trip.current = remember(trip.current, {place: place.id, kind, text: said});
    writeTrip(trip.current);
  };
  const onOpened = useMemo(() => () => { setOpened(true); if (world.opened == null) { world.opened = performance.now(); play('page'); } }, [world]);
  // What happens on the page as she looks through a piece (Pair says when).
  const look = {
    move(piece, how) {
      if (how === 'look') return;
      world.moves.set(piece.id, {how, start: performance.now()});
      play(how === 'lift' ? (kindOf(piece.art) === 'log' ? 'wood' : 'page') : 'cloth', {volume: how === 'shake' ? .9 : .7});
      world.bits.push(burstFor(piece, how));
    },
    show(piece, how) {
      const id = world.hidden[piece.id], state = world.looked.get(piece.id);
      if (id && state !== 'taken') {
        const find = place.finds[id];
        if (find.deep && state !== 'felt') { world.looked.set(piece.id, 'felt'); setHint(deepWords(how)); return {deep: true}; }
        const spot = findSpot(piece, place.page), reveal = {key: `${piece.id}-${Date.now()}`, find: id, from: spot.from || null, to: spot.to, start: performance.now(), takenAt: null};
        world.looked.set(piece.id, 'taken');
        // Into the trip's basket the moment it shows, with the spot marked: leaving the page while she's still picking
        // it up loses nothing. The basket on screen catches up when she takes it (take).
        if (trip.current) { trip.current = pick(markSearched(trip.current, place.id, piece.id, 'taken'), place.id, id); writeTrip(trip.current); }
        setReveals(r => [...r, reveal]);
        play('found');
        setHint(`${how === 'shake' ? '摇下来' : '翻到了'}「${find.name}」！`);
        return {find: id, reveal};
      }
      world.looked.set(piece.id, 'empty');
      if (trip.current && !world.pair.search?.view) { trip.current = markSearched(trip.current, place.id, piece.id, 'empty'); writeTrip(trip.current); }
      setHint((world.pair.search?.hug && place.nightView) || nothing[piece.art] || nothing[kindOf(piece.art)]);
      if (world.pair.search?.view && !world.pair.search.hug) world.note('view', place.viewMoment);
      return {};
    },
    take(piece, {find, reveal}) {
      reveal.takenAt = performance.now();
      const full = basketRef.current.length + 1 >= cap;
      // Found something hidden deep: a kiss on the top of her head; the basket full: a kiss before going home.
      if (full) world.kissNext = 'cheek'; else if (place.finds[find].deep) world.kissNext = 'head';
      if (full) world.note('full', '篮子满了，他亲了你一口');
      else if (place.finds[find].deep) world.note('deep', `翻出藏得深的${place.finds[find].name}，他亲了亲你的头顶`);
      setBasket(b => [...b, {place: place.id, id: find, name: place.finds[find].name, picture: place.dir + place.finds[find].art + '.webp'}]);
      setHint(`「${place.finds[find].name}」放进篮子里了。${full ? '篮子满了，带回家吧。' : place.finds[find].deep ? '藏得这么深都被你翻出来了，他低头亲了亲你的头顶。' : ''}`);
    },
    back(piece) {
      const m = world.moves.get(piece.id);
      if (m && m.how !== 'shake') m.back = performance.now();
    }
  };
  const onTapPiece = piece => {
    const state = world.looked.get(piece.id), how = howOf(piece);
    // What only stands to be looked at, where nothing ever hides (the pier): they can go and look out from it any time.
    const view = how === 'look' && !searchable(piece, place);
    if (world.pair.search && world.pair.search.stage !== 'go') return;
    if (!view && (state === 'empty' || state === 'taken')) { setHint(how === 'shake' ? (kindOf(piece.art) === 'arch' ? '花架摇过了。' : '这棵摇过了。') : how === 'look' ? '这儿看过了。' : '这儿翻过了。'); return; }
    if (!view && basketRef.current.length >= cap) { setHint('篮子满了，今天就到这儿，带回家吧。'); return; }
    // The point between them that puts her on the spot, facing the way she looks (resident-hand.js handSlots, the
    // other way round).
    const {at, yaw} = searchSpot(piece, place.page), h = HAND.gap / 2 * world.pair.side, c = [at[0] + Math.cos(yaw) * h, at[1] - Math.sin(yaw) * h];
    // After dark, there, he holds her from behind.
    const hug = view && (light === 'night' || light === 'cave');
    world.pair.route = routeOn(world.web, world.pair.c, c); world.pair.search = {piece, how, yaw, view, hug, stage: 'go', t: 0}; world.pair.holding = true;
    setHint(world.glints.includes(piece.id) && !state ? '去看看闪光的那儿。' : go[piece.art] || go[kindOf(piece.art)]);
  };
  const onTapFigure = () => {
    if (world.pair.search && world.pair.search.stage !== 'go') return;
    world.pair.search = null;
    if (startKiss(world)) { setHint('他转过来，偷亲了你一口。'); world.note('kiss', '他偷亲了你一口'); }
  };
  const onTapGround = point => {
    if (world.pair.search && world.pair.search.stage !== 'go') return;
    world.pair.search = null;
    world.pair.route = routeOn(world.web, world.pair.c, onPath(world.web, point));
  };
  return <div className={`explore is-${light}`}>
    <header className="explore-top">
      <a className="explore-home" href={trip.current ? '/?explore=book&open=1' : '/'}>{trip.current ? '回地图' : '回家'}</a>
      <div className="explore-title"><b>{place.name}</b><span>{`春天 · ${when}`}</span></div>
      <button className="explore-basket" aria-expanded={open} onClick={() => setOpen(o => !o)}>篮子 {basket.length}/{cap}</button>
    </header>
    {open && <ul className="explore-basket-list">{basket.length ? basket.map((f, i) => <li key={i}><img src={f.picture} alt=""/>{f.name}</li>) : <li className="empty">还空着</li>}</ul>}
    <p className="explore-hint" role="status">{hint}</p>
    {!opened && (failed || waiting) && <div className="explore-opening" role="status">{failed
      ? <><p>这一页没翻开，可能是网断了一下。</p><button onClick={retry}>再翻一次</button></>
      : <><p>正在翻开{place.name}……</p>{progress.total > 0 && <span className="explore-opening-bar" aria-hidden="true"><i style={{width: `${Math.round(Math.min(1, progress.loaded / progress.total) * 100)}%`}}/></span>}{slow && <small>网有点慢，再等等。</small>}</>}</div>}
    <QuietCanvas orthographic shadows dpr={[1, 1.6]} gl={{antialias: true, alpha: true}} camera={{position: [VIEW.x, LOOK_Y + VIEW.y, VIEW.z], zoom: 60, near: .1, far: 100}}>
      <CameraRig world={world} page={place.page}/>
      <PageCatch key={attempt} onFail={() => setFailed(true)}>
        <Suspense fallback={null}>
          <Page place={place} world={world} light={light} reveals={reveals} onTapPiece={onTapPiece} onTapGround={onTapGround} onTapFigure={onTapFigure} onOpened={onOpened}/>
        </Suspense>
      </PageCatch>
      <Pair world={world} look={look}/>
    </QuietCanvas>
  </div>;
}
