import assert from 'node:assert/strict';
import {majorityStructureId,nearbyStructures,structureGuide,structureLabel} from '../src/data/atlas.ts';
import {pickCandidates} from '../src/scene/picking.ts';
import {structureFocus} from '../src/scene/structureFocus.ts';
import {recordView,viewKey} from '../src/data/history.ts';
const hit=(value,region,id=1,extra={})=>({value,region,id,visible:true,opacity:1,ghost:false,...extra});
for(const region of ['heart','brain','lungs','spine']){
 const candidates=[hit('covering muscle',null,1,{opacity:.04,ghost:true}),hit('other organ','heart'===region?'brain':'heart',2),hit('target',region,3)];
 assert.deepEqual(pickCandidates(candidates,region,null),['target'],`${region} must never fall back to covering anatomy`);
 assert.deepEqual(pickCandidates(candidates.slice(0,2),region,null),[],'A miss must remain a miss');
 assert.deepEqual(pickCandidates([hit('hidden',region,3,{visible:false}),hit('disabled layer',region,4,{opacity:0})],region,null),[]);
}
assert.deepEqual(pickCandidates([hit('other','heart',2),hit('isolated','heart',3)],'heart',3),['isolated']);
assert.deepEqual(pickCandidates([hit('ambiguous','heart',null)],'heart',null),[]);
assert.equal(majorityStructureId([3,3,3]),3);
assert.equal(majorityStructureId([3,4,3]),3);
assert.equal(majorityStructureId([1,2,3]),null);
assert.equal(majorityStructureId([0,0,0]),null);
const part={id:3,key:'cardiovascular/3',name:'Left ventricle',system:'cardiovascular',region:'heart',min:[0,0,0],max:[1,2,1],anchor:[.5,1,1]};
assert.equal(structureGuide(part).scope,'structure');
assert.equal(structureGuide({...part,name:'Unknown vessel'}).scope,'system','Do not invent a specific function for uncurated source anatomy');
assert.equal(structureLabel({...part,name:'Middle_frontal_gyrus.l*'},s=>s),'Middle frontal gyrus · left');
assert.equal(nearbyStructures([part,{...part,id:4,key:'a',name:'A'},{...part,id:5,key:'b',name:'A'}],part,'heart').length,1);
assert.ok(structureFocus(part,.4).position[2]>structureFocus(part,2).position[2],'Portrait fit must allow for narrow width');
const view={organ:'heart',mode:'tissue',quality:'balanced',layers:{shell:true,skeleton:true,organs:true},structureKey:part.key,structureName:part.name,isolated:true};
const history=recordView([],view,1);
assert.equal(history[0].structureKey,part.key);assert.equal(history[0].isolated,true);
assert.notEqual(viewKey(view),viewKey({...view,structureKey:'another'}));
console.log('PASS: all four focused regions reject covering anatomy, hidden layers and ambiguous hits; isolation, identity, guide scope, portrait fit and structure history.');

