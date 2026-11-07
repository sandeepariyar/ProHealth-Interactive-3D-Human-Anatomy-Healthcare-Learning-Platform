/** One clock for synthetic ECG and the illustrative mechanical beat. Not patient data. */
export const DEMO_BEATS_PER_MINUTE=72;
export function cyclePhase(seconds:number){return ((seconds*DEMO_BEATS_PER_MINUTE/60)%1+1)%1;}
const gaussian=(phase:number,center:number,width:number)=>Math.exp(-.5*Math.pow((phase-center)/width,2));
/** Stylized single-lead P-QRS-T morphology; no calibrated voltage or diagnostic meaning. */
export function syntheticEcg(seconds:number){
  const p=cyclePhase(seconds);
  return .12*gaussian(p,.16,.035)-.15*gaussian(p,.32,.014)+gaussian(p,.35,.010)-.24*gaussian(p,.38,.016)+.26*gaussian(p,.62,.065);
}
export function heartExpansion(seconds:number){
  const p=cyclePhase(seconds);
  // Small mechanical pulse after the synthetic QRS, rather than treating ECG voltage as scale.
  return p<.25||p>.78?0:.028*gaussian(p,.47,.075);
}
