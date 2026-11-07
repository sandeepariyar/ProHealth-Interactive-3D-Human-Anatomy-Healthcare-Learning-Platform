import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {majorityStructureId,type AtlasStructure} from '../data/atlas';
import {heartExpansion} from './heartCycle';
import {useInspectionParts,type InspectionProps} from './InspectionOverlay';
/** Projection runs in the scene; touch controls stay in the application's DOM root. */
export function InspectionProjector(props:InspectionProps&{heartbeat:boolean;heartCenter?:[number,number,number]}){
 const {selected,organ,heartbeat,motionEnabled,heartCenter,elements}=props,{size,scene,invalidate}=useThree(),parts=useInspectionParts(props);
 const [position,center]=useMemo(()=>[new THREE.Vector3(),new THREE.Vector3()],[]);
 const ray=useMemo(()=>new THREE.Raycaster(),[]),ndc=useMemo(()=>new THREE.Vector2(),[]);
 ray.firstHitOnly=true;
 const occlusion=useRef(new Map<string,boolean>()),lastCheck=useRef(-10),lastPose=useRef('');
 useEffect(()=>{
  // A final settling frame refreshes pins after streamed geometry and fades finish.
  lastPose.current='';
  const timers=[0,350,1100].map(delay=>setTimeout(()=>{lastPose.current='';invalidate();},delay));
  return()=>timers.forEach(clearTimeout);
 },[parts,invalidate,props.inspectionGroup]);
 useFrame(({camera,clock})=>{
  const place=(part:AtlasStructure)=>{
   position.fromArray(part.anchor);
   if(organ==='heart'&&part.region==='heart'&&heartbeat&&motionEnabled&&heartCenter){center.fromArray(heartCenter);position.sub(center).multiplyScalar(1+heartExpansion(clock.elapsedTime)).add(center);}
   position.project(camera);
   return {x:(position.x+1)*size.width/2,y:(1-position.y)*size.height/2,visible:position.z>-1&&position.z<1};
  };
  const occupied:Array<{x:number;y:number}>=[];
  const selectedPoint=selected?place(selected):null;
  const toolX=selectedPoint?Math.max(115,Math.min(size.width-115,selectedPoint.x+(selectedPoint.x<size.width*.57?115:-115))):0;
  const toolY=selectedPoint?Math.max(185,Math.min(size.height-145,selectedPoint.y)):0;
  const pose=[...camera.position.toArray(),...camera.quaternion.toArray(),camera.projectionMatrix.elements[0],size.width,size.height,scene.userData.atlasRevision??0,props.activeSystem,props.inspectionGroup,organ,...parts.map(p=>p.key)].join('/');
  const check=pose!==lastPose.current&&clock.elapsedTime-lastCheck.current>.25;
  if(check){lastCheck.current=clock.elapsedTime;lastPose.current=pose;}
  for(const part of parts){
   const element=elements.pins.get(part.key);if(!element)continue;
   const p=place(part);
   if(check&&p.visible){
    ndc.set(p.x/size.width*2-1,1-p.y/size.height*2);ray.setFromCamera(ndc,camera);
    const hit=ray.intersectObjects(scene.children,true).find(hit=>hit.face&&(hit.object as THREE.Mesh).geometry?.getAttribute('aStructureId'));
    if(hit?.face){const ids=(hit.object as THREE.Mesh).geometry.getAttribute('aStructureId');occlusion.current.set(part.key,majorityStructureId([ids.getX(hit.face.a),ids.getX(hit.face.b),ids.getX(hit.face.c)])===part.id);}
    else occlusion.current.set(part.key,false);
   }
   const clearTop=p.x>200&&p.x<size.width-200?45:150;
   const underTool=!!selectedPoint&&Math.abs(p.x-toolX)<135&&Math.abs(p.y-toolY)<95;
   const visible=p.visible&&!underTool&&occlusion.current.get(part.key)===true&&p.x>115&&p.x<size.width-105&&p.y>clearTop&&p.y<size.height-115&&selected?.key!==part.key&&!occupied.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<65);
   element.hidden=!visible;
   if(visible){occupied.push(p);element.style.left=`${p.x}px`;element.style.top=`${p.y}px`;}
  }
  if(elements.tool&&selected){
   const p=selectedPoint!;elements.tool.hidden=!p.visible;
   if(elements.origin){elements.origin.hidden=!p.visible;elements.origin.style.left=`${p.x}px`;elements.origin.style.top=`${p.y}px`;}
   elements.tool.style.left=`${toolX}px`;elements.tool.style.top=`${toolY}px`;
  }
 });
 return null;
}
