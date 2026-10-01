import test from 'node:test';
import assert from 'node:assert/strict';
import {clamp, ease, between, sampleFrames, chapterOpacity, chapters, desktopFrames} from '../src/experience/timeline.mjs';

const values = frame => Object.values(frame).flat();
const epsilon = 1e-7;

test('camera timeline endpoints are stable and returned samples cannot mutate the source', () => {
  for (const [progress, expected] of [[-1,desktopFrames[0]],[0,desktopFrames[0]],[1,desktopFrames.at(-1)],[2,desktopFrames.at(-1)]]) {
    const frame = sampleFrames(desktopFrames, progress);
    assert.deepEqual(frame, expected);
    assert.notEqual(frame, expected);
    frame.camera[0] += 100;
    assert.notEqual(frame.camera[0], expected.camera[0]);
  }
});

test('production keyframes are ordered, finite and exact at their authored times', () => {
  desktopFrames.forEach((frame,index) => {
    assert.ok(values(frame).every(Number.isFinite));
    if (index) assert.ok(frame.at > desktopFrames[index-1].at);
    const result = sampleFrames(desktopFrames, frame.at);
    for (const key of Object.keys(frame)) {
      [frame[key]].flat().forEach((value,i) => {
        const actual = Array.isArray(result[key]) ? result[key][i] : result[key];
        assert.ok(Math.abs(value-actual)<1e-12, `${key} is exact at ${frame.at}`);
      });
    }
  });
});

test('camera, target, robot and visibility remain finite throughout forward and reverse scrolling', () => {
  for(let i=0;i<=2000;i++) {
    const progress=i/2000;
    const frame=sampleFrames(desktopFrames,progress);
    assert.ok(values(frame).every(Number.isFinite), `finite at ${progress}`);
    assert.ok(frame.field >= 0 && frame.field <= 1);
    assert.ok(frame.explode >= 0 && frame.explode <= 1);
    assert.ok(Math.hypot(...frame.camera.map((v,j)=>v-frame.target[j]))>.1, 'camera does not meet its target');
    const reverse=values(sampleFrames(desktopFrames,1-(1-progress)));
    values(frame).forEach((value,index)=>assert.ok(Math.abs(value-reverse[index])<1e-12));
  }
});

test('production camera and assembly interpolation has no jumps across authored boundaries', () => {
  for (const {at} of desktopFrames.slice(1,-1)) {
    const left=values(sampleFrames(desktopFrames,at-epsilon));
    const right=values(sampleFrames(desktopFrames,at+epsilon));
    left.forEach((value,i) => assert.ok(Math.abs(value-right[i])<1e-6, `continuous at ${at}, component ${i}`));
  }
});

test('each segment stays within its neighboring authored values rather than overshooting', () => {
  for(let segment=1;segment<desktopFrames.length;segment++) {
    const a=desktopFrames[segment-1], b=desktopFrames[segment];
    for(let i=0;i<=40;i++) {
      const result=values(sampleFrames(desktopFrames,a.at+(b.at-a.at)*i/40));
      const before=values(a), after=values(b);
      result.forEach((value,j)=>assert.ok(value>=Math.min(before[j],after[j])-1e-12 && value<=Math.max(before[j],after[j])+1e-12));
    }
  }
});

test('chapter opacity remains continuous, bounded and accessible at its intended reading position', () => {
  assert.equal(chapterOpacity(chapters[0],0),1);
  assert.equal(chapterOpacity(chapters.at(-1),1),1);
  for (const chapter of chapters) {
    for(let i=0;i<=1000;i++) {
      const alpha=chapterOpacity(chapter,i/1000);
      assert.ok(Number.isFinite(alpha) && alpha>=0 && alpha<=1);
    }
    for(const at of [chapter.start,chapter.inEnd,chapter.outStart,chapter.end]) {
      assert.ok(Math.abs(chapterOpacity(chapter,at-epsilon)-chapterOpacity(chapter,at+epsilon))<1e-6);
    }
    assert.ok(chapterOpacity(chapter,(chapter.inEnd+chapter.outStart)/2)>.99);
  }
});

test('easing saturates outside its interval and has smooth endpoints', () => {
  assert.deepEqual([-1,0,.5,1,2].map(value=>clamp(value)),[0,0,.5,1,1]);
  assert.equal(ease(-1),0); assert.equal(ease(2),1); assert.equal(ease(.5),.5);
  assert.equal(between(.1,.2,.8),0); assert.equal(between(.9,.2,.8),1);
  assert.ok(ease(epsilon)/epsilon<1e-5);
  assert.ok((1-ease(1-epsilon))/epsilon<1e-5);
});
