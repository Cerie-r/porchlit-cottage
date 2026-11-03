// A little open book, held in front of her when the two of them read together in a reading chair (resident-motion.jsx:
// she on his lap). Drawn in her body's frame (the rig's pelvis, avatar-rig.js), so it leans and tilts with her; its
// edges in her hands as READ_ARMS holds them. A page turns over now and then (`turned`: when, on the page's clock,
// performance.now()).
import React, {useMemo, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as T from 'three';

// Half a spread (one side of the open book), the cover and the pages, `side` -1 or 1 from the spine.
const W = .2, H = .24, COVER = '#c9929b', PAGE = '#fbf3e6';
// Never in the way of a tap, held or not: it's mounted on both of them all along, out of sight until it's read.
const noHit = () => null;
// Where it is in the body's frame (the rig's own units, before the figure is scaled down), and how far it lies back.
export const BOOK_AT = [0, 1.42, .93], BOOK_TILT = -1.1;
function Half({side}) {
  return <group rotation={[0, 0, side * .16]}>
    <mesh position={[side * W / 2, 0, -.004]} raycast={noHit}><boxGeometry args={[W + .012, H + .016, .008]}/><meshStandardMaterial color={COVER} roughness={.7}/></mesh>
    <mesh position={[side * W / 2, 0, .006]} raycast={noHit}><boxGeometry args={[W, H, .014]}/><meshStandardMaterial color={PAGE} roughness={.95}/></mesh>
    {[-.05, -.02, .01, .04].map(y => <mesh key={y} position={[side * W / 2, y, .0135]} raycast={noHit}><planeGeometry args={[W * .7, .004]}/><meshBasicMaterial color="#d9c9bb"/></mesh>)}
  </group>;
}

export function ReadingBook({motion, scale = 1, at = BOOK_AT, tilt = BOOK_TILT}) {
  const group = useRef(), page = useRef(), invalidate = useThree(s => s.invalidate);
  const turning = useMemo(() => {
    const g = new T.PlaneGeometry(W, H);
    g.translate(W / 2, 0, 0);
    return g;
  }, []);
  useFrame(() => {
    if (!group.current) return;
    const on = !!motion.book;
    group.current.visible = on;
    if (!on || !page.current) return;
    // The page lifts from the right, over the spine, and lies down on the left.
    const t = motion.turned ? (performance.now() - motion.turned) / 700 : 2;
    page.current.visible = t >= 0 && t < 1;
    if (page.current.visible) {
      page.current.rotation.y = -Math.PI * (t * t * (3 - 2 * t));
      invalidate();
    }
  });
  return <group ref={group} position={at} rotation={[tilt, 0, 0]} scale={scale} visible={false}>
    <Half side={-1}/><Half side={1}/>
    <mesh ref={page} geometry={turning} position={[0, 0, .016]} visible={false} raycast={noHit}><meshStandardMaterial color={PAGE} roughness={.95} side={T.DoubleSide}/></mesh>
  </group>;
}
