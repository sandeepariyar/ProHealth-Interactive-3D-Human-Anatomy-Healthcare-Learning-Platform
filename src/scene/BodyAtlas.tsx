import { structureFocus } from './structureFocus';
import { structureLabel, type AtlasStructure } from '../data/atlas';
import { HeartCycleOverlay } from './HeartCycleOverlay';
import { createStudioSky } from './studioSky';
import { PreferencesContext, useText } from '../i18n';
import React, { useCallback, useState } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei/core/OrbitControls.js';
import * as THREE from 'three';
import {cameraProgress} from './cameraTransition';
import type { OrganId, SceneLayers, ShaderMode, QualityMode } from '../data/clinical';
import { FOCUS, type FocusPose } from './anatomy';
import { RealAtlas } from './RealAtlas';
import {InspectionProjector} from './InspectionProjector';
import type {InspectionElements} from './InspectionOverlay';
import type {AtlasSystem} from '../data/atlas';
import type {InspectionGroup} from '../data/regionalInspection';

export type SceneProps={
  inspectionGroup:InspectionGroup;onInteraction:(active:boolean)=>void;
  overlayElements:InspectionElements;activeSystem:AtlasSystem;contextVisible:boolean;catalog:AtlasStructure[];landmarks:boolean;storyIds:number[];storyParts:AtlasStructure[];onFocus:()=>void;onIsolate:()=>void;onInfo:()=>void;
  selectedStructure:AtlasStructure|null;focusedStructure:AtlasStructure|null;isolated:boolean;onStructureSelect:(part:AtlasStructure)=>void;onCatalog:(parts:AtlasStructure[])=>void;
  focusRevision:number;quality:QualityMode;organ:OrganId;mode:ShaderMode;layers:SceneLayers;motionEnabled:boolean;showLabels?:boolean;heartbeat:boolean;
  onSelect:(organ:OrganId)=>void;onAtlasStatus?:(status:string)=>void;
};
function CameraDirector({onInteraction,organ,motionEnabled,targets,focusRevision,focusedStructure}:{onInteraction:(active:boolean)=>void;focusedStructure:AtlasStructure|null;focusRevision:number;organ:OrganId;motionEnabled:boolean;targets:Partial<Record<OrganId,FocusPose>>}){
  const {camera,invalidate,size,gl}=useThree();
  const controls=React.useRef<any>(null);
  const base=React.useMemo(()=>new THREE.Vector3(0,1.57,0),[]);
  const transition=React.useRef<{start:number;position:THREE.Vector3;target:THREE.Vector3;fov:number}|null>(null);
  const destination=focusedStructure?structureFocus(focusedStructure,size.width/size.height):targets[organ]??FOCUS[organ];
  React.useEffect(()=>{
    gl.domElement.dataset.focusPose=JSON.stringify({organ,...destination});
    transition.current={start:performance.now(),position:camera.position.clone(),target:(controls.current?.target??base).clone(),fov:camera instanceof THREE.PerspectiveCamera?camera.fov:35};
    invalidate();
    return()=>{transition.current=null;};
  },[camera,organ,motionEnabled,base,focusRevision,destination.position[0],destination.position[1],destination.position[2],destination.target[0],destination.target[1],destination.target[2],destination.fov]);
  useFrame(()=>{
    const moving=transition.current;if(!moving)return;
    const progress=cameraProgress(moving.start,performance.now(),motionEnabled?1250:0);
    camera.position.copy(moving.position).lerp(new THREE.Vector3(...destination.position),progress);
    controls.current?.target.copy(moving.target).lerp(new THREE.Vector3(...destination.target),progress);
    if(camera instanceof THREE.PerspectiveCamera){camera.fov=THREE.MathUtils.lerp(moving.fov,destination.fov,progress);camera.updateProjectionMatrix();}
    controls.current?.update();
    if(progress>=1)transition.current=null;else invalidate();
  });
  return <OrbitControls makeDefault ref={controls} onStart={()=>{transition.current=null;onInteraction(true);}} onEnd={()=>onInteraction(false)} minDistance={.05} maxDistance={10} enablePan={false} enableDamping dampingFactor={.075}/>;
}
export function BodyAtlas({inspectionGroup,onInteraction,overlayElements,activeSystem,contextVisible,catalog,landmarks,storyIds,storyParts,onFocus,onIsolate,onInfo,selectedStructure,focusedStructure,isolated,onStructureSelect,onCatalog,focusRevision,quality,organ,mode,layers,motionEnabled,onSelect,onAtlasStatus,showLabels,heartbeat}:SceneProps){
  const t=useText();
  const {theme}=React.useContext(PreferencesContext);
  const light=theme==='light';
  const sky=React.useMemo(()=>createStudioSky(theme),[theme]);
  React.useEffect(()=>()=>sky.dispose(),[sky]);
  const [targets,setTargets]=useState<Partial<Record<OrganId,FocusPose>>>({});
  const handleTargets=useCallback((updated:Partial<Record<OrganId,FocusPose>>)=>setTargets(previous=>({...previous,...updated})),[]);
  const handleStatus=useCallback((message:string)=>{onAtlasStatus?.(message);},[onAtlasStatus]);
  return <>
    <primitive object={sky} attach="background" />
    <fog attach="fog" args={[light?'#e5eeec':'#08151d',7,18]}/>
    <RealAtlas inspectionGroup={inspectionGroup} activeSystem={activeSystem} contextVisible={contextVisible} storyIds={storyIds} selectedStructure={selectedStructure} isolated={isolated} onStructureSelect={onStructureSelect} onCatalog={onCatalog} quality={quality} motionEnabled={motionEnabled} heartbeat={heartbeat} environment={sky} organ={organ} mode={mode} layers={layers} onSelect={onSelect}
      onReady={()=>{}} onTargets={handleTargets} onStatus={handleStatus}/>
    <InspectionProjector inspectionGroup={inspectionGroup} elements={overlayElements} activeSystem={activeSystem} catalog={catalog} organ={organ} selected={selectedStructure} isolated={isolated} storyParts={showLabels?storyParts:[]} landmarks={landmarks&&!!showLabels} motionEnabled={motionEnabled} heartbeat={heartbeat} heartCenter={targets.heart?.target}/>
    {landmarks&&organ==='heart'&&(!selectedStructure||selectedStructure.region==='heart')&&<HeartCycleOverlay position={targets.heart?.target??FOCUS.heart.target} enabled={heartbeat&&motionEnabled&&layers.organs}/>}
    <CameraDirector onInteraction={onInteraction} focusedStructure={focusedStructure} focusRevision={focusRevision} organ={organ} motionEnabled={motionEnabled} targets={targets}/>
  </>;
}




