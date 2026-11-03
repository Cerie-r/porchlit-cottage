import fs from "node:fs";
import * as THREE from "three";
import { createKit, writeGlb, LAWN } from "./brick-kit.mjs";

const colors = {
  cream: "#eee2d8",
  plaster: "#f7eee7",
  ivory: "#fff7ee",
  pearl: "#f8ece5",
  blush: "#e5cfd0",
  rose: "#c98aa5",
  roseDeep: "#9b607b",
  lavender: "#b896d0",
  lavenderDeep: "#76558f",
  roof: "#292630",
  roofPale: "#45404c",
  sage: "#507359",
  sageLight: "#769073",
  amber: "#f5cf79",
  stone: "#d8cbc0",
  lawn: "#c7d3ba",
  wood: "#7d6963",
  metal: "#28252d",
  gold: "#d7aa58",
  glass: "#dce9ea",
  // The warm room seen through each window. It glows a little at night and is
  // just a pale wall by day, so the pane itself never turns yellow.
  room: "#f4d6b4",
  // The palest wisteria tips and hydrangea florets.
  lilac: "#dccdea",
  // Softer garden greens: clipped hedges and the light leaves on top of them.
  hedge: "#8aa486",
  leafLight: "#a9bea2"
};

// The pieces (bricks, windows, plants, the plot) come from the shared kit;
// its random stream starts at 528, as this house always has.
const kit = createKit(528);
const { rand, between, box, cylinder, stud, piece, floret, flower, localBox, localDetailBox, leaves, leafyVine, raceme,
  bush, facadePlanter, gardenBed, windowAt, flagstones, hedge, wisteriaTree } = kit;

// Foundation, lawn and shell.
kit.plot();
// A threshold slab under the porch steps only; the flagstone path takes over in front.
box("stone", [0,-.12,1.75], [1.75,.1,3.5], [0,0,0], .025);
box("cream", [0,1.22,0], [6.15,2.8,4.15], [0,0,0], .08);
box("plaster", [0,3.55,0], [6.15,1.9,4.15], [0,0,0], .07);

// Micro-brick skin. Forty narrow courses make the shell read as a model assembled
// from real pieces at every camera distance, rather than a wall with brick marks.
for (let row = 0; row < 54; row += 1) {
  const y = .04 + row * .08;
  for (let column = 0; column < 74; column += 1) {
    const x = -3.045 + column * .084 + (row % 2 ? .042 : 0);
    if (Math.abs(x) > 3.075) continue;
    const blocked = (y < 2.4 && Math.abs(x) < .86)
      || (Math.abs(y - 1.35) < .68 && [-1.85,1.85].some((c) => Math.abs(x-c) < .62))
      || (Math.abs(y - 3.55) < .7 && [-1.85,0,1.85].some((c) => Math.abs(x-c) < .62));
    const tone = rand();
    const material = tone < .08 ? "cream" : tone < .26 ? "ivory" : "pearl";
    if (!blocked) box(material, [x,y,2.135], [.081,.077,.052], [0,0,0], .004);
  }
}

// Both return walls get the same dense bond because the house is rotatable.
for (const side of [-1, 1]) {
  for (let row = 0; row < 54; row += 1) {
    const y = .04 + row * .08;
    for (let column = 0; column < 50; column += 1) {
      const z = -2.045 + column * .084 + (row % 2 ? .042 : 0);
      if (z > 2.075) continue;
      const nearSideWindow = side > 0 && ((Math.abs(y - 1.35) < .69 && Math.abs(z + .72) < .62)
        || (Math.abs(y - 3.5) < .72 && Math.abs(z - .88) < .64));
      if (nearSideWindow) continue;
      const tone = rand();
      const material = tone < .08 ? "cream" : tone < .26 ? "ivory" : "pearl";
      box(material, [side * 3.115,y,z], [.052,.077,.081], [0,0,0], .004);
    }
  }
}
for (const x of [-3.13,3.13]) {
  for (let i = 0; i < 17; i += 1) box(i % 2 ? "pearl" : "ivory", [x,.12+i*.26,2.1], [.23,.13,i%2?.24:.19], [0,0,0], .018);
}
for (const y of [2.49,4.29]) {
  box("ivory", [0,y,2.16], [6.5,.13,.18], [0,0,0], .022);
  for (let x=-2.92; x<=2.92; x+=.27) box("ivory", [x,y-.13,2.27], [.13,.12,.15], [0,0,0], .014);
}

