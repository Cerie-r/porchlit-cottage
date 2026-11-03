import {cleanDecor} from './legacy-finishes.js';
import React,{createContext,useContext,useEffect,useState} from 'react';
import {decorValue} from './decor-state.js';
const DecorState=createContext({state:{},committed:{}}),Owner=createContext('');
export function DecorationProvider({children}){
 const [committed,setCommitted]=useState(()=>{try{return cleanDecor(JSON.parse(localStorage.getItem('porchlit-decoration-v1'))||{values:{},locks:{}});}catch{return {values:{},locks:{}};}}),[draft,setDraft]=useState(null),[past,setPast]=useState(null),[error,setError]=useState('');
 useEffect(()=>{try{localStorage.setItem('porchlit-decoration-v1',JSON.stringify(committed));setError('');}catch{setError('没有保存成功，请先别关闭页面。');}},[committed]);
 const api={state:draft??committed,committed,draft,error,setDraft,begin:()=>setDraft(structuredClone(committed)),cancel:()=>setDraft(null),commit:()=>{if(draft){setPast(committed);setCommitted(draft);setDraft(null);}},
  // What an AI living here changed (src/machine-decor.js), kept as she keeps hers; one step back undoes it.
  replace:next=>{setPast(committed);setCommitted(cleanDecor(next));setDraft(null);},undo:()=>{if(past){setCommitted(past);setPast(null);setDraft(null);}},canUndo:!!past};
 return <DecorState.Provider value={api}>{children}</DecorState.Provider>;
}
export const useDecoration=()=>useContext(DecorState);
export function MaterialOwner({id,children}){return <Owner.Provider value={id}>{children}</Owner.Provider>;}
export function useDecorValue(part,fallback,explicitOwner){const owner=useContext(Owner),{state}=useDecoration();return part?decorValue(state,explicitOwner||owner,part,fallback):fallback;}
export function DecorMaterial({role,color,...props}){const chosen=useDecorValue(role,null),tint=chosen??color;return <meshStandardMaterial color={tint} userData={{decorRole:role,decorManaged:chosen!==null}} {...props}/>;}
