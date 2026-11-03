import {SurfaceScope} from './surfaces.jsx';
import {FurnitureTint} from './furniture-tint.jsx';
import React,{createContext,useContext} from 'react';
export const UpstairsContext=createContext({});
export const upstairsItems={studyDesk:['书桌抽屉', 'study-desk'],studyPrinter:['打印柜','study-printer'],studyShelf:['书架','study-shelf'],studyReading:['阅读椅 · 坐垫下','study-reading'],studyCraft:['拼搭台','study-workbench'],studyComputer:['电脑','study-computer'],studyPrintPreview:['打印机','study-print-preview'],studyRug:['书房地毯','study-rug'],studyFrame1:['植物画 · 背面','frame'],studyFrame2:['植物画 · 背面','frame'],bedroomBed:['床铺 · 枕头下','bedroom-bed'],bedroomWardrobe:['衣柜','bedroom-wardrobe'],bedroomVanity:['梳妆台','bedroom-vanity'],bedroomRug:['卧室地毯','study-rug'],bedroomFrame:['卧室画框','frame'],bedroomNightstand:['床头柜','bedroom-nightstand']};
Object.assign(upstairsItems,{bedroomFigure:['帽子小人摆件','diorama-figure'],livingBasket:['编织篮','diorama-basket'],kitchenRail:['厨房挂杆','diorama-herbs'],bedroomSlippers:['床边拖鞋','diorama-slippers'],bedroomKeepsake:['纪念匣','diorama-keepsake'],studyPinboard:['照片与便笺板','diorama-pinboard']});
for(let i=0;i<7;i++)upstairsItems['studyBox'+i]=['书房收纳盒 '+(i+1),'study-box'];
// The tailor's corner beside the craft bench: the sewing table and the dress form move as one.
Object.assign(upstairsItems,{studyTailor:['小裁缝','study-tailor']});
Object.assign(upstairsItems,{bedroomBench:['床尾收纳凳','bedroom-bench'],bedroomChair:['卧室阅读椅','bedroom-chair'],bedroomSideTable:['阅读角小茶桌','bedroom-table'],bedroomShelf:['卧室层架','bedroom-shelf']});
// inherit: something that used to be drawn as part of the piece under it keeps
// that piece's finish until it is given one of its own.
export function UpstairsItem({id,pivot=[0,0,0],inherit=false,children}){const c=useContext(UpstairsContext),v=c.furniture?.[id]||{position:[0,0,0],rotationY:0};return <group userData={{cameraPlace:id}} position={pivot.map((n,i)=>n+v.position[i])} rotation={[0,v.rotationY,0]} onClick={e=>{if(e.delta>5)return;e.stopPropagation();c.decorMode?c.onSelect(id):c.onStorage('hide:'+id);}}><group position={pivot.map(n=>-n)}><SurfaceScope id={id}>{inherit&&!v.color?children:<FurnitureTint color={v.color}>{children}</FurnitureTint>}</SurfaceScope></group></group>;}
export function UpstairsHotspot({id,pivot=[0,0,0],children}){const c=useContext(UpstairsContext);if(id.startsWith("studyBox"))return <UpstairsItem id={id} pivot={pivot}>{children}</UpstairsItem>;return <group onClick={e=>{e.stopPropagation();if(e.delta<5)c.decorMode?c.onSelect(id):c.onStorage('hide:'+id);}}>{children}</group>;}
