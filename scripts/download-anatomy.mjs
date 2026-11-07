/**
 * Fetch the real, aligned Z-Anatomy atlas. Runs automatically after npm install.
 * Data licence: CC BY-NC-SA 4.0 as distributed. See public/models/NOTICE.md.
 * Upstream repo: https://github.com/nqwrc/3d-anatomy
 * This script never generates a procedural anatomical substitute.
 */
import { mkdir, readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dst=resolve(root,'public/models/z-anatomy');
const decoderDst=resolve(root,'public/draco');
const sources=[
  'https://raw.githubusercontent.com/nqwrc/3d-anatomy/master/public/models',
  'https://nqwrc.github.io/3d-anatomy/models',
  'https://cdn.jsdelivr.net/gh/nqwrc/3d-anatomy@master/public/models'
];
const systems=['skeletal','muscular','visceral','cardiovascular','nervous','joints','lymphatic'];
const args=new Set(process.argv.slice(2));
const expectedSha={skeletal:'73a8ace5eb2ada06d0253e192679cab9d5cd4e6f',muscular:'06d2b6dbf47d5f4c8cce75e109703407cdfc9d6b',visceral:'ad8d2cfba5a90dd2ef51f6208b8cc254e91ab302',cardiovascular:'47142234777592720c175bf466ba38d60d8ecee9',nervous:'115402de4700658ea0cadb1d9749fa1d145e6397',joints:'a20651f8f3e550ae8ee51365f147c09da4f80080',lymphatic:'b8aed41ff4e735fd0f59d972dfb83edeed888c28'};
function shaMatches(buf,system){const blob=createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');return blob===expectedSha[system];}
function validGlb(buf){return buf.byteLength>1024 && buf.subarray(0,4).toString('ascii')==='glTF' && buf.readUInt32LE(4)===2 && buf.readUInt32LE(8)===buf.length;}
async function fetchOne(system){
  const file=resolve(dst,`${system}.glb`);
  if(existsSync(file)){
    const data=await readFile(file);
    if(validGlb(data)&&shaMatches(data,system)){console.log(`✓ ${system} verified (${(data.length/1048576).toFixed(1)} MB)`);return true;}
  }
  if(args.has('--verify')){console.error(`✗ ${system}: not cached`);return false;}
  for(const base of sources){
    try{
      const response=await fetch(`${base}/${system}.glb`,{signal:AbortSignal.timeout(65000)});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const buf=Buffer.from(await response.arrayBuffer());
      if(!validGlb(buf)||!shaMatches(buf,system))throw new Error('GLB or pinned Git blob SHA mismatch');
      await mkdir(dst,{recursive:true});
      const temp=file+'.tmp';await writeFile(temp,buf);await rename(temp,file);
      console.log(`✓ ${system}.glb ${(buf.length/1048576).toFixed(1)} MB`);
      return true;
    }catch(error){console.warn(`  ${base.split('/')[2]}: ${String(error.message||error)}`);}
  }
  console.error(`✗ ${system} could not be downloaded`);
  return false;
}
async function copyDraco(){
  const source=resolve(root,'node_modules/three/examples/jsm/libs/draco');
  try{
    await mkdir(decoderDst,{recursive:true});
    for (const name of ['draco_decoder.wasm','draco_wasm_wrapper.js','draco_decoder.js']){
      const target=resolve(decoderDst,name);
      if(!existsSync(target)) await copyFile(resolve(source,name),target);
    }
    console.log('✓ Local Draco decoders installed');
  }catch(error){console.warn('Draco decoder copy skipped:',error.message);}
}
await copyDraco();
await mkdir(dst,{recursive:true});
// Downloads in two concurrent lanes to avoid overwhelming static hosts.
let success=0;
for(let i=0;i<systems.length;i+=2){
  const statuses=await Promise.all(systems.slice(i,i+2).map(fetchOne));
  success+=statuses.filter(Boolean).length;
}
console.log(`Anatomy assets ready: ${success}/${systems.length}.`);
if(success!==systems.length){
  console.warn('Local atlas incomplete. The application also attempts browser-hosted atlas URLs at runtime.');
  if(args.has('--verify'))process.exitCode=1;
}
