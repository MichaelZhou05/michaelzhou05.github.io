// Verify the published measurements against their persisted audit evidence.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { matchedRuns } from '../race-results.js';
for (const { label, lap, artifact } of matchedRuns) {
  const audit = (await readFile(new URL(`../${artifact}.audit.jsonl`, import.meta.url), 'utf8'))
    .trim().split('\n').map(JSON.parse);
  const [config, ...attempts] = audit;
  assert.equal(config.type, 'config', label);
  assert.deepEqual(lap.hashes, config.hashes, label);
  assert.equal(lap.startedAt, config.startedAt, label);
  const valid = attempts.filter(row => row.status === 'ok');
  assert.equal(lap.responseLatencyMs.attempts, attempts.length, label);
  assert.equal(lap.responseLatencyMs.calls, valid.length, label);
  assert.equal(lap.responseLatencyMs.failed, attempts.length - valid.length, label);
  assert.ok(Math.abs(lap.responseLatencyMs.total - attempts.reduce((s, a) => s + a.responseMs, 0)) < 0.001, label);
  assert.ok(lap.wallTimeMs >= lap.responseLatencyMs.total, label);
  assert.equal(lap.decisions.length, valid.length, label);
  for (const row of valid) {
    assert.ok(Number.isFinite(row.responseMs) && row.responseMs >= 0, label);
    assert.equal(JSON.parse(row.reply).plan[0].frames, 12, label);
    assert.equal(row.resolvedModel, lap.model, label);
  }
  if (lap.costUsd !== null) {
    assert.equal(attempts.length, valid.length, label);
    assert.ok(attempts.every(row => Number.isFinite(row.costUsd)), label);
    assert.ok(Math.abs(lap.costUsd - attempts.reduce((s, a) => s + a.costUsd, 0)) < 1e-10, label);
  }
  assert.ok(lap.frames.length > 1, label);
  assert.equal(lap.frames.at(-1)[0], lap.finishTime, label);
  console.log(`${label}: ${valid.length}/${attempts.length} valid attempts; audit verified`);
}
