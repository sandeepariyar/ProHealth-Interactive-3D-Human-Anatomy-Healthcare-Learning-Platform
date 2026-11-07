import { majorityStructureId, type AtlasStructure, type Vec3 } from '../data/atlas';
import { pickCandidates } from './picking';
import { canInspect,systemLayer } from '../data/inspection';
import {atlasOwner} from './atlasOwner';
import {structureGroup,type InspectionGroup} from '../data/regionalInspection';
import {attachPickingTree,raycastAtlasGeometry} from './pickingAcceleration';
import {createIsolationGeometry,type StructureSpan} from './isolationGeometry';
import type { AtlasSystem } from '../data/atlas';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heartExpansion } from './heartCycle';
import { regionForStructure, isCardiacChamber, isCerebralCore } from './regions';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import type { OrganId, SceneLayers, ShaderMode, QualityMode } from '../data/clinical';
import { makeTissueMaterial } from './shaders';
import type { FocusPose } from './anatomy';

/**
 * Z-Anatomy: REAL anatomical geometry, not a procedural stand-in.
 * All seven GLBs were exported from one Blender body and share coordinates.
 * The model data is CC BY-NC-SA 4.0 as a whole. See public/models/NOTICE.md.
 * Source: https://github.com/nqwrc/3d-anatomy
 */
