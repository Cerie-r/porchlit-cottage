import * as THREE from 'three';

// What the machines on the plaza share (capsule-machine.js, claw-machine.js):
// one family of soft vinyl bases built from bricks, printed tiles on their
// fronts, and a little glow for the night.

// Soft vinyl colours, one per street.
export const PALETTES = [
  {key: 'berry', name: '草莓牛奶', body: 0xf2b8c8, trim: 0xdd8ba3, bow: 0xe47a9a, cream: 0xfbf3ec, ink: '#b45f78', bg: 0xfaf3f4, bgNight: 0x1d1620},
  {key: 'mint', name: '薄荷', body: 0xb9e2d1, trim: 0x7fc3a7, bow: 0x5fb592, cream: 0xf8f5ec, ink: '#4a8a72', bg: 0xf2f8f5, bgNight: 0x141c1b},
  {key: 'lilac', name: '丁香', body: 0xcfc1ee, trim: 0xa894de, bow: 0x8f77d6, cream: 0xfaf6f0, ink: '#6b56a6', bg: 0xf5f2fa, bgNight: 0x17151f},
  {key: 'butter', name: '黄油', body: 0xf3dc98, trim: 0xdfbd5e, bow: 0xe39a5a, cream: 0xfbf7ee, ink: '#957328', bg: 0xfbf8ef, bgNight: 0x1c1912}
];
export const GLOWC = [0xff9fbd, 0x8fe6bf, 0xb9a2f7, 0xffd978, 0x9cc8ff];
export const CAPC = [0xf4b6c8, 0xa9dfc6, 0xc7b8f0, 0xf5dc8f, 0xaccdf2];
export const ITEMC = [0xffffff, 0xf2a7bf, 0xa79be0, 0x88cfb3, 0xf0c76a];
// Lights were tuned before three.js measured them physically.
export const LIGHT = Math.PI;
// A lamp inside a machine, lit the old way: no falling off with the square of
// the distance (decay 0), only the soft edge at `distance`. About this much of
// the old intensity fades the way the old one did.
export const pointLight = (color, distance) => new THREE.PointLight(color, 0, distance, 0);
export const POINT = Math.PI * .6;

