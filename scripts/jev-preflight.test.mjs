import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures,requestFor,gradeAction } from './jev-preflight.mjs';
import { DIRECTION_KEYS,worldToScreen } from './racer-protocol.mjs';
import { buildCourse,pointAtDistance } from '../race-sim.js';
const course=buildCourse();
test('named formats preserve car, gate, and every road point under origin translation',async()=>{
 for(const f of await fixtures()){
  const absolute=requestFor(f,'absolute-named').state,relative=requestFor(f,'relative-named').state;
  assert.deepEqual(relative.car,{x:0,y:0,surface:absolute.car.surface});
  const actual=worldToScreen(course.sectorViews[f.index],f.driver.x,f.driver.y);
  assert.ok(Math.abs(absolute.car.x-actual.x)<0.006 && Math.abs(absolute.car.y-actual.y)<0.006);
  for(let i=0;i<absolute.roadCenterlineInForwardOrder.length;i++){
   const a=absolute.roadCenterlineInForwardOrder[i],r=relative.roadCenterlineInForwardOrder[i];
   assert.ok(Math.abs(a.x-absolute.car.x-r.x)<0.02 && Math.abs(a.y-absolute.car.y-r.y)<0.02);
  }
  const gate=pointAtDistance(course,course.track.sectors[f.index].endDistance);
  const screen=worldToScreen(course.sectorViews[f.index],gate.x,gate.y);
  assert.deepEqual(absolute.roadCenterlineInForwardOrder.at(-1),absolute.sectorFinish.center);
  assert.ok(Math.abs(absolute.sectorFinish.center.x-screen.x)<0.006);
  assert.ok(Math.abs(absolute.sectorFinish.center.y-screen.y)<0.006);
  assert.deepEqual(Object.keys(requestFor(f,'absolute-named').questions.direction.criteria),[...DIRECTION_KEYS.keys()]);
 }
});
test('all fixed cases have useful legal actions and grader reproduces observed r5 mistakes',async()=>{
 const cases=await fixtures();assert.equal(cases.length,16);
 for(const f of cases)assert.ok([...DIRECTION_KEYS.keys()].some(a=>gradeAction(f,a).useful));
 const f=cases.find(f=>f.id==='r5-call-201');
 assert.equal(gradeAction(f,'up+left').useful,false);
 assert.equal(gradeAction(f,'down').useful,true);
 assert.equal(gradeAction(cases.find(f=>f.id==='r5-call-3'),'down+right').useful,false);
});
