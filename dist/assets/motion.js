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

export function rampHeight(x,z) {
  if(z<1.025||z>2.275||Math.abs(x)>=1.2)return 0;
  return .22*Math.min(1,(1.2-Math.abs(x))/.85);
}