// Roof shell and fine overlapping tiles.
box("roof", [-1.55,5.05,0], [3.9,.3,4.7], [0,0,.62], .045);
box("roof", [1.55,5.05,0], [3.9,.3,4.7], [0,0,-.62], .045);
for (const side of [-1,1]) {
  for (let column=0; column<38; column+=1) {
    const x=side*(.06+column*.084);
    const y=6.08-Math.abs(x)*.62;
    for (let row=0; row<53; row+=1) {
      const z=-2.16+row*.084+(column%2?.02:-.02);
      const tile = rand() < .15 ? "roofPale" : "roof";
      box(tile,[x,y+.1,z],[.081,.029,.081],[0,0,side<0?.62:-.62],.006);
      if (rand() < .09) stud(tile,[x,y+.138,z],.025,.016,[0,0,side<0?.62:-.62]);
    }
  }
}
box("roof", [0,6.22,0], [.22,.18,4.82], [0,0,0], .025);
box("ivory", [0,4.36,2.23], [6.65,.16,.18], [0,0,0], .02);
box("ivory", [0,4.36,-2.23], [6.65,.16,.18], [0,0,0], .02);

// Dormer and small roof crown.
box("plaster", [0,4.94,2.22], [1.42,1.08,.28], [0,0,0], .035);
// The attic keeps its curtains drawn; one warm seam shows through.
windowAt([0,5.0,2.4],0,true,{ curtain: "drawn", lamps: [] });
box("roof", [-.42,5.68,2.23], [1.13,.18,.58], [0,0,.57], .025);
box("roof", [.42,5.68,2.23], [1.13,.18,.58], [0,0,-.57], .025);
for (let i=0;i<5;i+=1) box("ivory", [0,5.91+i*.18,0], [.22-i*.02,.16,.22-i*.02], [0,0,0], .025);
box("rose", [0,6.77,0], [.36,.1,.36], [0,Math.PI/4,0], .02);
stud("gold", [0,6.86,0], .075, .08, [0,0,0]);

// Chimney with fine courses.
box("blush", [2.05,5.72,-1.12], [.58,1.35,.66], [0,0,0], .04);
for (let i=0;i<5;i+=1) box("pearl", [2.05,5.22+i*.24,-.77], [.62,.055,.035], [0,0,0], .008);
box("roof", [2.05,6.43,-1.12], [.75,.14,.82], [0,0,0], .025);

// Windows and balcony.
// The two left-hand windows sit behind the bay and keep the default look.
[
  [[-1.85,1.35,2.15]],
  [[1.85,1.35,2.15], { curtain: "left", lamps: [[.18, -.08, .08, .13]] }],
  [[-1.85,3.55,2.15]],
  [[1.85,3.55,2.15], { curtain: "right", lamps: [[-.2, .1, .06, .1], [.12, -.14, .07, .12]] }]
].forEach(([p, look]) => windowAt(p, 0, false, look));
windowAt([0,3.7,2.16],0,true,{ curtain: "both", lamps: [[.13, -.05, .06, .1]] });
windowAt([3.08,1.35,-.72],Math.PI/2,false,{ curtain: "right", lamps: [[-.16, .02, .08, .12]] });
windowAt([3.08,3.5,.88],Math.PI/2,false,{ curtain: "none", lamps: [[.2, -.1, .065, .11], [-.2, .15, .05, .09]] });
box("stone", [0,2.9,2.46], [1.85,.1,.65], [0,0,0], .025);
box("metal", [0,3.57,2.76], [1.86,.06,.06], [0,0,0], .012);
for (let x=-.78;x<=.78;x+=.195) box("metal", [x,3.25,2.76], [.04,.66,.04], [0,0,0], .009);
box("metal", [-.88,3.22,2.46], [.055,.7,.65], [0,0,0], .012);
box("metal", [.88,3.22,2.46], [.055,.7,.65], [0,0,0], .012);

