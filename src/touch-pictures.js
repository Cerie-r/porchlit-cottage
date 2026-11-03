// Little pictures for the two residents' touches (resident-touches.js): a hand
// patting, the words that float up, hearts. Drawn once on canvases.
import * as T from 'three';

const drawn = new Map();
function picture(key, paint) {
  if (drawn.has(key)) return drawn.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  paint(c.getContext('2d'));
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  drawn.set(key, t);
  return t;
}

// A capsule from (x1, y1) to (x2, y2), `r` round.
function capsule(x, x1, y1, x2, y2, r) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  x.moveTo(x1 + Math.cos(a + Math.PI / 2) * r, y1 + Math.sin(a + Math.PI / 2) * r);
  x.arc(x1, y1, r, a + Math.PI / 2, a - Math.PI / 2);
  x.arc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2);
  x.closePath();
}

// A hand seen from the back, palm down, fingers forward: patting.
export const handPicture = () => picture('hand', x => {
  const shape = () => {
    x.beginPath();
    x.ellipse(52, 66, 30, 23, -.12, 0, Math.PI * 2);
    for (const [y, l] of [[47, 38], [58, 44], [69, 42], [80, 34]]) capsule(x, 70, y, 70 + l, y + 3, 7.5);
    capsule(x, 44, 84, 62, 98, 8);
  };
  x.lineJoin = 'round';
  shape();
  x.lineWidth = 14;
  x.strokeStyle = '#fff6f2';
  x.stroke();
  // A warm outline inside the white one, so it still reads as a hand when it's small.
  x.lineWidth = 5;
  x.strokeStyle = '#b98272';
  x.stroke();
  x.fillStyle = '#f6dccb';
  x.fill();
  // The knuckles' lines and a soft shine.
  x.lineWidth = 3;
  x.strokeStyle = '#c48e7d';
  x.beginPath();
  for (const y of [52.5, 63.5, 74.5]) { x.moveTo(84, y + 1); x.lineTo(100, y + 2); }
  x.stroke();
  x.beginPath();
  x.ellipse(44, 58, 10, 6, -.4, 0, Math.PI * 2);
  x.fillStyle = 'rgba(255,255,255,.5)';
  x.fill();
});

// A word in the same hand as the kiss's 「啵」.
export const wordPicture = (text, color = '#c2768d') => picture('word:' + text + color, x => {
  const size = text.length > 1 ? 54 : 76;
  x.font = `bold ${size}px "PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",sans-serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineWidth = 12;
  x.strokeStyle = '#fff6f2';
  x.strokeText(text, 64, 66);
  x.fillStyle = color;
  x.fillText(text, 64, 66);
});

// Two little blush strokes, for a pinched cheek.
export const blushPicture = () => picture('blush', x => {
  x.lineCap = 'round';
  for (const [w, c] of [[14, '#fff6f2'], [7, '#e58d9e']]) {
    x.lineWidth = w;
    x.strokeStyle = c;
    x.beginPath();
    for (const dx of [-22, 0, 22]) { x.moveTo(52 + dx, 82); x.lineTo(70 + dx, 46); }
    x.stroke();
  }
});

// A heart, as the kiss has.
export const heartPicture = () => picture('heart', x => {
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
