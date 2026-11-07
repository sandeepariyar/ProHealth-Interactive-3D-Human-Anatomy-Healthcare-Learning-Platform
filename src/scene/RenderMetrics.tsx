import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/** Low-frequency, DOM-readable diagnostics; no React updates in the render loop. */
export function RenderMetrics(){
  const {gl}=useThree();
  const sample=useRef({start:performance.now(),sum:0,frames:0});
  useEffect(()=>{const previous=gl.info.autoReset;gl.info.autoReset=false;return()=>{gl.info.autoReset=previous;delete gl.domElement.dataset.renderStats;};},[gl]);
  useFrame((state,dt)=>{
    const s=sample.current;
    s.sum+=Math.min(dt,1)*1000;s.frames++;
    if(performance.now()-s.start>1000){
      gl.domElement.dataset.renderStats=JSON.stringify({frameMs:Number((s.sum/s.frames).toFixed(2)),calls:gl.info.render.calls,triangles:gl.info.render.triangles,programs:gl.info.programs?.length,drawWidth:gl.domElement.width,drawHeight:gl.domElement.height,camera:state.camera.position.toArray(),target:(state.controls as unknown as {target?:{toArray:()=>number[]}})?.target?.toArray()});
      s.start=performance.now();s.sum=0;s.frames=0;
    }
    gl.info.reset();
  },-100);
  return null;
}