// Projecting bay windows use narrow plates, columns and visible studs.
box("pearl", [-1.86,2.43,2.37], [1.62,4.12,.34], [0,0,0], .035);
for (const level of [1.35,3.52]) {
  box("metal", [-1.86,level,2.61], [1.3,1.22,.08], [0,0,0], .014);
  box("glass", [-1.86,level,2.66], [1.18,1.08,.045], [0,0,0], .004);
  // Same layering as the arched windows: the reveal's front face is at 2.65,
  // then the room, then lamps, then a curtain, all behind the pane (front 2.6825)
  // and the mullions. The two floors differ so the bay does not read as a stamp.
  const upper = level > 2;
  box("room", [-1.86,level,2.655], [1.14,1.04,.008], [0,0,0], .002);
  if (upper) box("amber", [-1.6,level+.18,2.664], [.07,.12,.008], [0,0,0], .004);
  else {
    box("amber", [-2.08,level-.18,2.664], [.1,.18,.008], [0,0,0], .004);
    box("amber", [-1.62,level+.16,2.664], [.075,.14,.008], [0,0,0], .004);
  }
  box("blush", [upper ? -2.26 : -1.46,level,2.673], [.3,.98,.008], [0,0,0], .002);
  for (const x of [-2.36,-1.86,-1.36]) box("metal", [x,level,2.71], [.045,1.1,.045], [0,0,0], .007);
  box("metal", [-1.86,level,2.71], [1.18,.045,.045], [0,0,0], .007);
  box("ivory", [-1.86,level-.72,2.63], [1.52,.14,.42], [0,0,0], .018);
  for (let x=-2.46;x<=-1.26;x+=.2) stud("ivory", [x,level-.63,2.82], .03, .024);
}
box("ivory", [-1.86,4.35,2.62], [1.76,.22,.52], [0,0,0], .025);

// Layered doorway: shadowed recess, panelled door, fanlight and projecting arch.
box("metal", [0,1.18,2.15], [1.52,2.5,.12], [0,0,0], .01);
box("roseDeep", [0,1.02,2.29], [1.06,1.9,.13], [0,0,0], .012, "door");
// Rails and stiles sit in front of a recessed panel field: they are the door's
// actual construction, not decorative tiles stuck onto a finished slab.
for (const x of [-.43,.43]) box("rose", [x,1.02,2.39], [.12,1.82,.07], [0,0,0], .005);
for (const y of [.18,.73,1.29,1.88]) box("rose", [0,y,2.39], [.94,.11,.07], [0,0,0], .005);
box("rose", [0,1.58,2.355], [.72,.43,.035], [0,0,0], .004);
stud("gold", [.37,1.02,2.435], .055,.04);
box("glass", [0,2.06,2.3], [.84,.3,.06], [0,0,0], .004);
box("amber", [0,2.06,2.265], [.12,.12,.025], [0,0,0], .004);
box("metal", [0,2.06,2.37], [.045,.28,.045], [0,0,0], .004);
for (const x of [-.28,.28]) box("metal", [x,2.06,2.37], [.035,.27,.045], [0,0,0], .004);
for (let i=0;i<13;i+=1) {
  const angle=Math.PI*(i/12);
  box("ivory", [Math.cos(angle)*.75,2.08+Math.sin(angle)*.58,2.4], [.145,.105,.17], [0,0,angle-Math.PI/2], .006);
}
for (const x of [-.82,.82]) {
  box("ivory", [x,1.13,2.37], [.2,2.05,.22], [0,0,0], .008);
  box("ivory", [x,.18,2.42], [.34,.16,.31], [0,0,0], .008);
  box("ivory", [x,2.05,2.42], [.34,.15,.31], [0,0,0], .008);
}
for (const x of [-1.04,1.04]) {
  box("metal", [x,2.03,2.48], [.05,.35,.05], [0,0,0], .008);
  // Named so the page can light them when someone is signed in (the porch light).
  box("amber", [x,1.82,2.49], [.22,.3,.18], [0,0,0], .025, "porch-lamp");
  box("metal", [x,1.63,2.49], [.28,.055,.24], [0,0,0], .008);
  box("metal", [x,2.01,2.49], [.28,.055,.24], [0,0,0], .008);
}
for (let i=0;i<3;i+=1) box("ivory", [0,.04+i*.11,2.8+i*.2], [2+i*.2,.12,.55], [0,0,0], .03);

