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

test('named runner sends structured state, preserves request audit, and executes the returned choice',async()=>{
 const {mkdtemp,writeFile,readFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {pathToFileURL}=await import('node:url');
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');
 const {verifyRacePhysics}=await import('./verify-race-physics.mjs');
 for (const format of ['absolute-named', 'surface-focused']) {
 const dir=await mkdtemp(join(tmpdir(),'jev-structured-'));
 try {
  const fixture={model:'test-fixture',answers:{direction:{type:'choice',choice:'right',confidence:1,probabilities:Object.fromEntries([...DIRECTION_KEYS.keys()].map(k=>[k,+(k==='right')]))}},usage:{cost:0}};
  const preload=join(dir,'mock.mjs'),output=join(dir,'lap.mjs');
  await writeFile(preload,`globalThis.fetch=async(url,options)=>{const request=JSON.parse(options.body);if(typeof request.state.car?.x!=='number'||!Array.isArray(request.state.roadCenterlineInForwardOrder)||request.state.screenStateAndFeedback)throw new Error('not structured');return {ok:true,json:async()=>(${JSON.stringify(fixture)})};};`);
  await promisify(execFile)(process.execPath,['--import',preload,'scripts/run-opus-racer.mjs','--agent','jev','--mode','reactive','--observation-format',format,'--max-calls','2','--out',output],{env:{...process.env,OPENROUTER_API_KEY:'test-only'}});
  const {jevLap}=await import(pathToFileURL(output));
  const [config,...rows]=(await readFile(output+'.audit.jsonl','utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(jevLap.modelCalls,2);assert.equal(jevLap.finishTime,0.2);
  assert.equal(jevLap.protocolVersion,format === 'absolute-named' ? 'screen-named-v3-six-frames' : 'screen-focused-v5-six-frames');
  assert.equal(config.observationFormat,format);
  assert.equal(rows[1].request.state.previousAction.keys[0].direction,'right');
  assert.equal(rows[1].request.state.previousAction.keys[0].frames,6);
  verifyRacePhysics(jevLap,rows);
 }finally{await rm(dir,{recursive:true,force:true});}
 }
});
