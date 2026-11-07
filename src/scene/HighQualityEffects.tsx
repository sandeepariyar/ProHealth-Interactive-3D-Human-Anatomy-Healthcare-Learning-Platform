import {Bloom,EffectComposer} from '@react-three/postprocessing';
/** Loaded only when the existing dark/high-quality preset needs bloom. */
export default function HighQualityEffects(){return <EffectComposer multisampling={4}><Bloom luminanceThreshold={1.1} mipmapBlur intensity={.36} radius={.48}/></EffectComposer>;}