export const SYSTEMS = ['skeletal','muscular','visceral','cardiovascular','nervous','joints','lymphatic'] as const;
type SystemId = typeof SYSTEMS[number];
const REMOTE = 'https://nqwrc.github.io/3d-anatomy/models';
const SECONDARY = 'https://cdn.jsdelivr.net/gh/nqwrc/3d-anatomy@master/public/models';
const SYSTEM_COLORS: Record<SystemId,[string,string]> = {
  skeletal:['#b6c1c3','#a1eced'], muscular:['#7f4352','#bda4b0'], visceral:['#bb7180','#f3b9ae'],
  cardiovascular:['#b75065','#f7b5be'], nervous:['#ad99ba','#e3cdff'],
  joints:['#9dbaa9','#a5e8e4'], lymphatic:['#528e8c','#96e5d3'],
};
function readName(object:THREE.Object3D):string {
  const names:string[]=[];
  for(let node:THREE.Object3D|null=object;node;node=node.parent){
    if(node.userData?.za_name) names.push(String(node.userData.za_name));
    if(node.name)names.push(node.name);
  }
  return names.join(' ');
}
function allowedOpacity(system:SystemId,organ:OrganId,layers:SceneLayers,mode:ShaderMode):number {
  if(!layers[systemLayer(system)])return 0;
  const isFull=organ==='body', isXray=mode==='xray';
  if(system==='muscular')return isFull?(isXray?.13:.64):.055;
  if(system==='skeletal'||system==='joints') return isFull?.73:organ==='spine'?.94:.14;
  if(system==='visceral')return isFull?.69:organ==='lungs'?.80:.22;
  if(system==='cardiovascular')return isFull?.85:organ==='heart'?.98:.42;
  if(system==='nervous')return isFull?.68:organ==='brain'?.96:.18;
  return isFull?.25:.09;
}
async function loadWithFallback(loader:GLTFLoader,system:SystemId) {
  let last:unknown;
  for(const url of [`${import.meta.env.BASE_URL}models/z-anatomy/${system}.glb`,`${REMOTE}/${system}.glb`,`${SECONDARY}/${system}.glb`]) {
    try { return await loader.loadAsync(url); }
    catch(e) {last=e;}
  }
  throw last || new Error(`No usable GLB for ${system}`);
}
export function RealAtlas({inspectionGroup,activeSystem,contextVisible,storyIds,organ,mode,layers,environment,heartbeat,motionEnabled,quality,selectedStructure,isolated,onStructureSelect,onCatalog,onSelect,onReady,onStatus,onTargets}:{
  inspectionGroup:InspectionGroup;
  activeSystem:AtlasSystem;contextVisible:boolean;storyIds:number[];
  organ:OrganId;mode:ShaderMode;layers:SceneLayers;environment:THREE.Texture;heartbeat:boolean;motionEnabled:boolean;quality:QualityMode;
  selectedStructure:AtlasStructure|null;isolated:boolean;onStructureSelect:(part:AtlasStructure)=>void;onCatalog:(parts:AtlasStructure[])=>void;
  onSelect:(o:OrganId)=>void;onReady:(ready:boolean)=>void;
  onStatus?:(message:string)=>void;onTargets?:(targets:Partial<Record<OrganId,FocusPose>>)=>void;
}) {
  const invalidate=useThree(state=>state.invalidate);
  const scene=useThree(state=>state.scene);
  const [versions,setVersions]=useState(0);
  const [loaded,setLoaded]=useState<SystemId[]>([]);
  const root=useMemo(()=>new THREE.Group(),[]);
  const materials=useMemo(()=>Object.fromEntries(SYSTEMS.map(system=>{
    const [base,rim]=SYSTEM_COLORS[system];
    const shader=makeTissueMaterial(base,rim,'tissue',1);
    shader.depthWrite=false; shader.side=THREE.FrontSide;
    return [system,shader];
  })) as Record<SystemId,THREE.ShaderMaterial>,[]);
  const parts=useRef<Array<{mesh:THREE.Mesh; system:SystemId; region:OrganId|null;group:InspectionGroup;full:THREE.BufferGeometry;low?:THREE.BufferGeometry;isolation?:{id:number;geometry:THREE.BufferGeometry}}>>([]);
  const focusParts=useRef<Array<{bounds:THREE.Box3;surface?:THREE.Vector3;surfaceWeight?:number;name:string;label:string;id:number;key:string;system:SystemId;region:OrganId|null}>>([]);
  const nextStructureId=useRef(1);
  const catalogById=useRef(new Map<number,AtlasStructure>());
  const normalized=useRef(false);
  const heartCenter=useRef(new THREE.Vector3());
  const regionMaterials=useRef<Map<string,THREE.ShaderMaterial>>(new Map());
  const updatedMaterials=useRef(new Set<THREE.ShaderMaterial>());
  const storyUniform=useMemo(()=>{const values=new Float32Array(8);values.set(storyIds.slice(0,8));return values;},[storyIds.join(',')]);

  useEffect(()=>{
    let active=true;
    const worker=new Worker(new URL('./lod.worker.ts',import.meta.url),{type:'module'});
    type Part=typeof parts.current[number];
    const queue:Part[]=[];
    let current:Part|undefined;
    const next=()=>{
      if(!active||current||!queue.length)return;
      current=queue.shift()!;
      const positions=new Float32Array(current.full.getAttribute('position').array);
      const indices=new Uint32Array(current.full.index!.array);
      worker.postMessage({id:1,positions:positions.buffer,indices:indices.buffer},[positions.buffer,indices.buffer]);
    };
    worker.onmessage=({data})=>{
      if(!active||!current)return;
      if(!data.error){
        const full=current.full;
        const low=new THREE.BufferGeometry();
        low.setAttribute('position',full.getAttribute('position'));low.setAttribute('normal',full.getAttribute('normal'));low.setAttribute('aStructureId',full.getAttribute('aStructureId'));
        low.setIndex(new THREE.BufferAttribute(new Uint32Array(data.indices),1));
        low.boundingBox=full.boundingBox?.clone()??null;low.boundingSphere=full.boundingSphere?.clone()??null;
        if(data.fullTree)attachPickingTree(full,data.fullTree);
        if(data.lowTree)attachPickingTree(low,data.lowTree);
        current.low=low;scene.userData.atlasRevision=(scene.userData.atlasRevision??0)+1;invalidate();
      }else console.warn('[ProHealth] Keeping full anatomy detail:',data.error);
      current=undefined;next();
    };
    worker.onerror=()=>{queue.length=0;current=undefined;worker.terminate();};
    const draco=new DRACOLoader();
    // npm's postinstall copies these decoders locally. No external decoder service required.
    draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
    draco.setWorkerLimit(2);
    const loader=new GLTFLoader(); loader.setDRACOLoader(draco);
    const install=async(system:SystemId)=>{
      try {
        const gltf=await loadWithFallback(loader,system);
        if(!active){gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});return;}
        const source=gltf.scene;
        source.updateWorldMatrix(true,true);
        const model=new THREE.Group();
        model.name=`Z-Anatomy / ${system}`;
        const batches=new Map<string,{geometries:THREE.BufferGeometry[];region:OrganId|null;group:InspectionGroup;ranges:Array<{start:number;end:number;name:string;structureId:number}>;triangles:number;materialKey:string}>();
        const sourceGeometry=new Set<THREE.BufferGeometry>();
        const identities=new Map<THREE.Object3D,typeof focusParts.current[number]>();
        let sourceIndex=0;
        source.traverse(object=>{
          if(!(object instanceof THREE.Mesh))return;
          // A GLTF atlas node may contain multiple primitives. Identity belongs to that
          // named node, not its sanitized child-mesh names or material fragments.
          const owner=atlasOwner(object) as THREE.Object3D;
          const name=readName(owner),region=regionForStructure(name,system);
          const label=String(owner.userData.za_name||owner.name||name);
          object.geometry.computeBoundingBox();
          const sourceBounds=object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld);
          let identity=identities.get(owner);
          if(!identity){identity={bounds:sourceBounds.clone(),name,label,id:nextStructureId.current++,key:`${system}/${sourceIndex++}`,system,region};identities.set(owner,identity);focusParts.current.push(identity);}
          else identity.bounds.union(sourceBounds);
          const id=identity.id;
          const group=structureGroup(label,region);
          const materialKey=`${system}/${region??'context'}/${group}`;
          const band=Math.floor(sourceBounds.getCenter(new THREE.Vector3()).y/.22);
          const key=`${materialKey}/band-${band}`;
          let batch=batches.get(key);
          if(!batch){batch={geometries:[],region,group,ranges:[],triangles:0,materialKey};batches.set(key,batch);}
          // Bake source transforms once. The shared root applies registration exactly once.
          const transformed=object.geometry.clone().applyMatrix4(object.matrixWorld);
          const bounds=sourceBounds,center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
          const sourcePositions=transformed.getAttribute('position');let best=Infinity;
          let surface:THREE.Vector3|undefined;
          for(let v=0;v<sourcePositions.count;v++){
            const x=sourcePositions.getX(v),y=sourcePositions.getY(v),z=sourcePositions.getZ(v);
            const score=((x-center.x)/Math.max(size.x,.001))**2+((y-center.y)/Math.max(size.y,.001))**2+.2*(bounds.max.z-z)/Math.max(size.z,.001);
            if(score<best){best=score;surface=new THREE.Vector3(x,y,z);}
          }
          const weight=size.x*size.y*size.z;
          if(!identity.surface||weight>(identity.surfaceWeight??0)){identity.surface=surface;identity.surfaceWeight=weight;}
          const geometry=new THREE.BufferGeometry();
          for(const attribute of ['position','normal']){
            const original=transformed.getAttribute(attribute);
            if(original)geometry.setAttribute(attribute,original);
          }
          geometry.setAttribute('aStructureId',new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count).fill(id),1));
          if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
          const indices=transformed.index?new Uint32Array(transformed.index.array):Uint32Array.from({length:transformed.getAttribute('position').count},(_,i)=>i);
          // Baking a mirrored node removes its negative object transform; preserve winding.
          if(object.matrixWorld.determinant()<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
          geometry.setIndex(new THREE.BufferAttribute(indices,1));
          const triangles=indices.length/3;
          const previous=batch.ranges.at(-1);
          if(previous?.structureId===id)previous.end=batch.triangles+triangles;
          else batch.ranges.push({start:batch.triangles,end:batch.triangles+triangles,name:label,structureId:id});
          batch.triangles+=triangles;
          batch.geometries.push(geometry);transformed.dispose();sourceGeometry.add(object.geometry);
        });
        for(const [key,batch] of batches){
          const geometry=mergeGeometries(batch.geometries,false);
          batch.geometries.forEach(g=>g.dispose());
          if(!geometry)throw new Error(`Could not batch ${key}`);
          let material=regionMaterials.current.get(batch.materialKey);
          if(!material){material=materials[system].clone();material.side=THREE.FrontSide;regionMaterials.current.set(batch.materialKey,material);}
          const mesh=new THREE.Mesh(geometry,material);
          // Match the shader's cardiac deformation when raycasting the displayed surface.
          const beatMatrix=new THREE.Matrix4(),originalMatrix=new THREE.Matrix4();
          mesh.raycast=function(raycaster,intersections){
            if(!this.visible||!this.userData.pickable)return;
            const beat=(this.material as THREE.ShaderMaterial).uniforms.uBeat.value as number;
            if(!beat){raycastAtlasGeometry(this,raycaster,intersections);return;}
            originalMatrix.copy(this.matrixWorld);
            const c=heartCenter.current,s=1+beat;
            beatMatrix.makeScale(s,s,s).setPosition(c.x*(1-s),c.y*(1-s),c.z*(1-s));
            this.matrixWorld.premultiply(beatMatrix);
            try{raycastAtlasGeometry(this,raycaster,intersections);}
            finally{this.matrixWorld.copy(originalMatrix);}
          };
          const rangeById=new Map<number,StructureSpan[]>();
          for(const range of batch.ranges){const spans=rangeById.get(range.structureId)??[];spans.push(range);rangeById.set(range.structureId,spans);}
          mesh.name=key;mesh.userData={prohealthSystem:system,prohealthRegion:batch.region,prohealthGroup:batch.group,structureRanges:batch.ranges,rangeById};
          geometry.computeBoundingBox();geometry.computeBoundingSphere();
          const part={mesh,system,region:batch.region,group:batch.group,full:geometry};
          model.add(mesh);parts.current.push(part);if(geometry.index!.count>3000)queue.push(part);
        }
        sourceGeometry.forEach(g=>g.dispose());next();
        root.add(model);
        scene.userData.atlasRevision=(scene.userData.atlasRevision??0)+1;
        // Skeleton supplies stable full-body registration for every other atlas system.
        if(system==='skeletal'&&!normalized.current){
          const bounds=new THREE.Box3().setFromObject(model);
          const dimensions=bounds.getSize(new THREE.Vector3());
          if(dimensions.y>0.01){
            const s=3.35/dimensions.y;
            root.scale.setScalar(s);
            root.position.set(-(bounds.min.x+bounds.max.x)*.5*s,-bounds.min.y*s,-(bounds.min.z+bounds.max.z)*.5*s);
            normalized.current=true;
          }
        }
        setVersions(x=>x+1);
        setLoaded(prev=>prev.includes(system)?prev:[...prev,system]);
      }catch(error){console.error(`[ProHealth] Unable to load real ${system} atlas`,error);}
    };
    const loading=(async()=>{
      onStatus?.('Loading real full-body anatomy · Skeleton');
      await install('skeletal');
      if(!active)return;
      // Reveal the skeleton immediately; remaining atlas systems stream in progressively.
      if(parts.current.length)onStatus?.('');
      // Two concurrent downloads reduce stalls on weaker networks.
      for (let i=1;i<SYSTEMS.length;i+=2) {
        if(!active)break;
        await Promise.all(SYSTEMS.slice(i,i+2).map(install));
      }
      if(active)onStatus?.(parts.current.length?'':'Unable to load anatomical data. Check your connection or run npm run assets:download.');
    })();
    return()=>{
      active=false;worker.terminate();
      for(const part of parts.current){part.full.boundsTree=undefined;if(part.low)part.low.boundsTree=undefined;part.full.dispose();part.low?.dispose();part.isolation?.geometry.dispose();}
      // Never terminate a worker with an outstanding decode: its promise would hang.
      void loading.finally(()=>draco.dispose());
      root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
      root.clear(); parts.current=[]; focusParts.current=[];catalogById.current.clear();nextStructureId.current=1; normalized.current=false;
      root.scale.setScalar(1); root.position.set(0,0,0);
      regionMaterials.current.forEach(m=>m.dispose());regionMaterials.current.clear();
    };
  },[root,materials,onStatus]);

  useEffect(()=>{onReady(loaded.length>0);},[loaded.length,onReady]);
  useEffect(()=>{
    if(!normalized.current||!loaded.length)return;
    root.updateWorldMatrix(true,true);
    const targets:Partial<Record<OrganId,FocusPose>>={};
    const centerFor=(region:OrganId)=>{
      const b=new THREE.Box3();
      let count=0;
      const cardiacCore=focusParts.current.filter(part=>part.region==='heart'&&isCardiacChamber(part.name,part.system));
      const cerebralCore=focusParts.current.filter(part=>part.region==='brain'&&isCerebralCore(part.name,part.system));
      for(const part of focusParts.current){
        if(part.region!==region)continue;
        if(region==='heart'&&cardiacCore.length&&!cardiacCore.includes(part))continue;
        if(region==='brain'&&(part.system!=='nervous'||cerebralCore.length&&!cerebralCore.includes(part)))continue;
        // For a spine view prefer actual vertebrae rather than broad spinal nerves.
        if(region==='spine'&&part.system!=='skeletal')continue;
        const bb=part.bounds.clone().applyMatrix4(root.matrixWorld);
        if(!bb.isEmpty()){b.union(bb);count++;}
      }
      if(!count)return;
      const center=b.getCenter(new THREE.Vector3());
      const size=b.getSize(new THREE.Vector3());
      if(region==='heart')heartCenter.current.copy(center);
      const distance=Math.max(region==='brain'?.8:region==='heart'?1.1:1.55,Math.max(size.x,size.y,size.z)*(region==='brain'?1.8:2.15));
      targets[region]={anchor:[center.x,center.y,b.max.z],target:[center.x,center.y,center.z],position:[center.x+(region==='spine'?.48:.17),center.y+.04,center.z+(region==='spine'?-distance:distance)],fov:region==='heart'?31:region==='brain'?32:35};
    };
    (['lungs','heart','brain','spine'] as const).forEach(centerFor);
    onTargets?.(targets);
    const catalog=focusParts.current.map(part=>{
      const box=part.bounds.clone().applyMatrix4(root.matrixWorld),center=box.getCenter(new THREE.Vector3());
      return {id:part.id,key:part.key,name:part.label,system:part.system,region:part.region,min:box.min.toArray() as Vec3,max:box.max.toArray() as Vec3,anchor:part.surface?.clone().applyMatrix4(root.matrixWorld).toArray() as Vec3??[center.x,center.y,box.max.z] as Vec3};
    });
    catalogById.current=new Map(catalog.map(part=>[part.id,part]));onCatalog(catalog);
  },[versions,loaded,onTargets,onCatalog,root]);

  useFrame((state,dt)=>{
    const updated=updatedMaterials.current;updated.clear();
    const desiredMode=mode==='tissue'?0:mode==='perfusion'?1:2;
    const cardiacBeat=heartbeat&&motionEnabled&&organ==='heart'&&(!selectedStructure||selectedStructure.region==='heart')?heartExpansion(state.clock.elapsedTime):0;
    const selectionPulse=motionEnabled?(.92+.08*Math.sin(state.clock.elapsedTime*2.4)):1;
    for(const part of parts.current){
      const {mesh,system,region,group}=part;
      const spans=selectedStructure?(mesh.userData.rangeById as Map<number,StructureSpan[]>).get(selectedStructure.id):undefined;
      const range=spans?.[0];
      const base=allowedOpacity(system,organ,layers,mode);
      const inspectable=canInspect(system,region,organ,activeSystem,base>0)&&(organ==='body'||inspectionGroup==='all'||group===inspectionGroup);
      mesh.geometry=quality==='balanced'&&part.low&&!range&&!isolated&&(organ==='body'||!inspectable)?part.low:part.full;
      if(isolated&&spans&&spans.length>1){
        if(part.isolation?.id!==selectedStructure!.id){part.isolation?.geometry.dispose();part.isolation={id:selectedStructure!.id,geometry:createIsolationGeometry(part.full,spans)};}
        mesh.geometry=part.isolation.geometry;
      }
      else mesh.geometry.setDrawRange(isolated&&range?range.start*3:0,isolated&&range?(range.end-range.start)*3:Infinity);
      const inIsolation=!isolated||!!range;
      // Do not spend raycast time on ghost context or disabled systems.
      mesh.userData.pickable=inIsolation&&(isolated?base>0:inspectable);
      const mat=mesh.material as THREE.ShaderMaterial;
      mesh.visible=inIsolation&&base>0&&mat.uniforms.uOpacity.value>.003;
      if(updated.has(mat))continue;
      updated.add(mat);
      mat.uniforms.uEnvironment.value=environment;
      mat.uniforms.uTime.value=state.clock.elapsedTime;
      mat.uniforms.uHeartCenter.value.copy(heartCenter.current);
      mat.uniforms.uBeat.value=region==='heart'?cardiacBeat:0;
      mat.uniforms.uSelectionPulse.value=selectionPulse;
      mat.uniforms.uMode.value=THREE.MathUtils.damp(mat.uniforms.uMode.value,desiredMode,3.1,dt);
      const selected=inspectable;
      const usefulContext=system==='muscular'||system==='skeletal'||system==='visceral';
      const ownsSelection=selectedStructure?.system===system&&selectedStructure.region===region;
      const opacity=base===0?0:ownsSelection&&selected?Math.max(base,.15):selected?1:contextVisible&&(region===organ||organ==='body'||usefulContext)?Math.min(base,.035):0;
      mat.uniforms.uFocus.value=!selectedStructure&&selected?1:0;
      mat.uniforms.uSelectedId.value=selectedStructure?.id??0;
      mat.uniforms.uStoryIds.value=storyUniform;
      mat.uniforms.uOpacity.value=THREE.MathUtils.damp(mat.uniforms.uOpacity.value,opacity,5.5,Math.min(dt,.1));
      mesh.visible=inIsolation&&base>0&&mat.uniforms.uOpacity.value>.003;
      const opaque=mode!=='xray'&&(isolated||!selectedStructure&&selected);
      if(mat.transparent===opaque){mat.transparent=!opaque;mat.needsUpdate=true;}
      mat.depthWrite=opaque;
      mat.uniforms.uGhost.value=selectedStructure||!selected?1:0;
      if(opaque&&base>0)mat.uniforms.uOpacity.value=1;
      mesh.visible=inIsolation&&base>0&&mat.uniforms.uOpacity.value>.003;
      if(Math.abs(mat.uniforms.uMode.value-desiredMode)>.002||!opaque&&base>0&&Math.abs(mat.uniforms.uOpacity.value-opacity)>.002)state.invalidate();
    }
  });
  useEffect(()=>()=>{Object.values(materials).forEach(m=>m.dispose());},[materials]);
  const handleClick=(event:ThreeEvent<MouseEvent>)=>{
    if(event.delta>8)return; // An orbit drag is not a selection tap.
    const candidates=event.intersections.map(hit=>{
      const mesh=hit.object as THREE.Mesh,mat=mesh.material as THREE.ShaderMaterial;
      const ids=mesh.geometry?.getAttribute('aStructureId'),face=hit.face;
      const id=ids&&face?majorityStructureId([ids.getX(face.a),ids.getX(face.b),ids.getX(face.c)]):null;
      return {value:hit,id,group:mesh.userData.prohealthGroup as InspectionGroup,system:mesh.userData.prohealthSystem as AtlasSystem,region:mesh.userData.prohealthRegion??null,visible:!!mesh.isMesh&&mesh.visible,
        opacity:mat.uniforms?.uOpacity?.value??0,ghost:(mat.uniforms?.uGhost?.value??1)>.5};
    });
    const hits=pickCandidates(candidates,organ,isolated?selectedStructure?.id??null:null,activeSystem,inspectionGroup);
    for(const hit of hits){
      const mesh=hit.object as THREE.Mesh,ids=mesh.geometry.getAttribute('aStructureId');
      if(!ids||!hit.face)continue;
      const id=majorityStructureId([ids.getX(hit.face.a),ids.getX(hit.face.b),ids.getX(hit.face.c)]);
      const part=id?catalogById.current.get(id):null;
      if(part){event.stopPropagation();onStructureSelect({...part,anchor:hit.point.toArray() as Vec3});return;}
    }
  };
  return <primitive object={root} onClick={handleClick}/>;
}



