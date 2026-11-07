/** Wall-clock easing keeps framing transitions bounded even when frames are slow. */
export function cameraProgress(start:number,now:number,duration:number){
 const x=duration<=0?1:Math.max(0,Math.min(1,(now-start)/duration));
 return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
}
