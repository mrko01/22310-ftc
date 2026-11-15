// Synthesized sound for Minex. No audio files: every sound is built with Web Audio.
// Sound is off until the player turns it on.
let ctx=null,master=null,noiseBuf=null,drone=null,on=false;
const KEY='minex-sound';
try{on=localStorage.getItem(KEY)==='on';}catch{}
function ensure(){
  if(ctx)return ctx;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  ctx=new AC();master=ctx.createGain();master.gain.value=.55;master.connect(ctx.destination);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate*1.5,ctx.sampleRate);const d=noiseBuf.getChannelData(0);let last=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=w*.6+last*2.4;}
  return ctx;
}
export const sound={
  get on(){return on;},
  set(v){on=v;try{localStorage.setItem(KEY,v?'on':'off');}catch{}if(v){ensure();ctx?.resume();}else drone?.gain.gain.setTargetAtTime(0,ctx.currentTime,.2);},
  unlock(){if(on){ensure();ctx?.resume();}},
};
function noise(t,dur,{freq=900,q=1.2,gain=.3,type='bandpass',attack=.004,sweep}={}){
  const src=ctx.createBufferSource();src.buffer=noiseBuf;const f=ctx.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(freq,t);if(sweep)f.frequency.exponentialRampToValueAtTime(sweep,t+dur);f.Q.value=q;
  const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.connect(f).connect(g).connect(master);src.start(t,Math.random());src.stop(t+dur+.05);
}
function tone(t,freq,dur,{gain=.2,type='sine',to}={}){
  const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(master);o.start(t);o.stop(t+dur+.05);
}
const play=fn=>{if(!on||!ensure()||ctx.state!=='running')return;fn(ctx.currentTime);};
export const sfx={
  drill:h=>play(t=>noise(t,.07,{freq:500+h*160,q:3,gain:.12})),
  break:h=>play(t=>{noise(t,.28,{freq:260+h*40,q:.8,gain:.32,type:'lowpass',sweep:90});tone(t,90+h*6,.16,{gain:.18,to:50});}),
  ore:v=>play(t=>{const f=660+Math.min(1,v/300)*900;tone(t,f,.5,{gain:.12,type:'triangle'});tone(t+.04,f*1.5,.4,{gain:.06});}),
  discover:()=>play(t=>[523,659,784,1047,1319].forEach((f,i)=>tone(t+i*.07,f,.9-i*.08,{gain:.09,type:'triangle'}))),
  cash:()=>play(t=>{tone(t,1318,.18,{gain:.1,type:'square'});tone(t+.08,1760,.32,{gain:.08,type:'triangle'});}),
  ui:()=>play(t=>tone(t,1200,.05,{gain:.04,type:'square'})),
  error:()=>play(t=>tone(t,220,.18,{gain:.1,type:'sawtooth',to:160})),
  cage:up=>play(t=>{noise(t,1.1,{freq:up?300:1400,sweep:up?1600:260,q:.7,gain:.2});tone(t,70,.25,{gain:.2,type:'square',to:40});tone(t+1,60,.3,{gain:.2,type:'square',to:35});}),
  burst:()=>play(t=>{noise(t,1.4,{freq:180,type:'lowpass',q:.5,gain:.6,sweep:40,attack:.02});tone(t,48,1,{gain:.35,to:28});}),
  magnet:()=>play(t=>tone(t,180,.35,{gain:.12,type:'sawtooth',to:420})),
  streak:()=>play(t=>noise(t,.5,{freq:3200,q:.6,gain:.12,type:'highpass'})),
};
/** Low rumble that deepens with depth (0..1). */
export function setDrone(depth01,active){
  if(!on||!ensure()||ctx.state!=='running')return;
  if(!drone){const src=ctx.createBufferSource();src.buffer=noiseBuf;src.loop=true;const f=ctx.createBiquadFilter();f.type='lowpass';f.Q.value=.7;const g=ctx.createGain();g.gain.value=0;src.connect(f).connect(g).connect(master);src.start();drone={f,gain:g};}
  drone.f.frequency.setTargetAtTime(220-depth01*150,ctx.currentTime,.5);drone.gain.gain.setTargetAtTime(active?.05+depth01*.12:0,ctx.currentTime,.6);
}
