import test from 'node:test';
import assert from 'node:assert/strict';
import { latencySummary, jevCost, validateReactive } from './race-metrics.mjs';
test('quantiles exclude failures but total time includes them', () => {
  assert.deepEqual(latencySummary([{ status: 'ok', responseMs: 10 }, { status: 'failed', responseMs: 100 }, { status: 'ok', responseMs: 30 }]),
    { calls: 2, attempts: 3, failed: 1, total: 140, mean: 20, p50: 10, p95: 30 });
  assert.equal(latencySummary([]).p50, null);
});
test('cost is only known for verified model and valid usage', () => {
  assert.equal(jevCost('jev-1.13.0', { input_tokens: 1000 }), 0.000042);
  for (const usage of [null, {}, { input_tokens: -1 }, { input_tokens: 1.5 }]) assert.equal(jevCost('jev-1.13.0', usage), null);
  assert.equal(jevCost('jev-latest', { input_tokens: 1000 }), null);
});
test('reactive output cannot sneak in a longer action or plan', () => {
  assert.throws(() => validateReactive({ moves: [{ frames: 13 }] }));
  assert.throws(() => validateReactive({ moves: [{ frames: 12 }, { frames: 12 }] }));
  assert.doesNotThrow(() => validateReactive({ moves: [{ frames: 12 }] }));
});

import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
for (const agent of ['opus', 'sol']) test(`${agent}: stateless matched calls, bounded attempts and audit`, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'matched-race-'));
  try {
    const binary = join(directory, agent === 'opus' ? 'claude' : 'codex');
    const reply = JSON.stringify({ plan: [{ direction: 'none', frames: 12 }], note: '' });
    const script = agent === 'opus'
      ? `console.log(JSON.stringify({result:${JSON.stringify(reply)},total_cost_usd:0.001,usage:{input_tokens:10}}));`
      : `console.log(JSON.stringify({type:'thread.started',thread_id:'fixture'}));console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:${JSON.stringify(reply)}}}));console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:10,output_tokens:5}}));`;
    await writeFile(binary, `#!${process.execPath}\nif(process.argv.includes('--resume')||process.argv.includes('resume'))process.exit(3);\n${script}`, { mode: 0o755 });
    const out = join(directory, 'result.mjs');
    await promisify(execFile)(process.execPath, ['scripts/run-opus-racer.mjs', '--agent', agent, '--mode', 'reactive', '--max-calls', '2', '--sectors', '1', '--out', out],
      { env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, CODEX_BIN: binary } });
    const lap = (await import(pathToFileURL(out).href))[`${agent}Lap`];
    assert.equal(lap.finished, false);
    assert.equal(lap.finishTime, 0.4);
    assert.equal(lap.responseLatencyMs.attempts, 2);
    assert.equal(lap.historyPolicy, 'stateless-current-state-and-last-feedback');
    assert.equal(lap.costUsd, agent === 'opus' ? 0.002 : null);
    assert.equal(lap.stopReason, 'Call budget exhausted');
    const log = (await readFile(`${out}.audit.jsonl`, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(log.length, 3);
    assert.ok(log[1].prompt.includes('Screen state:'));
    assert.ok(log[1].reply.includes('none'));
    assert.ok(lap.wallTimeMs >= lap.responseLatencyMs.total);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('failed HTTP request is preserved without leaking response body', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'failed-race-'));
  try {
    const preload = join(directory, 'mock.mjs');
    await writeFile(preload, 'globalThis.fetch=async()=>({ok:false,status:401,json:async()=>({secret:"NEVER_PRINT"})});');
    const out = join(directory, 'result.mjs');
    await promisify(execFile)(process.execPath, ['--import', preload, 'scripts/run-opus-racer.mjs', '--agent', 'jev', '--mode', 'reactive', '--out', out],
      { env: { ...process.env, TYPESAFE_API_KEY: 'fixture-only' } });
    const { jevLap } = await import(pathToFileURL(out).href);
    assert.equal(jevLap.responseLatencyMs.failed, 1);
    assert.equal(jevLap.costUsd, null);
    assert.equal(jevLap.finished, false);
    const audit = await readFile(`${out}.audit.jsonl`, 'utf8');
    assert.ok(!audit.includes('NEVER_PRINT') && !audit.includes('fixture-only'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
