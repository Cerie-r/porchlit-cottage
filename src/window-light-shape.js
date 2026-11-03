// Light falling through a window onto the floor. Everything here is in the
// window's own frame: the glass lies in the plane z = 0 facing +z (into the
// room), x runs across the window, y is height above the floor. Sunlight comes
// down at one fixed angle, so a point of glass at height h lands h * reach into
// the room and h * reach * drift to the side.
export const SUN = { reach: .9, drift: .32 }; // reach = 1 / tan(48°)

// The padded glass rectangle, projected onto the floor as a parallelogram.
// Texture coordinates map the same rectangle, so the pane pattern drawn on the
// canvas lands where its glass would cast it.
export function lightQuad({ width, bottom, top, floorY = 0, pad = .14, reach = SUN.reach, drift = SUN.drift }) {
  const x0 = -width / 2 - pad, x1 = width / 2 + pad;
  const y0 = Math.max(.01, bottom - pad), y1 = top + pad;
  const land = (x, y) => [x + y * reach * drift, floorY, y * reach];
  const corners = [land(x0, y0), land(x1, y0), land(x1, y1), land(x0, y1)];
  return {
    positions: corners.flat(),
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
    indices: [0, 2, 1, 0, 3, 2], // wound so the face points up
    bounds: { x0, x1, y0, y1 }
  };
}

// Panes as shapes in the window frame (y = height above the floor), between
// the glazing bars. "grid": the living-room and bedroom window (InteriorWindow).
// "arch": the study's arched window.
export function panes(kind, { width, bottom, top }) {
  if (kind === "arch") {
    const half = width / 2, bar = .0225, spring = bottom + 1.1;
    const shapes = [];
    for (const side of [-1, 1]) {
      const inner = side * bar, outer = side * half;
      const span = side < 0 ? [outer, inner] : [inner, outer];
      shapes.push({ rect: [span[0], bottom, span[1], bottom + .8 - bar] });
      shapes.push({ rect: [span[0], bottom + .8 + bar, span[1], spring - bar] });
      shapes.push({ arch: { cx: 0, cy: spring, r: half, side, from: spring + bar, bar } });
    }
    return shapes;
  }
  const middle = (bottom + top) / 2, cuts = [-width / 2, -width / 4, 0, width / 4, width / 2];
  const bars = [0, .02, .0275, .02, 0], shapes = [];
  for (let i = 0; i < 4; i += 1) {
    const left = cuts[i] + bars[i], right = cuts[i + 1] - bars[i + 1];
    shapes.push({ rect: [left, bottom, right, middle - .0275] });
    shapes.push({ rect: [left, middle + .0275, right, top] });
  }
  return shapes;
}

// Where the living-room and bedroom curtains leave the glass uncovered, as
// [from, to] ranges across the window (glass x runs -1.35 to 1.35). CurtainHiding
// hangs each half at side * (.73 + .6a) with width 1.47 - 1.02a, where a is how
// far it is drawn back (0 closed, 1 open), so its inner edge sits at
// side * (.005 - 1.11a). Closed curtains let no window pattern through.
export function curtainGaps(left, right, width = 2.7) {
  const half = width / 2, gaps = [];
  const leftEdge = Math.max(-half, .005 - 1.11 * left), rightEdge = Math.min(half, -.005 + 1.11 * right);
  if (leftEdge < -.01) gaps.push([leftEdge, 0]);
  if (rightEdge > .01) gaps.push([0, rightEdge]);
  return gaps;
}

// Keeps only the parts of rectangular panes inside the uncovered ranges.
export function clipPanes(shapes, gaps) {
  if (!gaps) return shapes;
  const out = [];
  for (const s of shapes) {
    if (!s.rect) { out.push(s); continue; }
    const [l, b, r, t] = s.rect;
    for (const [from, to] of gaps) {
      const left = Math.max(l, from), right = Math.min(r, to);
      if (right - left > .005) out.push({ rect: [left, b, right, t] });
    }
  }
  return out;
}

// Draws the panes onto a canvas with soft edges. The blur uses the canvas
// shadow (shapes are drawn far off-canvas and only their shadow lands), which
// works in every browser, unlike ctx.filter. Pass gaps to draw only the glass
// the curtains leave uncovered.
export function drawPanes(canvas, kind, glass, bounds, blur = 9, gaps = null) {
  const size = canvas.width, far = 4000, g = canvas.getContext('2d');
  const px = x => (x - bounds.x0) / (bounds.x1 - bounds.x0) * size;
  const py = y => (1 - (y - bounds.y0) / (bounds.y1 - bounds.y0)) * canvas.height;
  g.shadowColor = '#ffffff'; g.shadowBlur = blur; g.shadowOffsetX = -far; g.fillStyle = '#ffffff';
  for (const s of clipPanes(panes(kind, glass), gaps)) {
    g.beginPath();
    if (s.rect) {
      const [l, b, r, t] = s.rect;
      g.rect(px(l) + far, py(t), px(r) - px(l), py(b) - py(t));
    } else {
      // Half of the arched head, between the centre bar and the rim.
      const { cx, cy, r, side, from, bar } = s.arch, steps = 24;
      g.moveTo(px(cx + side * bar) + far, py(from));
      for (let i = 0; i <= steps; i += 1) {
        const a = side < 0 ? Math.PI - (Math.PI / 2) * i / steps : (Math.PI / 2) * i / steps;
        g.lineTo(px(cx + Math.cos(a) * r) + far, py(Math.max(from, cy + Math.sin(a) * r)));
      }
      g.lineTo(px(cx + side * bar) + far, py(cy + r));
      g.closePath();
    }
    g.fill();
  }
  return canvas;
}

// Day to night: warm sunlight by day, a faint cool moonlight at night.
export function lightLook(daylight) {
  const d = Math.max(0, Math.min(1, daylight));
  const mix = (a, b) => Math.round(a + (b - a) * d);
  const night = [180, 196, 245], day = [255, 233, 199];
  return { rgb: night.map((v, i) => mix(v, day[i])), opacity: +(.13 + (.29 - .13) * d).toFixed(3) };
}
