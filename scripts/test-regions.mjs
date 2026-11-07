import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {regionForStructure,isCardiacChamber,isCerebralCore} from '../src/scene/regions.ts';
assert.equal(regionForStructure('Lateral ventricle.l','nervous'),'brain');
assert.equal(regionForStructure('Fourth ventricle','nervous'),'brain');
assert.equal(regionForStructure('Right ventricle','cardiovascular'),'heart');
assert.equal(regionForStructure('Left atrium','cardiovascular'),'heart');
assert.equal(regionForStructure('Left coronary artery','cardiovascular'),'heart');
assert.equal(isCardiacChamber('Lateral ventricle.l','nervous'),false);
assert.equal(isCardiacChamber('Left ventricle','cardiovascular'),true);
for(const system of ['nervous','cardiovascular']){
 const bytes=readFileSync(new URL(`../public/models/z-anatomy/${system}.glb`,import.meta.url));
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 const hearts=gltf.nodes.filter(n=>regionForStructure(n.name||'',system)==='heart');
 assert.equal(system==='nervous'?hearts.length===0:hearts.length>0,true);
 console.log(`${system}: ${hearts.length} cardiac structures`);
}
console.log('PASS: cerebral ventricles excluded; cardiac chambers retained.');

for(const name of ['Anterior spinothalamic tract','Lateral spinothalamic tract','Anterior spinocerebellar tract','Posterior spinocerebellar tract']){
 assert.equal(regionForStructure(name,'nervous'),null,`${name} must not pull brain focus into the spine`);
 assert.equal(isCerebralCore(name,'nervous'),false);
}
assert.equal(regionForStructure('Middle frontal gyrus.l','nervous'),'brain');
assert.equal(isCerebralCore('White matter of telencephalon.l','nervous'),true);
const brainBytes=readFileSync(new URL('../public/models/z-anatomy/nervous.glb',import.meta.url));
const brainJson=JSON.parse(brainBytes.subarray(20,20+brainBytes.readUInt32LE(12)).toString());
assert.equal(brainJson.nodes.filter(n=>isCerebralCore(n.name||'','nervous')).length,2,'Both cerebral hemisphere cores must exist in the actual atlas');
console.log('PASS: brain framing uses cerebral hemispheres, excludes long spinal tracts and includes cortical gyri.');
