import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildPickingTree,attachPickingTree,raycastAtlasGeometry} from '../src/scene/pickingAcceleration.ts';
import {createIsolationGeometry} from '../src/scene/isolationGeometry.ts';

const pieces=[-1.4,1.4].map((x,i)=>{const g=new THREE.TorusKnotGeometry(.75,.22,400,64);g.translate(x,0,0);g.setAttribute('aStructureId',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(i+1),1));return g;});
const geometry=mergeGeometries(pieces,false);pieces.forEach(p=>p.dispose());
const originalIndex=geometry.index.array.slice(),originalPositions=geometry.attributes.position.array.slice();
const tree=buildPickingTree(geometry);
assert.deepEqual(geometry.index.array,originalIndex,'Building the spatial index must preserve source triangle ordering');
attachPickingTree(geometry,structuredClone(tree));
assert.deepEqual(geometry.index.array,originalIndex,'Deserialization must retain the receiving source index');
assert.deepEqual(geometry.attributes.position.array,originalPositions,'Acceleration must not change geometry or visual detail');
const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());mesh.updateMatrixWorld(true);
const rays=Array.from({length:120},(_,i)=>new THREE.Raycaster(new THREE.Vector3(-2.5+5*i/119,Math.sin(i*.31)*.5,4),new THREE.Vector3(0,0,-1)));
const normal=ray=>{const hits=[];THREE.Mesh.prototype.raycast.call(mesh,ray,hits);return hits.sort((a,b)=>a.distance-b.distance)[0];};
const fast=ray=>{const hits=[];ray.firstHitOnly=true;raycastAtlasGeometry(mesh,ray,hits);return hits.sort((a,b)=>a.distance-b.distance)[0];};
let confirmed=0;
for(const ray of rays){const a=normal(ray),b=fast(ray);assert.equal(!!b,!!a);if(a&&b){assert.ok(Math.abs(a.distance-b.distance)<1e-6);assert.deepEqual(b.face,a.face,'Exact source triangle identities must survive acceleration');confirmed++;}}
assert.ok(confirmed>50);
geometry.setDrawRange(0,96);
for(const ray of rays.slice(0,20)){const a=normal(ray),b=fast(ray);assert.equal(!!b,!!a);if(a&&b)assert.ok(Math.abs(a.distance-b.distance)<1e-6);}
geometry.setDrawRange(0,Infinity);
const measure=fn=>{const start=performance.now();for(const ray of rays)fn(ray);return performance.now()-start;};
// Controlled synthetic benchmark: demonstrates picking cost, not whole-app FPS.
measure(fast);const plainMs=measure(normal),acceleratedMs=measure(fast);
const source=new THREE.BufferGeometry();source.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0,2,0,0,3,0,0,2,1,0,4,0,0,5,0,0,4,1,0],3));source.setIndex([0,1,2,3,4,5,6,7,8]);
const isolated=createIsolationGeometry(source,[{start:0,end:1,structureId:1},{start:2,end:3,structureId:1}]);
assert.deepEqual(Array.from(isolated.index.array),[0,1,2,6,7,8],'Non-adjacent primitives must all remain isolated without intervening anatomy');
assert.equal(isolated.attributes.position,source.attributes.position,'Isolation must share immutable vertex data rather than copying a whole body');
const isolatedMesh=new THREE.Mesh(isolated,new THREE.MeshBasicMaterial());isolatedMesh.updateMatrixWorld(true);
for(const [x,expected] of [[.2,true],[2.2,false],[4.2,true]]){const hits=[];raycastAtlasGeometry(isolatedMesh,new THREE.Raycaster(new THREE.Vector3(x,.2,1),new THREE.Vector3(0,0,-1)),hits);assert.equal(!!hits.length,expected);}
console.log(JSON.stringify({test:'picking-benchmark',triangles:geometry.index.count/3,rays:rays.length,plainMs:+plainMs.toFixed(2),acceleratedMs:+acceleratedMs.toFixed(2),speedup:+(plainMs/acceleratedMs).toFixed(1)}));
console.log('PASS: identical geometry, index ordering and source triangle hits; finite draw ranges; complete multi-primitive isolation.');
