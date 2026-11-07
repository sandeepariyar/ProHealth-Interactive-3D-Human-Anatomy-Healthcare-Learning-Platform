import {useText} from '../i18n';
import {ArrowUpRight,BookOpen,X} from 'lucide-react';
import {nearbyStructures,structureGuide,structureLabel,SYSTEM_GUIDES,SYSTEM_LABELS,type AtlasStructure,type AtlasSystem} from '../data/atlas';
import type {OrganId} from '../data/clinical';
import {matchesInspectionGroup,REGION_GROUPS,type InspectionGroup} from '../data/regionalInspection';

const organSystem:Record<Exclude<OrganId,'body'>,AtlasSystem>={heart:'cardiovascular',brain:'nervous',lungs:'visceral',spine:'skeletal'};
const overviewTitle:Record<OrganId,string>={body:'Explore human anatomy',lungs:'Lobes & airways',heart:'Chambers & coronary supply',brain:'Cortical & deep anatomy',spine:'Vertebral anatomy'};
export function Sidebar({inspectionGroup,activeSystem,catalog,selected,organ,onChoose,onClose}:{inspectionGroup:InspectionGroup;activeSystem:AtlasSystem;catalog:AtlasStructure[];selected:AtlasStructure|null;organ:OrganId;onChoose:(part:AtlasStructure)=>void;onClose:()=>void}){
 const t=useText();
 const guide=selected?structureGuide(selected):organ==='body'?null:organ==='lungs'?{text:'Inspect the lung lobes and conducting airways. Choose a structure group, then tap the model or a numbered landmark to identify an individual part.',source:'https://openstax.org/books/anatomy-and-physiology-2e/pages/22-1-organs-and-structures-of-the-respiratory-system',scope:'region'}:{...SYSTEM_GUIDES[organSystem[organ]],scope:'system'};
 const related=nearbyStructures(organ==='body'?catalog.filter(p=>p.system===activeSystem):catalog.filter(p=>matchesInspectionGroup(p,organ,inspectionGroup)),selected,organ);
 const groupName=organ==='body'?SYSTEM_LABELS[activeSystem]:REGION_GROUPS[organ].find(g=>g.id===inspectionGroup)?.label??'';
 return <aside className="information-panel anatomy-guide guide-unified" aria-label={t('Anatomy guide')}>
  <section className="context-primary guide-primary">
   <div className="guide-heading"><div><span className="micro-kicker">{t('REFERENCE ANATOMY')}</span><h2>{t('Anatomy guide')}</h2></div><button className="quiet-icon guide-close" onClick={onClose} aria-label={t('Close anatomy guide')}><X size={18}/></button></div>
   <div className="guide-reading">
    {selected?<><span className="guide-system">{t(SYSTEM_LABELS[selected.system])}</span><h3 className="guide-part-name">{structureLabel(selected,t)}</h3>{structureLabel(selected,t)!==selected.name&&<p className="atlas-term"><span>{t('Atlas term')}</span>{selected.name}</p>}</>:<h3 className="guide-part-name">{t(overviewTitle[organ])}</h3>}
    <div className="guide-role"><h4>{t(guide?.scope==='structure'?'Anatomical function':guide?.scope==='region'?'Structural context':guide?'System overview':'Start with a structure')}</h4><p>{t(guide?.text??'Tap a visible structure to identify it. Hide covering layers to explore deeper anatomy.')}</p></div>
    {selected&&!/\p{L}/u.test(selected.name)&&<p className="inspection-hint">{t('The source atlas does not provide a usable name for this mesh. No specific identity is inferred.')}</p>}
   </div>
   <section className="guide-related" aria-label={t('Related anatomy')}>
    <div className="related-heading"><h4>{t(selected?'Nearby in this system':'Explore individual parts')}</h4><small>{t(groupName)}</small></div>
    <p className="related-instruction">{t('Select to locate')}</p>
    <ul className="related-structures">{related.map(part=><li key={part.key}><button onClick={()=>onChoose(part)}><span>{structureLabel(part,t)}</span><ArrowUpRight size={14}/></button></li>)}</ul>
    {!related.length&&<p className="inspection-hint">{t('Atlas parts appear here as the systems load.')}</p>}
   </section>
   <footer className="guide-reference">
    {guide&&<a className="guide-source" href={guide.source} target="_blank" rel="noopener noreferrer"><BookOpen size={14}/><span>{t('Anatomy reference · OpenStax')}</span><ArrowUpRight size={13}/></a>}
    <small className="guide-provenance">{t('Geometry: Z-Anatomy / BodyParts3D. Atlas terms may be English or Latin.')}</small>
   </footer>
  </section>
 </aside>;
}
