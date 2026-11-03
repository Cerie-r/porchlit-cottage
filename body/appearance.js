// Colour every material, including hidden hairstyle choices and the fitted scalp.
export function applyHairColor(hairModels,base,value){
 const materials=new Set();
 for(const root of [...Object.values(hairModels),base]){
  root.traverse(o=>{if(o.isMesh){for(const material of (Array.isArray(o.material)?o.material:[o.material]))if(material?.color)materials.add(material);}});
 }
 for(const material of materials)material.color.set(value);
 return materials.size;
}
export function bindColorInput(input,onColor){
 const update=()=>onColor(input.value);
 input.addEventListener('input',update);
 input.addEventListener('change',update);
 return update;
}
