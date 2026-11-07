import type { OrganId } from '../data/clinical';
import type {AtlasSystem} from '../data/atlas';
import type {InspectionGroup} from '../data/regionalInspection';

export type PickCandidate<T>={value:T;region:OrganId|null;system?:AtlasSystem;group?:InspectionGroup;id:number|null;visible:boolean;opacity:number;ghost:boolean};
/** Focus views inspect their anatomy, never a faint covering context surface. */
export function pickCandidates<T>(hits:PickCandidate<T>[],organ:OrganId,isolatedId:number|null,activeSystem?:AtlasSystem,inspectionGroup:InspectionGroup='all'){
 return hits.filter(hit=>hit.visible&&hit.opacity>.003&&hit.id!==null&&
   (isolatedId!==null?hit.id===isolatedId:organ==='body'?hit.opacity>.12&&(!activeSystem||hit.system===activeSystem):hit.region===organ&&(inspectionGroup==='all'||hit.group===inspectionGroup)))
   .map(hit=>hit.value);
}
