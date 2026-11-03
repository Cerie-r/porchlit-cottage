// A home's IANA time zone is stable when its owner travels. Future MCP setters
// should update this same setting, rather than relying on the server's zone.
export const DEFAULT_ZONE = 'Australia/Melbourne';
// Making a date formatter takes over ten times as long as using one, and these run every time the house draws: each
// zone is checked once, and each kind of formatter is made once per zone.
const checked=new Map(),formats=new Map();
export function validZone(zone){if(typeof zone!=='string'||zone.length>=80)return false;if(!checked.has(zone)){let ok=true;try{new Intl.DateTimeFormat('en',{timeZone:zone}).format();}catch{ok=false;}checked.set(zone,ok);}return checked.get(zone);}
// A formatter for `zone` (the default zone when it isn't one) with these options, made once and kept.
export function zoneFormat(zone,options){const z=validZone(zone)?zone:DEFAULT_ZONE,key=z+' '+JSON.stringify(options);let format=formats.get(key);if(!format){format=new Intl.DateTimeFormat('en-GB',{...options,timeZone:z});formats.set(key,format);}return format;}
const hourMinute={hour:'2-digit',minute:'2-digit',hourCycle:'h23'};
export function daylightAt(date,zone){const parts=zoneFormat(zone,hourMinute).formatToParts(date);const h=Number(parts.find(p=>p.type==='hour').value)+Number(parts.find(p=>p.type==='minute').value)/60;const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};return smooth(h-6)*(1-smooth(h-18));}
