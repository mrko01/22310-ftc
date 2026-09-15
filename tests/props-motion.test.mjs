import test from 'node:test';
import assert from 'node:assert/strict';
import {FLOOR_Y,PROP_LANE_Z,propTypes,propSequence,seededRandom,createFlight,sampleFlight} from '../dist/assets/props-motion.js';

test('each set includes all five props without immediate repeats, spaced 4–7 seconds apart',()=>{
  const next=propSequence(seededRandom(22310));let last;
  for(let cycle=0;cycle<100;cycle++){
    const kinds=new Set();
    for(let i=0;i<5;i++){const cue=next();assert.notEqual(cue.type.kind,last);last=cue.type.kind;kinds.add(last);assert.ok(cue.delay>=4&&cue.delay<=7);}
    assert.equal(kinds.size,5);
  }
});
test('objects stay above the shared floor and leave the screen at varied frame rates and viewport widths',()=>{
  for(const type of propTypes)for(const route of [0,1,2,3])for(const width of [2,3,5,8])for(const fps of [12,24,30,60,120]){
    const flight=createFlight(type,width,1.3,.94,route,4);let previous=flight.start,exited=false;
    for(let frame=0;frame<fps*12;frame++){
      const p=sampleFlight(flight,frame/fps);
      assert.ok(Number.isFinite(p.y)&&Number.isFinite(p.angle));
      assert.ok(p.y>=FLOOR_Y+type.radius-1e-9);
      assert.ok(flight.direction*(p.x-previous)>=-1e-9);previous=p.x;
      assert.ok(p.z-type.radius>1.66+.65,'prop must clear inflated rover path');
      if(p.done){assert.ok(flight.direction*(p.x-flight.end)>0,'exit must happen offscreen, not via time limit');exited=true;break;}
    }
    assert.ok(exited);
  }
});
test('impact positions are continuous and each bounce loses energy',()=>{
  for(const type of propTypes){
    const flight=createFlight(type,3);
    for(let i=0;i<flight.segments.length;i++){
      const s=flight.segments[i],time=s.time+s.duration;
      const before=sampleFlight(flight,time-1e-7),after=sampleFlight(flight,time+1e-7);
      assert.ok(Math.abs(before.x-after.x)<1e-5);assert.ok(Math.abs(before.y-after.y)<1e-5);
      if(i<flight.segments.length-1)assert.ok(Math.abs(after.vy)<Math.abs(before.vy),'bounce gained energy');
    }
    const roll=sampleFlight(flight,flight.rollTime+.1);
    assert.equal(roll.height,0);assert.equal(roll.vy,0);
  }
});
test('sampling after a pause or skipped frame does not change trajectory or penetrate the floor',()=>{
  const flight=createFlight(propTypes[0],3);
  const expected=sampleFlight(flight,1.25);
  for(let i=0;i<150;i++)sampleFlight(flight,i/120);
  assert.deepEqual(sampleFlight(flight,1.25),expected);
  assert.equal(sampleFlight(flight,1.25).z,PROP_LANE_Z);
});

test('entry points start fully outside the viewport and top drops stay outside the central face area',()=>{
 for(const route of [0,1,2,3])for(const width of [2,3,5,8]){
  const flight=createFlight(propTypes[0],width,1,1,route,4),p=sampleFlight(flight,0);
  assert.ok(Math.abs(p.x)-.23>width||p.y-.23>4);
  if(route>=2)for(let t=0;t<3;t+=.02){const point=sampleFlight(flight,t);assert.ok(Math.abs(point.x)>=1.65);}
 }
});
