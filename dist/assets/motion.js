// A critically damped transition with a speed limit, stable across frame rates.
export function smoothDamp(current, target, velocity, delta, smoothTime = .34, maxSpeed = 3) {
  const dt = Math.min(.05, Math.max(0, delta));
  const omega = 2 / Math.max(.001, smoothTime), x = omega * dt;
  const decay = 1 / (1 + x + .48 * x * x + .235 * x * x * x);
  const original = target, limit = maxSpeed * smoothTime;
  const change = Math.max(-limit, Math.min(limit, current - target));
  target = current - change;
  const temp = (velocity + omega * change) * dt;
  let speed = (velocity - omega * temp) * decay;
  let value = target + (change + temp) * decay;
  if ((original - current > 0) === (value > original)) { value = original; speed = 0; }
  return { value, velocity: speed };
}
export const poses = [
  [-.12,0,1.0,1.12,0,-.06,0],
  [-.30,2.30,.30,-2.30,.10,-.025,0],
  [-.90,-.45,.90,.45,0,0,0],
  [-.4,-.7,.2,.6,.13,.025,.025],
  [-.12,0,1.04,1.14,0,-.08,0],
];
export function poseAt(chapter) {
  const position = Math.max(0, Math.min(poses.length-1, Number.isFinite(chapter) ? chapter : 0));
  const index = Math.floor(position), fraction = position - index;
  const mix = fraction * fraction * (3 - 2 * fraction);
  return poses[index].map((v, i) => v + (poses[Math.min(poses.length-1, index + 1)][i] - v) * mix);
}
export const roverStops = [[2.05,1.65],[2.2,-.9],[1.85,1.65],[-1.8,1.65],[-2.2,-1.0],[-2.05,1.6],[2.05,1.65]];

// The obstacle lives entirely in the right-hand lane, clear of the mascot.
export function rampHeight(x,z) {
  if(Math.abs(x-2.12)>.61||Math.abs(z-.30)>=.75)return 0;
  return .18*Math.min(1,(.75-Math.abs(z-.30))/.53);
}
export const roverDwell=[.8,1,.65,.8,3.9,.7];
export const roverDurations=[3.5,3.5,4.1,3.5,6.7,4.1];
export const smootherstep=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
export function roverMotion(time) {
  const total=roverDurations.reduce((sum,n)=>sum+n,0);
  let phase=((time%total)+total)%total,segment=0;
  while(phase>=roverDurations[segment]&&segment<5)phase-=roverDurations[segment++];
  const from=roverStops[segment],to=roverStops[segment+1];
  const drive=smootherstep((phase-roverDwell[segment])/(roverDurations[segment]-roverDwell[segment]));
  return {segment,phase,drive,x:from[0]+(to[0]-from[0])*drive,z:from[1]+(to[1]-from[1])*drive,aim:Math.atan2(to[0]-from[0],to[1]-from[1])};
}
