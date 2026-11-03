// Migrate retired whole-house finishes only; artwork and foliage are not inputs.
const retired=new Set(['#cadccf','#94b09a','#b9cbb8','#d8e2d5','#8eaa94','#a9bda9','#d5e0d4','#b4c8b5','#8fa88f','#d5c5df','#aa8fba','#c5afd2','#dfd0e6','#9d82ad','#bca7c4','#e0d4e4','#c5b1cb']);
export const cleanFinish=value=>typeof value==='string'&&retired.has(value.toLowerCase())?'#f5eee3':value;
export function cleanDecor(state){return {...state,values:Object.fromEntries(Object.entries(state?.values||{}).map(([k,v])=>[k,v==='sage'?'milk':cleanFinish(v)]))};}
export function cleanSurfaces(state){return {...state,surfaces:Object.fromEntries(Object.entries(state?.surfaces||{}).map(([k,v])=>[k,v==='sage'?'milk':v])),...(state?.unlocked?{unlocked:[...new Set(state.unlocked.map(v=>v==='sage'?'milk':v))]}:{})};}
