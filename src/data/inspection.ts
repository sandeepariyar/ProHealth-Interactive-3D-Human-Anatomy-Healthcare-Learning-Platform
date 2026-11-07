import type {AtlasStructure,AtlasSystem} from './atlas';
import type {OrganId,SceneLayers} from './clinical';
export const INSPECTION_SYSTEMS:AtlasSystem[]=['muscular','skeletal','visceral','cardiovascular','nervous','joints','lymphatic'];
export const REGION_SYSTEM:Record<OrganId,AtlasSystem>={body:'muscular',heart:'cardiovascular',brain:'nervous',lungs:'visceral',spine:'skeletal'};
export function systemLayer(system:AtlasSystem):keyof SceneLayers{return system==='muscular'?'shell':system==='skeletal'||system==='joints'?'skeleton':'organs';}
export function canInspect(system:AtlasSystem,region:OrganId|null,organ:OrganId,active:AtlasSystem,visible:boolean){return visible&&(organ==='body'?system===active:region===organ);}
const presets:Record<AtlasSystem,RegExp[]>={
 muscular:[/^Clavicular part of deltoid muscle\.r$/i,/^Clavicular part of pectoralis major\.l$/i,/^Short head of biceps brachii\.r$/i,/^Rectus abdominis muscle\.l$/i,/^Rectus femoris muscle\.l$/i,/^Tibialis anterior muscle\.r$/i],
 skeletal:[/^Clavicle\.r$/i,/^Body of sternum$/i,/^Humerus\.l$/i,/^Femur\.r$/i,/^Patella\.l$/i,/^Tibia\.l$/i],
 visceral:[/^Trachea$/i,/^Superior lobe of right lung/i,/^Stomach$/i,/^Liver$/i,/^Kidney\.l$/i,/^Urinary bladder$/i],
 cardiovascular:[/^Right coronary artery$/i,/^Left ventricle$/i,/^Ascending aorta$/i,/^Common carotid artery\.r$/i,/^Femoral artery\.l$/i],
 nervous:[/^White matter of telencephalon\.l$/i,/^Pons\.r$/i,/^Medulla oblongata/i,/^Median nerve\.r$/i,/^Sciatic nerve\.l$/i],
 joints:[/glenohumeral/i,/hip joint/i,/knee joint/i,/elbow joint/i],
 lymphatic:[/axillary.*node/i,/inguinal.*node/i,/cervical.*node/i,/thoracic duct/i]
};
/** Resolve curated landmarks to real source records; missing data creates no invented pin. */
export function landmarkStructures(catalog:AtlasStructure[],system:AtlasSystem){
 const pool=catalog.filter(p=>p.system===system);
 const matches=presets[system].map(pattern=>pool.find(p=>pattern.test(p.name.replace(/_/g,' ')))).filter((p):p is AtlasStructure=>!!p);
 return [...new Map(matches.map(p=>[p.key,p])).values()];
}