export function finish(m) { m.castShadow = true; m.receiveShadow = true; return m; }
export function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = finish(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); return m; }
export function vinyl(color, rough = .55) { return new THREE.MeshStandardMaterial({color, roughness: rough, metalness: 0}); }
export function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// A soft box standing on y=0: width w (x), height h (y), depth d (z).
export function softBox(w, h, d, bevel, corner) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w - 2 * bevel, d - 2 * bevel, corner), {depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 10});
  g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0);
  return g;
}
// A soft plate facing +z, rounded in its face plane, centred on the origin.
export function plate(w, h, d, bevel, corner) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w - 2 * bevel, h - 2 * bevel, corner), {depth: Math.max(.001, d - 2 * bevel), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8});
  g.translate(0, 0, -Math.max(.001, d - 2 * bevel) / 2);
  return g;
}
// A printed tile: a canvas drawing on the front of a thin soft slab.
export function tile(w, h, draw, base) {
  const g = new THREE.Group();
  g.add(finish(new THREE.Mesh(plate(w, h, .016, .005, Math.min(w, h) * .22).translate(0, 0, -.008), base)));
  const c = document.createElement('canvas'); c.width = Math.round(256 * w / Math.max(w, h)); c.height = Math.round(256 * h / Math.max(w, h));
  draw(c.getContext('2d'), c.width, c.height);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * .92, h * .88), new THREE.MeshStandardMaterial({map: tex, transparent: true, roughness: .6}));
  face.position.z = .0085; g.add(face);
  return g;
}
let glowMap = null;
export function glow(color, size) {
  if (!glowMap) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    glowMap = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: glowMap, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0}));
  s.scale.set(size, size, 1); return s;
}
export function seeded(seed) { let x = seed >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }
export function star(x, cx, cy, r, ink) {
  x.fillStyle = ink; x.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
}
// Drawings for the printed tiles.
export const draws = {
  name: ink => (x, w, h) => {
    x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `italic 600 ${Math.round(h * .5)}px Georgia, "Times New Roman", serif`;
    x.fillText('Porchlit', w * .56, h * .54);
    star(x, w * .13, h * .5, h * .3, ink);
  },
  dial: ink => (x, w, h) => {
    x.strokeStyle = ink; x.lineWidth = w * .035; x.lineCap = 'round';
    x.beginPath(); x.arc(w / 2, h / 2, w * .4, -2.6, 1.9); x.stroke();
    const a = 1.9, r = w * .4, ex = w / 2 + Math.cos(a) * r, ey = h / 2 + Math.sin(a) * r;
    x.fillStyle = ink; x.beginPath(); x.moveTo(ex - w * .07, ey - w * .02); x.lineTo(ex + w * .03, ey + w * .07); x.lineTo(ex + w * .05, ey - w * .06); x.fill();
    for (let i = 0; i < 6; i++) { const t = -2.4 + i * .7; x.beginPath(); x.arc(w / 2 + Math.cos(t) * w * .47, h / 2 + Math.sin(t) * w * .47, w * .018, 0, 7); x.fill(); }
  },
  ticket: ink => (x, w, h) => {
    x.fillStyle = ink; x.strokeStyle = ink; x.lineWidth = w * .03;
    const tw = w * .62, th = h * .36, tx = (w - tw) / 2, ty = h * .5;
    x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx + tw, ty); x.lineTo(tx + tw, ty + th * .35); x.arc(tx + tw, ty + th * .5, th * .15, -1.57, 1.57, true); x.lineTo(tx + tw, ty + th); x.lineTo(tx, ty + th); x.lineTo(tx, ty + th * .65); x.arc(tx, ty + th * .5, th * .15, 1.57, -1.57, true); x.closePath(); x.stroke();
    star(x, w / 2, ty + th / 2, w * .07, ink);
    x.fillStyle = 'rgba(40,30,50,.85)'; x.fillRect(w * .2, h * .2, w * .6, h * .07);
  },
  door: ink => (x, w, h) => {
    x.strokeStyle = ink; x.lineWidth = w * .03; x.lineJoin = 'round';
    x.strokeRect(w * .14, h * .2, w * .72, h * .66);
    x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `600 ${Math.round(h * .12)}px -apple-system, "PingFang SC", sans-serif`;
    x.fillText('出口', w / 2, h * .1);
  },
  mini: ink => (x, w, h) => { x.strokeStyle = ink; x.lineWidth = h * .08; x.strokeRect(w * .06, h * .12, w * .88, h * .76); star(x, w / 2, h / 2, h * .26, ink); },
  stars: ink => (x, w, h) => { for (const [px, py, s] of [[.3, .35, .1], [.66, .3, .07], [.5, .65, .12]]) star(x, w * px, h * py, w * s, ink); },
  flap: ink => (x, w, h) => {
    x.strokeStyle = ink; x.lineWidth = h * .06; x.lineCap = 'round';
    x.beginPath(); x.moveTo(w * .12, h * .3); x.lineTo(w * .88, h * .3); x.stroke();
    const cx = w / 2, cy = h * .62;
    x.fillStyle = 'rgba(255,214,120,.95)'; x.beginPath(); x.arc(cx, cy, h * .13, 0, 7); x.fill();
    x.fillStyle = ink; x.beginPath(); x.moveTo(cx - h * .2, cy - h * .12); x.lineTo(cx + h * .2, cy - h * .12); x.lineTo(cx, cy - h * .3); x.fill();
  },
  gingham: (a, b) => (x, w, h) => {
    x.fillStyle = a; x.fillRect(0, 0, w, h);
    x.fillStyle = b; const n = 8, s = w / n;
    for (let i = 0; i < n; i += 2) { x.globalAlpha = .45; x.fillRect(i * s, 0, s, h); x.fillRect(0, i * s * h / w, w, s * h / w); }
    x.globalAlpha = 1;
  }
};
export const hex = n => '#' + n.toString(16).padStart(6, '0');
