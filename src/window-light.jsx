import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { lightQuad, drawPanes, lightLook } from './window-light-shape.js';
import { useDaylight } from './home-lighting.jsx';

function paneTexture(kind, glass, bounds, gaps) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  drawPanes(c, kind, glass, bounds, 9, gaps);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A soft patch of window light on the floor, in the window's frame: place it
// at floor level in front of the glass, facing into the room (+z). gaps, when
// given, are the parts of the glass the curtains leave open (see curtainGaps);
// with none open, nothing is drawn.
export function WindowLight({ kind = 'grid', width, bottom, top, gaps = null, position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const daylight = useDaylight();
  const glass = { width, bottom, top };
  const gapKey = gaps ? gaps.map(g => g.map(v => v.toFixed(3)).join(':')).join(',') : 'all';
  const { geometry, texture } = useMemo(() => {
    const quad = lightQuad({ ...glass, floorY: .012 });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(quad.positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(quad.uvs, 2));
    geometry.setIndex(quad.indices);
    geometry.computeVertexNormals();
    return { geometry, texture: paneTexture(kind, glass, quad.bounds, gaps) };
  }, [kind, width, bottom, top, gapKey]);
  useEffect(() => () => { geometry.dispose(); texture.dispose(); }, [geometry, texture]);
  if (gaps && !gaps.length) return null;
  const look = lightLook(daylight);
  return <mesh geometry={geometry} position={position} rotation={rotation} renderOrder={2} raycast={() => null}>
    <meshBasicMaterial map={texture} color={`rgb(${look.rgb.join(',')})`} transparent opacity={look.opacity}
      blending={THREE.AdditiveBlending} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
  </mesh>;
}
