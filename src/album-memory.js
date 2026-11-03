import {checkGift} from './door-gifts.js';
// Something an AI hid that she hasn't found yet (src/machine-acts.js): not in her album until she finds it.
export const stillHidden = i => !!i && typeof i.hid === 'object' && !!i.hid && !i.hid.found && typeof i.location === 'string' && i.location.startsWith('hide:');
// One representative per discovered kind, never a second inventory or a photo archive.
export function cleanAlbumMemory(raw){
 const out={dolls:{},desserts:{},flowers:{}};
 for(const shelf of ['dolls','desserts'])for(const [id,value] of Object.entries(raw?.[shelf]||{}).slice(0,80)){
  const look=checkGift(value?.look);
  if(!look||look.kind!==(shelf==='dolls'?'animal':'dessert'))continue;
  const key=shelf==='dolls'?look.species:look.base;if(key!==id)continue;
  out[shelf][id]={look};
 }
 for(const [id,value] of Object.entries(raw?.flowers||{}).slice(0,80)){
  if(!/^[a-z][a-z0-9-]{0,40}$/.test(id))continue;
  out.flowers[id]={color:typeof value?.color==='string'&&/^#[a-f0-9]{6}$/i.test(value.color)?value.color:'#ffffff'};
 }
 return out;
}
export function rememberAlbum(state){
 const album=cleanAlbumMemory(state.album);
 for(const item of state.creations||[]){
  if(!['animal','dessert','bouquet'].includes(item.kind)||stillHidden(item))continue;
  const look=checkGift(item);if(!look)continue;
  if(look.kind==='animal')album.dolls[look.species]={look};
  if(look.kind==='dessert')album.desserts[look.base]={look};
  if(look.kind==='bouquet')for(const stem of look.stems)album.flowers[stem.type]={color:stem.color};
 }
 return {...state,album};
}
