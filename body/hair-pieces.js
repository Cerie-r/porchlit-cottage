// The public hairstyles beyond the two every resident starts with (body/hair-registry.js): made in code, part of the
// public release, and meant for the capsule machine, where each is a rare prize in a single colour (the hair colour is
// the resident's own, chosen in the wardrobe). A home that has drawn one finds it in the wardrobe; a home's own pack
// can say it has some without drawing (body/drawn.js, registerOwn). See body/hair-registry.js for what an entry is.
import {createBraidsHair} from './hair-braids.js';
import {createLongHair} from './hair-long.js';
import {createCenterHair} from './hair-center.js';
import {createSlickHair} from './hair-slick.js';
import {createWavyHair, createWavyCurtainHair} from './hair-waves.js';
import {createLeafyHair} from './hair-leafy.js';
import {createRollHair} from './hair-roll.js';

export const publicHairs = [
  {id: 'braids', name: '双麻花辫', wearers: ['girl'], create: createBraidsHair},
  {id: 'straight', name: '长直发', wearers: ['girl'], create: createLongHair},
  {id: 'waves', name: '大波浪', wearers: ['girl'], create: createWavyHair},
  {id: 'waves-curtain', name: '八字刘海大波浪', wearers: ['girl'], create: createWavyCurtainHair},
  {id: 'center', name: '中分', wearers: ['boy'], create: createCenterHair},
  {id: 'slick', name: '背头', wearers: ['boy'], create: createSlickHair},
  {id: 'leafy', name: '蓬松碎盖', wearers: ['boy'], create: createLeafyHair},
  {id: 'roll', name: '卷边碎发', wearers: ['boy'], create: createRollHair}
];
