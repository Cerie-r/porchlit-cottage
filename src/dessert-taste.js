import {normalizeDessert,handOf,bakeOf,isDay} from './dessert-recipe.js';

// Taste follows palette roles, even when a home repaints its colours.
export const FLAVOURS = {cream:'香草',white:'牛奶',blush:'樱花',rose:'玫瑰',lilac:'芋泥',sage:'抹茶',mist:'海盐',wood:'焦糖',ink:'巧克力',gold:'蜂蜜'};
const FRUIT = {strawberry:'草莓',blueberry:'蓝莓',cherry:'樱桃'};
const TEXTURE = {cake:'松软的蛋糕',tart:'酥酥的塔皮',pudding:'滑滑的布丁',macaron:'外脆内软的饼壳',puff:'轻脆的泡芙皮'};
export function flavourLabel(role, tone = 'cream') {return role === 'gold' && tone === 'body' ? '蛋香' : FLAVOURS[role] || '香草';}
export function notes(item) {
  const d=normalizeDessert(item), fruit=FRUIT[d.fruit], cream=d.cream!=='none'?flavourLabel(d.c.cream)+'奶油':null;
  const base=flavourLabel(d.c.body,'body');
  return {top:fruit||cream||base,heart:[cream, !fruit&&!cream?TEXTURE[d.base]:null, d.sprinkles!=='none'?flavourLabel(d.c.sprinkles)+'糖':null].filter(Boolean).join('、')||TEXTURE[d.base],base};
}
export function waitedDays(madeOn,eatenOn){return isDay(madeOn)&&isDay(eatenOn)?Math.max(0,Math.floor((Date.parse(eatenOn+'T00:00:00Z')-Date.parse(madeOn+'T00:00:00Z'))/86400000)):0;}
// Printed once when eaten. Old pages can derive a reading from their saved
// calendar dates, without pretending to know the hour they were eaten.
export function houseTaste(item,{eatenOn, hour}={}) {
  const d=normalizeDessert(item), lines=[], hand=handOf(d), waited=waitedDays(d.madeOn,eatenOn);
  if(bakeOf(d)==='burnt')lines.push('边边烤得有点焦，焦的那一圈最香。');
  else if(hand?.cream?.some(([,r])=>r>7))lines.push('奶油挤歪了一点，歪的那边多一口。');
  else if(hand?.fruit?.length>1){const angles=hand.fruit.map(([a])=>a);if(angles.every(a=>a<16)||angles.every(a=>a>=16))lines.push('水果都挤在一边，像是给谁留的。');}
  if(waited>=3&&d.cream!=='none')lines.push('等你等得奶油都软了。');
  else if(waited>=1)lines.push(({pudding:'放了一夜，更凉更滑了。',tart:'放了一夜，塔皮没那么酥了。',cake:d.cream==='none'?'放了一夜，甜味慢慢留了下来。':'放了一夜，奶油软了一点。',macaron:'放了一夜，夹心和饼壳更贴近了。',puff:'放了一夜，泡芙皮软了一点。'})[d.base]);
  if(Number.isFinite(hour)&&(hour>=23||hour<4))lines.push('半夜吃的，有一点罪恶，所以更好吃。');
  else if(Number.isFinite(hour)&&hour>=6&&hour<10)lines.push('早上吃甜的，一整天都是甜的。');
  return lines.join('')||'把这一口甜，留在了今天。';
}
