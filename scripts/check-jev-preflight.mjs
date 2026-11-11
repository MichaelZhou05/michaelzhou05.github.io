/** Reconcile the fixed-state diagnostic against its saved requests and actual physics. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gradeAction,requestFor} from './jev-preflight.mjs';
import {parseJevDecision} from './jev-driver.mjs';
const [config,...rows]=(await readFile(new URL('../results/jev-2026-10-18-input-preflight-1.jsonl',import.meta.url),'utf8')).trim().split('\n').map(JSON.parse);
assert.equal(rows.length,48);
const seen=new Set(),totals={};let cost=0;
for(const row of rows){
 const f=config.fixtures.find(f=>f.id===row.fixture);assert.ok(f);
 const id=`${row.fixture}/${row.variant}`;assert.ok(!seen.has(id));seen.add(id);
 assert.deepEqual(row.request,JSON.parse(JSON.stringify(requestFor(f,row.variant))));
 const decision=parseJevDecision(row.response);
 assert.deepEqual(row.grade,gradeAction(f,decision.plan[0].direction));
 assert.equal(row.response.model,'typesafe/jev-1.13-20260917');
 assert.ok(Number.isFinite(row.response.usage.cost));cost+=row.response.usage.cost;
 totals[row.variant]??={useful:0,calls:0};totals[row.variant].calls++;totals[row.variant].useful+=+row.grade.useful;
}
for(const variant of config.variants)assert.equal(totals[variant].calls,16);
console.log(JSON.stringify({totals,reportedCostUsd:cost}));
