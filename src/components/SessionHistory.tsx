import { Clock3, RotateCcw, X } from 'lucide-react';
import { useText, PreferencesContext } from '../i18n';
import { useContext } from 'react';
import { REGIONS } from '../data/clinical';
import type { ExplorationEntry } from '../data/history';
import {SYSTEM_LABELS} from '../data/atlas';
import {REGION_GROUPS} from '../data/regionalInspection';
const inspectionLabel=(entry:ExplorationEntry)=>entry.organ==='body'?SYSTEM_LABELS[entry.activeSystem??'muscular']:REGION_GROUPS[entry.organ].find(group=>group.id===(entry.inspectionGroup??'all'))?.label??SYSTEM_LABELS[entry.activeSystem??'muscular'];
const modeLabels={tissue:'Tissue',perfusion:'Flow',xray:'X-ray'};
export function SessionHistory({entries,onRestore,onClose,onClear}:{entries:ExplorationEntry[];onRestore:(entry:ExplorationEntry)=>void;onClose:()=>void;onClear:()=>void}){
  const t=useText();const {language}=useContext(PreferencesContext);
  const time=(timestamp:number)=>new Date(timestamp).toLocaleTimeString(language==='fi'?'fi-FI':'en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Europe/Helsinki'});
  return <section className="session-history" aria-label={t('Exploration history')}>
    <div className="history-head"><div><span className="micro-kicker">{t('THIS SESSION')}</span><h2>{t('Exploration history')}</h2></div><button className="quiet-icon" onClick={onClose} aria-label={t('Close history')}><X size={18}/></button></div>
    <p>{t('Reopen an earlier anatomy view, including its layers and rendering mode.')}</p>
    <ol className="history-list">{entries.map((entry,i)=><li key={entry.id}><button onClick={()=>onRestore(entry)} aria-label={`${t('Reopen view')}: ${t(entry.structureName??REGIONS.find(r=>r.id===entry.organ)!.label)}, ${t(modeLabels[entry.mode])}`}><span className="history-mark">{i===0?<span className="live-dot"/>:<Clock3 size={15}/>}</span><span className="history-description"><strong>{t(entry.structureName??REGIONS.find(r=>r.id===entry.organ)!.label)}</strong><small>{t(modeLabels[entry.mode])} · {t('Inspecting')}: {t(inspectionLabel(entry))} · {t('Surroundings')}: {t(entry.contextVisible===false?'Hidden':'Visible')}</small><time>{time(entry.timestamp)}</time></span><RotateCcw size={15}/></button></li>)}</ol>
    <div className="history-footer"><span>{t('Stored only for this session')}</span><button onClick={onClear}>{t('Clear history')}</button></div>
  </section>;
}
export function RecentViews({entries,onRestore,onOpen}:{entries:ExplorationEntry[];onRestore:(entry:ExplorationEntry)=>void;onOpen:()=>void}){
  const t=useText();return <section className="activity-strip real-history" aria-label={t('Recent views')}><button className="activity-title history-open" onClick={onOpen}><span className="micro-kicker">{t('ACTIVITY')}</span><div>{t('Recent views')}</div></button><div className="timeline-mini">{entries.slice(0,3).map((entry,i)=><button key={entry.id} className={`activity-event ${i===0?'selected':''}`} onClick={()=>onRestore(entry)}><Clock3 size={15}/><span className="activity-text"><strong>{t(entry.structureName??REGIONS.find(r=>r.id===entry.organ)!.label)}</strong><small>{t(modeLabels[entry.mode])} · {t('Reopen view')}</small></span></button>)}</div></section>;
}