// Retired glass conservatory. A later garden module can occupy this lot.
if (false) {
// A warm, attached conservatory: solid plinth, fine panes and a shallow barrel roof.
// The masonry keeps it legible on pale backgrounds; the curved ribs make it feel
// like part of the house rather than a transparent temporary lean-to.
const conservatoryX = -4.12;
const conservatoryFront = 1.46;
const conservatoryBack = -1.52;
const conservatoryOuter = -5.24;
const conservatoryInner = -3.0;
const conservatoryWallTop = 1.72;

box("stone", [conservatoryX,-.01,-.03], [2.42,.2,3.22], [0,0,0], .055);
box("pearl", [conservatoryX,.2,conservatoryFront], [2.34,.46,.18], [0,0,0], .02);
box("pearl", [conservatoryX,.2,conservatoryBack], [2.34,.46,.18], [0,0,0], .02);
box("pearl", [conservatoryOuter,.2,-.03], [.18,.46,3.06], [0,0,0], .02);

// Tall panes. The inner wall is intentionally open into the main house.
box("glass", [conservatoryX,1.03,conservatoryFront], [2.22,1.4,.065], [0,0,0], .006);
box("glass", [conservatoryX,1.03,conservatoryBack], [2.22,1.4,.065], [0,0,0], .006);
box("glass", [conservatoryOuter,1.03,-.03], [.065,1.4,2.92], [0,0,0], .006);

for (const z of [conservatoryFront,conservatoryBack]) {
  box("ivory", [conservatoryX,.45,z+.02], [2.42,.085,.12], [0,0,0], .01);
  box("ivory", [conservatoryX,1.12,z+.025], [2.34,.055,.11], [0,0,0], .008);
  box("ivory", [conservatoryX,conservatoryWallTop,z+.02], [2.42,.1,.12], [0,0,0], .012);
  for (const x of [conservatoryOuter,conservatoryX-.56,conservatoryX,conservatoryX+.56,conservatoryInner]) {
    box("ivory", [x,1.06,z+.03], [.055,1.48,.11], [0,0,0], .008);
  }
}
for (const z of [-1.46,-.76,-.03,.7,1.4]) {
  box("ivory", [conservatoryOuter,1.06,z], [.11,1.5,.055], [0,0,0], .008);
}
box("ivory", [conservatoryOuter,1.12,-.03], [.12,.055,3.02], [0,0,0], .008);
box("ivory", [conservatoryOuter,conservatoryWallTop,-.03], [.13,.1,3.12], [0,0,0], .012);

// Segment an elliptical barrel roof into narrow glass strips.
const roofArc = [];
const roofSegments = 10;
for (let i = 0; i <= roofSegments; i += 1) {
  const angle = Math.PI * i / roofSegments;
  roofArc.push([
    conservatoryX + 1.12 * Math.cos(angle),
    conservatoryWallTop + .72 * Math.sin(angle)
  ]);
}
for (let i = 0; i < roofSegments; i += 1) {
  const [x1,y1] = roofArc[i];
  const [x2,y2] = roofArc[i+1];
  const length = Math.hypot(x2-x1,y2-y1);
  const turn = Math.atan2(y2-y1,x2-x1);
  box("glass", [(x1+x2)/2,(y1+y2)/2,-.03], [length+.025,.052,3.02], [0,0,turn], .006);
  for (const z of [-1.52,-.77,-.03,.72,1.47]) {
    box("ivory", [(x1+x2)/2,(y1+y2)/2+.018,z], [length+.035,.052,.065], [0,0,turn], .006);
  }
}
box("ivory", [conservatoryX,2.46,-.03], [.09,.1,3.16], [0,0,0], .01);

// A proper little glass door, warm interior and planters make the room inhabited.
box("ivory", [conservatoryX,.98,1.535], [.78,1.5,.12], [0,0,0], .018);
box("glass", [conservatoryX,1.01,1.605], [.62,1.3,.055], [0,0,0], .006);
box("ivory", [conservatoryX,1.03,1.645], [.04,1.2,.035], [0,0,0], .006);
box("ivory", [conservatoryX,1.03,1.645], [.58,.04,.035], [0,0,0], .006);
box("amber", [conservatoryX+.22,1.04,1.69], [.055,.055,.045], [0,0,0], .012);
box("blush", [conservatoryX,.28,-.08], [1.48,.08,1.82], [0,0,0], .025);
box("ivory", [conservatoryX,.72,-.2], [.72,.08,.52], [0,0,0], .025);
box("ivory", [conservatoryX,.47,-.2], [.07,.5,.07], [0,0,0], .012);
for (const x of [conservatoryX-.75,conservatoryX+.72]) {
  box("roseDeep", [x,.52,-.34], [.44,.28,.54], [0,0,0], .035);
  bush([x,.5,-.34], x < conservatoryX ? -1 : 1);
}
for (const x of [conservatoryOuter-.04,conservatoryInner+.04]) {
  box("pearl", [x,.38,1.7], [.34,.34,.54], [0,0,0], .035);
  flower([x,.72,1.7], x < conservatoryX ? "rose" : "blush", .09);
}
}

