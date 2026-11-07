import type {AtlasStructure} from './atlas';
export const CORONARY_STORY={
 title:'Coronary artery disease',
 source:'https://www.nhlbi.nih.gov/health/coronary-heart-disease',
 symptomsSource:'https://www.nhlbi.nih.gov/health/coronary-heart-disease/symptoms',
 steps:[
  {title:'1. Coronary supply',legend:'Primary vessel anatomy',text:'Plaque can narrow the coronary arteries and reduce oxygen-rich blood reaching the heart muscle. The highlight locates reference coronary vessels; it does not show a measured blockage or its severity.'},
  {title:'2. The pump it supplies',legend:'Related pump anatomy',text:'The coronary circulation supplies the myocardium. Chamber geometry is highlighted here to orient the pump, not to map an injured myocardial territory. Actual involvement depends on the vessel and the individual anatomy.'},
  {title:'3. Symptoms are not a tissue map',legend:'Reference body overview',text:'Coronary disease may cause chest discomfort, shortness of breath or discomfort elsewhere, and can also be silent. A symptom location does not identify a damaged body structure. This view does not infer affected tissue from symptoms.'}
 ]
};
/** Only named, source-backed meshes are used; absence never creates surrogate geometry. */
export function coronaryStoryParts(catalog:AtlasStructure[],step:number){
 const names=step===0?['Right coronary artery','Left coronary artery','Anterior interventricular artery','Circumflex artery of heart']:step===1?['Left ventricle','Right ventricle','Left atrium','Right atrium']:[];
 return names.flatMap(name=>{const part=catalog.find(p=>p.system==='cardiovascular'&&p.name===name);return part?[part]:[];});
}
