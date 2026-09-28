import test from 'node:test';
import assert from 'node:assert/strict';
import { jevRequest, parseJevDecision, askJev, JEV_DIRECTIONS } from './jev-driver.mjs';

function reply(choice = 'up+right') {
  return { model: 'jev-test-fixture', answers: { direction: {
    type: 'choice', choice, confidence: 1,
    probabilities: Object.fromEntries(JEV_DIRECTIONS.map((key) => [key, Number(key === choice)])),
  } }, usage: { input_tokens: 10, output_tokens: 3 } };
}

test('all nine mutually exclusive controls become a legal fixed-duration move', () => {
  for (const direction of JEV_DIRECTIONS) {
    assert.deepEqual(parseJevDecision(reply(direction)).plan, [{ direction, frames: 12 }]);
  }
  assert.deepEqual(Object.keys(jevRequest({ car: { x: 0, y: 0 } }).questions.direction.criteria), JEV_DIRECTIONS);
});

test('invalid probabilities, unknown actions and inconsistent choices cannot drive', () => {
  for (const mutate of [
    (a) => { a.choice = 'teleport'; },
    (a) => { delete a.probabilities.left; },
    (a) => { a.probabilities.left = -0.1; },
    (a) => { a.probabilities.left = 0.5; },
    (a) => { a.confidence = NaN; },
    (a) => { a.choice = 'down'; },
  ]) {
    const data = reply(); mutate(data.answers.direction);
    assert.throws(() => parseJevDecision(data));
  }
});

test('missing credentials fail before any network call', async () => {
  await assert.rejects(askJev({}, { apiKey: '', fetchImpl: () => assert.fail('must not call API') }), /TYPESAFE_API_KEY/);
});

test('request uses official endpoint and preserves state, resolved model and usage', async () => {
  const state = { car: { x: 3, y: 8 }, road: [[0, 0], [12, 12]] };
  const result = await askJev(state, { apiKey: 'test-only', model: 'jev-test-fixture', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    assert.deepEqual(JSON.parse(options.body).state, state);
    assert.equal(JSON.parse(options.body).model, 'jev-test-fixture');
    return { ok: true, json: async () => reply() };
  } });
  assert.equal(result.model, 'jev-test-fixture');
  assert.equal(result.usage.input_tokens, 10);
});

test('HTTP failures expose status without echoing provider bodies', async () => {
  await assert.rejects(askJev({}, { apiKey: 'test-only', fetchImpl: async () => ({ ok: false, status: 401 }) }), /^Error: Jev HTTP 401$/);
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
    ], { cwd: new URL('..', import.meta.url), env: { ...process.env, TYPESAFE_API_KEY: 'test-only' } });
    const { jevLap } = await import(pathToFileURL(output).href);
    assert.equal(jevLap.finished, false);
    assert.equal(jevLap.finishTime, 25);
    assert.equal(jevLap.modelCalls, 125);
    assert.equal(jevLap.model, 'jev-test-fixture');
    assert.equal(jevLap.decisions.length, 125);
    assert.equal(jevLap.responseLatencyMs.calls, 125);
    assert.equal(jevLap.costUsd, null);
    assert.equal(jevLap.controlMode, 'reactive-choice-12-frames');
    assert.ok(jevLap.frames.length > 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
