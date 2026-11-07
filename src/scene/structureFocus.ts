import type {AtlasStructure} from '../data/atlas';
import type {FocusPose} from './anatomy';
/** Fit original registered bounds with comfortable touch-view margins. */
export function structureFocus(part:AtlasStructure,aspect:number):FocusPose{
 const center=part.min.map((v,i)=>(v+part.max[i])/2) as [number,number,number];
 const size=part.max.map((v,i)=>Math.max(.001,v-part.min[i]));
 const distance=Math.max(.08,Math.max(size[1],size[0]/Math.max(.4,aspect))/(2*Math.tan(35*Math.PI/360))*1.5+size[2]*.55);
 return {target:center,anchor:part.anchor,position:[center[0]+distance*.12,center[1]+distance*.04,center[2]+distance],fov:35};
}
