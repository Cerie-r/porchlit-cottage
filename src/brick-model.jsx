import React,{useMemo,useLayoutEffect,useRef,useEffect} from 'react';
import * as THREE from 'three';
import {expand} from './brick-recipe.js';
import {partGeometry,partMaterial,twoSided,flowerHeart,placeOf,turnOf,studsInBuild,studGeometry,buildFrame,landingGeometry} from './brick-geometry.js';
export {placeOf} from './brick-geometry.js';

// Drawing a recipe: studs and parts as React three objects; the shapes and
// materials themselves are made in brick-geometry.js.
const noRaycast = () => null;

function Studs({role, mat, points}) {
  const ref = useRef();
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    points.forEach(([x, y, z], i) => ref.current.setMatrixAt(i, m.makeTranslation(x, y, z)));
    ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere();
  }, [points]);
  return <instancedMesh ref={ref} key={points.length} args={[studGeometry(), partMaterial(role, mat), points.length]} castShadow raycast={noRaycast}/>;
}

export function PartMesh({part, material, onClick, onPointerMove}) {
  const centre = placeOf(part);
  return <group position={centre} rotation={[0, turnOf(part), 0]}>
    <group scale={[part.flip ? -1 : 1, 1, 1]}>
      <mesh geometry={partGeometry(part)} material={material || partMaterial(part.c, part.mat, twoSided(part))} castShadow receiveShadow onClick={onClick} onPointerMove={onPointerMove} userData={{partId: part.mirrorOf || part.id}}/>
      {part.p === 'flower' && <mesh geometry={flowerHeart()} material={partMaterial('gold')}/>}
    </group>
  </group>;
}

// The whole build. With hide, parts with those ids are left out (while one is
// being moved, say); onPart gets taps on parts.
export function BuildModel({recipe, onPart, onPartMove, hide}) {
  const parts = useMemo(() => expand(recipe).filter(p => !hide?.has(p.mirrorOf || p.id)), [recipe, hide]);
  const studs = useMemo(() => {
    const groups = new Map();
    for (const p of parts) for (const pt of studsInBuild(p)) {const k = `${p.c}|${p.mat || 'plain'}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(pt);}
    return [...groups].map(([k, points]) => {const [role, mat] = k.split('|'); return {key: k, role, mat, points};});
  }, [parts]);
  return <group>
    {parts.map(p => <PartMesh key={p.id} part={p} onClick={onPart && (e => onPart(e, p))} onPointerMove={onPartMove && (e => onPartMove(e, p))}/>)}
    {studs.map(s => <Studs key={s.key + s.points.length} role={s.role} mat={s.mat} points={s.points}/>)}
  </group>;
}

// A finished build as an object in the house or the backpack (see buildFrame
// for fit and fill).
// Out in the house (no fit, no fill) it also carries its landing faces, so
// other things can be set down on its tops.
export function BuildObject({item, onClick, fit, fill}) {
  const frame = buildFrame(expand(item), item.scale, {fit, fill}), placed = !fit && !fill;
  const landing = useMemo(() => placed ? landingGeometry(expand(item)) : null, [placed, item.parts, item.mirror]);
  useEffect(() => () => landing?.dispose(), [landing]);
  if (!frame) return null;
  return <group position={[0, frame.lift, 0]} scale={frame.s} onClick={onClick}><group position={[-frame.cx, 0, -frame.cz]}><BuildModel recipe={item}/>{landing && <mesh geometry={landing} visible={false} userData={{landing: true}}/>}</group></group>;
}
