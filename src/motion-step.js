export function motionStep(value,target,delta,speed=10){
 if(Math.abs(value-target)<.0001)return target;
 const next=value+(target-value)*(1-Math.exp(-Math.min(delta,.05)*speed));
 return Math.abs(next-target)<.0001?target:next;
}
