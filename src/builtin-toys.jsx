import React,{useMemo,useEffect} from 'react';
import {AnimalModel} from './animal-model.jsx';
import {freshAnimal} from './animal-state.js';
import {addBuiltinToys,bedBear,builtinToys} from './builtin-toy-state.js';
export {builtinToys};
export const withBuiltinToys=items=>addBuiltinToys(items,builtinToys);
function PrivateToy({definition}){
 const object=useMemo(()=>definition.build(),[definition]);
 useEffect(()=>()=>definition.dispose(object),[definition,object]);
 return <primitive object={object}/>;
}
// CreationModel units are 1/.12 room units; preserve the old models' exact size.
export function BuiltinToyModel({item,onClick}){
 const definition=builtinToys.find(d=>d.id===item.toy);
 if(!definition)return null;
 return <group onClick={onClick} scale={definition.scale/.12} userData={{tintExclude:true}}>{definition===bedBear?<AnimalModel item={{...freshAnimal(),fur:'#b89477',accessory:'none',accent:'#ad8b97'}}/>:<PrivateToy definition={definition}/>}</group>;
}
