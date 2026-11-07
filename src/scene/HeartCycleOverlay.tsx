import React, { useRef } from 'react';
import {Html} from '@react-three/drei/web/Html.js';
import { useFrame } from '@react-three/fiber';
import { useText } from '../i18n';
import { DEMO_BEATS_PER_MINUTE, syntheticEcg } from './heartCycle';

const width=560,beats=4,beatWidth=width/beats,period=60/DEMO_BEATS_PER_MINUTE;
const trace=Array.from({length:1681},(_,i)=>{
  const x=i/3;
  return `${i?'L':'M'}${x.toFixed(2)},${(57-syntheticEcg(x/beatWidth*period)*39).toFixed(2)}`;
}).join(' ');

/** Synthetic electrical trace and mechanical demo share a clock, not an amplitude equation. */
export function HeartCycleOverlay({enabled,position}:{enabled:boolean;position:[number,number,number]}){
  const t=useText();
  const marker=useRef<SVGCircleElement>(null);
  const cursor=useRef<SVGLineElement>(null);
  useFrame(({clock})=>{
    const seconds=enabled?clock.elapsedTime:0;
    const x=(seconds/period%beats)*beatWidth;
    marker.current?.setAttribute('cx',String(x));
    marker.current?.setAttribute('cy',String(57-syntheticEcg(seconds)*39));
    cursor.current?.setAttribute('x1',String(x));cursor.current?.setAttribute('x2',String(x));
  });
  return <Html position={position} calculatePosition={(_,__,size)=>[size.width/2,size.height/2]} fullscreen zIndexRange={[8,0]} style={{pointerEvents:'none'}}><section className="heart-cycle" aria-label={t('Illustrative heartbeat graph')}>
    <div className="heart-cycle-heading"><span>{t(enabled?'Synthetic ECG · demo':'Animation paused')}</span><span className="cycle-bpm">72 <small>{t('cycles/min · demo')}</small></span></div>
    <svg viewBox={`0 0 ${width} 84`} role="img" aria-label={t('Synthetic P–QRS–T waveform')}>
      <defs><linearGradient id="cycle-line"><stop stopColor="#60b4a7"/><stop offset=".6" stopColor="#b6f2d7"/><stop offset="1" stopColor="#77c6b1"/></linearGradient></defs>
      <line x1="0" y1="57" x2={width} y2="57" stroke="currentColor" opacity=".12"/>
      <path d={trace} stroke="url(#cycle-line)" strokeWidth="1.65" fill="none" strokeLinejoin="round"/>
      <line ref={cursor} x1="0" x2="0" y1="9" y2="76" stroke="currentColor" opacity=".22"/>
      <circle ref={marker} cx="0" cy="57" r="2.8" fill="currentColor"/>
      {[['P',.16,43],['Q',.32,76],['R',.35,9],['S',.38,79],['T',.62,39]].map(([label,phase,y])=><text key={label} x={Number(phase)*beatWidth} y={Number(y)} fill="currentColor" opacity=".65" fontSize="8" textAnchor="middle">{label}</text>)}
    </svg>
    <p>{t('Synthetic signal · not a recorded ECG')}</p>
  </section></Html>;
}

