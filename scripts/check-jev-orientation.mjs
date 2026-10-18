/** Re-execute every saved diagnostic choice, including the unsuccessful and partial trials. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { orientationRequest, executeDiagnosticMove } from './jev-orientation-preflight.mjs';
import { gradeAction } from './jev-preflight.mjs';
import { parseJevDecision } from './jev-driver.mjs';
for (const name of ['orientation-preflight-1', 'orientation-preflight-2', 'orientation-pilot']) {
  const [config, ...rows] = (await readFile(new URL(`../results/jev-2026-10-18-${name}.jsonl`, import.meta.url), 'utf8')).trim().split('\n').map(JSON.parse);
  const fixtures = new Map(config.fixtures.map(f => [f.id, structuredClone(f)]));
  let cost = 0, calls = 0, failed = 0, frames = 0, grass = 0, walls = 0, reachedGate = false;
  const totals = {}, seen = new Set();
  for (const row of rows) {
    if (row.type === 'summary') {
      assert.deepEqual(row.totals, totals);
      assert.equal(row.reportedCostUsd, cost);
      if (config.pilot) {
        assert.equal(row.reachedGate, reachedGate);
        assert.equal(row.simulationSeconds, frames / 60);
        assert.equal(row.grassSeconds, grass / 60);
        assert.equal(row.wallFrames, walls);
        assert.equal(row.diagnosticOnly, true);
      }
      continue;
    }
    const f = fixtures.get(row.fixture); assert.ok(f);
    assert.ok(config.variants.includes(row.variant));
    assert.deepEqual(row.request, JSON.parse(JSON.stringify(orientationRequest(f, row.variant))));
    if (!config.pilot) { const key = `${row.fixture}/${row.variant}`; assert.ok(!seen.has(key)); seen.add(key); }
    if (row.failure) { failed++; assert.equal(row, rows.at(-1)); continue; }
    const decision = row.response.decision;
    assert.deepEqual(parseJevDecision({ answers: { direction: { type: 'choice', choice: decision.plan[0].direction, probabilities: decision.probabilities, confidence: decision.confidence } } }), decision);
    assert.deepEqual(row.grade, gradeAction(f, decision.plan[0].direction));
    assert.equal(row.response.model, 'typesafe/jev-1.13-20260917');
    assert.ok(Number.isFinite(row.response.usage.cost));
    calls++; cost += row.response.usage.cost;
    totals[row.variant] ??= { useful: 0, calls: 0 };
    totals[row.variant].calls++; totals[row.variant].useful += +row.grade.useful;
    if (config.pilot) {
      const r = executeDiagnosticMove(f, decision.plan[0].direction);
      assert.deepEqual(row.executed, r);
      frames += r.ranFrames; grass += r.grass; walls += r.walls; reachedGate = r.reachedGate;
    }
  }
  assert.ok(calls + failed <= config.maxCalls);
  assert.ok(failed || rows.at(-1).type === 'summary');
  console.log(JSON.stringify({ name, calls, failed, totals, reportedSuccessfulCostUsd: cost, ...(config.pilot ? { reachedGate, seconds: frames / 60, grassSeconds: grass / 60, walls } : {}) }));
}
