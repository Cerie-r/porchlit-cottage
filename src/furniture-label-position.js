import * as T from 'three';
export function furnitureLabelPosition(anchor,localPoint,camera,rect,width,height){
 anchor.updateWorldMatrix(true,false);
 const p=new T.Vector3(...localPoint).applyMatrix4(anchor.matrixWorld).project(camera);
 if(p.z<-1||p.z>1)return null;
 const half=Math.min(width/2,rect.width/2-12);
 return {x:Math.max(rect.left+half+10,Math.min(rect.right-half-10,rect.left+(p.x+1)*rect.width/2)),y:Math.max(rect.top+height+12,Math.min(rect.bottom-20,rect.top+(1-p.y)*rect.height/2))};
}
