import { SYSTEM_LABELS, type AtlasStructure,type AtlasSystem } from '../data/atlas';
import {INSPECTION_SYSTEMS} from '../data/inspection';
import {REGION_GROUPS,REGION_CONTROL_LABEL,type InspectionGroup} from '../data/regionalInspection';
import {InspectionOverlay,type InspectionElements} from '../scene/InspectionOverlay';

import { PreferencesContext, useText } from '../i18n';
import React, { Suspense, useState } from 'react';


import { motion, AnimatePresence } from 'motion/react';
import { Activity, Bone, Brain, Check, CircleDot, Eye, EyeOff, HeartPulse, Layers3, Maximize2, RotateCcw, ScanFace, SlidersHorizontal, Sparkles, Waves, X } from 'lucide-react';
import type { OrganId, QualityMode, SceneLayers, ShaderMode } from '../data/clinical';
import { REGIONS } from '../data/clinical';
const AnatomyCanvas=React.lazy(()=>import('../scene/AnatomyCanvas'));

const ORGAN_ICON:Record<OrganId,React.ReactNode> = {
 body:<ScanFace size={17}/>,lungs:<Waves size={17}/>,heart:<HeartPulse size={17}/>,brain:<Brain size={17}/>,spine:<Bone size={17}/>
};
const ORGAN_LABELS:Record<OrganId,string> = {body:'Full body',lungs:'Lungs',heart:'Heart',brain:'Brain',spine:'Spine'};
const MODES:{id:ShaderMode;name:string;detail:string}[]=[
 {id:'tissue',name:'Tissue',detail:'Translucent surface study'},
 {id:'perfusion',name:'Flow',detail:'Stylized temporal overlay'},
 {id:'xray',name:'X-ray',detail:'Ghosted structural view'},
];
const spring={type:'spring',stiffness:380,damping:34,mass:.8} as const;


class SceneBoundary extends React.Component<{children:React.ReactNode;retry:()=>void},{error:string}> {
  state={error:''};
  static getDerivedStateFromError(error:Error){return {error:error.message};}
  componentDidCatch(error:Error){console.error('[ProHealth] Scene failed',error);}
  render(){return this.state.error?<div className="scene-error" role="alert"><strong>The anatomy renderer needs a restart</strong><p>{this.state.error}</p><button onClick={this.props.retry}>Restart renderer</button></div>:this.props.children;}
}

