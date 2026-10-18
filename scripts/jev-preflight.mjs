/** Bounded development-only live comparison; no selected action or evaluator scores enter state. */
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildCourse,createDriver,createCamera,locate,pointAtDistance,stepDriver,updateCamera,ROAD_HALF_WIDTH } from '../race-sim.js';
import { buildObservation,drivingPrompt,DIRECTION_KEYS,ACTION_FRAMES } from './racer-protocol.mjs';
import { jevRequest,parseJevDecision } from './jev-driver.mjs';
import { candidateState,candidateQuestion } from './racer-observation-v3.mjs';
const course=buildCourse();
const clone=x=>structuredClone(x);
export function gradeAction(fixture,direction) {
  const d=clone(fixture.driver),c=clone(fixture.camera);
  const initial=locate(course,d.x,d.y,d.index);
  let grass=0,walls=0;
  for(let i=0;i<ACTION_FRAMES;i++) { const r=stepDriver(course,d,DIRECTION_KEYS.get(direction),c,1/60);grass+=+r.offTrack;walls+=+r.hitWall;updateCamera(course,c,fixture.index,1/60); }
  const final=locate(course,d.x,d.y,d.index);
  return {useful:fixture.driver.offTrack ? final.absOffset<initial.absOffset-1 && walls===0 : grass===0 && final.distance>initial.distance+0.25,
    initialOffset:initial.absOffset,finalOffset:final.absOffset,progress:final.distance-initial.distance,grassFrames:grass,wallFrames:walls};
}
export async function fixtures() {
  const result=[];
  for(const index of [0,3,8,14]) for(const offset of [0,-70,70]){
    const distance=course.track.sectors[index].startDistance+150;
    const point=pointAtDistance(course,distance);
    const driver={...createDriver(course),x:point.x-Math.sin(point.angle)*offset,y:point.y+Math.cos(point.angle)*offset};
    const hint=course.track.points.findIndex(p=>p.distance>=distance);
    const found=locate(course,driver.x,driver.y,hint);
    Object.assign(driver,{index:found.index,offset:found.offset,distance:found.distance,offTrack:Math.abs(found.offset)>ROAD_HALF_WIDTH});
    const camera=createCamera(course,index);
    if(index===8) {camera.angle+=0.6;camera.scale*=1.2;}
    result.push({id:`sector-${index+1}-offset-${offset}`,index,driver,camera,previous:null});
  }
  const audit=(await readFile(new URL('../results/jev-2026-10-18-r5.js.audit.jsonl',import.meta.url),'utf8')).trim().split('\n').map(JSON.parse).slice(1);
  const driver=createDriver(course),camera=createCamera(course,0);
  let previous=null;
  for(let n=1;n<=201;n++) {
    if([3,16,66,201].includes(n))result.push({id:`r5-call-${n}`,index:0,driver:clone(driver),camera:clone(camera),previous:clone(previous), originalPrompt:audit[n-1].prompt});
    const start={x:driver.x,y:driver.y,distance:driver.distance};
    const move=JSON.parse(audit[n-1].reply).plan[0]; let grass=0,walls=0;
    for(let i=0;i<move.frames;i++){const r=stepDriver(course,driver,DIRECTION_KEYS.get(move.direction),camera,1/60);grass+=+r.offTrack;walls+=+r.hitWall;updateCamera(course,camera,0,1/60);}
    previous={moves:[move],ranFrames:move.frames,dx:driver.x-start.x,dy:driver.y-start.y,gained:driver.distance-start.distance,grass,walls};
  }
  return result;
}
export function requestFor(fixture,variant,model='typesafe/jev-1.13') {
  const {driver,camera,index,previous}=fixture,gate=course.track.sectors[index].endDistance;
  if(variant==='v2-baseline')return jevRequest({movementRules:drivingPrompt({reactive:true,typedChoice:true}),screenStateAndFeedback:fixture.originalPrompt??`Screen state:\n${JSON.stringify(buildObservation(course,driver,camera,index,gate,previous))}\nChoose the next fixed-duration move using the movement rules.`},model);
  const state=candidateState(course,driver,camera,index,gate,previous,variant);
  return {model,state,questions:{direction:candidateQuestion(state)}};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
  const cases=await fixtures();
  if(!process.argv.includes('--live')) {
    console.log(JSON.stringify(cases.map(f=>({id:f.id,onGrass:f.driver.offTrack,usefulDirections:[...DIRECTION_KEYS.keys()].filter(d=>gradeAction(f,d).useful)})),null,2));
    process.exit(0);
  }
  const outIndex=process.argv.indexOf('--out'),out=process.argv[outIndex+1];
  if(outIndex<0||!out)throw new Error('Explicit fresh --out required');
  if(!process.env.OPENROUTER_API_KEY)throw new Error('OPENROUTER_API_KEY required');
  const variants=['v2-baseline','absolute-named','relative-named'];
  const hashes={};for(const name of ['jev-preflight.mjs','racer-observation-v3.mjs','racer-protocol.mjs','jev-driver.mjs'])hashes[name]=createHash('sha256').update(await readFile(new URL(name,import.meta.url))).digest('hex');
  await writeFile(out,JSON.stringify({type:'config',startedAt:new Date().toISOString(),maxCalls:48,variants,fixtures:cases,hashes,scoreDefinition:'Road: stay asphalt and advance >0.25m. Grass: reduce nearest-road distance by >1m without wall collision. Scores are never supplied to the model.'})+'\n',{flag:'wx'});
  let count=0,cost=0;const totals=Object.fromEntries(variants.map(v=>[v,{useful:0,calls:0}]));
  // Rotate format order per state to avoid always assigning one variant to colder requests.
  for(let i=0;i<cases.length;i++)for(let j=0;j<variants.length;j++){
    const variant=variants[(i+j)%variants.length],fixture=cases[i],request=requestFor(fixture,variant);
    const start=performance.now();let payload;
    const response=await fetch('https://openrouter.ai/api/alpha/decisions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(30000)});
    if(!response.ok){await appendFile(out,JSON.stringify({type:'failure',fixture:fixture.id,variant,status:response.status})+'\n');throw new Error(`Jev HTTP ${response.status}; stopped without retry`);}
    payload=await response.json();
    const decision=parseJevDecision(payload),grade=gradeAction(fixture,decision.plan[0].direction);
    await appendFile(out,JSON.stringify({fixture:fixture.id,variant,request,response:payload,responseMs:performance.now()-start,grade})+'\n');
    count++;cost+=payload.usage?.cost??0;totals[variant].calls++;totals[variant].useful+=+grade.useful;
    console.log(`${count}/48 ${fixture.id} ${variant}: ${decision.plan[0].direction}, useful=${grade.useful}`);
  }
  console.log(JSON.stringify({totals,reportedCostUsd:cost}));
}
