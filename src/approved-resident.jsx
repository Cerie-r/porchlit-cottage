import React,{useEffect,useState} from 'react';
import {useThree} from '@react-three/fiber';
import {createApprovedAvatar,disposeAvatar} from '../body/avatar-model.js';
import {cleanWardrobe,readWardrobe} from '../body/wardrobe-state.js';
export function ApprovedResident({kind='girl',wardrobe}){const [root,setRoot]=useState(null),invalidate=useThree(s=>s.invalidate);const look=cleanWardrobe(wardrobe||readWardrobe())[kind];const signature=JSON.stringify(look);
 useEffect(()=>{let alive=true,object;setRoot(null);createApprovedAvatar(kind,look).then(o=>{if(!alive){disposeAvatar(o);return;}object=o;setRoot(o);invalidate();}).catch(e=>console.error('Avatar unavailable',e));return()=>{alive=false;if(object)disposeAvatar(object);};},[kind,signature,invalidate]);return root?<primitive object={root}/>:null;}
