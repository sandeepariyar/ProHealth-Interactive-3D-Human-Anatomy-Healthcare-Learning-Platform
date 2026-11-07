import type {AtlasStructure} from './atlas';
import type {OrganId} from './clinical';
export type InspectionGroup='all'|'lobes'|'airways'|'chambers'|'coronary'|'valves'|'cortex'|'deep'|'brainstem'|'cerebellum'|'cervical'|'thoracic'|'lumbar';
export const REGION_GROUPS:Record<OrganId,Array<{id:InspectionGroup;label:string}>>={
 body:[],
 lungs:[{id:'all',label:'All lung structures'},{id:'lobes',label:'Lung lobes'},{id:'airways',label:'Airways'}],
 heart:[{id:'all',label:'All heart structures'},{id:'chambers',label:'Chambers'},{id:'coronary',label:'Coronary vessels'},{id:'valves',label:'Valves'}],
 brain:[{id:'all',label:'All brain structures'},{id:'cortex',label:'Cortex'},{id:'deep',label:'Deep structures'},{id:'brainstem',label:'Brainstem'},{id:'cerebellum',label:'Cerebellum'}],
 spine:[{id:'all',label:'All vertebrae'},{id:'cervical',label:'Cervical'},{id:'thoracic',label:'Thoracic'},{id:'lumbar',label:'Lumbar'}]
};
export const REGION_CONTROL_LABEL:Record<OrganId,string>={body:'Inspect a layer',lungs:'Lung structures',heart:'Heart structures',brain:'Brain structures',spine:'Spinal structures'};
export function structureGroup(name:string,region:OrganId|null):InspectionGroup{
 const n=name.replace(/_/g,' ');
 if(region==='lungs')return /trachea|bronch/i.test(n)?'airways':'lobes';
 if(region==='heart')return /valve|leaflet|cusp|chordae|papillary/i.test(n)?'valves':/coronary|cardiac vein|interventricular artery|circumflex/i.test(n)?'coronary':/\b(left|right) (atrium|ventricle)|auricle/i.test(n)?'chambers':'all';
 if(region==='brain')return /cerebell|vermis/i.test(n)?'cerebellum':/pons|medulla oblongata|midbrain|collicul/i.test(n)?'brainstem':/gyrus|gyri|sulc|cortex|cortical/i.test(n)?'cortex':'deep';
 if(region==='spine')return /vertebra\s*C\d/i.test(n)?'cervical':/vertebra\s*T\d/i.test(n)?'thoracic':/vertebra\s*L\d|lumbar/i.test(n)?'lumbar':'all';
 return 'all';
}
export function matchesInspectionGroup(part:Pick<AtlasStructure,'name'|'region'>,organ:OrganId,group:InspectionGroup){return organ==='body'||part.region===organ&&(group==='all'||structureGroup(part.name,part.region)===group);}
const regionPresets:Partial<Record<OrganId,RegExp[]>>={
 lungs:[/^Trachea$/i,/^Superior lobe of right lung$/i,/^Inferior lobe of left lung$/i,/^Left main bronchus$/i,/^Right main bronchus$/i],
 heart:[/^Right coronary artery$/i,/^Left ventricle$/i,/^Right atrium$/i,/^Anterior interventricular artery$/i,/^Septal leaflet of right atrioventricular valve$/i],
 brain:[/^Middle frontal gyrus\.l$/i,/^Precentral gyrus\.r$/i,/^White matter of telencephalon\.l$/i,/^Pons\.r$/i,/^Medulla oblongata\.l$/i],
 spine:[/^Vertebra C7$/i,/^Vertebra C3/i,/^Vertebra T6/i,/^Vertebra L3/i]
};
export function regionalLandmarks(catalog:AtlasStructure[],organ:OrganId,group:InspectionGroup){
 const pool=catalog.filter(p=>matchesInspectionGroup(p,organ,group));
 const matches=(regionPresets[organ]??[]).map(pattern=>pool.find(p=>pattern.test(p.name))).filter((p):p is AtlasStructure=>!!p);
 if(!matches.length&&pool.length){const named=pool.filter(p=>/\p{L}/u.test(p.name)).sort((a,b)=>a.name.localeCompare(b.name));matches.push(...named.slice(0,3));}
 return [...new Map(matches.map(p=>[p.key,p])).values()].slice(0,5);
}
