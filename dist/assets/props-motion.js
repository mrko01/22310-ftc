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
  let bag=[],last=-1,route=-1;
  return () => {
    if(!bag.length){bag=propTypes.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.at(-1)===last)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];}
    last=bag.pop();route=(route+1+Math.floor(random()*3))%4;return {type:propTypes[last],route,delay:4+random()*3,loft:.7+random()*.6,speed:.94+random()*.12};
  };
}
// Solve each impact exactly, then sample the flight at any time. Independent of
// rendering rate: dropped frames cannot tunnel through the floor or add energy.
export function createFlight(type, halfWidth, loft=1, speed=1, route=0, top=4) {
  // Two side throws and two outward top drops keep the central face area clear.
  const direction=route===1||route===2?-1:1;
  const fromTop=route>=2;
  const start=fromTop?direction*Math.min(halfWidth-.35,Math.max(1.65,halfWidth*.6)):-direction*(halfWidth+.7);
  const end=direction*(halfWidth+.7);
  const vx=direction*(fromTop?Math.max(.85,Math.abs(end-start)/2.3):Math.abs(end-start)/3.3)*speed;
  if(fromTop)loft=top+.7-FLOOR_Y-type.radius;
  const segments=[];let time=0,x=start,y=loft,vy=-.15,velocity=vx;
  for(let bounce=0;bounce<12;bounce++){
    const duration=(vy+Math.sqrt(vy*vy+2*GRAVITY*y))/GRAVITY;
    segments.push({time,x,y,vy,vx:velocity,duration});
    time+=duration;x+=velocity*duration;
    vy=(GRAVITY*duration-vy)*type.restitution;velocity*=.975;y=0;
    if(vy<.2)break;
  }
  return {type,start,end,direction,friction:fromTop?.06:type.friction,segments,rollTime:time,rollX:x,rollVelocity:velocity};
}
export function sampleFlight(flight, age) {
  const {type}=flight;
  let x,height,vy,vx,impacts=0;
  const segment=flight.segments.find((s,i)=>{if(age>=s.time)impacts=i;return age<s.time+s.duration;});
  if(segment){const t=Math.max(0,age-segment.time);x=segment.x+segment.vx*t;height=Math.max(0,segment.y+segment.vy*t-GRAVITY*t*t/2);vy=segment.vy-GRAVITY*t;vx=segment.vx;}
  else {const t=Math.max(0,age-flight.rollTime);vx=flight.direction*Math.max(0,Math.abs(flight.rollVelocity)-flight.friction*t);const moving=Math.min(t,Math.abs(flight.rollVelocity)/flight.friction);x=flight.rollX+flight.rollVelocity*moving-flight.direction*flight.friction*moving*moving/2;height=0;vy=0;impacts=flight.segments.length;}
  return {x,y:FLOOR_Y+type.radius+height,z:PROP_LANE_Z,height,vx,vy,impacts,angle:-(x-flight.start)/type.radius,done:flight.direction*(x-flight.end)>0};
}
