import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {LAP, LAP_HOLD, NESTLE, WIDE, lapSeat, lapSide, sameSeat, seatBeside, seatEnd, seatNestled} from '../src/resident-together.js';
import {newMotion, stepResident, beginStand} from '../src/resident-motion-state.js';
import {findPath, freePoint, nearestFree, obstaclesFor, sofaSeat, standingSpot} from '../src/resident-navigation.js';
import {rigAvatar} from '../body/avatar-rig.js';
import {applyHeadRatio} from '../body/proportions.js';
import {applyRoundHead} from '../body/round-head.js';

const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
// The living room as the motion tests have it.
const furniture = {sofa: {position: [-.62, .43, -.45], rotationY: -Math.PI / 2}, coffeeTable: {position: [-2.4, .34, -.48], rotationY: Math.PI / 2}, armchair: {position: [-2.28, .38, -2.16], rotationY: .62}, tvUnit: {position: [-3.88, .34, -.55], rotationY: Math.PI / 2}, lamp: {position: [.5, 0, -2.72], rotationY: 0}, floorPlant: {position: [-3.62, .03, -2.48], rotationY: -.18}};

test('the lap: ahead of his seat the way he faces, across his thighs, a thigh higher, facing his way', () => {
  const his = {seat: [1, 2], approach: [1, 2.88], height: .235, yaw: 0};
  const lap = lapSeat(his, LAP.side);
  assert.equal(lap.id, 'lap');
  assert.equal(lap.lap, true);
  assert.ok(near(lap.seat[0], 1 + LAP.side) && near(lap.seat[1], 2 + LAP.forward));
  assert.ok(near(lap.approach[0], 1 + LAP.side) && near(lap.approach[1], 2 + LAP.forward + LAP.backIn));
  assert.ok(near(lap.height, .235 + LAP.rise));
  assert.equal(lap.yaw, 0);
  // Turned a quarter: ahead is +x, across is -z.
  const turned = lapSeat({...his, yaw: Math.PI / 2}, LAP.side);
  assert.ok(near(turned.seat[0], 1 + LAP.forward) && near(turned.seat[1], 2 - LAP.side));
});

test('she sits on the side that keeps his face in view: along the way the camera looks', () => {
  assert.equal(lapSide(0, [-.7, -.7]), -LAP.side);
  assert.equal(lapSide(0, [.7, -.7]), LAP.side);
  assert.equal(lapSide(Math.PI, [.7, -.7]), -LAP.side, 'the other way round when he faces the other way');
  assert.equal(lapSide(0, null), -LAP.side);
});

test('on the sofa: she can walk up to him and back onto his lap, and gets up again', () => {
  const obstacles = obstaclesFor(furniture), his = sofaSeat(furniture.sofa, 'boy');
  const him = newMotion(his.seat);
  Object.assign(him, {seat: his, sit: 1, yaw: his.yaw});
  const lap = lapSeat(his, lapSide(his.yaw, [-.7, -.7])), blocked = [...obstacles, {x: him.x, z: him.z, w: .22, d: .22, angle: 0}];
  const her = newMotion(nearestFree([.65, .9], blocked)), to = standingSpot(lap.approach, blocked) || lap.approach;
  assert.ok(freePoint(to, blocked), 'there is room in front of him');
  const route = findPath([her.x, her.z], to, blocked);
  assert.ok(route, 'she can get there');
  Object.assign(her, {route, seat: lap});
  for (let i = 0; i < 900; i++) stepResident(her, 1 / 60, .25);
  assert.equal(her.sit, 1);
  assert.ok(near(her.x, lap.seat[0], 1e-6) && near(her.z, lap.seat[1], 1e-6), 'on his thighs');
  assert.ok(near(her.y, lap.height - .25, 1e-6), 'at the height of his thighs');
  assert.ok(Math.abs(Math.atan2(Math.sin(her.yaw - his.yaw), Math.cos(her.yaw - his.yaw))) < .03, 'facing the way he does');
  beginStand(her);
  for (let i = 0; i < 120; i++) stepResident(her, 1 / 60, .25);
  assert.equal(her.sit, 0);
  assert.equal(her.y, 0);
});

test('arms come round and let go, easing like leaning', () => {
  const m = newMotion([0, 0]);
  assert.deepEqual(m.arms, [0, 0, 0, 0]);
  assert.equal(stepResident(m, 1 / 60, .25), false, 'nothing to do');
  m.armsTo = LAP_HOLD.under.arms;
  assert.equal(stepResident(m, 1 / 60, .25), true, 'moving');
  for (let i = 0; i < 300; i++) stepResident(m, 1 / 60, .25);
  assert.deepEqual(m.arms, LAP_HOLD.under.arms);
  assert.equal(stepResident(m, 1 / 60, .25), false, 'and settled');
  m.armsTo = null;
  for (let i = 0; i < 300; i++) stepResident(m, 1 / 60, .25);
  assert.deepEqual(m.arms, [0, 0, 0, 0]);
});

test('the rig takes the arms on top of the pose, and without them the arms hang as before', async () => {
  const data = fs.readFileSync('public/models/resident-body.glb');
  const {scene: model} = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
  applyRoundHead(model); applyHeadRatio(model);
  const root = new T.Group(); root.add(model); root.updateMatrixWorld(true);
  const rig = rigAvatar(root), [left, right] = [rig.bones[5], rig.bones[6]];
  rig.pose({sit: 1});
  const sitting = [left.rotation.x, left.rotation.z, right.rotation.x, right.rotation.z];
  rig.pose({sit: 1, arms: LAP_HOLD.under.arms});
  const a = LAP_HOLD.under.arms;
  assert.ok(near(left.rotation.x, sitting[0] + a[0]) && near(left.rotation.z, a[1]));
  assert.ok(near(right.rotation.x, sitting[2] + a[2]) && near(right.rotation.z, sitting[3] + a[3]));
  rig.pose({sit: 1});
  assert.deepEqual([left.rotation.x, left.rotation.z, right.rotation.x, right.rotation.z], sitting, 'let go');
});

