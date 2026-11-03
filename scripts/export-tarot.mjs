import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
await build({entryPoints:['scripts/tarot-compositions.jsx'],outfile:'/tmp/porchlit-tarot-compositions.cjs',bundle:true,platform:'node',format:'cjs'});
const {CardArt}=await import('/tmp/porchlit-tarot-compositions.cjs');
const React=await import('react');
const {renderToStaticMarkup}=await import('react-dom/server');
const {tarotCards}=await import('../src/tarot-state.js');
await mkdir('/tmp/porchlit-tarot-vectors',{recursive:true});
for(const card of [...tarotCards,{id:'back'}]){
 await writeFile(`/tmp/porchlit-tarot-vectors/${card.id}.svg`,renderToStaticMarkup(React.createElement(CardArt,{card,back:card.id==='back'})));
}
console.log('Exported 78 compositions and card back.');
