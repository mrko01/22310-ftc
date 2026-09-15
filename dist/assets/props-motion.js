// All scene objects use this floor, including the mascot soles and rover tires.
export const FLOOR_Y = -1.305;
export const PROP_LANE_Z = 2.8;
const GRAVITY = 9.81;
export const propTypes = [
  {kind:'green-artifact', radius:.23, restitution:.68, friction:.16},
  {kind:'purple-artifact', radius:.23, restitution:.64, friction:.16},
  {kind:'ring', radius:.27, restitution:.51, friction:.12},
  {kind:'wheel', radius:.24, restitution:.45, friction:.10},
  {kind:'nut', radius:.22, restitution:.28, friction:.20},
];
export function seededRandom(seed) {
  return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
export function propSequence(random=Math.random) {
  let bag=[],last=-1;
  return () => {
    if(!bag.length){bag=propTypes.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.at(-1)===last)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];}
    last=bag.pop();return {type:propTypes[last],delay:3+random()*3,loft:.7+random()*.6,speed:.94+random()*.12};
  };
}
// Solve each impact exactly, then sample the flight at any time. Independent of
// rendering rate: dropped frames cannot tunnel through the floor or add energy.
export function createFlight(type, halfWidth, loft=1, speed=1) {
  const start=-halfWidth-.7,end=halfWidth+.7,vx=(end-start)/3.3*speed;
  const segments=[];let time=0,x=start,y=loft,vy=-.15,velocity=vx;
  for(let bounce=0;bounce<12;bounce++){
    const duration=(vy+Math.sqrt(vy*vy+2*GRAVITY*y))/GRAVITY;
    segments.push({time,x,y,vy,vx:velocity,duration});
    time+=duration;x+=velocity*duration;
    vy=(GRAVITY*duration-vy)*type.restitution;velocity*=.975;y=0;
    if(vy<.2)break;
  }
  return {type,start,end,segments,rollTime:time,rollX:x,rollVelocity:velocity};
}
export function sampleFlight(flight, age) {
  const {type}=flight;
  let x,height,vy,vx,impacts=0;
  const segment=flight.segments.find((s,i)=>{if(age>=s.time)impacts=i;return age<s.time+s.duration;});
  if(segment){const t=Math.max(0,age-segment.time);x=segment.x+segment.vx*t;height=Math.max(0,segment.y+segment.vy*t-GRAVITY*t*t/2);vy=segment.vy-GRAVITY*t;vx=segment.vx;}
  else {const t=Math.max(0,age-flight.rollTime);vx=Math.max(0,flight.rollVelocity-type.friction*t);const moving=Math.min(t,flight.rollVelocity/type.friction);x=flight.rollX+flight.rollVelocity*moving-type.friction*moving*moving/2;height=0;vy=0;impacts=flight.segments.length;}
  return {x,y:FLOOR_Y+type.radius+height,z:PROP_LANE_Z,height,vx,vy,impacts,angle:-(x-flight.start)/type.radius,done:x>flight.end||age>12};
}
