import React,{createContext,useContext,useEffect,useState} from 'react';
import {DEFAULT_ZONE,validZone,daylightAt} from './home-clock.js';
export const DaylightContext=createContext(1);
// The home's IANA zone, for things in the rooms that tell the time.
export const HomeZoneContext=createContext(DEFAULT_ZONE);
export const useDaylight=()=>useContext(DaylightContext);
export function useHomeClock(){
 const [zone,setZone]=useState(()=>{try{const s=JSON.parse(localStorage.getItem('porchlit-clock-v1'));return validZone(s?.timeZone)?s.timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||DEFAULT_ZONE;}catch{return DEFAULT_ZONE;}});
 const [preview,setPreview]=useState('auto');
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{const update=()=>{if(!document.hidden)setNow(new Date());};const timer=setInterval(update,30000);document.addEventListener('visibilitychange',update);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update);};},[]);
 useEffect(()=>{localStorage.setItem('porchlit-clock-v1',JSON.stringify({timeZone:zone}));},[zone]);
 return {zone,setZone:next=>{if(validZone(next))setZone(next);},preview,setPreview,daylight:preview==='day'?1:preview==='night'?0:daylightAt(now,zone)};
}
export function HomeClockSettings({zone,onZone,preview,onPreview}){const [draft,setDraft]=useState(zone),[error,setError]=useState('');return <details className="home-clock"><summary aria-label="小屋时区"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg></summary><form onSubmit={e=>{e.preventDefault();if(!validZone(draft)){setError('请选择有效时区');return;}onZone(draft);setError('已保存，小屋会跟着这里的时间亮起。');}}><label>小屋所在时区<input aria-label="小屋所在时区" value={draft} list="home-zones" onChange={e=>setDraft(e.target.value)}/></label><datalist id="home-zones">{['Australia/Melbourne','Asia/Shanghai','Asia/Tokyo','Europe/London','America/New_York','America/Los_Angeles'].map(z=><option key={z} value={z}/>)}</datalist><label>光线预览<select aria-label="光线预览" value={preview} onChange={e=>onPreview(e.target.value)}><option value="auto">跟随小屋时间</option><option value="day">白天预览</option><option value="night">夜晚预览</option></select></label><small>日夜自动变化 · 清晨 6–7 时 / 傍晚 18–19 时</small><button type="submit">保存</button><p role="status">{error}</p></form></details>;}
