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

test('ramp meets the floor at both ends and has a level deck',async()=>{
  const {rampHeight}=await import('../dist/assets/motion.js');
  assert.equal(rampHeight(-1.2,1.65),0);assert.equal(rampHeight(1.2,1.65),0);
  assert.equal(rampHeight(0,1.65),.22);assert.equal(rampHeight(0,0),0);
  for(let x=-1.2;x<=1.2;x+=.01)assert.ok(rampHeight(x,1.65)>=0&&rampHeight(x,1.65)<=.22);
});
