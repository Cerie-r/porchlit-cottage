// Stable IDs make the conversion repeatable without replacing a moved or stored toy.
export function addBuiltinToys(items=[],definitions=[]){
 const ids=new Set(items.map(i=>i.id));
 return [...items,...definitions.filter(d=>!ids.has(d.id)).map(d=>({id:d.id,kind:'keepsake',toy:d.id,name:d.name,location:'room',floor:'2F',room:'bedroom',support:'bed-toys',position:[...d.position],rotationY:d.rotationY||0}))];
}

// The keepsakes on the bed: the little bear every home has, and a home's own once its things have come
// (src/ours-pack.js). Each {id, name, position, rotationY, scale, build(), dispose(object)}; the bear is drawn as
// a stuffed animal instead.
export const bedBear = {id: 'builtin-bed-bear', name: '床边的小熊', position: [-.7, .82, -.28], rotationY: .2, scale: .18};
export const builtinToys = [bedBear];
export function addOurToys(toys = []) {
  for (const t of toys) if (t?.id && typeof t.build === 'function' && !builtinToys.some(d => d.id === t.id)) builtinToys.push(t);
}
