// The sidebar's current floor/room owns one pair of residents.
export function residentLocation(floor,room){
 const area=floor==='1F'?(room==='overview'?'downstairs':room==='kitchen'?'kitchen':'living'):(room==='bedroom'?'bedroom':'study');
 const origin=area==='living'?[-1,0,1.6]:area==='kitchen'?[1.05,0,-1]:[0,0,0];
 const spawns=area==='downstairs'?{girl:[-.35,2.5],boy:[-.35,.2]}:area==='kitchen'?{girl:[1.1,2.3],boy:[2.1,2.3]}:area==='bedroom'?{girl:[.2,2.1],boy:[2.9,2.75]}:area==='study'?{girl:[.65,.9],boy:[1.6,.4]}:{girl:[.65,.9],boy:[.65,-1.4]};
 return {key:`${floor}:${room}`,area,origin,spawns};
}
