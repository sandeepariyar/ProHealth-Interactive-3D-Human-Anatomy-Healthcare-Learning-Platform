import {useMemo} from 'react';

import {Eye,Focus,Info} from 'lucide-react';

import {structureLabel,type AtlasStructure,type AtlasSystem} from '../data/atlas';
import {landmarkStructures} from '../data/inspection';
import {regionalLandmarks,type InspectionGroup} from '../data/regionalInspection';
import {useText} from '../i18n';

import type {OrganId} from '../data/clinical';
export type InspectionElements={tool:HTMLDivElement|null;origin:HTMLSpanElement|null;pins:Map<string,HTMLButtonElement>};
export type InspectionProps={inspectionGroup:InspectionGroup;catalog:AtlasStructure[];activeSystem:AtlasSystem;organ:OrganId;selected:AtlasStructure|null;isolated:boolean;landmarks:boolean;storyParts:AtlasStructure[];motionEnabled:boolean;elements:InspectionElements};
export function useInspectionParts({catalog,activeSystem,inspectionGroup,organ,isolated,landmarks,storyParts}:InspectionProps){return useMemo(()=>isolated?[]:storyParts.length?storyParts:landmarks?organ==='body'?landmarkStructures(catalog,activeSystem):regionalLandmarks(catalog,organ,inspectionGroup):[],[catalog,activeSystem,inspectionGroup,organ,landmarks,isolated,storyParts]);}
export function InspectionOverlay(props:InspectionProps&{onSelect:(part:AtlasStructure)=>void;onFocus:()=>void;onIsolate:()=>void;onInfo:()=>void}){
 const {selected,isolated,motionEnabled,elements,storyParts,onSelect,onFocus,onIsolate,onInfo}=props,t=useText(),parts=useInspectionParts(props);
 return <div className="inspection-screen">
  {selected&&<span hidden ref={element=>{elements.origin=element;}} className={`selection-origin ${motionEnabled?'has-motion':''}`} aria-hidden="true"/>}
  {parts.map((part,i)=><button hidden ref={element=>{if(element)elements.pins.set(part.key,element);else elements.pins.delete(part.key);}} key={part.key} className={`anatomy-pin ${storyParts.length?'story-pin':''}`} aria-label={`${t('Inspect landmark')}: ${structureLabel(part,t)}`} title={structureLabel(part,t)} onClick={event=>{event.stopPropagation();onSelect(part);}}><span>{String(i+1).padStart(2,'0')}</span><i/></button>)}
  {selected&&<div hidden ref={element=>{elements.tool=element;}} className={`selection-orbit ${motionEnabled?'has-motion':''}`} role="group" aria-label={t('Selected structure actions')} key={selected.key}>
   <div className="selection-orbit-title"><span>{t('SELECTED STRUCTURE')}</span><strong>{structureLabel(selected,t)}</strong></div>
   <div className="orbit-actions"><button onClick={onFocus} aria-label={t('Focus selected')}><span><Focus size={21}/></span><small>{t('Focus')}</small></button><button onClick={onIsolate} aria-label={t(isolated?'Show context':'Isolate selected')} aria-pressed={isolated}><span><Eye size={21}/></span><small>{t(isolated?'Show context':'Isolate')}</small></button><button onClick={onInfo} aria-label={t('Structure details')}><span><Info size={21}/></span><small>{t('Details')}</small></button></div>
  </div>}
 </div>;
}

