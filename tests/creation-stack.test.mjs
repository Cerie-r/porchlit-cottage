// Things resting on placed builds: the pile, and what happens when the bottom one goes.
import assert from 'node:assert/strict';
import {stackOf,moveItem,placeItem} from '../src/workshop-state.js';

const room = (id, support = null) => ({id, location: 'room', floor: '2F', room: 'study', position: [0, 0, 0], support});
const items = [room('table'), room('vase', 'creation:table'), room('flower', 'creation:vase'), room('lamp', 'studyDesk'), {id: 'note', location: 'bag', slot: 0}];

assert.deepEqual([...stackOf(items, 'table')].sort(), ['flower', 'table', 'vase']);
assert.deepEqual([...stackOf(items, 'vase')].sort(), ['flower', 'vase']);
assert.deepEqual([...stackOf(items, 'lamp')], ['lamp']);
assert.deepEqual([...stackOf(items, null)], []);
// Something in the bag that still remembers an old support doesn't count.
assert.deepEqual([...stackOf([...items, {id: 'old', location: 'bag', support: 'creation:table'}], 'table')].sort(), ['flower', 'table', 'vase']);

// Into the bag: the whole pile comes along, and forgets what it stood on.
const after = moveItem(items, 'table', 'bag');
for (const id of ['table', 'vase', 'flower']) assert.equal(after.find(i => i.id === id).location, 'bag', id);
assert.equal(after.find(i => i.id === 'vase').support, null);
assert.equal(after.find(i => i.id === 'lamp').location, 'room');
// Taking the top one leaves the rest where they are.
const top = moveItem(items, 'flower', 'bag');
assert.equal(top.find(i => i.id === 'vase').location, 'room');
assert.equal(top.find(i => i.id === 'table').location, 'room');
// Set down on another floor: what rides on it goes along, still standing on it.
const moved = placeItem(items, 'table', {position: [1, 0, 1], support: null, wall: null}, '1F', 'overview');
for (const id of ['table', 'vase', 'flower']) assert.equal(moved.find(i => i.id === id).floor, '1F', id);
assert.equal(moved.find(i => i.id === 'vase').support, 'creation:table');
assert.deepEqual(moved.find(i => i.id === 'vase').position, [0, 0, 0], 'riders keep their spot on it');
assert.equal(moved.find(i => i.id === 'lamp').floor, '2F', 'the rest stay where they are');
assert.equal(moved.find(i => i.id === 'table').wall, null);
console.log('ok creation-stack');

// Thrown away from the backpack: only that one goes; what stood on it comes back to the bag.
{
  const {dropItem} = await import('../src/workshop-state.js');
  const left = dropItem(items, 'table');
  assert.deepEqual(left.map(i => i.id).sort(), ['flower', 'lamp', 'note', 'vase']);
  for (const id of ['vase', 'flower']) { assert.equal(left.find(i => i.id === id).location, 'bag', id); assert.equal(left.find(i => i.id === id).support, null, id); }
  assert.equal(left.find(i => i.id === 'lamp').location, 'room');
  assert.deepEqual(dropItem(items, 'note').map(i => i.id), ['table', 'vase', 'flower', 'lamp']);
  assert.equal(dropItem(items, 'nothing'), items);
}