// Flowers have an origin: pots and window boxes first, then only three climbing
// stems. This keeps the facade architectural instead of becoming a flower texture.
facadePlanter([-1.86,.57,2.86],1.18,6);
facadePlanter([-1.86,2.75,2.86],1.18,6);
facadePlanter([0,2.98,2.83],1.34,7);
facadePlanter([2.22,2.92,2.62],.82,5);

// Twining wisteria on the walls is saved for a later castle shell (decided
// 2026-10-22: 缠绕形式的花留给城堡). This house keeps its window boxes and the
// wisteria tree in the garden. When it returns: two old woody stems climb the
// front corners (between the pilasters and the drainpipes) and meet under the
// cornice; a third climbs the right wall and runs under the eave. Racemes hang
// at uneven spacing: short over windows, long between them.
const facadeWisteria = false;
if (facadeWisteria) {
const frontWindows = [-1.85, 0, 1.85];
leafyVine([[-2.86,-.19,2.31],[-2.8,.55,2.32],[-2.9,1.3,2.31],[-2.83,2.05,2.33],[-2.9,2.8,2.31],[-2.84,3.5,2.33],[-2.76,4.0,2.42],[-2.62,4.1,2.62]], .055);
leafyVine([[2.86,-.19,2.31],[2.92,.6,2.31],[2.83,1.4,2.32],[2.9,2.2,2.31],[2.82,2.95,2.33],[2.88,3.6,2.31],[2.78,4.02,2.42],[2.66,4.1,2.55]], .055);
// Under the cornice: in front of the bay (its face is at z 2.54), then in
// front of the window arches (which reach z 2.49).
leafyVine([[-2.62,4.1,2.62],[-2.2,4.13,2.7],[-1.5,4.11,2.71],[-.98,4.12,2.68],[-.7,4.1,2.56],[0,4.13,2.56],[.7,4.1,2.56],[1.4,4.12,2.56],[2.1,4.11,2.56],[2.66,4.1,2.55]], .04);
for (let x = -2.58; x < 2.62; x += between(.1, .2)) {
  const overWindow = frontWindows.some((c) => Math.abs(x - c) < .5);
  raceme(x, 4.08, (x < -.98 ? 2.73 : 2.58) + between(-.015, .015), overWindow ? between(.12, .26) : between(.3, .62));
}
// A fringe from the balcony planter over the door, longer at the corners.
for (let x = -.62; x <= .64; x += between(.1, .17)) leaves(x, 2.87, 2.95, 2, .03);
for (let x = -.6; x <= .62; x += between(.11, .19)) raceme(x, 2.87, 2.96, between(.1, .26));
for (const x of [-.9, .9]) raceme(x + between(-.03, .03), 2.84, 2.8, between(.36, .5));
// Right wall: up the back corner, then along under the eave, in front of the
// upper window's arch (which reaches x 3.41).
leafyVine([[3.24,-.19,-1.86],[3.26,.7,-1.8],[3.23,1.5,-1.88],[3.27,2.3,-1.79],[3.24,3.1,-1.85],[3.3,3.6,-1.72],[3.44,3.72,-1.5]], .05, [.03, 0, 0]);
leafyVine([[3.44,3.72,-1.5],[3.45,3.75,-.8],[3.45,3.73,0],[3.46,3.76,.8],[3.45,3.74,1.5],[3.4,3.72,1.95]], .036, [.03, 0, 0]);
for (let z = -1.42; z < 1.9; z += between(.11, .2)) raceme(3.47, 3.7, z, Math.abs(z - .88) < .55 ? between(.1, .22) : between(.26, .55));
}

