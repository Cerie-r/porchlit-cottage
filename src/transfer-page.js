import './compat.js';
import {exportHome,parseHome,importHome,downloadHome} from './home-transfer.js';
const $=id=>document.getElementById(id);let pending;
$('export').onclick=()=>{try{const doc=exportHome(localStorage);if(!Object.keys(doc.entries).length)throw Error('这个网址下还没有存档，请在原来的小屋网址导出');downloadHome(doc);$('status').textContent='搬家箱已下载。';}catch(e){$('status').textContent=e.message;}};
$('file').onchange=async()=>{pending=null;$('import').disabled=true;try{const file=$('file').files[0];if(!file)return;if(file.size>20*1024*1024)throw Error('存档过大');pending=parseHome(await file.text());$('preview').textContent='已读到 '+Object.keys(pending.entries).length+' 项小屋记录。';$('import').disabled=false;}catch(e){$('status').textContent=e.message;}};
$('import').onclick=()=>{try{const old=exportHome(localStorage);if(Object.keys(old.entries).length)downloadHome(old);importHome(localStorage,pending);pending=null;$('import').disabled=true;$('status').textContent='已经搬好了，点「回家」看看。';}catch(e){$('status').textContent=e.message;}};
