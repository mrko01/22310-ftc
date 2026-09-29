import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneQuality, shouldRender} from '../src/scene/quality.mjs';

test('high-DPI phones stay within a bounded rendering budget', () => {
  const phone = sceneQuality({width:430,height:600,pixelRatio:3,coarse:true});
  assert.ok(430*600*phone.pixelRatio**2 <= 1100000);
  assert.equal(phone.frameInterval, 1000/30);
  const desktop = sceneQuality({width:1600,height:1200,pixelRatio:2});
  assert.ok(1600*1200*desktop.pixelRatio**2 <= 2400001);
  assert.equal(desktop.frameInterval, 1000/60);
  assert.ok(Number.isFinite(sceneQuality({width:0,height:0,pixelRatio:3}).pixelRatio));
});

test('hidden, offscreen and settled paused scenes do not render', () => {
  const state = {visible:true,hidden:false,paused:false,now:5000,activeUntil:4000};
  assert.equal(shouldRender(state), true);
  assert.equal(shouldRender({...state,visible:false}), false);
  assert.equal(shouldRender({...state,hidden:true}), false);
  assert.equal(shouldRender({...state,paused:true}), false);
  assert.equal(shouldRender({...state,paused:true,activeUntil:6000}), true);
});