// Standalone mailbox beside the front gate. It is a distinct named object so it
// can later hold letters, gifts or hidden clues independently from the door.
box("ivory", [1.68,.31,3.72], [.12,1.0,.12], [0,0,0], .006);
box("roseDeep", [1.68,.86,3.72], [.48,.34,.4], [0,0,0], .01, "mailbox");
box("rose", [1.68,1.055,3.72], [.54,.08,.44], [0,0,0], .008);
box("metal", [1.68,.89,3.935], [.26,.035,.025], [0,0,0], .003);
box("gold", [1.91,1.02,3.72], [.035,.34,.035], [0,0,0], .004);
box("gold", [2.02,1.16,3.72], [.2,.08,.035], [0,0,0], .004);
// ---------- Garden ----------
// A calm lawn, pale flagstones hugging the house, a short path to the gate,
// full borders, a low railing in front, hedges round the sides and back, and
// an old wisteria tree in the back corner with a bench under it.
// Pin the garden's random stream, so changes above (like switching the facade
// wisteria off) never reshuffle the garden. This is the state it had on
// 2026-10-22, when the tree was approved.
kit.reseed(-704734122);

const porch = (x, z) => Math.abs(x) < 1.28 && z > 2.1;
flagstones(-3.75, 3.75, 2.18, 2.78, 2, porch);
flagstones(-3.75, 3.75, -2.78, -2.18, 2);
flagstones(-3.75, -3.15, -2.18, 2.18, 2);
flagstones(3.15, 3.75, -2.18, 2.18, 2);
// The path from the steps out through the gate.
flagstones(-.62, .62, 3.53, 4.3, 3);

// Full borders in the four beds.
gardenBed([-3.46,-.22,3.54],2.45,0);
gardenBed([3.55,-.22,3.54],1.8,0);
gardenBed([-4.63,-.22,.2],3.35,Math.PI/2);
gardenBed([4.63,-.22,.2],3.35,Math.PI/2);

// A low wrought-iron railing either side of the gate, ending in short pillars.
kit.frontRailing();

hedge(false, -5.15, -3.95, 3.85);
hedge(false, 5.15, -3.95, 3.85);
hedge(true, -4.0, -4.92, 4.92);

const tree = [4.25, -3.15];
wisteriaTree(...tree);

