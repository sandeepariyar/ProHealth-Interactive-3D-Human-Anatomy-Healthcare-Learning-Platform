import type { OrganId, ShaderMode, SceneLayers, QualityMode } from './clinical';
import type {AtlasSystem} from './atlas';
import type {InspectionGroup} from './regionalInspection';
export type ExplorationView={organ:OrganId;mode:ShaderMode;layers:SceneLayers;quality:QualityMode;structureKey?:string;structureName?:string;isolated?:boolean;activeSystem?:AtlasSystem;inspectionGroup?:InspectionGroup;contextVisible?:boolean};
export type ExplorationEntry=ExplorationView&{id:number;timestamp:number};
export function viewKey(view:ExplorationView){return `${view.organ}/${view.mode}/${view.quality}/${Number(view.layers.shell)}${Number(view.layers.skeleton)}${Number(view.layers.organs)}/${view.structureKey??''}/${Number(!!view.isolated)}/${view.activeSystem??'muscular'}/${Number(view.contextVisible!==false)}/${view.inspectionGroup??'all'}`;}
export function recordView(entries:ExplorationEntry[],view:ExplorationView,time:number){
  if(entries.length&&viewKey(entries[0])===viewKey(view))return entries;
  return [{...view,layers:{...view.layers},id:Math.max(time,(entries[0]?.id??0)+1),timestamp:time},...entries].slice(0,40);
}
