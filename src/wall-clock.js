import {zoneFormat} from './home-clock.js';

const handsTime={hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'};
// Hand angles for the living-room clock, in radians clockwise from twelve,
// read in the home's own time zone (the same one that drives day and night).
export function clockAngles(date,zone){
  const parts=zoneFormat(zone,handsTime).formatToParts(date);
  const read=type=>Number(parts.find(p=>p.type===type)?.value||0);
  const minutes=read('minute')+read('second')/60;
  return {hour:((read('hour')%12)+minutes/60)/12*Math.PI*2,minute:minutes/60*Math.PI*2};
}
