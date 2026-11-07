import * as THREE from 'three';
import type { Theme } from '../i18n';

/** Seamless, locally generated studio panorama. No external HDRI or backdrop plane. */
export function createStudioSky(theme:Theme){
  const width=1024,height=512,day=theme==='light';
  const data=new Float32Array(width*height*4);
  const base=new THREE.Color(day?'#dce7e7':'#0b1722');
  const zenith=new THREE.Color(day?'#f8faf7':'#223f4a');
  const wrap=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
  const washWeight=new Float64Array(width),panelX=new Float64Array(width),rimX=new Float64Array(width);
  for(let x=0;x<width;x++){
    const phi=x/width*Math.PI*2;
    washWeight[x]=.18+(.5+.5*Math.cos(phi+.5))*.25;
    panelX[x]=Math.pow(wrap(phi-.35)/.25,2);rimX[x]=Math.pow(wrap(phi-3.7)/.32,2);
  }
  const dr=zenith.r-base.r,dg=zenith.g-base.g,db=zenith.b-base.b;
  for(let y=0;y<height;y++){
    const v=y/(height-1);
    const heightGlow=Math.exp(-Math.pow((v-.62)/.4,2));
    const panelY=Math.pow((v-.58)/.3,2),rimY=Math.pow((v-.6)/.32,2);
    for(let x=0;x<width;x++){
      const weight=heightGlow*washWeight[x];
      const panel=Math.exp(-panelX[x]-panelY),rim=Math.exp(-rimX[x]-rimY);
      const brightness=panel*(day?.18:.25)+rim*.08;
      const i=(y*width+x)*4;
      data[i]=base.r+dr*weight+brightness;data[i+1]=base.g+dg*weight+brightness;data[i+2]=base.b+db*weight+brightness;data[i+3]=1;
    }
  }
  const map=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
  map.name=`ProHealth / ${theme} studio panorama`;
  map.mapping=THREE.EquirectangularReflectionMapping;
  map.colorSpace=THREE.LinearSRGBColorSpace;
  map.wrapS=THREE.RepeatWrapping;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearFilter;
  map.needsUpdate=true;
  return map;
}
