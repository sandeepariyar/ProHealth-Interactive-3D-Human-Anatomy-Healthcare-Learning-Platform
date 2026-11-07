import assert from 'node:assert/strict';
import {heartExpansion,syntheticEcg,DEMO_BEATS_PER_MINUTE} from '../src/scene/heartCycle.ts';
const period=60/DEMO_BEATS_PER_MINUTE;
assert.ok(syntheticEcg(.35*period)>.9,'R peak');
assert.ok(syntheticEcg(.32*period)<0,'Q deflection');
assert.ok(syntheticEcg(.38*period)<0,'S deflection');
assert.ok(syntheticEcg(.16*period)>0,'P wave');
assert.ok(syntheticEcg(.62*period)>.2,'T wave');
assert.ok(heartExpansion(.47*period)>heartExpansion(.35*period),'Mechanical peak follows QRS');
for(let i=0;i<1000;i++){
 const seconds=i/100;
 assert.ok(heartExpansion(seconds)>=0&&heartExpansion(seconds)<=.028);
 assert.ok(Math.abs(syntheticEcg(seconds)-syntheticEcg(seconds+period))<1e-8);
}
console.log('PASS: synthetic morphology, periodicity, bounded mechanical beat after QRS.');
