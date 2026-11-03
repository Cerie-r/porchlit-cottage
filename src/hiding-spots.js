// Stable semantic IDs: independent of furniture world coordinates and camera angle.
export const spotDefinitions={
 'hide:livingWindow':['living.curtain',['左帘后侧','右帘后侧','左帘内侧','右帘内侧']],
 'hide:bedroomWindow':['bedroom.curtain',['左帘后侧','右帘后侧','左帘内侧','右帘内侧']],
 'hide:coffeeTable':['living.coffee-table',['桌面左后','桌面右后','桌面左前','桌面右前']],
 'hide:bedroomBench':['bedroom.bench',['凳内左后','凳内右后','凳内左前','凳内右前']],
 'hide:bedroomChair':['bedroom.chair',['坐垫左后','坐垫右后','坐垫左前','坐垫右前']],
 'hide:rug':['living.rug',['左毯角内侧','右毯角内侧','左毯角外侧','右毯角外侧']],
 'hide:studyShelf':['study.bookcase',['第一层书后','第二层书后','第三层书后','第四层书后','背板左袋','背板右袋']],
 'hide:studyRug':['study.rug',['左毯角内侧','右毯角内侧','左毯角外侧','右毯角外侧']],
 'hide:bedroomRug':['bedroom.rug',['左毯角内侧','右毯角内侧','左毯角外侧','右毯角外侧']],
 'hide:sofa':['living.sofa',['左坐垫后侧','右坐垫后侧','左坐垫前侧','右坐垫前侧']],
 'hide:bedroomBed':['bedroom.bed',['左枕头下面','右枕头下面','被角左侧','被角右侧']],
 'hide:bedroomWardrobe':['bedroom.wardrobe',['左层板后侧','右层板后侧','左层板前侧','右层板前侧']],
 'hide:studyDesk':['study.desk',['抽屉左后','抽屉右后','抽屉左前','抽屉右前']],
 'hide:bedroomKeepsake':['bedroom.keepsake',['盒内左后','盒内右后','盒内左前','盒内右前']],
 'hide:bedroomNightstand':['bedroom.nightstand',['上抽屉左后','上抽屉右后','上抽屉左前','上抽屉右前','下抽屉左后','下抽屉右后','下抽屉左前','下抽屉右前']],
 'hide:bedroomVanity':['hide:bedroomVanity',['首饰盒左后','首饰盒右后','首饰盒左前','首饰盒右前','左抽屉左后','左抽屉右后','左抽屉左前','左抽屉右前','右抽屉左后','右抽屉右后','右抽屉左前','右抽屉右前']],
 'hide:armchair':['living.armchair',['坐垫左后','坐垫右后','坐垫左前','坐垫右前']],
 'hide:studyReading':['study.reading-chair',['坐垫左后','坐垫右后','坐垫左前','坐垫右前']],
 'hide:greenBook':['living.green-book',['封面内左后','封面内右后','封面内左前','封面内右前']],
 'hide:roseBook':['living.rose-book',['封面内左后','封面内右后','封面内左前','封面内右前']],
 'hide:livingBasket':['living.basket',['折毯下左后','折毯下右后','折毯下左前','折毯下右前']],
};
for(let i=0;i<7;i++)spotDefinitions['hide:studyBox'+i]=['study.box-'+(i+1),['盒内左后','盒内右后','盒内左前','盒内右前']];
export function spotsFor(location){const [prefix,labels]=spotDefinitions[location]||[location,['左后','右后','左前','右前']];return labels.map((label,slot)=>({id:prefix+'.'+(location==='hide:studyShelf'?'shelf-':'slot-')+(slot+1),label,location,slot,accepts:['note','photo','small-object']}));}
export const hidingSpotCatalog=Object.keys(spotDefinitions).flatMap(spotsFor);
export function placeLetter(items,{id,note,spotId,location}){const spot=(location?spotsFor(location):hidingSpotCatalog).find(s=>s.id===spotId);if(!spot)throw Error('找不到这个藏点。');if(!note?.trim())throw Error('先写一点内容。');if(note.length>2000)throw Error('信最多 2000 字。');if(items.some(i=>i.location===spot.location&&i.slot===spot.slot))throw Error('这个位置已经放着东西了。');return [...items,{id,kind:'note',name:'一封信',note:note.trim(),location:spot.location,slot:spot.slot,spotId:spot.id}];}
export function migrateLetters(saved){const result=structuredClone(saved),items=result.creations=Array.isArray(result.creations)?result.creations:[];const move=(location,gift,clear)=>{if(!gift?.note)return;const id='legacy-letter:'+location;if(!items.some(i=>i.id===id)){const preferred=[1,0,2,3].find(n=>!items.some(i=>i.location===location&&i.slot===n));items.push({id,kind:'note',name:'一封信',note:gift.note,location:preferred===undefined?'bag':location,slot:preferred??0,...(preferred===undefined?{}:{spotId:spotsFor(location)[preferred].id})});}clear();};for(const [location,c] of Object.entries(result.containers||{})){if(c?.gift)move(location,c.gift,()=>{c.gift=null;});}for(const [side,gift] of Object.entries(result.containers?.tvUnit?.slots||{}))move('tv:'+side,gift,()=>{result.containers.tvUnit.slots[side]=null;});return result;}
