import * as THREE from 'three';
import type { ShaderMode } from '../data/clinical';

/**
 * ProHealth spectral anatomy material.
 * Artistic surface/scan rendering — NOT CT attenuation, true perfusion,
 * physical volumetric scattering, or patient-derived physiology.
 * Uses real mesh curvature and normals from the anatomical atlas.
 */
const vertex=/* glsl */`
  attribute float aStructureId;
  varying float vStructureId;
  uniform vec3 uHeartCenter;
  uniform float uBeat;
  varying vec3 vEyePos;
  varying vec3 vViewNormal;
  varying vec3 vWorldPos;
  varying vec3 vObjectPos;
  varying vec3 vWorldNormal;
  void main(){
    vStructureId=aStructureId;
    vec4 world=modelMatrix*vec4(position,1.0);
    // All cardiac meshes expand about one registered center, not their individual origins.
    world.xyz=uHeartCenter+(world.xyz-uHeartCenter)*(1.+uBeat);
    vec4 eye=viewMatrix*world;
    vEyePos=-eye.xyz;
    vWorldPos=world.xyz;
    vObjectPos=position;
    vViewNormal=normalize(normalMatrix*normal);
    vWorldNormal=normalize(mat3(modelMatrix)*normal);
    gl_Position=projectionMatrix*eye;
  }
`;
const fragment=/* glsl */`
  uniform float uTime;
  uniform float uMode;
  uniform float uFocus;
  uniform float uGhost;
  uniform float uSelectedId;
  uniform float uStoryIds[8];
  varying float vStructureId;
  uniform float uSelectionPulse;
  uniform float uOpacity;
  uniform float uActivity;
  uniform vec3 uBase;
  uniform vec3 uRim;
  uniform sampler2D uEnvironment;
  varying vec3 vEyePos;
  varying vec3 vViewNormal;
  varying vec3 vWorldPos;
  varying vec3 vObjectPos;
  varying vec3 vWorldNormal;

  float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
  float noise3(vec3 x){
    vec3 i=floor(x), f=fract(x);
    f=f*f*(3.-2.*f);
    return mix(
      mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float ridge(float n){return 1.-abs(n*2.-1.);}
  void main(){
    vec3 N=normalize(vViewNormal), V=normalize(vEyePos);
    if(!gl_FrontFacing)N=-N;
    float NV=abs(dot(N,V));
    // Context takes an early exit: no tissue noise, flow noise or environment lookup.
    float picked=uSelectedId>0.?1.-step(.5,abs(vStructureId-uSelectedId)):0.;
    float story=0.;
    for(int i=0;i<8;i++){if(uStoryIds[i]>0.&&abs(vStructureId-uStoryIds[i])<.5)story=1.;}
    float focus=uSelectedId>0.?picked:uFocus;
    if(uGhost>.5&&picked<.5&&story<.5){
      float rim=pow(1.-NV,2.2);
      vec3 result=mix(uBase*.38,uRim*.68,rim);
      gl_FragColor=vec4(result,uOpacity*(.22+.78*rim));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      return;
    }
    vec3 L=normalize(vec3(-.43,.67,.61));
    vec3 H=normalize(L+V);
    float NL=max(0.,dot(N,L));
    float fresnel=pow(1.-NV,3.25);
    float studio=0.; // No Phong specular: illumination comes from the environment and edge response.
    float soft=NL*.67+max(0.,dot(N,normalize(vec3(.8,-.26,-.35))))*.22+.43;
    float fine=noise3(vWorldPos*65.0);
    float broad=noise3(vWorldPos*8.0);
    float stromal=noise3(vWorldPos*25.0+vec3(broad*.32));
    float grain=(fine-.5)*.044+(stromal-.5)*.052;
    vec3 tissue=uBase*(soft +grain);
    // Broad directional edge lights reveal shape; strongest on silhouettes, not emissive outlines.
    float edge=pow(1.-NV,2.35);
    float coolRim=pow(max(0.,dot(N,normalize(vec3(.8,.35,-.6)))),2.0)*edge;
    float warmRim=pow(max(0.,dot(N,normalize(vec3(-.8,.4,-.4)))),2.0)*edge;
    tissue+=uRim*(edge*.17+coolRim*.7)*(1.+focus*.18);
    tissue+=vec3(1.,.75,.62)*warmRim*.24;
    vec3 reflection=reflect(-normalize(cameraPosition-vWorldPos),normalize(vWorldNormal));
    vec2 skyUv=vec2(atan(reflection.z,reflection.x)*.15915494+.5,asin(clamp(reflection.y,-1.,1.))*.31830989+.5);
    vec3 environment=texture2D(uEnvironment,skyUv).rgb;
    tissue+=environment*(.12+edge*.32);

    tissue+=vec3(1.0,.84,.74)*studio*.38;
    // Soft rim/transmission term: art-directed, NOT a physical BSSRDF.
    tissue+=uBase*pow(1.-NL,2.5)*.085;
    tissue*=.9+(.1*broad);

    vec3 result=tissue;
    float alpha=mix(uOpacity,1.,picked);
    if(uMode>.05&&uMode<1.95){
      float stream=pow(max(0.,sin(vWorldPos.y*13.-uTime*1.75+broad*7.)*.5+.5),7.);
      vec3 pulseTone=mix(vec3(.17,.62,.65),vec3(.98,.46,.49),smoothstep(.55,.86,broad));
      float blend=smoothstep(.08,.9,uMode)*(1.-smoothstep(1.35,1.95,uMode));
      result=mix(tissue,tissue*.78+pulseTone*stream*.36,blend);
    }
    if(uMode>1.3){
      float scanEdge=pow(1.-NV,1.7);
      float blend=smoothstep(1.3,1.95,uMode);
      vec3 scan=mix(vec3(.04,.24,.30),uRim*.58,scanEdge);
      result=mix(result,scan,blend);
      alpha*=mix(1.,.065+scanEdge*.55,blend);
    }
    // Region-linked silhouette glow communicates selection, never pathology.
    result+=vec3(.18,.8,.66)*pow(1.-NV,2.6)*focus*.62*uSelectionPulse;
    result=mix(result,result*.65+vec3(.95,.56,.17)*(.45+pow(1.-NV,2.2)*.7),story);

    gl_FragColor=vec4(result,clamp(alpha,0.,1.));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
export function makeTissueMaterial(base:string,rim:string,mode:ShaderMode,opacity=1){
  return new THREE.ShaderMaterial({
    name:'ProHealth / Spectral Tissue',vertexShader:vertex,fragmentShader:fragment,
    uniforms:{uTime:{value:0},uMode:{value:mode==='tissue'?0:mode==='perfusion'?1:2},
      uHeartCenter:{value:new THREE.Vector3()},uBeat:{value:0},uSelectionPulse:{value:1},uEnvironment:{value:null},uSelectedId:{value:0},uStoryIds:{value:new Float32Array(8)},uGhost:{value:0},uFocus:{value:1},uOpacity:{value:opacity},uActivity:{value:.4},
      uBase:{value:new THREE.Color(base)},uRim:{value:new THREE.Color(rim)}},
    transparent:true,depthWrite:false,side:THREE.FrontSide,
  });
}
