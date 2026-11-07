import type {OrganId} from './clinical';
export type AtlasSystem='skeletal'|'muscular'|'visceral'|'cardiovascular'|'nervous'|'joints'|'lymphatic';
export type Vec3=[number,number,number];
export type AtlasStructure={id:number;key:string;name:string;system:AtlasSystem;region:OrganId|null;min:Vec3;max:Vec3;anchor:Vec3};
export const SYSTEM_LABELS:Record<AtlasSystem,string>={skeletal:'Skeleton',muscular:'Muscles',visceral:'Internal organs',cardiovascular:'Cardiovascular system',nervous:'Nervous system',joints:'Joints',lymphatic:'Lymphatic system'};
const book='https://openstax.org/books/anatomy-and-physiology-2e/pages/';
export const SYSTEM_GUIDES:Record<AtlasSystem,{text:string;source:string}>={
 skeletal:{text:'The skeleton supports the body, protects organs and provides levers for movement.',source:book+'6-1-the-functions-of-the-skeletal-system'},
 muscular:{text:'Muscle contraction generates force. Skeletal muscles help move the body and maintain posture.',source:book+'10-1-overview-of-muscle-tissues'},
 visceral:{text:'This atlas group contains internal organs from several body systems. The selected part is identified by its original atlas label.',source:book+'1-2-structural-organization-of-the-human-body'},
 cardiovascular:{text:'The heart and blood vessels circulate blood between the lungs and the rest of the body.',source:book+'19-1-heart-anatomy'},
 nervous:{text:'The nervous system receives information, processes it and coordinates responses. It includes the brain, spinal cord and peripheral nerves.',source:book+'12-1-basic-structure-and-function-of-the-nervous-system'},
 joints:{text:'Joints are connections between bones. Their structure determines the support and movement they allow.',source:book+'9-1-classification-of-joints'},
 lymphatic:{text:'The lymphatic system returns excess tissue fluid to the bloodstream and participates in immune defense.',source:book+'21-1-anatomy-of-the-lymphatic-and-immune-systems'}
};
export function structureGuide(part:AtlasStructure){
 const n=part.name.replace(/_/g,' ');
 if(part.system==='cardiovascular'&&/^(right|left) coronary artery\b/i.test(n))return {
  text:/^right/i.test(n)?'The right coronary artery follows the coronary sulcus. It supplies the right atrium, parts of both ventricles and portions of the conduction system. Trace its course along the heart surface.':'The left coronary artery arises from the aorta and branches to supply the left heart and interventricular septum. Inspect its relationship to the anterior interventricular and circumflex arteries.',
  source:SYSTEM_GUIDES.cardiovascular.source,scope:'structure'};
 if(part.system==='nervous'&&part.region==='brain'){
  const source=book+'13-2-the-central-nervous-system';
  if(/corpus callosum/i.test(n))return {text:'The corpus callosum is a major white-matter connection between the cerebral hemispheres. Isolate it, then restore context to inspect its position beneath the cortex.',source,scope:'structure'};
  if(/white matter of telencephalon/i.test(n))return {text:'Cerebral white matter lies beneath the cortical gray matter and contains connecting axons. Compare its deep position with the cortical folds surrounding it.',source,scope:'structure'};
  if(/gyrus|gyri|sulcus|sulci/i.test(n))return {text:'Gyri are ridges and sulci are grooves of the cerebral cortex. These landmarks help orient the cortical surface. This atlas selection identifies geometry; it does not establish an individual functional boundary.',source,scope:'region'};
 }
 if(part.system==='skeletal'&&part.region==='spine')return {text:'Vertebrae form a supporting column around the spinal canal. Compare the body, arch and processes of this atlas part with adjacent vertebrae. Shape and movement differ between cervical, thoracic and lumbar regions.',source:book+'7-3-the-vertebral-column',scope:'region'};
 if(part.system==='cardiovascular'){
  const text=/^left ventricle\b/i.test(n)?'The left ventricle is a pumping chamber that ejects blood into the aorta.':/^right ventricle\b/i.test(n)?'The right ventricle ejects blood into the pulmonary trunk, toward the lungs.':/^left atrium\b/i.test(n)?'The left atrium receives blood returning from the lungs.':/^right atrium\b/i.test(n)?'The right atrium receives blood returning from the body.':null;
  if(text)return {text,source:SYSTEM_GUIDES.cardiovascular.source,scope:'structure'};
 }
 if(part.system==='visceral'&&part.region==='lungs')return {text:/trachea|bronch/i.test(n)?'The conducting airways carry air toward and away from the gas-exchanging regions of the lungs.':'The lungs contain the respiratory regions where oxygen and carbon dioxide are exchanged.',source:book+'22-1-organs-and-structures-of-the-respiratory-system',scope:'structure'};
 return {...SYSTEM_GUIDES[part.system],scope:'system'};
}
/** A triangle in a simplified display mesh retains the original vertex identities. */
export function majorityStructureId(ids:number[]){
 if(ids.length<3||ids.some(id=>!Number.isInteger(id)||id<=0))return null;
 if(ids[0]===ids[1]||ids[0]===ids[2])return ids[0];
 if(ids[1]===ids[2])return ids[1];
 return null; // Ambiguous triangles never invent an identity.
}
export function structureLabel(part:AtlasStructure,t:(text:string)=>string){
 if(!/\p{L}/u.test(part.name))return t('Unnamed atlas structure');
 const raw=part.name.trim().replace(/\*/g,'').replace(/_/g,' '),side=/\.(l|r)$/i.exec(raw);
 const name=side?raw.slice(0,-2):raw;
 return t(name)+(side?` · ${t(side[1].toLowerCase()==='l'?'left':'right')}`:'');
}
export function nearbyStructures(catalog:AtlasStructure[],selected:AtlasStructure|null,organ:OrganId){
 const center=(p:AtlasStructure)=>p.min.map((v,i)=>(v+p.max[i])/2);
 const candidates=catalog.filter(p=>/\p{L}/u.test(p.name)&&p.key!==selected?.key&&(selected?p.system===selected.system&&(!selected.region||p.region===selected.region):organ==='body'?true:p.region===organ));
 if(selected){const c=center(selected);candidates.sort((a,b)=>center(a).reduce((sum,v,i)=>sum+(v-c[i])**2,0)-center(b).reduce((sum,v,i)=>sum+(v-c[i])**2,0));}
 else candidates.sort((a,b)=>a.name.localeCompare(b.name));
 const seen=new Set<string>();return candidates.filter(p=>{if(seen.has(p.name))return false;seen.add(p.name);return true;}).slice(0,4);
}
