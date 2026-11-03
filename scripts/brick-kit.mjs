// The brick pieces every house shell is built from: rounded bricks and studs,
// fine leaves and florets, arched windows, the garden's plants, and the plot
// they all stand on. A build script makes its own kit, places pieces with it,
// then turns them into one scene: same-material pieces become one instanced
// mesh, so a whole house stays light on phones.
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
};

export const UP = new THREE.Vector3(0, 1, 0);
export const eulerOf = (quaternion) => new THREE.Euler().setFromQuaternion(quaternion).toArray().slice(0, 3);
// The lawn's top: where walls start and the garden grows from.
export const LAWN = -.19;

export function createKit(startSeed = 528) {
  // Seeded random, so the garden grows the same way on every build. Use it for
  // anything organic or any mix of tones: picking tones by (row + column) % n
  // lines them up into diagonal stripes.
  let seed = startSeed;
  function rand() {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  const between = (a, b) => a + (b - a) * rand();
  // Pin the random stream to a new point, so later pieces don't shift when
  // earlier ones change.
  const reseed = (value) => { seed = value; };

  const instancesByMaterial = new Map();
  const cylindersByMaterial = new Map();
  const namedInstances = [];
  const orderedInstances = [];

  function box(material, position, size, rotation = [0, 0, 0], radius = .035, name = null) {
    const item = { material, position, size, rotation, radius };
    orderedInstances.push(item);
    if (name) namedInstances.push({ ...item, name });
    else {
      if (!instancesByMaterial.has(material)) instancesByMaterial.set(material, []);
      instancesByMaterial.get(material).push(item);
    }
  }

  function cylinder(material, position, radius, height, rotation = [0, 0, 0]) {
    const item = { material, position, radius, height, rotation };
    if (!cylindersByMaterial.has(material)) cylindersByMaterial.set(material, []);
    cylindersByMaterial.get(material).push(item);
  }

  function stud(material, position, radius = .043, height = .026, rotation = [Math.PI / 2, 0, 0]) {
    cylinder(material, position, radius, height, rotation);
  }

  // Fine pieces: leaves, petals and florets too small to show a rounded edge.
  // They export as plain boxes (12 triangles instead of 300 for a rounded one),
  // so a garden full of them stays light on phones. Not part of the .vox export.
  const piecesByMaterial = new Map();
  function piece(material, position, size, rotation = [0, 0, 0]) {
    if (!piecesByMaterial.has(material)) piecesByMaterial.set(material, []);
    piecesByMaterial.get(material).push({ position, size, rotation });
  }
  // A small flat floret, as a low disc (8-sided, so it stays cheap).
  const floretsByMaterial = new Map();
  function floret(material, position, radius, rotation = [0, 0, 0], height = radius * .45) {
    if (!floretsByMaterial.has(material)) floretsByMaterial.set(material, []);
    floretsByMaterial.get(material).push({ position, radius, height, rotation });
  }

  function localBox(material, base, local, size, turn = 0, radius = .025) {
    const p = new THREE.Vector3(...local).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn).add(new THREE.Vector3(...base));
    box(material, p.toArray(), size, [0, turn, 0], radius);
  }

  function localDetailBox(material, base, local, size, turn = 0, roll = 0, radius = .01) {
    const p = new THREE.Vector3(...local).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn).add(new THREE.Vector3(...base));
    const rotation = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, 0))
        .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, roll)))
    );
    box(material, p.toArray(), size, [rotation.x, rotation.y, rotation.z], radius);
  }

  function flower(base, color = "rose", size = .09) {
    const [x, y, z] = base;
    box("sage", [x, y - .1, z], [.022, .22, .022], [0, 0, 0], .006);
    [[0, .03, 0], [.055, 0, 0], [-.055, 0, 0], [0, 0, .055], [0, 0, -.055]].forEach(([dx, dy, dz], index) => {
      cylinder(index === 0 ? "gold" : color, [x + dx, y + dy, z + dz], size * .48, size * .32, [Math.PI / 2, 0, 0]);
    });
  }

  function facadeFlower(base,color="lavender",size=.05){const [x,y,z]=base;for(let j=0;j<5;j++){const a=j*Math.PI*2/5;cylinder(color,[x+Math.cos(a)*size*.65,y+Math.sin(a)*size*.65,z],size*.43,size*.22,[Math.PI/2,0,0]);}cylinder("ivory",[x,y,z+.012],size*.23,size*.25,[Math.PI/2,0,0]);}

  // ---------- Garden pieces ----------
  // Everything organic grows from rand(): uneven, but the same on every build.

  const leafTilt = () => [between(-.7, .7), between(0, Math.PI), between(-.7, .7)];

  // A stem through points [x, y, z], one segment per step. Thick woody stems
  // use rounded pieces; thin ones use fine pieces.
  function stem(points, thickness = .05, material = "wood") {
    for (let i = 1; i < points.length; i += 1) {
      const a = new THREE.Vector3(...points[i - 1]), b = new THREE.Vector3(...points[i]);
      const direction = b.clone().sub(a), length = direction.length();
      const rotation = eulerOf(new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()));
      const middle = a.clone().add(b).multiplyScalar(.5).toArray();
      const size = [thickness, length + thickness * .7, thickness];
      if (thickness >= .035) box(material, middle, size, rotation, thickness * .35);
      else piece(material, middle, size, rotation);
    }
  }

  // A tuft of leaves around a point.
  const leafTone = () => { const k = rand(); return k < .32 ? "sage" : k < .74 ? "sageLight" : "leafLight"; };
  function leaves(x, y, z, count = 4, spread = .05, scale = 1) {
    for (let i = 0; i < count; i += 1) {
      piece(leafTone(),
        [x + between(-spread, spread), y + between(-spread, spread) * .6, z + between(-spread, spread)],
        [between(.06, .09) * scale, .012, between(.03, .045) * scale], leafTilt());
    }
  }

  // A woody vine with leaf tufts along it, slightly in front of the stem.
  function leafyVine(points, thickness, forward = [0, 0, .03]) {
    stem(points, thickness);
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1], b = points[i];
      for (let t = between(0, .2); t < 1; t += between(.12, .24)) {
        leaves(a[0] + (b[0] - a[0]) * t + forward[0], a[1] + (b[1] - a[1]) * t + forward[1], a[2] + (b[2] - a[2]) * t + forward[2], 4 + Math.floor(rand() * 3), .07, 1.15);
      }
    }
  }

  // A hanging wisteria raceme: florets taper from deep lavender to the palest lilac.
  function raceme(x, y, z, length) {
    const n = Math.max(5, Math.round(length / .024));
    const sway = between(0, Math.PI * 2);
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1);
      const r = .046 - t * .03 + between(-.003, .003);
      const color = t < .26 ? "lavenderDeep" : t < .68 ? "lavender" : "lilac";
      const px = x + Math.sin(t * 2.4 + sway) * .016, py = y - t * length, pz = z + between(-.008, .008);
      floret(color, [px, py, pz], r, [between(-.7, .7), 0, between(-.7, .7)]);
      // Fuller near the top, like a real raceme, thinning to a single tip.
      for (let extra = 0; extra < (t < .35 ? 2 : t < .65 ? 1 : 0); extra += 1) {
        if (rand() < .85) floret(color, [px + between(-.032, .032), py - between(0, .016), pz + between(-.03, .03)], r * between(.7, .9), [between(-.7, .7), 0, between(-.7, .7)]);
      }
    }
  }

  // A clump of lavender spikes on fine stems.
  function lavenderClump(x, y, z) {
    const spikes = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < spikes; i += 1) {
      const h = between(.3, .55), lean = between(.05, .24), turn = between(0, Math.PI * 2);
      const bx = x + Math.cos(turn) * .03, bz = z + Math.sin(turn) * .03;
      const tx = bx + Math.cos(turn) * lean * h, tz = bz + Math.sin(turn) * lean * h;
      stem([[bx, y, bz], [tx, y + h, tz]], .012, "sage");
      const florets = 6 + Math.floor(rand() * 5);
      for (let j = 0; j < florets; j += 1) {
        const t = .5 + .5 * j / (florets - 1);
        floret(j >= florets - 2 ? "lavender" : "lavenderDeep", [bx + (tx - bx) * t, y + h * t, bz + (tz - bz) * t], .028 - j * .0013, [between(-.4, .4), 0, between(-.4, .4)], .026);
      }
    }
    leaves(x, y + .04, z, 4, .06);
  }

  // A hydrangea: a leafy base under a dome of florets in one main tone.
  const hydrangeaTones = { lilac: "lavender", blush: "rose", ivory: "lilac" };
  function hydrangea(x, y, z, r, tone) {
    leaves(x, y + .05, z, 7, r * .9, 1.3);
    const count = Math.round(r * 160);
    for (let i = 0; i < count; i += 1) {
      const a = between(0, Math.PI * 2), up = Math.acos(between(.15, 1));
      floret(rand() < .72 ? tone : hydrangeaTones[tone],
        [x + Math.cos(a) * Math.sin(up) * r, y + .1 + Math.cos(up) * r * .85, z + Math.sin(a) * Math.sin(up) * r],
        between(.034, .048), [between(-.8, .8), 0, between(-.8, .8)]);
    }
  }

  // A rose sprig: leaves and two or three layered blooms.
  function roseSprig(x, y, z) {
    leaves(x, y + .07, z, 5, .06);
    const blooms = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < blooms; i += 1) {
      const bx = x + between(-.06, .06), bz = z + between(-.06, .06), by = y + between(.11, .21);
      const color = rand() < .5 ? "rose" : rand() < .5 ? "blush" : "ivory";
      floret(color, [bx, by, bz], .05, [between(-.3, .3), 0, between(-.3, .3)], .036);
      floret(color === "rose" ? "roseDeep" : "rose", [bx, by + .026, bz], .028, [0, 0, 0], .026);
    }
  }

  function bush(base, flip = 1) {
    const [x, y, z] = base;
    const leaves = [[-.2,.14,0,.27,-.7],[.05,.2,.02,.32,.22],[.27,.13,-.03,.24,.72],[-.05,.31,-.09,.25,-.25],[.17,.34,.1,.22,.48]];
    leaves.forEach(([dx, dy, dz, size, turn], index) => {
      box(index % 2 ? "sageLight" : "sage", [x + dx * flip, y + dy, z + dz], [size*.52,.045,size], [0,turn*flip,index%2?.18:-.18], .012);
      stud(index % 2 ? "sageLight" : "sage", [x + dx * flip, y + dy + .032, z + dz], size*.13, .026, [0,0,0]);
    });
    flower([x - .13 * flip, y + .5, z + .08], "rose", .075);
    flower([x + .1 * flip, y + .54, z - .02], "blush", .07);
    flower([x + .28 * flip, y + .39, z + .08], "ivory", .065);
  }

  function facadePlanter(base, width = .72, count = 5) {
    const [x, y, z] = base;
    // A fixed architectural flower box, not a row of freestanding pots.
    box("roseDeep", [x,y,z], [width,.2,.3], [0,0,0], .006);
    box("wood", [x,y+.105,z], [width-.08,.04,.22], [0,0,0], .003);
    const clusters = Math.max(3, Math.min(7, count));
    for (let i = 0; i < clusters; i += 1) {
      const dx = clusters === 1 ? 0 : -width*.4 + i * (width*.8/(clusters-1));
      box(i%2 ? "sageLight" : "sage", [x+dx-.035,y+.18,z+.04], [.13,.035,.075], [0,i%2?.45:-.4,i%2?.2:-.15], .006);
      box(i%2 ? "sage" : "sageLight", [x+dx+.04,y+.2,z-.015], [.12,.035,.065], [0,i%2?-.35:.5,i%2?-.15:.2], .006);
      facadeFlower([x+dx,y+.255+(i%2)*.025,z+.15], i%4===0 ? "ivory" : i%2 ? "lavender" : "rose", .055);
    }
  }

  // `plants` picks the border: the cottage's mix, or roses with pale pink
  // hydrangeas (for a house all in roses, where lavender would clash).
  function gardenBed(base, length = 2, turn = 0, plants = "cottage") {
    // Exterior planting lives in removable edged modules.  A later conservatory,
    // side wing or larger plot can replace one bed without rebuilding the house.
    localBox("ivory", base, [0,.03,0], [length,.13,.52], turn, .018);
    localBox("wood", base, [0,.105,0], [length-.14,.07,.36], turn, .012);
    const axis = new THREE.Vector3(1,0,0).applyAxisAngle(UP, turn);
    const across = new THREE.Vector3(0,0,1).applyAxisAngle(UP, turn);
    const at = (along, offset) => [base[0] + axis.x * along + across.x * offset, base[2] + axis.z * along + across.z * offset];
    const soil = base[1] + .14;
    // A full border at uneven spacing: lavender, hydrangeas, roses and leafy filler.
    for (let along = -length / 2 + .12; along < length / 2 - .1; along += between(.1, .17)) {
      const [x, z] = at(along, between(-.1, .1)), kind = rand();
      if (plants === "roses") {
        if (kind < .58) roseSprig(x, soil, z);
        else if (kind < .84) hydrangea(x, soil, z, between(.12, .17), "blush");
        else leaves(x, soil + .05, z, 6, .07);
      } else if (kind < .32) lavenderClump(x, soil, z);
      else if (kind < .68) hydrangea(x, soil, z, between(.12, .18), ["lilac", "blush", "ivory", "lilac"][Math.floor(rand() * 4)]);
      else if (kind < .86) roseSprig(x, soil, z);
      else leaves(x, soil + .05, z, 6, .07);
    }
    // Leaves spill over both long edges of the rim.
    for (let along = -length / 2 + .08; along < length / 2 - .05; along += between(.07, .13)) {
      for (const side of [-1, 1]) {
        const [x, z] = at(along, side * between(.2, .27));
        const tilt = new THREE.Quaternion().setFromAxisAngle(axis, side * between(.35, .7))
          .multiply(new THREE.Quaternion().setFromAxisAngle(UP, turn + between(-.5, .5)));
        piece(rand() < .5 ? "sageLight" : "sage", [x, soil - .02, z], [between(.07, .1), .012, .045], eulerOf(tilt));
      }
    }
  }

  // Curtains hang in the lower sash, in front of the room and behind the pane.
  // "both" leaves the room open in the middle; "drawn" nearly closes it and lets
  // one warm seam through. The porch-light states can drive these later
  // (灯亮着: 窗帘微开; 熄灯落锁: 窗帘合上).
  function curtainsAt(base, turn, width, bottom, spring, mode) {
    const inner = width * .5 - .06;
    const top = spring - .03;
    const low = bottom + .05;
    const hang = (x, w) => localBox("blush", base, [x, (top + low) * .5, .1], [w, top - low, .008], turn, .002);
    if (mode === "left") hang(-inner + width * .11, width * .22);
    if (mode === "right") hang(inner - width * .11, width * .22);
    if (mode === "both") {
      hang(-inner + width * .08, width * .16);
      hang(inner - width * .08, width * .16);
    }
    if (mode === "drawn") {
      const w = inner - .03;
      hang(-inner + w * .5, w);
      hang(inner - (w - .024) * .5, w - .024);
    }
  }

  // Every window passes its own look, so no two windows on the facade repeat the
  // same lamp and curtain placement. Lamps are [x as a share of width, y offset, w, h].
  const defaultLook = { curtain: "left", lamps: [[-.22, -.05, .085, .14], [.2, .12, .065, .11]] };

  // `shape` makes other sizes than the two standard ones: { width, height,
  // slices } (a narrow tower window, say).
  function windowAt(base, turn = 0, compact = false, look = defaultLook, shape = null) {
    const width = shape?.width ?? (compact ? .66 : .82);
    const height = shape?.height ?? (compact ? .72 : 1.02);
    const radius = width * .5;
    const spring = height * .5 - radius;
    const bottom = -height * .5;
    const lowerHeight = spring - bottom;
    const lowerCenter = (spring + bottom) * .5;

    // The reveal and pane are actually arched: a rectangular lower sash plus a
    // semicircle assembled from narrow transparent micro-parts.
    localBox("metal", base, [0, lowerCenter, .015], [width + .14, lowerHeight + .12, .12], turn, .006);
    localBox("glass", base, [0, lowerCenter, .09], [width - .1, lowerHeight - .05, .045], turn, .003);
    // The room sits just in front of the dark reveal (its front face is at .075)
    // and behind the pane, so the window reads as lived in.
    const roomBottom = bottom + .035;
    const roomTop = spring - .02;
    localBox("room", base, [0, (roomBottom + roomTop) * .5, .084], [width - .12, roomTop - roomBottom, .012], turn, .002);
    const slices = shape?.slices ?? (compact ? 7 : 9);
    for (let i = 0; i < slices; i += 1) {
      const x = -radius + (i + .5) * (width / slices);
      const cap = Math.sqrt(Math.max(0, radius * radius - x * x));
      localBox("metal", base, [x, spring + cap*.5, .015], [width/slices+.025,cap+.035,.12], turn, .003);
      localBox("glass", base, [x, spring + cap*.5, .09], [width/slices-.012,Math.max(.025,cap-.025),.045], turn, .002);
      // Measure the arch at the slice's outer edge, so no warm corner pokes past the curve.
      const outer = Math.abs(x) + width / slices * .5;
      const edgeCap = Math.sqrt(Math.max(0, radius * radius - outer * outer));
      if (edgeCap > .05) localBox("room", base, [x, spring + .015 + (edgeCap - .03) * .5, .084], [width / slices + .002, edgeCap - .03, .012], turn, .002);
    }

    // Lamps stand in the room: in front of it, behind the pane. (They used to sit
    // inside the reveal block, front face .059 behind .075, so they never showed.)
    for (const [fx, dy, w, h] of look.lamps || []) localBox("amber", base, [width * fx, lowerCenter + dy, .093], [w, h, .01], turn, .003);
    curtainsAt(base, turn, width, bottom, spring, look.curtain);

    // Black sash: vertical jambs, spring rail, central mullion and curved head.
    for (const x of [-radius, radius]) localBox("metal", base, [x, lowerCenter, .15], [.055, lowerHeight+.04, .065], turn, .004);
    localBox("metal", base, [0,bottom,.15], [width+.055,.055,.065], turn, .004);
    localBox("metal", base, [0,spring,.15], [width+.02,.045,.065], turn, .004);
    localBox("metal", base, [0,lowerCenter,.155], [.04,lowerHeight-.02,.055], turn, .003);
    localBox("metal", base, [0,spring+radius*.48,.155], [.04,radius*.94,.055], turn, .003);
    for (let i = 0; i < 11; i += 1) {
      const angle = Math.PI * i / 10;
      localDetailBox("metal", base, [Math.cos(angle)*radius,spring+Math.sin(angle)*radius,.155], [.095,.045,.065], turn, angle-Math.PI/2, .003);
    }

    // Cream jambs stop at the spring line; individual arch bricks continue the
    // curve, leaving no imaginary square window around the semicircle.
    for (const x of [-radius-.13, radius+.13]) localBox("ivory", base, [x,lowerCenter,.215], [.16,lowerHeight+.18,.2], turn, .006);
    localBox("ivory", base, [0,bottom-.16,.235], [width+.48,.14,.3], turn, .007);
    for (let i = 0; i < 13; i += 1) {
      const angle = Math.PI * i / 12;
      localDetailBox("ivory", base, [Math.cos(angle)*(radius+.14),spring+Math.sin(angle)*(radius+.14),.235], [.14,.1,.18], turn, angle-Math.PI/2, .004);
    }
  }

  // ---------- The plot ----------

  // Foundation and lawn: the slab every shell stands on.
  function plot() {
    box("stone", [0,-.61,0], [11.55,.24,9.15], [0,0,0], .08);
    // The lawn comes up to the house: its top (-.19) is where the walls start.
    box("lawn", [0,-.37,0], [11.05,.36,8.65], [0,0,0], .07);
  }

  // Standalone mailbox beside the front gate. It is a distinct named object so it
  // can later hold letters, gifts or hidden clues independently from the door.
  function mailbox(x = 1.68, z = 3.72) {
    box("ivory", [x,.31,z], [.12,1.0,.12], [0,0,0], .006);
    box("roseDeep", [x,.86,z], [.48,.34,.4], [0,0,0], .01, "mailbox");
    box("rose", [x,1.055,z], [.54,.08,.44], [0,0,0], .008);
    box("metal", [x,.89,z+.215], [.26,.035,.025], [0,0,0], .003);
    box("gold", [x+.23,1.02,z], [.035,.34,.035], [0,0,0], .004);
    box("gold", [x+.34,1.16,z], [.2,.08,.035], [0,0,0], .004);
  }

  // Irregular flagstones filling a rectangle in rows along its longer side.
  function flagstones(x0, x1, z0, z1, rows, skip = () => false) {
    const alongX = x1 - x0 >= z1 - z0;
    const [a0, a1, d0, d1] = alongX ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
    const rowDepth = (d1 - d0) / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let p = a0 + between(-.12, 0); p < a1 - .06;) {
        const length = Math.min(between(.22, .42), a1 - p), middle = p + length / 2;
        const across = d0 + rowDepth * (row + .5) + between(-.012, .012);
        const position = alongX ? [middle, LAWN + .02, across] : [across, LAWN + .02, middle];
        const size = alongX ? [length - .035, .06, rowDepth - .035] : [rowDepth - .035, .06, length - .035];
        const tone = rand();
        if (!skip(position[0], position[2])) box(tone < .5 ? "stone" : tone < .82 ? "pearl" : "cream", position, size, [0, between(-.05, .05), 0], .014);
        p += length;
      }
    }
  }

  // A low wrought-iron railing either side of the gate, ending in short pillars.
  function railing(x0, x1, z) {
    const middle = (x0 + x1) / 2, length = Math.abs(x1 - x0);
    piece("metal", [middle, LAWN + .09, z], [length, .035, .035]);
    piece("metal", [middle, LAWN + .5, z], [length, .04, .04]);
    const count = Math.round(length / .115);
    for (let i = 0; i <= count; i += 1) {
      const x = x0 + (x1 - x0) * i / count;
      piece("metal", [x, LAWN + .27, z], [.024, .54, .024]);
      if (i % 2 === 0) stud("gold", [x, LAWN + .55, z], .02, .03, [0, 0, 0]);
    }
  }
  function frontRailing() {
    for (const side of [-1, 1]) {
      railing(side * 1.07, side * 5.22, 4.06);
      const x = side * 5.3;
      box("ivory", [x, LAWN + .33, 4.06], [.16, .66, .16], [0, 0, 0], .016);
      box("ivory", [x, LAWN + .7, 4.06], [.23, .09, .23], [0, 0, 0], .02);
      stud("gold", [x, LAWN + .77, 4.06], .05, .045, [0, 0, 0]);
    }
  }

  // Low hedges: overlapping soft lumps of uneven height, covered in leaves.
  function hedge(alongX, fixed, start, end) {
    for (let p = start; p < end - .05;) {
      const length = Math.min(between(.4, .66), end - p), middle = p + length / 2;
      const h = between(.24, .36), w = between(.36, .42), shift = between(-.02, .02);
      const at = (along, y, out) => alongX ? [along, y, fixed + shift + out] : [fixed + shift + out, y, along];
      box("hedge", at(middle, LAWN + h / 2, 0), alongX ? [length + .08, h, w] : [w, h, length + .08], [0, between(-.03, .03), 0], .1);
      // A smaller lump on top, off-centre, so the top line rises and dips.
      const bump = between(.06, .12), bumpLength = length * between(.4, .7), bumpAt = middle + between(-.12, .12);
      box("hedge", at(bumpAt, LAWN + h + bump / 2 - .04, between(-.04, .04)), alongX ? [bumpLength, bump + .08, w * .8] : [w * .8, bump + .08, bumpLength], [0, between(-.1, .1), 0], .08);
      for (let i = 0, n = Math.round(length * 44); i < n; i += 1) {
        const along = middle + between(-length / 2, length / 2), onTop = rand() < .45;
        const out = onTop ? between(-w / 2, w / 2) : (rand() < .5 ? -1 : 1) * (w / 2 + .006);
        const raised = Math.abs(along - bumpAt) < bumpLength / 2 && Math.abs(out) < w * .4 ? bump : 0;
        const y = LAWN + (onTop ? h + raised + .006 : between(.06, h));
        piece(rand() < .5 ? "leafLight" : "sageLight", at(along, y, out),
          [between(.06, .09), .014, between(.035, .05)], [between(-1, 1), between(0, Math.PI), between(-1, 1)]);
      }
      p += length - .04;
    }
  }

  // An old wisteria tree: a twisting trunk, branches spreading into a soft
  // canopy, racemes hanging all round, petals on the grass.
  function wisteriaTree(x, z) {
    // Two stems twisting round each other, as old wisteria trunks do.
    for (const phase of [0, 2.4]) {
      const trunk = [];
      for (let i = 0; i <= 9; i += 1) {
        const t = i / 9;
        trunk.push([x + Math.sin(t * 4.2 + phase) * .1 + Math.sin(t * 1.6) * .1, LAWN + t * 2.05, z + Math.cos(t * 4.2 + phase) * .09]);
      }
      for (let i = 1; i < trunk.length; i += 1) stem([trunk[i - 1], trunk[i]], .15 - i * .008);
    }
    for (let i = 0; i < 5; i += 1) {
      const a = i * Math.PI * 2 / 5 + between(-.4, .4);
      stem([[x, LAWN + .14, z], [x + Math.cos(a) * .26, LAWN + .01, z + Math.sin(a) * .26]], .08);
    }
    const top = [x + Math.sin(1.6) * .1, LAWN + 2.05, z];
    for (let i = 0; i < 6; i += 1) {
      const a = i * Math.PI * 2 / 6 + between(-.35, .35), length = between(.7, 1.05);
      stem([[top[0], top[1] - .15, top[2]],
        [top[0] + Math.cos(a) * length * .5, top[1] + between(.1, .25), top[2] + Math.sin(a) * length * .5],
        [top[0] + Math.cos(a) * length, top[1] + between(.05, .3), top[2] + Math.sin(a) * length]], .07);
    }
    // A wide, soft canopy, then a second, smaller dome on top for volume.
    const crown = top[1] + .18, spread = 1.22;
    for (let i = 0; i < 760; i += 1) {
      const a = between(0, Math.PI * 2), r = Math.sqrt(rand()), upper = i % 3 === 0;
      const reach = upper ? r * spread * .62 : r * spread;
      const lift = upper ? .3 + (1 - r * r) * .32 : (1 - r * r) * .36;
      piece(leafTone(), [top[0] + Math.cos(a) * reach, crown + lift + between(-.07, .07), top[2] + Math.sin(a) * reach],
        [between(.08, .12), .016, between(.04, .06)], [between(-.8, .8), between(0, Math.PI), between(-.8, .8)]);
    }
    for (let i = 0; i < 46; i += 1) {
      const a = between(0, Math.PI * 2), r = .3 + Math.sqrt(rand()) * .9;
      raceme(top[0] + Math.cos(a) * r, crown + (1 - (r / spread) ** 2) * .18, top[2] + Math.sin(a) * r, between(.35, .85));
    }
    for (let i = 0; i < 36; i += 1) {
      const a = between(0, Math.PI * 2), r = between(.3, 1.35);
      floret(rand() < .5 ? "lilac" : "lavender", [x + Math.cos(a) * r, LAWN + .004, z + Math.sin(a) * r], between(.016, .026), [0, 0, 0], .006);
    }
  }

  // Grass tufts on the open lawn, `count` of them at spots drawn from `spots`
  // (functions returning [x, z]), skipping anywhere `taken`.
  function grassTufts(spots, taken, count = 80) {
    for (let placed = 0, tries = 0; placed < count && tries < 4000; tries += 1) {
      const [x, z] = spots[Math.floor(rand() * spots.length)]();
      if (taken(x, z)) continue;
      placed += 1;
      for (let blade = 0, n = 2 + Math.floor(rand() * 3); blade < n; blade += 1) {
        const h = between(.05, .1);
        piece(rand() < .6 ? "sageLight" : "sage", [x + between(-.02, .02), LAWN + h / 2, z + between(-.02, .02)], [.012, h, .02], [between(-.35, .35), between(0, Math.PI), between(-.35, .35)]);
      }
    }
  }

  // A real two-leaf wrought-iron gate: separate posts, hinges and framed leaves.
  // Each leaf is named independently so it can later swing open without changing
  // the plot or the rest of the facade.
  function frontGate() {
    for (const side of [-1,1]) {
      const postX = side*.98;
      box("ivory", [postX,.365,4.04], [.18,1.11,.18], [0,0,0], .018);
      box("ivory", [postX,.96,4.04], [.27,.12,.27], [0,0,0], .025);
      stud("gold", [postX,1.045,4.04], .065,.055,[0,0,0]);

      const centerX = side*.48;
      box("metal", [centerX,.69,4.04], [.78,.055,.07], [0,0,0], .01, side < 0 ? "front_gate_left" : "front_gate_right");
      box("metal", [centerX,.18,4.04], [.78,.055,.07], [0,0,0], .01);
      for (const x of [side*.83,side*.54,side*.25]) {
        box("metal", [x,.44,4.04], [.045,.58,.07], [0,0,0], .008);
        stud("gold", [x,.755,4.04], .035,.03,[0,0,0]);
      }
      for (const y of [.3,.72]) cylinder("gold", [side*.88,y,4.04], .035,.11, [Math.PI/2,0,0]);
    }
  }

  // ---------- Into one scene ----------

  // Every piece placed so far, as a scene under a group called `name`.
  // `colors` gives each material its colour; the page recolours them by name.
  // `rounding` is how many steps round each brick's edges: 2 is the cottage's;
  // 1 looks the same at a brick's size and draws a third of the triangles.
  function toScene(name, colors, { rounding = 2 } = {}) {
    const v = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const scene = new THREE.Scene();
    const root = new THREE.Group();
    root.name = name;
    scene.add(root);

    const materialCache = new Map();
    function getMaterial(key) {
      if (materialCache.has(key)) return materialCache.get(key);
      const config = key === "glass"
        ? { color: colors.glass, transparent: true, opacity: .3, roughness: .06, metalness: .04, depthWrite: false, side: THREE.DoubleSide }
        // Mist lies low over a lawn; the page fades it in after dark.
        : key === "mist" ? { color: colors.mist, transparent: true, opacity: .25, roughness: 1, depthWrite: false }
        : { color: colors[key] || colors.ivory, roughness: key === "amber" ? .26 : key === "metal" ? .34 : key === "wood" ? .72 : key === "plaster" ? .9 : key === "roof" ? .73 : .58, metalness: key === "metal" ? .18 : 0 };
      if (key === "amber") Object.assign(config, { emissive: colors.amber, emissiveIntensity: .32 });
      // Exported with a soft baseline; AssetHouse raises it at night from daylight.
      if (key === "room") Object.assign(config, { roughness: .95, emissive: "#ffc58a", emissiveIntensity: .3 });
      const material = new THREE.MeshStandardMaterial(config);
      material.name = key;
      materialCache.set(key, material);
      return material;
    }

    for (const [key, instances] of instancesByMaterial) {
      const geometry = new RoundedBoxGeometry(1, 1, 1, rounding, .022);
      const mesh = new THREE.InstancedMesh(geometry, getMaterial(key), instances.length);
      mesh.name = key;
      mesh.castShadow = key !== "glass";
      mesh.receiveShadow = true;
      instances.forEach((item, index) => {
        v.set(...item.position);
        q.setFromEuler(new THREE.Euler(...item.rotation));
        s.set(...item.size);
        matrix.compose(v, q, s);
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      root.add(mesh);
    }
    for (const item of namedInstances) {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 2, .022), getMaterial(item.material));
      mesh.name = item.name;
      mesh.position.set(...item.position);
      mesh.rotation.set(...item.rotation);
      mesh.scale.set(...item.size);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    }

    for (const [key, instances] of cylindersByMaterial) {
      const geometry = new THREE.CylinderGeometry(1, 1, 1, 14);
      const mesh = new THREE.InstancedMesh(geometry, getMaterial(key), instances.length);
      mesh.name = `${key}-round-pieces`;
      mesh.castShadow = key !== "mist";
      mesh.receiveShadow = true;
      instances.forEach((item, index) => {
        v.set(...item.position);
        q.setFromEuler(new THREE.Euler(...item.rotation));
        s.set(item.radius, item.height, item.radius);
        matrix.compose(v, q, s);
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      root.add(mesh);
    }

    // Fine pieces and florets: one cheap shared shape per material.
    for (const [set, suffix, makeGeometry] of [
      [piecesByMaterial, "fine-pieces", () => new THREE.BoxGeometry(1, 1, 1)],
      [floretsByMaterial, "florets", () => new THREE.CylinderGeometry(1, 1, 1, 8)]
    ]) {
      for (const [key, instances] of set) {
        const mesh = new THREE.InstancedMesh(makeGeometry(), getMaterial(key), instances.length);
        mesh.name = `${key}-${suffix}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        instances.forEach((item, index) => {
          v.set(...item.position);
          q.setFromEuler(new THREE.Euler(...item.rotation));
          if (item.size) s.set(...item.size);
          else s.set(item.radius, item.height, item.radius);
          matrix.compose(v, q, s);
          mesh.setMatrixAt(index, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        root.add(mesh);
      }
    }
    return scene;
  }

  // How many pieces of each kind, for keeping an eye on what phones must draw.
  function counts() {
    const total = (map) => [...map.values()].reduce((sum, list) => sum + list.length, 0);
    return {
      bricks: total(instancesByMaterial), named: namedInstances.length, round: total(cylindersByMaterial),
      fine: total(piecesByMaterial), florets: total(floretsByMaterial)
    };
  }

  return {
    rand, between, reseed, orderedInstances,
    box, cylinder, stud, piece, floret, localBox, localDetailBox, flower, facadeFlower,
    leafTilt, stem, leafTone, leaves, leafyVine, raceme, lavenderClump, hydrangea, roseSprig, bush,
    facadePlanter, gardenBed, curtainsAt, defaultLook, windowAt,
    plot, mailbox, flagstones, railing, frontRailing, hedge, wisteriaTree, grassTufts, frontGate,
    toScene, counts
  };
}

// The scene as a binary glTF file.
export async function writeGlb(scene, url) {
  const exporter = new GLTFExporter();
  const glb = await new Promise((resolve, reject) => exporter.parse(scene, resolve, reject, { binary: true, onlyVisible: true }));
  const fs = await import("node:fs");
  fs.writeFileSync(url, Buffer.from(glb));
  return glb.byteLength;
}