test('a sofa seats two, one at each end; she sits at the other end from him, and on a seat for one he is in, nowhere', () => {
  // The sofa's middle seat facing +z: its width runs along +x.
  const middle = {id: 'sofa', seat: [0, 0], approach: [0, .6], height: .3, yaw: 0};
  const right = seatEnd(middle, 1), left = seatEnd(middle, -1);
  assert.deepEqual(right.seat, [WIDE.sofa, 0]);
  assert.deepEqual(left.approach, [-WIDE.sofa, .6]);
  assert.equal(seatEnd({id: 'armchair', seat: [0, 0], approach: [0, 1], yaw: 0}, 1).seat[0], 0, 'a chair has no ends');
  // He's at the right end: tapping the sofa, she gets the left end, and the other way round.
  assert.deepEqual(seatBeside(middle, right).seat, left.seat);
  assert.deepEqual(seatBeside(middle, left).seat, right.seat);
  assert.deepEqual(seatBeside(right, right).seat, left.seat, 'even asking for his end');
  // Turned a quarter, the ends turn with it.
  const turned = {...middle, yaw: Math.PI / 2};
  assert.ok(Math.abs(seatEnd(turned, 1).seat[1] + WIDE.sofa) < 1e-9);
  // Another seat: as asked. His chair: nowhere.
  const chair = {id: 'armchair', seat: [3, 1], approach: [3, 2], height: .2, yaw: 0};
  assert.equal(seatBeside(chair, right), chair);
  assert.equal(seatBeside(chair, {...chair}), null);
  assert.equal(seatBeside(middle, null), middle);
  assert.equal(sameSeat({id: 'bench', seat: [0, 0], yaw: 0}, right), false, 'two seats with names are the same only by name');
  // Without names, by where they are.
  assert.equal(sameSeat({seat: [0, 0], yaw: 0}, {seat: [.1, 0], yaw: .1}), true);
});

test('tilting turns the body sideways about the hips: the legs keep their angle, the feet stay on the floor, the head moves over', async () => {
  const data = fs.readFileSync('public/models/resident-body.glb');
  const {scene: model} = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
  applyRoundHead(model); applyHeadRatio(model);
  const root = new T.Group(); root.add(model); root.updateMatrixWorld(true);
  const rig = rigAvatar(root), [pelvis, hipL, kneeL, hipR, kneeR] = rig.bones;
  const at = (bone, local = [0, 0, 0]) => { root.updateMatrixWorld(true); return bone.localToWorld(new T.Vector3(...local)); };
  const feet = () => [at(kneeL, [0, -.43, 0]), at(kneeR, [0, -.43, 0])];
  const middle = () => at(hipL).add(at(hipR)).multiplyScalar(.5);
  const thigh = (hip, knee) => at(knee).sub(at(hip)).normalize();
  for (const [sit, lean] of [[0, 0], [1, -.2], [1, .1]]) {
    rig.pose({sit, lean});
    const before = feet(), mid = middle(), head = at(pelvis, [0, 2.4, 0]), legs = [thigh(hipL, kneeL), thigh(hipR, kneeR)];
    rig.pose({sit, lean, tilt: LAP_HOLD.under.tilt});
    const after = feet(), tilted = at(pelvis, [0, 2.4, 0]);
    // Sitting, the middle of the hips stays on the seat; standing, the body rose so that the lower foot is on the floor.
    if (sit) assert.ok(middle().distanceTo(mid) < 1e-6, 'on the seat');
    else assert.ok(Math.abs(Math.min(after[0].y, after[1].y) - Math.min(before[0].y, before[1].y)) < 1e-3, 'a foot on the floor');
    after.forEach((p, i) => assert.ok(Math.abs(p.x - before[i].x) < .02 && Math.abs(p.z - before[i].z) < .02, `sit ${sit}: a foot slid ${p.x - before[i].x}, ${p.z - before[i].z}`));
    [thigh(hipL, kneeL), thigh(hipR, kneeR)].forEach((v, i) => assert.ok(v.angleTo(legs[i]) < 1e-6, `sit ${sit}, lean ${lean}: a leg turned`));
    assert.ok(tilted.x < head.x - .1, `the head moves over to -x: ${head.x} → ${tilted.x}`);
  }
  rig.pose({sit: 1});
  assert.equal(pelvis.rotation.z, 0, 'and back upright');
});

test('leaning on him on the sofa: she sits next to him, towards the middle, their heads just clear', () => {
  const middle = {id: 'sofa', seat: [0, 0], approach: [0, .6], height: .3, yaw: 0};
  const his = seatEnd(middle, 1), hers = seatNestled(his);
  assert.ok(Math.abs(hers.seat[0] - (WIDE.sofa - NESTLE.apart)) < 1e-9 && hers.seat[1] === 0);
  assert.ok(Math.abs(hers.approach[0] - hers.seat[0]) < 1e-9 && hers.approach[1] === .6, 'and walks up in front of it');
  assert.equal(hers.nestle, 1, 'he is on her +x side');
  assert.equal(seatNestled(seatEnd(middle, -1)).nestle, -1);
  assert.ok(Math.abs(seatNestled(seatEnd(middle, -1)).seat[0] - (-WIDE.sofa + NESTLE.apart)) < 1e-9);
  assert.equal(seatNestled({id: 'armchair', seat: [0, 0], approach: [0, 1], yaw: 0}), null, 'not on a chair for one');
  assert.equal(seatNestled(null), null);
});
