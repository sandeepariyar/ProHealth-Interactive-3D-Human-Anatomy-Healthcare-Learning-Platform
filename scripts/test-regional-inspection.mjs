import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGION_GROUPS,structureGroup,matchesInspectionGroup,regionalLandmarks} from '../src/data/regionalInspection.ts';
import {regionForStructure} from '../src/scene/regions.ts';
import {pickCandidates} from '../src/scene/picking.ts';
import {viewKey,recordView} from '../src/data/history.ts';
let catalog=[];
for(const system of ['skeletal','visceral','cardiovascular','nervous']){
 const b=readFileSync(new URL(`../public/models/z-anatomy/${system}.glb`,import.meta.url));
 const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
 catalog.push(...gltf.nodes.filter(n=>n.mesh!==undefined).map((n,i)=>{const name=n.extras?.za_name||n.name;return {id:catalog.length+i+1,key:`${system}/${i}`,name,system,region:regionForStructure(name,system),min:[0,0,0],max:[1,1,1],anchor:[.5,.5,1]};}));
}
for(const organ of ['lungs','heart','brain','spine']){
 for(const choice of REGION_GROUPS[organ]){
  const eligible=catalog.filter(p=>matchesInspectionGroup(p,organ,choice.id));
  assert.ok(eligible.length,`${organ}/${choice.id} must correspond to real source anatomy`);
  const landmarks=regionalLandmarks(catalog,organ,choice.id);
  assert.ok(landmarks.length,`${organ}/${choice.id} must resolve a source-backed landmark`);
  assert.ok(landmarks.every(p=>matchesInspectionGroup(p,organ,choice.id)));
  const hits=catalog.filter(p=>p.region===organ).map(p=>({value:p,region:p.region,group:structureGroup(p.name,p.region),system:p.system,id:p.id,visible:true,opacity:1,ghost:false}));
  assert.ok(pickCandidates(hits,organ,null,undefined,choice.id).every(p=>matchesInspectionGroup(p,organ,choice.id)),'Picking and the visible group must use the same rule');
  console.log(`${organ}/${choice.id}: ${eligible.length} source structures`);
 }
}
assert.deepEqual(pickCandidates([{value:'lung surface',id:1,region:'lungs',group:'lobes',visible:true,opacity:1,ghost:false}], 'lungs',null,'visceral','airways'),[],'Airway inspection must not fall back to the covering lung surface');
const view={organ:'lungs',mode:'tissue',quality:'balanced',layers:{shell:true,skeleton:true,organs:true},inspectionGroup:'airways'};
assert.notEqual(viewKey(view),viewKey({...view,inspectionGroup:'lobes'}));
assert.equal(recordView([],view,1)[0].inspectionGroup,'airways');
console.log('PASS: contextual controls, source membership, regional landmarks, covering-surface rejection and history group restoration.');
