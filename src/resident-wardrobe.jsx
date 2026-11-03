import React,{useEffect,useRef} from 'react';
import {cleanWardrobe,readWardrobe} from '../body/wardrobe-state.js';
// drawn: what this home has drawn from the capsule machine (homeState.capsules); the wardrobe offers
// only those of the pieces, outfits and hairstyles that come out of it (body/drawn.js). day: the home's today, for what
// comes out on a day of its own (body/wardrobe-day.js). sewn: what has been sewn at home (homeState.tailor.made), worn
// like any other outfit.
export function ResidentPanel({kind,value,drawn,day,sewn,onChange,onClose}){
 const frame=useRef(),latest=useRef({kind,value,drawn,day,sewn,onChange,onClose});latest.current={kind,value,drawn,day,sewn,onChange,onClose};
 useEffect(()=>{const prev=document.activeElement;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
 const listener=e=>{if(e.origin!==location.origin||e.source!==frame.current?.contentWindow)return;const props=latest.current;
 if(e.data?.type==='porchlit-wardrobe-ready'){frame.current.contentWindow.postMessage({type:'porchlit-wardrobe-init',kind:props.kind,day:props.day,wardrobe:readWardrobe(props.value?.wardrobeV1),drawn:{pieces:props.drawn?.pieces||[],outfits:props.drawn?.outfits||[],hairs:props.drawn?.hairs||[]},sewn:props.sewn||[]},location.origin);frame.current.focus();}
 if(e.data?.type==='porchlit-wardrobe-close')props.onClose();
 if(e.data?.type==='porchlit-wardrobe-save'){const w=cleanWardrobe(e.data.wardrobe),patch={wardrobeV1:w,playerKind:w.playerKind};for(const k of ['girl','boy']){patch[k+'HairColor']=w[k].hairColor;patch[k+'EyeColor']=w[k].eyeColor;patch[k+'Outfit']=w[k].outfit;patch[k+'Accessory']=w[k].accessory!=='none';}props.onChange(patch);props.onClose();}};
 window.addEventListener('message',listener);return()=>{window.removeEventListener('message',listener);document.body.style.overflow=overflow;prev?.focus?.();};},[]);
 return <div className="resident-overlay" role="dialog" aria-modal="true" aria-label="今日穿搭" onPointerDown={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()} style={{zIndex:1000,padding:0,background:'#f3f1ee'}}><iframe ref={frame} src={`/body/?embedded=1&kind=${kind==='boy'?'boy':'girl'}`} title="今日穿搭衣橱" style={{width:'100%',height:'100%',border:0,background:'#f3f1ee'}}/></div>;
}
