import {Mesh,BufferGeometry,type Raycaster,type Intersection} from 'three';
import {MeshBVH,acceleratedRaycast,type SerializedBVH,type MeshBVHOptions} from 'three-mesh-bvh';
export type PickingTree=SerializedBVH&{indirectBuffer?:Uint16Array|Uint32Array|null};
/** Indirect BVHs preserve source index order and therefore anatomical draw ranges. */
export function buildPickingTree(geometry:BufferGeometry):PickingTree{
 const options:MeshBVHOptions&{indirect:boolean}={indirect:true,maxLeafTris:12};
 const tree=new MeshBVH(geometry,options);
 const data=MeshBVH.serialize(tree,{cloneBuffers:false}) as PickingTree;
 // The receiving geometry already owns its index. Do not send a redundant copy back.
 data.index=new Uint32Array(0);
 return data;
}
export function attachPickingTree(geometry:BufferGeometry,data:PickingTree){geometry.boundsTree=MeshBVH.deserialize(data,geometry,{setIndex:false});}
export function raycastAtlasGeometry(mesh:Mesh,raycaster:Raycaster,hits:Intersection[]){
 // This version's BVH query does not honor a changed drawRange. Use the original
 // exact-range path for isolated structures so hidden anatomy cannot intercept taps.
 const cast=mesh.geometry.boundsTree&&!Number.isFinite(mesh.geometry.drawRange.count)?acceleratedRaycast:Mesh.prototype.raycast;
 cast.call(mesh,raycaster,hits);
}
