import test from 'node:test';
import assert from 'node:assert/strict';
import { jevRequest, parseJevDecision, askJev, JEV_DIRECTIONS } from './jev-driver.mjs';

function reply(choice = 'up+right') {
  return { model: 'jev-test-fixture', id: 'fixture-request', provider: 'TypeSafe', answers: { direction: {
    type: 'choice', choice, confidence: 1,
    probabilities: Object.fromEntries(JEV_DIRECTIONS.map((key) => [key, Number(key === choice)])),
  } }, usage: { input_tokens: 10, output_tokens: 3 } };
}

test('all nine mutually exclusive controls become a legal fixed-duration move', () => {
  for (const direction of JEV_DIRECTIONS) {
    assert.deepEqual(parseJevDecision(reply(direction)).plan, [{ direction, frames: 6 }]);
  }
  assert.deepEqual(Object.keys(jevRequest({ car: { x: 0, y: 0 } }).questions.direction.criteria), JEV_DIRECTIONS);
});

test('invalid probabilities, unknown actions and invalid confidence cannot drive', () => {
  for (const mutate of [
    (a) => { a.choice = 'teleport'; },
    (a) => { delete a.probabilities.left; },
    (a) => { a.probabilities.left = -0.1; },
    (a) => { a.probabilities.left = 0.5; },
    (a) => { a.confidence = NaN; },
  ]) {
    const data = reply(); mutate(data.answers.direction);
    assert.throws(() => parseJevDecision(data));
  }
});

test('missing credentials fail before any network call', async () => {
  await assert.rejects(askJev({}, { apiKey: '', fetchImpl: () => assert.fail('must not call API') }), /OPENROUTER_API_KEY/);
});

test('request uses official endpoint and preserves state, resolved model and usage', async () => {
  const state = { car: { x: 3, y: 8 }, road: [[0, 0], [12, 12]] };
  const result = await askJev(state, { apiKey: 'test-only', model: 'jev-test-fixture', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://openrouter.ai/api/alpha/decisions');
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    assert.deepEqual(JSON.parse(options.body).state, state);
    assert.equal(JSON.parse(options.body).model, 'jev-test-fixture');
    return { ok: true, json: async () => reply() };
  } });
  assert.equal(result.model, 'jev-test-fixture');
  assert.equal(result.usage.input_tokens, 10);
  assert.equal(result.requestId, 'fixture-request');
  assert.equal(result.provider, 'TypeSafe');
  assert.equal(jevRequest(state).model, 'typesafe/jev-1.13');
});

test('HTTP failures expose status without echoing provider bodies', async () => {
  await assert.rejects(askJev({}, { apiKey: 'test-only', fetchImpl: async () => ({ ok: false, status: 401 }) }), /^Error: Jev HTTP 401$/);
});

test('network, timeout and malformed JSON failures retain safe categories only', async () => {
  for (const [error, expected] of [
    [Object.assign(new Error('secret-bearing message'), { cause: { code: 'ECONNRESET' } }), 'Jev network failure (ECONNRESET)'],
    [Object.assign(new Error('secret-bearing message'), { cause: { code: 'untrusted-secret' } }), 'Jev network failure (UNKNOWN)'],
    [Object.assign(new Error('secret-bearing message'), { name: 'TimeoutError' }), 'Jev request timed out'],
  ]) await assert.rejects(askJev({}, { apiKey: 'test-only', fetchImpl: async () => { throw error; } }), e => e.message === expected);
  await assert.rejects(askJev({}, { apiKey: 'test-only', fetchImpl: async () => ({ ok: true, json: async () => { throw new Error('secret-bearing body'); } }) }), e => e.message === 'Jev response was not valid JSON');
});

