import {outfitsFor,colorwaysOf,extraOutfits,sewnOutfit} from './outfit-registry.js';
import {hairsFor,baseHairFor} from './hair-registry.js';
import {headwearFor,piecesFor,wearablesFor,accessoryById,accessoryColorwaysOf,PIECE_SLOTS} from './accessory-registry.js';
import {expressionOf} from './expressions.js';
export const wardrobeKey='porchlit.wardrobe.v1';
const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
export function cleanWardrobe(raw={}){raw=raw&&typeof raw==='object'?raw:{};const out={version:1,playerKind:raw.playerKind==='boy'?'boy':'girl',girl:{},boy:{}};for(const kind of ['girl','boy']){const d={hairColor:kind==='girl'?'#806455':'#494448',eyeColor:'#454344',browColor:'#685047',linked:true,mouth:0,blush:true,accessory:kind==='girl'?'bow':'none',accessoryColor:kind==='girl'?'#f3e6d5':'#51474a',outfit:kind==='girl'?'dress':'coat'},r=raw[kind]||{};for(const k of ['hairColor','eyeColor','browColor','accessoryColor'])if(hex(r[k]))d[k]=r[k];for(const k of ['linked','blush'])if(typeof r[k]==='boolean')d[k]=r[k];d.mouth=expressionOf(r.mouth);if(r.accessory==='none'||headwearFor(kind).includes(r.accessory))d.accessory=r.accessory;if(outfitsFor(kind).includes(r.outfit))d.outfit=r.outfit;const ways={};if(r.colorways&&typeof r.colorways==='object')for(const [id,way] of Object.entries(r.colorways))if(outfitsFor(kind).includes(id)&&colorwaysOf(id).some(w=>w.id===way))ways[id]=way;if(Object.keys(ways).length)d.colorways=ways;if(hairsFor(kind).includes(r.hair)&&r.hair!==baseHairFor(kind))d.hair=r.hair;for(const slot of PIECE_SLOTS)if(piecesFor(kind,slot).includes(r[slot]))d[slot]=r[slot];const accessoryWays={};if(r.accessoryWays&&typeof r.accessoryWays==='object')for(const [id,way] of Object.entries(r.accessoryWays))if(wearablesFor(kind).includes(id)&&accessoryColorwaysOf(id).some(w=>w.id===way))accessoryWays[id]=way;if(Object.keys(accessoryWays).length)d.accessoryWays=accessoryWays;out[kind]=d;}return out;}
// A look as anyone outside the home sees it (someone visiting, the street map): an outfit, headwear,
// glasses or anything at the neck, on the chest or on the braids worn only at home show as the ones
// they name instead (an outfit keeps its colourway where the other has it), and nothing of it is left
// in the look.
// Whatever shows a resident to others, or sends one out, goes through here.
export function publicLook(kind,look){
 // An outfit sewn at home shows as its pattern (no other home knows it), which then goes by the rules below.
 const sewn=sewnOutfit(look?.outfit);if(sewn)look={...look,outfit:outfitsFor(kind).filter(id=>!sewnOutfit(id)).includes(sewn.pattern)?sewn.pattern:outfitsFor(kind)[0]};
 const out={...look},outfit=extraOutfits.find(o=>o.id===look?.outfit),hidden=new Set(extraOutfits.filter(o=>o.homeOnly).map(o=>o.id));
 if(outfit?.homeOnly){const instead=outfitsFor(kind).includes(outfit.homeOnly)?outfit.homeOnly:outfitsFor(kind)[0],way=look.colorways?.[outfit.id];out.outfit=instead;if(way&&colorwaysOf(instead).some(w=>w.id===way))out.colorways={...look.colorways,[instead]:way};}
 if(out.colorways){const ways=Object.fromEntries(Object.entries(out.colorways).filter(([id])=>!hidden.has(id)));if(Object.keys(ways).length)out.colorways=ways;else delete out.colorways;}
 const headwear=accessoryById(look?.accessory);
 if(headwear?.homeOnly)out.accessory=headwear.homeOnly==='none'||headwearFor(kind).includes(headwear.homeOnly)?headwear.homeOnly:'none';
 for(const slot of PIECE_SLOTS){const piece=accessoryById(look?.[slot]);if(piece?.homeOnly){if(piecesFor(kind,slot).includes(piece.homeOnly))out[slot]=piece.homeOnly;else delete out[slot];}}
 if(out.accessoryWays){const ways=Object.fromEntries(Object.entries(out.accessoryWays).filter(([id])=>!accessoryById(id)?.homeOnly));if(Object.keys(ways).length)out.accessoryWays=ways;else delete out.accessoryWays;}
 return out;
}
export function publicWardrobe(raw){const w=cleanWardrobe(raw);return {...w,girl:publicLook('girl',w.girl),boy:publicLook('boy',w.boy)};}
// The wardrobe is the saved appearance source; the house copy is a legacy fallback.
export function readWardrobe(fallback){try{const raw=localStorage.getItem(wardrobeKey);if(raw!==null){const value=JSON.parse(raw);if(value&&typeof value==='object'&&!Array.isArray(value))return cleanWardrobe(value);}return cleanWardrobe(fallback);}catch{return cleanWardrobe(fallback);}}
