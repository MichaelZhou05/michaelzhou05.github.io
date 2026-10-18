import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleLap } from '../race-replay.js';
import { jevLap } from '../jev-lap.js';
import { opusLap } from '../opus-lap.js';

test('real Jev trial moves during playback and stops without becoming a finish', () => {
  const start = sampleLap(jevLap, 0);
  const moving = sampleLap(jevLap, 1);
  assert.notDeepEqual([moving.x, moving.y], [start.x, start.y]);
  assert.equal(moving.done, false);
  assert.equal(moving.finished, false);
  const end = sampleLap(jevLap, jevLap.finishTime);
  const later = sampleLap(jevLap, jevLap.finishTime + 500);
  assert.deepEqual(end, later);
  assert.equal(end.done, true);
  assert.equal(end.finished, false);
  assert.deepEqual([end.x, end.y], jevLap.frames.at(-1).slice(1, 3));
});
test('completed Opus replay becomes a finish only at its recorded end', () => {
  assert.equal(sampleLap(opusLap, opusLap.finishTime - 1).finished, false);
  assert.equal(sampleLap(opusLap, opusLap.finishTime).finished, true);
});
