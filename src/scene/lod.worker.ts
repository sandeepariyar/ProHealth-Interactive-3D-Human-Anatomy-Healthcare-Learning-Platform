import { MeshoptSimplifier } from 'meshoptimizer/simplifier';
import {BufferGeometry,BufferAttribute} from 'three';
import {buildPickingTree} from './pickingAcceleration';
const scope=self as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage:(value:unknown,transfer:Transferable[])=>void};
scope.onmessage=async({data})=>{
  try{
    await MeshoptSimplifier.ready;
    const indices=new Uint32Array(data.indices),positions=new Float32Array(data.positions);
    const target=Math.max(12,Math.floor(indices.length*.18/3)*3);
    const [result]=MeshoptSimplifier.simplify(indices,positions,3,target,.015,['LockBorder']);
    const full=new BufferGeometry();full.setAttribute('position',new BufferAttribute(positions,3));full.setIndex(new BufferAttribute(indices,1));
    const low=new BufferGeometry();low.setAttribute('position',full.getAttribute('position'));low.setIndex(new BufferAttribute(result,1));
    const fullTree=buildPickingTree(full),lowTree=buildPickingTree(low);
    const transfer:Transferable[]=[result.buffer,...fullTree.roots,...lowTree.roots];
    if(fullTree.indirectBuffer)transfer.push(fullTree.indirectBuffer.buffer);
    if(lowTree.indirectBuffer)transfer.push(lowTree.indirectBuffer.buffer);
    scope.postMessage({id:data.id,indices:result.buffer,fullTree,lowTree},transfer);
  }catch(error){scope.postMessage({id:data.id,error:String(error)},[]);}
};