export function Stage({onRestore,inspectionGroup,onGroup,activeSystem,onSystem,contextVisible,onContext,catalog,storyIds,storyParts,onFocus,onIsolate,onInfo,story,onStory,selectedStructure,focusedStructure,isolated,onStructureSelect,onCatalog,focusMode,onToggleFocus,focusRevision,organ,setOrgan,mode,setMode,layers,setLayers,quality,motionEnabled}:{
 onRestore:()=>void;inspectionGroup:InspectionGroup;onGroup:(group:InspectionGroup)=>void;
 activeSystem:AtlasSystem;onSystem:(system:AtlasSystem)=>void;contextVisible:boolean;onContext:()=>void;catalog:AtlasStructure[];storyIds:number[];storyParts:AtlasStructure[];onFocus:()=>void;onIsolate:()=>void;onInfo:()=>void;story:boolean;onStory:(enabled:boolean)=>void;
 selectedStructure:AtlasStructure|null;focusedStructure:AtlasStructure|null;isolated:boolean;onStructureSelect:(part:AtlasStructure)=>void;onCatalog:(parts:AtlasStructure[])=>void;
 focusMode:boolean;onToggleFocus:()=>void;focusRevision:number;organ:OrganId;setOrgan:(o:OrganId)=>void;mode:ShaderMode;setMode:(o:ShaderMode)=>void;
 layers:SceneLayers;setLayers:React.Dispatch<React.SetStateAction<SceneLayers>>;quality:QualityMode;motionEnabled:boolean;
}){
  const t=useText();
  const {theme}=React.useContext(PreferencesContext);
  const [heartbeat,setHeartbeat]=useState(true);
  const [showLabels,setShowLabels]=useState(true);
  const [navigationHidden,setNavigationHidden]=useState(false);
  const returnTimer=React.useRef<ReturnType<typeof setTimeout>|null>(null);
  const onInteraction=React.useCallback((active:boolean)=>{
    if(returnTimer.current)clearTimeout(returnTimer.current);
    if(active)setNavigationHidden(true);
    else returnTimer.current=setTimeout(()=>setNavigationHidden(false),850);
  },[]);
  React.useEffect(()=>{
    const release=()=>onInteraction(false);
    window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',release);
    return()=>{window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',release);if(returnTimer.current)clearTimeout(returnTimer.current);};
  },[onInteraction]);
  React.useEffect(()=>{if(returnTimer.current)clearTimeout(returnTimer.current);setNavigationHidden(false);},[organ,inspectionGroup]);
  const overlayElements=React.useMemo<InspectionElements>(()=>({tool:null,origin:null,pins:new Map()}),[]);
  const region=REGIONS.find(o=>o.id===organ)!;
  const [canvasKey,setCanvasKey]=useState(0);
  const [atlasStatus,setAtlasStatus]=useState('Loading real human anatomy…');
  return <div className={`viewer-shell region-${organ} ${organ==='body'?'whole-body-controls':'regional-controls'}`}><div className={`stage ${motionEnabled?'':'reduced-motion'}`} data-navigation-hidden={navigationHidden} aria-label="Interactive reference anatomy viewer">
    <div className="stage-shine"/><div className="atlas-scale" aria-hidden="true"><span>SUPERIOR</span><i/><span>INFERIOR</span></div><div className="atlas-edition">Z–ANATOMY <b>07</b><small>REGISTERED SYSTEMS / GLSL</small></div>
    <div className="stage-grid" aria-hidden="true"/>
    <div className="three-layer" id="anatomy-canvas">
      <SceneBoundary key={canvasKey} retry={()=>{onRestore();setCanvasKey(k=>k+1);}}><Suspense fallback={null}><AnatomyCanvas inspectionGroup={inspectionGroup} onInteraction={onInteraction} overlayElements={overlayElements} activeSystem={activeSystem} contextVisible={contextVisible} catalog={catalog} landmarks={!story} storyIds={storyIds} storyParts={storyParts} onFocus={onFocus} onIsolate={onIsolate} onInfo={onInfo} selectedStructure={selectedStructure} focusedStructure={focusedStructure} isolated={isolated} onStructureSelect={onStructureSelect} onCatalog={onCatalog} quality={quality} focusRevision={focusRevision} heartbeat={heartbeat&&!story} showLabels={showLabels} organ={organ} mode={mode} layers={layers} motionEnabled={motionEnabled} onSelect={setOrgan} onAtlasStatus={setAtlasStatus}/></Suspense></SceneBoundary>
    </div>
    <InspectionOverlay inspectionGroup={inspectionGroup} elements={overlayElements} activeSystem={activeSystem} catalog={catalog} organ={organ} selected={selectedStructure} isolated={isolated} storyParts={showLabels?storyParts:[]} landmarks={!story&&showLabels} motionEnabled={motionEnabled} onSelect={onStructureSelect} onFocus={onFocus} onIsolate={onIsolate} onInfo={onInfo}/>
    {atlasStatus&&<div className="anatomy-loading" role="status"><span className="anatomy-spinner"/>{t(atlasStatus)}</div>}
    <div className="stage-top">
      <div className="stage-identification">
        <span className="micro-kicker"><span className="live-dot"/>{t("ANATOMICAL EXPLORER")}<span className="micro-index">/ 01</span></span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={selectedStructure?.key??region.id} className={`stage-heading ${selectedStructure?'structure-heading':''}`} initial={motionEnabled?{opacity:0,y:12,filter:'blur(5px)'}:{opacity:1}} animate={{opacity:1,y:0,filter:'blur(0px)'}} exit={motionEnabled?{opacity:0,y:-9,filter:'blur(5px)'}:{opacity:0}} transition={{duration:motionEnabled?.35:0}}>
            <h1>{t(story?'Coronary artery disease':selectedStructure?'Inspect anatomy':region.label)}</h1>
            <p>{selectedStructure?t(SYSTEM_LABELS[selectedStructure.system]):t(organ==='body'&&!story?'Choose a layer, then tap the model.':region.subtitle)}{organ==='heart'&&!story&&heartbeat&&motionEnabled&&<small className="beat-note">{t('Illustrative motion · not a measured heartbeat')}</small>}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="stage-top-controls">{organ==='heart'&&!story&&<button className={`labels-button ${heartbeat?'enabled':''}`} aria-pressed={heartbeat} onClick={()=>setHeartbeat(v=>!v)}>{t('Heartbeat demo')}</button>}<button className={`labels-button ${showLabels?'enabled':''}`} aria-pressed={showLabels} onClick={()=>setShowLabels(v=>!v)}>{t('Landmarks')}</button>
        <motion.button whileHover={motionEnabled?{y:-2}:undefined} whileTap={{scale:.92}} className="glass-icon" onClick={onRestore} title={t('Restore overview')}><RotateCcw size={18}/></motion.button>
      </div>
    </div>
    <div className="exploration-mode" role="group" aria-label={t('Workspace mode')}><button aria-pressed={!story} onClick={()=>onStory(false)}>{t('Explore anatomy')}</button><button aria-pressed={story} onClick={()=>onStory(true)}>{t('Condition story')}</button></div>

    <div className="reticle reticle-tl"/><div className="reticle reticle-tr"/><div className="reticle reticle-bl"/><div className="reticle reticle-br"/>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={organ} className="region-floating-caption" initial={{opacity:0,y:11}} animate={{opacity:1,y:0}} exit={{opacity:0,y:9}} transition={{duration:motionEnabled?.35:0}}>
        <span className="tiny-rule"/>{selectedStructure?t(SYSTEM_LABELS[selectedStructure.system]):t(region.eyebrow)}<span className="region-separator">/</span><span>{t("REFERENCE")}</span>
      </motion.div>
    </AnimatePresence>
    <div className="stage-bottom">
      <div className="scene-subtitle"><CircleDot size={14}/> <span>{t("Drag to rotate")}</span><span className="subtle-divider">·</span><span>{t("Scroll to zoom")}</span></div>
      <div className={`organ-dock ${navigationHidden?'is-resting':''}`} inert={navigationHidden} aria-hidden={navigationHidden} role="tablist" aria-label="Anatomical regions">
        {REGIONS.map(entry=><button key={entry.id} role="tab" aria-selected={organ===entry.id} className={`organ-tab ${organ===entry.id?'selected':''}`} onClick={()=>setOrgan(entry.id)} title={t(entry.label)}>
          {organ===entry.id&&<motion.span layoutId="organ-background" className="organ-pill-back" transition={spring}/>}
          <span className="organ-tab-inner">{ORGAN_ICON[entry.id]}<span>{t(ORGAN_LABELS[entry.id])}</span></span>
        </button>)}
      </div>
      <button className={`viewer-expand ${focusMode?'expanded':''}`} onClick={onToggleFocus} aria-pressed={focusMode} aria-label={t(focusMode?'Return to workspace':'Open immersive view')}><span className="expand-orb"><Maximize2 size={20}/></span><span>{t(focusMode?'Back':'Expand view')}</span></button>
    </div>
    <span className="stage-watermark">{t("VISUAL REFERENCE · NOT A DIAGNOSTIC DEVICE")}</span>
  </div>    <div className="viewer-controls">
      <div className="control-section inspection-system-controls"><span className="control-label">{t(REGION_CONTROL_LABEL[organ])}</span><div className="direct-layers" role="group" aria-label={t('Inspection layer')}>{organ==='body'?INSPECTION_SYSTEMS.map(system=><button key={system} aria-pressed={activeSystem===system} className={activeSystem===system?'enabled':''} onClick={()=>onSystem(system)}><span className="control-orb">{system==='muscular'?<ScanFace size={21}/>:system==='skeletal'||system==='joints'?<Bone size={21}/>:system==='nervous'?<Brain size={21}/>:system==='cardiovascular'?<HeartPulse size={21}/>:system==='lymphatic'?<CircleDot size={21}/>:<Layers3 size={21}/>}<i/></span><span>{t(SYSTEM_LABELS[system])}</span></button>):REGION_GROUPS[organ].map(entry=><button key={entry.id} aria-pressed={inspectionGroup===entry.id} className={inspectionGroup===entry.id?'enabled':''} onClick={()=>onGroup(entry.id)}><span className="control-orb">{entry.id==='all'?<Layers3 size={21}/>:entry.id==='airways'||entry.id==='coronary'?<Waves size={21}/>:organ==='brain'?<Brain size={21}/>:organ==='spine'?<Bone size={21}/>:organ==='heart'?<HeartPulse size={21}/>:<Layers3 size={21}/>}<i/></span><span>{t(entry.label)}</span></button>)}</div></div>
      <div className="control-section display-controls"><span className="control-label">{t('Rendering mode')}</span><div className="direct-modes" role="group" aria-label={t('Rendering mode')}>{MODES.map(item=><button key={item.id} aria-pressed={mode===item.id} className={mode===item.id?'selected':''} onClick={()=>setMode(item.id)}><span className="control-orb">{item.id==='tissue'?<Layers3 size={21}/>:item.id==='perfusion'?<Waves size={21}/>:<Eye size={21}/>}<i/></span><span>{t(item.name)}</span></button>)}</div>{!story&&<button className="surroundings-instrument" aria-pressed={contextVisible} onClick={onContext} aria-label={t('Show surrounding anatomy')}><span className="control-orb">{contextVisible?<Eye size={21}/>:<EyeOff size={21}/>}<i/></span><span>{t('Surroundings')}</span></button>}</div>
    </div>

</div>;
}









