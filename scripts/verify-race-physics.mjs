/** Independently execute recorded choices and check v2 observations and saved endpoints. No inference. */
import assert from 'node:assert/strict';
import { buildCourse, createDriver, createCamera, stepDriver, updateCamera, LAP_LENGTH_METERS, FINISH_MARGIN } from '../race-sim.js';
import { candidateState, candidateQuestion } from './racer-observation-v3.mjs';
import { buildObservation, DIRECTION_KEYS } from './racer-protocol.mjs';

export function verifyRacePhysics(lap, attempts, { onObservation } = {}) {
  const course = buildCourse(), driver = createDriver(course), camera = createCamera(course, 0);
  let frames = 0, grass = 0, walls = 0, previous = null, previousSector = 1;
  const recording = [[0, Math.round(driver.x), Math.round(driver.y), Number(driver.heading.toFixed(3))]];
  const sectorFrames = new Map();
  const record = () => recording.push([Number((frames / 60).toFixed(3)), Math.round(driver.x), Math.round(driver.y), Number(driver.heading.toFixed(3))]);
  for (const row of attempts) {
    const index = row.sector - 1;
    assert.ok(row.sector === previousSector || row.sector === previousSector + 1);
    if (row.sector > previousSector) assert.ok(driver.distance >= course.track.sectors[index - 1].endDistance);
    previousSector = row.sector;
    const gate = index === 17 ? LAP_LENGTH_METERS - FINISH_MARGIN : course.track.sectors[index].endDistance;
    const delivered = JSON.parse(row.prompt.split('Screen state:\n')[1].split('\n')[0]);
    const expectedObservation = lap.protocolVersion === 'screen-named-v3-six-frames'
      ? candidateState(course, driver, camera, index, gate, previous, 'absolute-named')
      : buildObservation(course, driver, camera, index, gate, previous);
    if (row.request) {
      assert.deepEqual(row.request.state, JSON.parse(JSON.stringify(expectedObservation)));
      assert.deepEqual(row.request.questions.direction, candidateQuestion(expectedObservation));
    }
    assert.deepEqual(delivered, JSON.parse(JSON.stringify(expectedObservation)), `observation at frame ${frames}`);
    assert.equal(row.simulationTime, Number((frames / 60).toFixed(3)));
    onObservation?.(structuredClone({ driver, camera, index, previous }), row);
    if (row.status !== 'ok') continue;
    const { plan } = JSON.parse(row.reply);
    const start = { x: driver.x, y: driver.y, distance: driver.distance };
    previous = { moves: [], ranFrames: 0, dx: 0, dy: 0, gained: 0, grass: 0, walls: 0 };
    for (const move of plan) {
      let ran = 0;
      assert.equal(move.frames, lap.actionFrames);
      for (let i = 0; i < move.frames && (sectorFrames.get(index) ?? 0) < lap.sectorFrameBudget; i++) {
        const result = stepDriver(course, driver, DIRECTION_KEYS.get(move.direction), camera, 1 / 60);
        frames++; ran++; previous.ranFrames++;
        sectorFrames.set(index, (sectorFrames.get(index) ?? 0) + 1);
        if (result.offTrack) { grass++; previous.grass++; }
        if (result.hitWall) { walls++; previous.walls++; }
        if (result.leftTrack) driver.offTrackCount++;
        updateCamera(course, camera, index, 1 / 60);
        if (frames % 3 === 0) record();
        if (driver.distance >= gate) break;
      }
      previous.moves.push({ direction: move.direction, frames: ran });
    }
    previous.dx = driver.x - start.x; previous.dy = driver.y - start.y;
    previous.gained = driver.distance - start.distance;
  }
  record();
  assert.deepEqual(lap.frames, JSON.parse(JSON.stringify(recording)), 'all recorded positions and timestamps match executed choices');
  assert.equal(lap.distance, Math.round(driver.distance));
  assert.equal(lap.finished, driver.distance >= LAP_LENGTH_METERS - FINISH_MARGIN);
  assert.equal(lap.finishTime, Number((frames / 60).toFixed(3)));
  assert.equal(lap.offTrackSeconds, Number((grass / 60).toFixed(2)));
  assert.equal(lap.offTrackCount, driver.offTrackCount);
  assert.equal(lap.wallHits, walls);
}
