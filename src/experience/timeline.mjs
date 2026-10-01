export const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
export const ease=value=>{const t=clamp(value);return t*t*(3-2*t)};
export const lerp=(a,b,t)=>a+(b-a)*t;
export function between(value,start,end){return ease((value-start)/(end-start))}
export function sampleFrames(frames,progress){
  if(progress<=frames[0].at)return structuredClone(frames[0]);
  const last=frames.at(-1);if(progress>=last.at)return structuredClone(last);
  const end=frames.findIndex(frame=>frame.at>=progress),a=frames[end-1],b=frames[end];
  const t=ease((progress-a.at)/(b.at-a.at));
  return Object.fromEntries(Object.keys(a).map(key=>[key,Array.isArray(a[key])?a[key].map((v,i)=>lerp(v,b[key][i],t)):lerp(a[key],b[key],t)]));
}
export const chapters=[
  {start:0,inEnd:0,outStart:.095,end:.185,label:'01 / In motion'},
  {start:.16,inEnd:.23,outStart:.31,end:.39,label:'02 / The machine'},
  {start:.37,inEnd:.43,outStart:.49,end:.56,label:'03 / Inside the build'},
  {start:.57,inEnd:.65,outStart:.76,end:.86,label:'04 / BIOBUZZ'},
  {start:.86,inEnd:.94,outStart:1,end:1.1,label:'05 / Built together'}
];
export function chapterOpacity(chapter,progress){return (chapter.start===0?1:between(progress,chapter.start,chapter.inEnd))*(1-between(progress,chapter.outStart,chapter.end))}

export const desktopFrames=[
  {at:0,camera:[.85,.59,1.39],target:[0,.2,0],robot:[0,0,0],rotation:-.12,explode:0,field:0},
  {at:.14,camera:[.85,.64,1.36],target:[0,.23,0],robot:[0,0,0],rotation:.14,explode:0,field:0},
  {at:.28,camera:[.83,.61,1.45],target:[0,.25,0],robot:[.24,0,0],rotation:.2,explode:1,field:0},
  {at:.43,camera:[.62,.53,1.17],target:[0,.3,0],robot:[-.20,.015,0],rotation:-.4,explode:.42,field:0},
  {at:.50,camera:[.82,.85,1.9],target:[0,.23,0],robot:[-.08,0,0],rotation:-.3,explode:0,field:0},
  {at:.62,camera:[5.6,4.7,6.5],target:[-.44,.28,0],robot:[1.1,0,1.1],rotation:-.4,explode:0,field:1},
  {at:.77,camera:[5.4,4.7,6.7],target:[-.50,.3,0],robot:[1.1,0,1.1],rotation:-.4,explode:0,field:1},
  {at:.88,camera:[3.9,4.2,6.8],target:[-.1,.25,0],robot:[1.1,0,1.1],rotation:-.4,explode:0,field:1},
  {at:1,camera:[.88,.60,1.45],target:[0,.19,0],robot:[.29,0,0],rotation:.42,explode:0,field:0}
];
