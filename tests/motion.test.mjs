import test from 'node:test';
import assert from 'node:assert/strict';
import {smoothDamp,poseAt,roverStops} from '../dist/assets/motion.js';

test('rapid section skips remain finite and respect joint speed limits',()=>{
  for(const fps of [20,30,60,120]){
    const current=poseAt(0),velocity=current.map(()=>0);
    for(let frame=0;frame<fps*12;frame++){
      const chapter=[0,6,1,5,2,0,4,6][Math.floor(frame/(fps*.13))%8];
      const target=poseAt(chapter);
      for(let j=0;j<current.length;j++){
        const next=smoothDamp(current[j],target[j],velocity[j],1/fps);
        assert.ok(Number.isFinite(next.value)&&Number.isFinite(next.velocity));
        assert.ok(Math.abs(next.value-current[j])<=3/fps+.001,'joint jumps under fast scrolling');
        current[j]=next.value;velocity[j]=next.velocity;
      }
    }
  }
});
test('a skipped gesture settles directly into the final pose without overshoot',()=>{
  let value=-1.8,velocity=0;
  for(let i=0;i<120;i++){const next=smoothDamp(value,1.14,velocity,1/60);assert.ok(next.value>=value&&next.value<=1.14);value=next.value;velocity=next.velocity;}
  assert.ok(Math.abs(value-1.14)<.003);
});
test('all rover travel segments maintain space around the mascot footprint',()=>{
  for(let i=0;i<roverStops.length-1;i++)for(let step=0;step<=100;step++){
    const t=step/100,x=roverStops[i][0]*(1-t)+roverStops[i+1][0]*t,z=roverStops[i][1]*(1-t)+roverStops[i+1][1]*t;
    assert.ok(Math.abs(x)>1.4||z>1.4||z<-1.2,'rover enters inflated mascot footprint');
    assert.ok(Math.abs(x)<=2.21&&Math.abs(z)<=1.66,'rover leaves the stage');
  }
  assert.deepEqual(roverStops[0],roverStops.at(-1),'route loop must not teleport');
});

test('ramp stays clear of the mascot and meets the floor at both ends',async()=>{
  const {rampHeight}=await import('../dist/assets/motion.js');
  assert.equal(rampHeight(2.12,-.45),0);assert.equal(rampHeight(2.12,1.05),0);
  assert.equal(rampHeight(2.12,.3),.18);
  for(let x=-1.4;x<=1.4;x+=.02)for(let z=-2;z<2;z+=.05)assert.equal(rampHeight(x,z),0);
  for(let z=-.45;z<=1.05;z+=.01)assert.ok(rampHeight(2.12,z)>=0&&rampHeight(2.12,z)<=.18);
});
test('rover route and turning trick have continuous, bounded motion',async()=>{
  const {roverMotion,roverDurations,smootherstep}=await import('../dist/assets/motion.js');
  const duration=roverDurations.reduce((a,b)=>a+b,0);
  for(const fps of [20,30,60,120]){
    let last=roverMotion(0);
    for(let frame=1;frame<duration*fps*2;frame++){
      const next=roverMotion(frame/fps);
      assert.ok(Math.hypot(next.x-last.x,next.z-last.z)*fps<2.5,'excessive drive speed');
      assert.ok(Math.abs(next.x)>1.4||next.z>1.4,'mascot clearance');
      if(next.segment===4&&next.phase<3.2)assert.ok(next.drive===0,'rover must stop for its turn');
      last=next;
    }
  }
  assert.equal(smootherstep(0),0);assert.equal(smootherstep(1),1);
  assert.ok(smootherstep(.001)<1e-7,'spin starts without a jump');
  assert.deepEqual(roverMotion(0),roverMotion(duration));
});
