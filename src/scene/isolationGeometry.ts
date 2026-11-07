import {BufferGeometry,BufferAttribute} from 'three';
export type StructureSpan={start:number;end:number;structureId:number};
/** Retain every selected primitive even when another structure separates its ranges. */
export function createIsolationGeometry(full:BufferGeometry,spans:StructureSpan[]){
 const geometry=new BufferGeometry();
 for(const [name,attribute] of Object.entries(full.attributes))geometry.setAttribute(name,attribute);
 const count=spans.reduce((sum,span)=>sum+(span.end-span.start)*3,0),indices=new Uint32Array(count);
 const source=full.index!.array;let offset=0;
 for(const span of spans){const slice=source.subarray(span.start*3,span.end*3);indices.set(slice,offset);offset+=slice.length;}
 geometry.setIndex(new BufferAttribute(indices,1));
 geometry.boundingBox=full.boundingBox?.clone()??null;geometry.boundingSphere=full.boundingSphere?.clone()??null;
 return geometry;
}
