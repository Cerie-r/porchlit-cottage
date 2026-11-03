import test from 'node:test';
import assert from 'node:assert/strict';
import {COLOURS, applyDecor, decorArgs, decorLine, decorLook, paintable} from '../src/machine-decor.js';
import {actArgs, applyActs, prepareAct} from '../src/machine-acts.js';

const DAY = '2026-10-28';
const act = (action, args) => ({id: '1', key: crypto.randomUUID(), tool: 'decorate', action, args, by: {id: '34', name: 'Birch', nickname: '小桦'}});

test('what may be asked: a room\'s wallpaper and floor, a piece\'s colours, a room\'s lights, the outside', () => {
  assert.deepEqual(decorArgs('room', {room: 'bedroom', wall: 'rose'}).args, {room: 'bedroom', wall: 'rose'});
  assert.match(decorArgs('room', {room: 'attic', wall: 'rose'}).problem, /downstairs（一楼）/);
  assert.match(decorArgs('room', {room: 'bedroom'}).problem, /至少填一样/);
  assert.match(decorArgs('room', {room: 'bedroom', floor: 'marble'}).problem, /oak（白橡木）/);
  assert.deepEqual(decorArgs('paint', {piece: 'diningTable', paint: 'shell', top: 'rose'}).args, {piece: 'diningTable', paint: 'shell', top: 'rose'});
  assert.match(decorArgs('paint', {piece: 'sofa', top: 'oak'}).problem, /沙发没有台面可换/);
  assert.match(decorArgs('paint', {piece: 'rug', paint: 'shell'}).problem, /能换颜色的家具/);
  assert.match(decorArgs('paint', {piece: 'sofa', paint: '#ff0000'}).problem, /ivory（象牙白）/);
  assert.deepEqual(decorArgs('light', {room: 'study', mode: 'read'}).args, {room: 'study', mode: 'read'});
  assert.match(decorArgs('light', {room: 'study', mode: 'disco'}).problem, /daily（日常）/);
  assert.match(decorArgs('shell', {shell: 'igloo'}).problem, /haunted（万圣节鬼屋）/);
  // Through the act's own shape, with a note; the line it's asked as.
  assert.deepEqual(actArgs('decorate', 'light', {room: 'bedroom', mode: 'sleep', note: '早点睡'}).args, {note: '早点睡', room: 'bedroom', mode: 'sleep'});
  assert.equal(decorLine('room', {room: 'bedroom', wall: 'rose', floor: 'walnut'}), '把卧室换成蔷薇小花墙纸、胡桃木地板');
  assert.equal(decorLine('paint', {piece: 'diningTable', paint: 'shell', top: 'rose'}, true), '给餐桌换上了贝壳粉的主色、粉白石面的台面');
  // Every piece that can change colour has a name the AI is told.
  for (const p of paintable()) assert.ok(!/^[a-z]/.test(decorLine('paint', {piece: p.id, paint: 'ivory'}).slice(1)), p.id);
});

test('let in: kept apart from the house, not over what she locked, not over what is already so', () => {
  const decor = {values: {'sofa|paint': COLOURS.paint.shell.color}, locks: {'room:study|wall': true}};
  const wall = applyDecor({}, 'room', {room: 'bedroom', wall: 'rose'}, {decor, lights: {}, day: DAY});
  assert.equal(wall.ok, true);
  assert.equal(wall.home, undefined);
  assert.equal(wall.decor.values['room:bedroom|wall'], 'rose');
  assert.equal(wall.decor.values['sofa|paint'], COLOURS.paint.shell.color);
  assert.match(applyDecor({}, 'room', {room: 'study', wall: 'rose'}, {decor, day: DAY}).why, /书房的墙纸她锁住了/);
  assert.match(applyDecor({}, 'paint', {piece: 'sofa', paint: 'shell'}, {decor, day: DAY}).why, /已经是这个颜色了/);
  const light = applyDecor({}, 'light', {room: 'bedroom', mode: 'sleep'}, {decor, lights: {study: {mode: 'read'}}, day: DAY});
  assert.equal(light.lights.bedroom.mode, 'sleep');
  assert.equal(light.lights.study.mode, 'read');
  assert.match(applyDecor({}, 'light', {room: 'study', mode: 'read'}, {decor, lights: {study: {mode: 'read'}}, day: DAY}).why, /已经是「夜读」/);
  // The outside: only what's open to the home on the day (the haunted house only round Halloween).
  assert.match(applyDecor({}, 'shell', {shell: 'roseCastle'}, {decor, day: DAY}).why, /还没解开/);
  const haunted = applyDecor({}, 'shell', {shell: 'haunted'}, {decor, day: DAY});
  assert.equal(haunted.home.seasonShell, 'haunted');
  assert.match(applyDecor({}, 'shell', {shell: 'haunted'}, {decor, day: '2026-12-01'}).why, /不在它的日子/);
});

test('acts let in one after another carry the decoration and the lights on, and the house\'s outside in it', () => {
  const r = applyActs({creations: []}, [act('room', {room: 'bedroom', wall: 'rose'}), act('paint', {piece: 'sofa', paint: 'shell'}), act('light', {room: 'study', mode: 'read'}), act('shell', {shell: 'haunted'})],
    {day: DAY, now: 1, decor: {values: {}, locks: {}}, lights: {}});
  assert.deepEqual(r.entries.map(e => e.what), ['把卧室换成了蔷薇小花墙纸', '给沙发换上了贝壳粉的主色', '把书房的灯调成了「夜读」', '把房子的外观换成了万圣节鬼屋']);
  assert.deepEqual(Object.keys(r.decor.values).sort(), ['room:bedroom|wall', 'sofa|paint']);
  assert.equal(r.lights.study.mode, 'read');
  assert.equal(r.home.seasonShell, 'haunted');
  // Nothing about the decoration changed: none comes back.
  const none = applyActs({creations: []}, [act('shell', {shell: 'haunted'})], {day: DAY, now: 1, decor: {values: {}, locks: {}}, lights: {}});
  assert.equal(none.decor, undefined);
  assert.equal(none.lights, undefined);
  // A few may wait at once.
  const waiting = Array.from({length: 6}, () => ({tool: 'decorate', action: 'room', args: {}}));
  assert.match(prepareAct({creations: []}, {tool: 'decorate', action: 'light', args: {room: 'study', mode: 'read'}}, {waiting}).problem, /已经排着 6 件布置/);
});

test('what the AI is told the home looks like, and what it may choose', () => {
  const lines = decorLook({}, {values: {'room:bedroom|wall': 'rose', 'diningTable|top': COLOURS.top.rose.color}, locks: {'room:bedroom|floor': true}}, {bedroom: {mode: 'sleep'}}, {day: DAY}).join('\n');
  assert.match(lines, /外观：现在是 紫藤街屋（gabledCottage）。能换：gabledCottage（紫藤街屋）、haunted（万圣节鬼屋）。/);
  assert.match(lines, /bedroom（卧室）：墙纸 蔷薇小花，地板 原来的（她锁住了），灯「入睡」/);
  assert.match(lines, /餐桌（diningTable）：能换 paint、top、detail；现在 台面 粉白石面/);
  assert.match(lines, /墙纸（wall）：plain（奶油素墙）/);
});
