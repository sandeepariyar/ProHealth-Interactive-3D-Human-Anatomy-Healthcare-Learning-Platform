import {lazy,Suspense} from 'react';
import {Canvas} from '@react-three/fiber';
import {BodyAtlas,type SceneProps} from './BodyAtlas';
import {RenderMetrics} from './RenderMetrics';
import {useContext} from 'react';
import {PreferencesContext} from '../i18n';
const HighQualityEffects=lazy(()=>import('./HighQualityEffects'));
/** Keep the interface separate from renderer loading; preserve the rendering presets. */
export default function AnatomyCanvas(props:SceneProps){
 const {theme}=useContext(PreferencesContext);
 return <Canvas frameloop={props.motionEnabled&&(props.selectedStructure||props.organ!=='body'||props.mode==='perfusion')?'always':'demand'} camera={{position:[.18,1.65,6.7],fov:37,near:.01,far:60}}
  dpr={props.quality==='high'?[1,1.75]:[1,1.25]} gl={{alpha:false,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true}} onCreated={({gl,raycaster})=>{gl.setClearColor('#070f15');raycaster.firstHitOnly=true;}}>
  <RenderMetrics/>
  <Suspense fallback={null}><BodyAtlas {...props}/></Suspense>
  {theme==='dark'&&props.quality==='high'&&<Suspense fallback={null}><HighQualityEffects/></Suspense>}
 </Canvas>;
}