// A small bench under the tree, turned toward the garden.
const benchAt = [4.0, -2.45], benchTurn = Math.PI / 4;
const benchBase = [benchAt[0], LAWN, benchAt[1]];
for (const lx of [-.3, .3]) for (const lz of [-.09, .09]) localBox("ivory", benchBase, [lx, .12, lz], [.04, .24, .04], benchTurn, .01);
for (const lz of [-.075, 0, .075]) localBox("wood", benchBase, [0, .25, lz], [.74, .03, .06], benchTurn, .01);
localBox("ivory", benchBase, [0, .44, -.12], [.74, .2, .035], benchTurn, .012);
for (const lx of [-.36, .36]) localBox("ivory", benchBase, [lx, .34, 0], [.035, .03, .22], benchTurn, .008);

// Grass tufts on the open lawn only, mostly where grass really gathers: at the
// foot of the hedges, along the flagstones and beside the path.
const taken = (x, z) =>
  (Math.abs(x) < 3.82 && Math.abs(z) < 2.86)                                  // house and flagstones
  || (Math.abs(x) < .72 && z > 2.8)                                            // path
  || (z > 3.18 && z < 3.9 && Math.abs(x) > 2.12 && Math.abs(x) < 4.78)         // front beds
  || (Math.abs(x) > 4.3 && Math.abs(x) < 4.96 && z > -1.62 && z < 2.0)         // side beds
  || Math.abs(x) > 4.88 || z < -3.72 || z > 3.95                               // hedges and railing
  || Math.hypot(x - 1.68, z - 3.72) < .32                                      // mailbox
  || Math.hypot(x - tree[0], z - tree[1]) < .3 || Math.hypot(x - benchAt[0], z - benchAt[1]) < .5;
const sign = () => rand() < .5 ? -1 : 1;
const tuftSpots = [
  () => [sign() * between(4.74, 4.87), between(-3.7, 3.9)],     // foot of the side hedges
  () => [between(-4.85, 4.85), between(-3.71, -3.6)],           // foot of the back hedge
  () => [sign() * between(3.83, 3.93), between(-2.9, 2.9)],     // beside the side flagstones
  () => [between(-3.9, 3.9), sign() * between(2.87, 2.97)],     // beside the front and back flagstones
  () => [sign() * between(.73, .8), between(2.85, 3.95)],       // beside the path
  () => [between(-5, 5), between(-3.7, 3.9)]                    // a few anywhere
];
kit.grassTufts(tuftSpots, taken, 80);

// A real two-leaf wrought-iron gate: separate posts, hinges and framed leaves.
// Each leaf is named independently so it can later swing open without changing
// the plot or the rest of the facade.
kit.frontGate();

// Small architectural hardware gives the facade a believable scale.
for(const x of [-2.67,2.67]){
 box("metal",[x,2.18,2.32],[.035,3.9,.035],[0,0,0],.006);
 for(const y of [.45,1.55,2.65,3.8])box("gold",[x,y,2.345],[.064,.025,.045],[0,0,0],.003);
}
const scene = kit.toScene("PorchlitHouse", colors);

function makeChunk(id, content = Buffer.alloc(0), children = Buffer.alloc(0)) {
  const header = Buffer.alloc(12);
  header.write(id, 0, 4, "ascii");
  header.writeUInt32LE(content.length, 4);
  header.writeUInt32LE(children.length, 8);
  return Buffer.concat([header, content, children]);
}

