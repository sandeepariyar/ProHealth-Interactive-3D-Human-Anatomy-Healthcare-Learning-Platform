import {ArrowUpRight,BookOpen,X} from 'lucide-react';
import {CORONARY_STORY} from '../data/conditions';
import {useText} from '../i18n';
export function ConditionGuide({step,onStep,onExit,onClose}:{step:number;onStep:(step:number)=>void;onExit:()=>void;onClose:()=>void}){
 const t=useText(),current=CORONARY_STORY.steps[step];
 return <aside className="information-panel condition-guide" aria-label={t('Condition story')}>
  <section className="context-primary"><div className="guide-heading"><div><span className="micro-kicker">{t('GUIDED ANATOMY')}</span><h2>{t(CORONARY_STORY.title)}</h2></div><button className="quiet-icon guide-close" onClick={onClose} aria-label={t('Close condition guide')}><X size={18}/></button></div>
  <p className="condition-label">{t('General illustration · no patient record')}</p>
  <div className="story-steps" role="group" aria-label={t('Story steps')}>{CORONARY_STORY.steps.map((entry,i)=><button key={entry.title} aria-pressed={i===step} onClick={()=>onStep(i)}><span>{String(i+1).padStart(2,'0')}</span><strong>{t(entry.title.slice(3))}</strong></button>)}</div>
  </section>
  <section className="context-secondary"><span className="story-legend"><i/>{t(current.legend)}</span><h3>{t(current.title.slice(3))}</h3><p className="story-copy">{t(current.text)}</p>
  <p className="inspection-hint">{t(step===2?'No fixed symptom territory is painted on the model.':'Tap a numbered point to inspect the highlighted reference anatomy.')}</p>
  <a className="guide-source" href={step===2?CORONARY_STORY.symptomsSource:CORONARY_STORY.source} target="_blank" rel="noopener noreferrer"><BookOpen size={15}/>{t('Condition reference · NIH / NHLBI')}<ArrowUpRight size={14}/></a>
  <a className="guide-source" href="https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy" target="_blank" rel="noopener noreferrer"><BookOpen size={15}/>{t('Anatomy reference · OpenStax')}<ArrowUpRight size={14}/></a>
  <p className="story-limits">{t('Atlas geometry does not depict plaque, perfusion or an individual lesion. This story has not been clinically validated.')}</p>
  <button className="story-exit" onClick={onExit}>{t('Return to anatomy exploration')}<ArrowUpRight size={15}/></button>
  </section>
 </aside>;
}
