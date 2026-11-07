import { type AtlasStructure,type AtlasSystem } from './data/atlas';
import {REGION_SYSTEM,systemLayer} from './data/inspection';
import {structureGroup,type InspectionGroup} from './data/regionalInspection';
import {coronaryStoryParts} from './data/conditions';
import {ConditionGuide} from './components/ConditionGuide';
import { SessionHistory } from './components/SessionHistory';
import { recordView, viewKey, type ExplorationEntry } from './data/history';
import { PreferencesContext, useText, type Language, type Theme } from './i18n';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { Activity, ArrowUpRight, Bell, BookOpen, CircleHelp, Command, GalleryVerticalEnd, HeartPulse, Layers3, LayoutDashboard, Maximize, Moon, PanelRightClose, ScanFace, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Waves, X } from 'lucide-react';
import { Stage } from './components/Stage';
import { Sidebar } from './components/Sidebar';
import type { OrganId, QualityMode, SceneLayers, ShaderMode } from './data/clinical';

const spring={type:'spring',stiffness:320,damping:33} as const;
export function App(){
  const [language,setLanguage]=useState<Language>(()=>localStorage.getItem('prohealth-language')==='en'?'en':'fi');
  const [theme,setTheme]=useState<Theme>(()=>localStorage.getItem('prohealth-theme')==='dark'?'dark':'light');
  useEffect(()=>{document.documentElement.lang=language;document.documentElement.dataset.theme=theme;localStorage.setItem('prohealth-language',language);localStorage.setItem('prohealth-theme',theme);},[language,theme]);
  return <PreferencesContext.Provider value={{language,theme}}><Workspace language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme}/></PreferencesContext.Provider>;
}
function Workspace({language,setLanguage,theme,setTheme}:{language:Language;setLanguage:(v:Language)=>void;theme:Theme;setTheme:(v:Theme)=>void}){
  const t=useText();
  const [organ,setOrgan]=useState<OrganId>('body');
  const [mode,setMode]=useState<ShaderMode>('tissue');
  const [layers,setLayers]=useState<SceneLayers>({shell:true,skeleton:true,organs:true});
  const [activeSystem,setActiveSystem]=useState<AtlasSystem>('muscular');
  const [inspectionGroup,setInspectionGroup]=useState<InspectionGroup>('all');
  const [contextVisible,setContextVisible]=useState(true);
  const [story,setStory]=useState(false);
  const [storyStep,setStoryStep]=useState(0);
  const [catalog,setCatalog]=useState<AtlasStructure[]>([]);
  const [selectedStructure,setSelectedStructure]=useState<AtlasStructure|null>(null);
  const [focusedStructure,setFocusedStructure]=useState<AtlasStructure|null>(null);
  const [isolated,setIsolated]=useState(false);
  const [quality,setQuality]=useState<QualityMode>('balanced');
  const [focusRevision,setFocusRevision]=useState(0);
  const [history,setHistory]=useState<ExplorationEntry[]>(()=>{const now=Date.now();return [{organ:'body',mode:'tissue',quality:'balanced',layers:{shell:true,skeleton:true,organs:true},id:now,timestamp:now}];});
  const restoring=useRef(false);
  const lastView=useRef(viewKey({organ,mode,layers,quality}));
  useEffect(()=>{
    if(story)return;
    const view={organ,mode,layers,quality,activeSystem,inspectionGroup,contextVisible,structureKey:selectedStructure?.key,structureName:selectedStructure?.name,isolated};const key=viewKey(view);
    if(key===lastView.current)return;
    lastView.current=key;
    if(restoring.current){restoring.current=false;return;}
    setHistory(previous=>recordView(previous,view,Date.now()));
  },[organ,mode,layers,quality,selectedStructure?.key,isolated,activeSystem,inspectionGroup,contextVisible,story]);
  const restoreView=(entry:ExplorationEntry)=>{
    const key=viewKey(entry);
    restoring.current=key!==lastView.current;
    setHistory(previous=>recordView(previous,entry,Date.now()));
    const part=entry.structureKey?catalog.find(part=>part.key===entry.structureKey)??null:null;
    setSelectedStructure(part);setFocusedStructure(part);setIsolated(!!part&&!!entry.isolated);
    setOrgan(entry.organ);setMode(entry.mode);setLayers({...entry.layers});setQuality(entry.quality);
    setActiveSystem(entry.activeSystem??REGION_SYSTEM[entry.organ]);setContextVisible(entry.contextVisible!==false);setStory(false);
    setInspectionGroup(entry.inspectionGroup??'all');
    setFocusRevision(v=>v+1);setSection('explore');
  };
  const [motionEnabled,setMotionEnabled]=useState(true);
  const [section,setSection]=useState<'explore'|'activity'|'about'>('explore');
  const [contextOpen,setContextOpen]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [toast,setToast]=useState('');
  const selectOrgan=useCallback((next:OrganId)=>{setSelectedStructure(null);setFocusedStructure(null);setIsolated(false);setInspectionGroup('all');setOrgan(next);if(next!=='body')setActiveSystem(REGION_SYSTEM[next]);setStory(false);},[]);
  const selectStructure=useCallback((part:AtlasStructure)=>{setSelectedStructure(part);setContextOpen(false);setSection('explore');},[]);
  const selectSystem=(system:AtlasSystem)=>{selectOrgan('body');setActiveSystem(system);setLayers({shell:true,skeleton:true,organs:true});setContextOpen(false);};
  const selectGroup=(group:InspectionGroup)=>{setInspectionGroup(group);setFocusedStructure(null);setFocusRevision(v=>v+1);setSelectedStructure(null);setIsolated(false);setStory(false);setContextOpen(false);};
  const ensureVisible=(part:AtlasStructure)=>setLayers(previous=>({...previous,...(part.system==='muscular'?{shell:true}:['skeletal','joints'].includes(part.system)?{skeleton:true}:{organs:true})}));
  const focusStructure=(part:AtlasStructure)=>{ensureVisible(part);setActiveSystem(part.system);if(organ!=='body'&&inspectionGroup!=='all')setInspectionGroup(structureGroup(part.name,part.region));setSelectedStructure(part);setFocusedStructure(part);setFocusRevision(v=>v+1);setContextOpen(false);};
  const chooseStructure=(part:AtlasStructure)=>{setIsolated(false);focusStructure(part);};
  const restoreOverview=()=>{setSelectedStructure(null);setFocusedStructure(null);setIsolated(false);setOrgan('body');setStory(false);setInspectionGroup('all');setLayers({shell:true,skeleton:true,organs:true});setFocusRevision(v=>v+1);};
  const changeStoryStep=(step:number)=>{setStory(true);setStoryStep(step);setInspectionGroup('all');setSelectedStructure(null);setFocusedStructure(null);setIsolated(false);setOrgan(step===2?'body':'heart');setActiveSystem(step===2?'muscular':'cardiovascular');setLayers({shell:true,skeleton:true,organs:true});setContextVisible(true);setContextOpen(true);setFocusRevision(v=>v+1);};
  const toggleStory=(enabled:boolean)=>{if(enabled)changeStoryStep(0);else{setStory(false);restoreOverview();setContextOpen(false);}};
  const storyParts=React.useMemo(()=>story?coronaryStoryParts(catalog,storyStep):[],[story,storyStep,catalog]);
  const isolateSelection=()=>{if(selectedStructure){focusStructure(selectedStructure);setIsolated(v=>!v);}};
  useEffect(()=>{
    const m=window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotionEnabled(!m.matches);
    const cb=(event:MediaQueryListEvent)=>setMotionEnabled(!event.matches);
    m.addEventListener?.('change',cb);
    return()=>m.removeEventListener?.('change',cb);
  },[]);
  useEffect(()=>{
    if(!toast)return;
    const t=window.setTimeout(()=>setToast(''),2900);
    return()=>window.clearTimeout(t);
  },[toast]);
  const handleSection=(name:'explore'|'activity'|'about')=>{
    setSection(previous=>name==='activity'&&previous==='activity'?'explore':name);
    
    if(name==='about')setShowSettings(true);
  };
  return <MotionConfig reducedMotion={motionEnabled?'never':'always'}><div className="app-root">
    <header className="top-bar" inert={expanded} aria-hidden={expanded}>
      <div className="brand-lockup"><span className="brand-symbol"><span/><span/><span/><span/></span><span className="brand-name">prohealth<span className="brand-suffix">/next</span></span></div>
      <div className="top-divider"/>
      <div className="workspace-label"><span className="workspace-label-strong">{t("Workspace")}</span><span className="breadcrumb-slash">/</span><span>{t("Anatomy explorer")}</span></div>
      <div className="top-spacer"/>
      <div className="global-preferences"><div className="language-switch" role="group" aria-label="Kieli / Language">{(['fi','en'] as const).map(l=><button key={l} aria-pressed={language===l} onClick={()=>setLanguage(l)}>{l.toUpperCase()}</button>)}</div><button className="theme-switch" aria-label={t(theme==='dark'?'Light mode':'Dark mode')} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<span>☀</span>:<Moon size={17}/>}<span>{t(theme==='dark'?'Light mode':'Dark mode')}</span></button></div>
      <motion.button className="top-round" whileTap={{scale:.9}} whileHover={{scale:1.07}} title={t("Rendering preferences")} onClick={()=>setShowSettings(true)}><Settings2 size={18}/></motion.button>
      <button className="context-button header-context" aria-label={t(contextOpen?'Close context':'Context')} aria-pressed={contextOpen} onClick={()=>setContextOpen(v=>!v)}><Layers3 size={17}/></button><motion.button whileHover={{y:-2}} whileTap={{scale:.96}} className="share-button header-export" title={t("Export view")} onClick={()=>{const canvas=document.querySelector<HTMLCanvasElement>('#anatomy-canvas canvas');if(!canvas)return;try{const link=document.createElement('a');link.download=`prohealth-${organ}-${mode}.png`;link.href=canvas.toDataURL('image/png');link.click();setToast('Anatomy viewport saved as PNG');}catch{setToast('The viewport could not be exported. Try resetting the scene.');}}}>{t("Export view")}<ArrowUpRight size={16}/></motion.button>
      <div className="top-avatar" aria-label="Demo workspace">P</div>
    </header>
    <div className="workspace-body">
      <nav className="rail" aria-label="Main navigation" inert={expanded} aria-hidden={expanded}>
        <div className="rail-upper">
          {[{id:'explore',icon:<ScanFace/>,label:'Anatomy'},{id:'activity',icon:<Activity/>,label:'Activity'},{id:'about',icon:<Layers3/>,label:'About'}].map(entry=><motion.button key={entry.id} className={`rail-button ${section===entry.id?'active':''}`} whileTap={{scale:.88}} whileHover={{scale:1.05}} title={t(entry.label)} onClick={()=>handleSection(entry.id as 'explore'|'activity'|'about')}>
            {section===entry.id&&<motion.span className="rail-indicator" layoutId="rail-current" transition={spring}/>} {entry.icon}
          </motion.button>)}
        </div>
        <div className="rail-lower"><button className="rail-button" title={t("Help")} onClick={()=>setToast('Demo help: choose a region, drag to rotate, use sliders for shaders and layers')}><CircleHelp/></button></div>
      </nav>
      <main className={`work-area ${expanded?'fullscreen-stage':''} ${contextOpen?'context-open':''} ${section==='activity'?'activity-focused':''}`} >

        <div className="main-grid">
          <div className="main-column">
            <Stage onRestore={restoreOverview} inspectionGroup={inspectionGroup} onGroup={selectGroup} activeSystem={activeSystem} onSystem={selectSystem} contextVisible={contextVisible} onContext={()=>setContextVisible(v=>!v)} catalog={catalog} storyIds={storyParts.map(p=>p.id)} storyParts={storyParts} onFocus={()=>selectedStructure&&focusStructure(selectedStructure)} onIsolate={isolateSelection} onInfo={()=>{setStory(false);setContextOpen(true);}} story={story} onStory={toggleStory} selectedStructure={selectedStructure} focusedStructure={focusedStructure} isolated={isolated} onStructureSelect={selectStructure} onCatalog={setCatalog} focusMode={expanded} onToggleFocus={()=>{setExpanded(v=>!v);setSection('explore');setContextOpen(false);}} focusRevision={focusRevision} organ={organ} setOrgan={selectOrgan} mode={mode} setMode={setMode} layers={layers} setLayers={setLayers} quality={quality} motionEnabled={motionEnabled}/>
            {section==='activity'&&<SessionHistory entries={history} onRestore={restoreView} onClose={()=>setSection('explore')} onClear={()=>setHistory(recordView([],{organ,mode,layers,quality,activeSystem,inspectionGroup,contextVisible,structureKey:selectedStructure?.key,structureName:selectedStructure?.name,isolated},Date.now()))}/>}
          </div>
          {(!expanded||contextOpen)&&(story?<ConditionGuide step={storyStep} onStep={changeStoryStep} onExit={()=>toggleStory(false)} onClose={()=>setContextOpen(false)}/>:<Sidebar inspectionGroup={inspectionGroup} activeSystem={activeSystem} catalog={catalog} selected={selectedStructure} organ={organ} onChoose={chooseStructure} onClose={()=>setContextOpen(false)}/>)}
        </div>
        <footer className="bottom-bar"><span className="creator-footer">Designed &amp; Developed by Sandeep Pariyar</span><span>PROHEALTH NEXT <b>·</b>{t("MOTION & SHADER STUDY")}</span><span>{t("SIMULATED DATA")}<b>·</b>{t("NOT FOR CLINICAL USE")}</span><span>R3F / THREE.JS / GLSL <b>·</b> <a href="https://github.com/nqwrc/3d-anatomy" target="_blank" rel="noopener noreferrer" title="Anatomy models by BodyParts3D and Z-Anatomy">Z-ANATOMY</a></span></footer>
      </main>
    </div>
    <AnimatePresence>{showSettings&&<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowSettings(false)}>
      <motion.div className="settings-dialog" role="dialog" aria-modal="true" aria-label={t("Visual preferences")} initial={{opacity:0,y:25,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16,scale:.96}} transition={spring} onClick={e=>e.stopPropagation()}>
        <div className="dialog-head"><div><span className="micro-kicker">{t("VISUAL ENGINE")}</span><h2>{t("Preferences")}</h2></div><button onClick={()=>setShowSettings(false)} className="quiet-icon"><X size={18}/></button></div>
        <div className="setting-line"><div><strong>{t("Motion design")}</strong><small>{t("Spatial camera transitions and UI springs")}</small></div><button aria-label={t("Motion design")} aria-pressed={motionEnabled} className={`toggle-track ${motionEnabled?'on':''}`} onClick={()=>setMotionEnabled(!motionEnabled)}><span/></button></div>
        <div className="setting-line"><div><strong>{t("Rendering quality")}</strong><small>{t("Balanced optimizes surroundings; selected anatomy stays at full detail")}</small></div><div className="selector"><button className={quality==='balanced'?'current':''} onClick={()=>setQuality('balanced')}>{t("Balanced")}</button><button className={quality==='high'?'current':''} onClick={()=>setQuality('high')}>{t("High")}</button></div></div>
        <div className="about-notice"><ShieldCheck size={18}/><div>{t("Reference anatomy and illustrative overlays. No patient record is loaded. This prototype is not clinically validated.")}<p style={{marginTop:10}}>Model credits: BodyParts3D — Database Center for Life Science (CC BY-SA 2.1 Japan); Z-Anatomy (CC BY-SA 4.0). Combined atlas: CC BY-NC-SA 4.0. <a href="https://github.com/nqwrc/3d-anatomy/blob/master/NOTICE" target="_blank" rel="noopener noreferrer" style={{color:"#7ae3d0"}}>{t("Full model attribution")}</a>.</p></div></div>
        <button className="dialog-done" onClick={()=>setShowSettings(false)}>{t("Done")}</button>
      </motion.div>
    </motion.div>}</AnimatePresence>
    <AnimatePresence>{toast&&<motion.div key={toast} role="status" className="toast" initial={{opacity:0,y:24,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12}}>{t(toast)}</motion.div>}</AnimatePresence>
  </div></MotionConfig>
}





