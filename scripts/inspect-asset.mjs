import fs from 'node:fs';
import path from 'node:path';

/** Inspect local glTF binary without any npm packages. */
const filename=process.argv[2]||'public/models/z-anatomy/skeletal.glb';
const bytes=fs.readFileSync(filename);
if(bytes.toString('ascii',0,4)!=='glTF') throw new Error(`Not a GLB: ${filename}`);
const version=bytes.readUInt32LE(4);
const declared=bytes.readUInt32LE(8);
if(declared!==bytes.length) throw new Error('GLB declared length does not equal actual length');
const jsonLength=bytes.readUInt32LE(12);
const chunkType=bytes.toString('ascii',16,20);
if(chunkType!=='JSON')throw new Error('GLB JSON chunk not found');
const gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));
const triMeshes=(gltf.meshes||[]).length;
const nodes=(gltf.nodes||[]).length;
const sceneNames=(gltf.scenes||[]).map(s=>s.name||'(unnamed scene)');
console.log(JSON.stringify({file:path.resolve(filename),bytes:bytes.length,version,meshes:triMeshes,nodes,scenes:sceneNames,materials:(gltf.materials||[]).length,sampleNodes:(gltf.nodes||[]).slice(0,15).map(n=>n.name)},null,2));