function writeVox() {
  const unit = .1;
  const origin = new THREE.Vector3(-6, -1, -5);
  const dimensions = [120, 100, 80]; // x, depth, height in MagicaVoxel axes
  const materialKeys = Object.keys(colors);
  const paletteIndex = new Map(materialKeys.map((key, index) => [key, index + 1]));
  const voxels = new Map();
  const local = new THREE.Vector3();
  const center = new THREE.Vector3();
  const inverse = new THREE.Quaternion();
  const rotationMatrix = new THREE.Matrix4();

  const q = new THREE.Quaternion();
  for (const item of kit.orderedInstances) {
    const half = new THREE.Vector3(...item.size).multiplyScalar(.5);
    q.setFromEuler(new THREE.Euler(...item.rotation));
    inverse.copy(q).invert();
    rotationMatrix.makeRotationFromQuaternion(q);
    const e = rotationMatrix.elements;
    const extent = new THREE.Vector3(
      Math.abs(e[0]) * half.x + Math.abs(e[4]) * half.y + Math.abs(e[8]) * half.z,
      Math.abs(e[1]) * half.x + Math.abs(e[5]) * half.y + Math.abs(e[9]) * half.z,
      Math.abs(e[2]) * half.x + Math.abs(e[6]) * half.y + Math.abs(e[10]) * half.z
    );
    const position = new THREE.Vector3(...item.position);
    const minX = Math.max(0, Math.floor((position.x - extent.x - origin.x) / unit));
    const maxX = Math.min(dimensions[0] - 1, Math.ceil((position.x + extent.x - origin.x) / unit));
    const minY = Math.max(0, Math.floor((position.y - extent.y - origin.y) / unit));
    const maxY = Math.min(dimensions[2] - 1, Math.ceil((position.y + extent.y - origin.y) / unit));
    const minZ = Math.max(0, Math.floor((position.z - extent.z - origin.z) / unit));
    const maxZ = Math.min(dimensions[1] - 1, Math.ceil((position.z + extent.z - origin.z) / unit));
    for (let ix = minX; ix <= maxX; ix += 1) {
      for (let iy = minY; iy <= maxY; iy += 1) {
        for (let iz = minZ; iz <= maxZ; iz += 1) {
          center.set(origin.x + (ix + .5) * unit, origin.y + (iy + .5) * unit, origin.z + (iz + .5) * unit);
          local.copy(center).sub(position).applyQuaternion(inverse);
          if (Math.abs(local.x) <= Math.max(half.x, unit * .56)
            && Math.abs(local.y) <= Math.max(half.y, unit * .56)
            && Math.abs(local.z) <= Math.max(half.z, unit * .56)) {
            const vx = ix;
            const vy = iz;
            const vz = iy;
            voxels.set((vx << 16) | (vy << 8) | vz, paletteIndex.get(item.material) || 1);
          }
        }
      }
    }
  }

  const size = Buffer.alloc(12);
  size.writeUInt32LE(dimensions[0], 0);
  size.writeUInt32LE(dimensions[1], 4);
  size.writeUInt32LE(dimensions[2], 8);
  const xyzi = Buffer.alloc(4 + voxels.size * 4);
  xyzi.writeUInt32LE(voxels.size, 0);
  let offset = 4;
  for (const [packed, color] of voxels) {
    xyzi[offset] = (packed >> 16) & 255;
    xyzi[offset + 1] = (packed >> 8) & 255;
    xyzi[offset + 2] = packed & 255;
    xyzi[offset + 3] = color;
    offset += 4;
  }
  const rgba = Buffer.alloc(1024);
  materialKeys.forEach((key, index) => {
    const color = new THREE.Color(colors[key]);
    rgba[index * 4] = Math.round(color.r * 255);
    rgba[index * 4 + 1] = Math.round(color.g * 255);
    rgba[index * 4 + 2] = Math.round(color.b * 255);
    rgba[index * 4 + 3] = key === "glass" ? 110 : 255;
  });
  const children = Buffer.concat([makeChunk("SIZE", size), makeChunk("XYZI", xyzi), makeChunk("RGBA", rgba)]);
  const header = Buffer.alloc(8);
  header.write("VOX ", 0, 4, "ascii");
  header.writeUInt32LE(150, 4);
  fs.writeFileSync(new URL("../public/models/porchlit-house.vox", import.meta.url), Buffer.concat([header, makeChunk("MAIN", Buffer.alloc(0), children)]));
  return voxels.size;
}

const voxelCount = writeVox();

const glbBytes = await writeGlb(scene, new URL("../public/models/porchlit-house.glb", import.meta.url));
console.log(`wrote porchlit-house.glb (${(glbBytes / 1024 / 1024).toFixed(2)} MB), porchlit-house.vox (${voxelCount} voxels)`);
