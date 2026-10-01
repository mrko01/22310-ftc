import test from 'node:test';
import assert from 'node:assert/strict';
import {constrainDrive,springStep,stepBall,MAX_BALLS} from '../src/experience/interactions.js';

test('driving stays within the field and slides along the central keep-out',()=>{
  assert.deepEqual(constrainDrive({x:1.5,z:1.5},{x:2,z:2}),{x:1.58,z:1.58});
  const slide=constrainDrive({x:.95,z:.3},{x:.89,z:.34});
  assert.deepEqual(slide,{x:.95,z:.34});
  let position={x:1.1,z:1.1};
  for(let i=0;i<1000;i++) {
    position=constrainDrive(position,{x:position.x+Math.sin(i*.13)*.04,z:position.z+Math.cos(i*.07)*.04});
    assert.ok(Number.isFinite(position.x)&&Number.isFinite(position.z));
    assert.ok(Math.abs(position.x)<=1.58&&Math.abs(position.z)<=1.58);
    assert.ok(!(position.x>-.91&&position.x<.91&&position.z>-.77&&position.z<.77),'does not enter central frame');
  }
});

test('hive spring converges toward input, returns to rest and never exceeds its stops',()=>{
  let state={angle:0,velocity:0};
  for(let i=0;i<1000;i++) {
    state=springStep(state.angle,state.velocity,.3,1/120);
    assert.ok(Number.isFinite(state.angle)&&Number.isFinite(state.velocity));
    assert.ok(Math.abs(state.angle)<=.43);
  }
  assert.ok(Math.abs(state.angle-.3)<.0001);
  for(let i=0;i<1000;i++)state=springStep(state.angle,state.velocity,0,1/120);
  assert.equal(state.angle,0);assert.equal(state.velocity,0);
  state={angle:0,velocity:0};
  for(let i=0;i<1000;i++) {
    state=springStep(state.angle,state.velocity,1,1/120);
    assert.ok(Math.abs(state.angle)<=.43);
  }
});

test('dropped balls bounce, remain within floor/walls and settle',()=>{
  const ball={position:{x:1.7,y:1.6,z:0},velocity:{x:2,y:0,z:.3},radius:.03556};
  let bounced=false,lastVelocity=ball.velocity.y;
  for(let i=0;i<3000;i++) {
    stepBall(ball,1/120);
    if(lastVelocity<0&&ball.velocity.y>0)bounced=true;
    lastVelocity=ball.velocity.y;
    assert.ok(Object.values(ball.position).every(Number.isFinite));
    assert.ok(Object.values(ball.velocity).every(Number.isFinite));
    assert.ok(ball.position.y>=ball.radius);
    assert.ok(Math.abs(ball.position.x)<=1.79-ball.radius+1e-12);
    assert.ok(Math.abs(ball.position.z)<=1.79-ball.radius+1e-12);
  }
  assert.ok(bounced);assert.equal(ball.position.y,ball.radius);
  assert.deepEqual(ball.velocity,{x:0,y:0,z:0});
});

test('resting balls stay on a nonzero CAD floor and pooling has a bounded budget',()=>{
  const floor=.015,ball={position:{x:0,y:floor+.04572,z:0},velocity:{x:0,y:0,z:0},radius:.04572};
  for(let i=0;i<240;i++)stepBall(ball,1/120,floor);
  assert.equal(ball.position.y,floor+ball.radius);
  assert.deepEqual(ball.velocity,{x:0,y:0,z:0});
  assert.ok(Number.isInteger(MAX_BALLS)&&MAX_BALLS>0&&MAX_BALLS<=64);
});