test('runner records a bounded incomplete trial and latency with a mock provider', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const directory = await mkdtemp(join(tmpdir(), 'jev-racer-test-'));
  try {
    const preload = join(directory, 'provider.mjs');
    const output = join(directory, 'lap.mjs');
    await writeFile(preload, `globalThis.fetch = async () => ({ok:true,json:async () => (${JSON.stringify(reply('none'))})});`);
    await promisify(execFile)(process.execPath, [
      '--import', preload, 'scripts/run-opus-racer.mjs', '--agent', 'jev', '--sectors', '1', '--out', output,
    ], { cwd: new URL('..', import.meta.url), env: { ...process.env, OPENROUTER_API_KEY: 'test-only' } });
    const { jevLap } = await import(pathToFileURL(output).href);
    assert.equal(jevLap.finished, false);
    assert.equal(jevLap.finishTime, 25);
    assert.equal(jevLap.modelCalls, 250);
    assert.equal(jevLap.model, 'jev-test-fixture');
    assert.equal(jevLap.decisions.length, 250);
    assert.equal(jevLap.responseLatencyMs.calls, 250);
    assert.equal(jevLap.costUsd, null);
    assert.equal(jevLap.transport, 'openrouter-decisions-http');
    assert.equal(jevLap.costBasis, 'openrouter-reported-usd');
    assert.equal(jevLap.controlMode, 'reactive-choice-6-frames');
    assert.ok(jevLap.frames.length > 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('runner totals reported OpenRouter charges and saves reconciliation IDs', async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const directory = await mkdtemp(join(tmpdir(), 'openrouter-cost-test-'));
  try {
    const preload = join(directory, 'provider.mjs');
    const output = join(directory, 'lap.mjs');
    const payload = reply('none');
    payload.usage.cost = 0.0000042;
    await writeFile(preload, `globalThis.fetch = async () => ({ok:true,json:async () => (${JSON.stringify(payload)})});`);
    await promisify(execFile)(process.execPath, [
      '--import', preload, 'scripts/run-opus-racer.mjs', '--agent', 'jev', '--mode', 'reactive', '--max-calls', '2', '--out', output,
    ], { cwd: new URL('..', import.meta.url), env: { ...process.env, OPENROUTER_API_KEY: 'test-only' } });
    const { jevLap } = await import(pathToFileURL(output).href);
    assert.equal(jevLap.costUsd, 0.0000084);
    const audit = (await readFile(`${output}.audit.jsonl`, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(audit[0].provider, 'openrouter');
    assert.equal(audit[1].requestId, 'fixture-request');
    assert.equal(audit[1].provider, 'TypeSafe');
    assert.equal(audit[1].costUsd, 0.0000042);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('probability validation diagnostics contain only expected numeric fields', () => {
  const payload = reply();
  payload.answers.direction.probabilities.unexpected = 'do-not-log';
  assert.throws(() => parseJevDecision(payload), error => {
    assert.equal(error.validation.probabilityCount, 10);
    assert.ok(!JSON.stringify(error.validation).includes('do-not-log'));
    assert.deepEqual(Object.keys(error.validation.probabilities), JEV_DIRECTIONS);
    return true;
  });
});

// Observed OpenRouter response: a legal returned choice need not equal argmax.
test('executes the supplied legal choice and flags its probability mismatch', () => {
  const data = reply();
  data.answers.direction.choice = 'up+right';
  data.answers.direction.probabilities = { up: .03, down: .08, left: .08, right: .07,
    'up+left': .2, 'up+right': .19, 'down+left': .18, 'down+right': .16, none: .01 };
  const decision = parseJevDecision(data);
  assert.deepEqual(decision.plan, [{ direction: 'up+right', frames: 6 }]);
  assert.equal(decision.choiceMatchesArgmax, false);
  assert.deepEqual(decision.probabilities, data.answers.direction.probabilities);
});

test('opt-in transient retry preserves state, logs failures, and respects attempt caps', async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { verifyRacePhysics } = await import('./verify-race-physics.mjs');
  for (const [scenario, cap, expectedAttempts, expectedCalls] of [['recover', 3, 3, 2], ['always-timeout', 10, 2, 0], ['recover', 1, 1, 0], ['invalid', 10, 1, 0]]) {
    const dir = await mkdtemp(join(tmpdir(), 'jev-retry-'));
    try {
      const preload = join(dir, 'mock.mjs'), output = join(dir, 'lap.mjs');
      const payload = reply('right'); payload.usage.cost = .01;
      if (scenario === 'invalid') payload.answers.direction.choice = 'invalid';
      await writeFile(preload, `let calls=0;globalThis.fetch=async()=>{calls++;if(${JSON.stringify(scenario)}!=='invalid'&&(calls===1||${JSON.stringify(scenario)}==='always-timeout'))throw Object.assign(new Error('private detail'),{name:'TimeoutError'});return {ok:true,json:async()=>(${JSON.stringify(payload)})};};`);
      await promisify(execFile)(process.execPath, ['--import', preload, 'scripts/run-opus-racer.mjs', '--agent', 'jev', '--network-retries', '1', '--max-calls', String(cap), '--out', output], { env: { ...process.env, OPENROUTER_API_KEY: 'test-only' } });
      const { jevLap } = await import(pathToFileURL(output));
      const [config, ...rows] = (await readFile(output + '.audit.jsonl', 'utf8')).trim().split('\n').map(JSON.parse);
      assert.equal(rows.length, expectedAttempts); assert.equal(jevLap.modelCalls, expectedCalls);
      assert.equal(config.networkRetries, 1); assert.equal(jevLap.networkRetries, 1);
      assert.equal(jevLap.costUsd, null);
      if (rows.length > 1) {
        assert.equal(rows[1].retryOf, 1);
        assert.equal(rows[0].simulationTime, rows[1].simulationTime);
        assert.deepEqual(rows[0].request, rows[1].request);
      }
      verifyRacePhysics(jevLap, rows);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});
