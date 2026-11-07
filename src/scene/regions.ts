import type { OrganId } from '../data/clinical';

/** Anatomical terms are ambiguous across systems: cerebral ventricles are not cardiac. */
export function regionForStructure(name:string,system:string):OrganId|null {
  if(system==='visceral'&&/(lung|pulmon|pulmo|bronch|trachea)/i.test(name))return 'lungs';
  if(system==='cardiovascular'&&/(heart|coronary|myocard|ventric|atrium|cardiac|pulmonary valve|semilunar leaflet)/i.test(name))return 'heart';
  // Spinothalamic/spinocerebellar tracts extend down the spinal cord, despite their names.
  if(system==='nervous'&&!/(spino|spinal)/i.test(name)&&/(brain|cerebr|cerebell|encephal|thalam|hippocamp|cortex|ventricle|gyrus|gyri|sulc|lobule|vermis|pons|medulla oblongata|collicul|caudate|putamen|pallid|amygdal|habenula|geniculate|mamillary|corpus callosum)/i.test(name))return 'brain';
  if(system==='skeletal'&&/(vertebra|intervertebral|spine|lumbar)/i.test(name))return 'spine';
  return null;
}
/** Chamber geometry, rather than incidental vessels, defines the heart's framing. */
export function isCardiacChamber(name:string,system:string){
  return system==='cardiovascular'&&/\b(left|right)[ _]+(atrium|ventricle)\b/i.test(name);
}

/** Paired cerebral hemispheres define a compact intracranial framing volume. */
export function isCerebralCore(name:string,system:string){
  return system==='nervous'&&/\bwhite matter of telencephalon\b/i.test(name);
}
