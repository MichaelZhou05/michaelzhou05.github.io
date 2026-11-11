import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ACTION_FRAMES, DIRECTION_KEYS, buildObservation, movementVectors, worldToScreen, windowSwingDegrees, projectVector, drivingPrompt } from './racer-protocol.mjs';
import { buildCourse, createCamera, createDriver, stepDriver, updateCamera, pointAtDistance, ROAD_HALF_WIDTH, CORRIDOR_HALF_WIDTH, ASPHALT_PIXELS_PER_SECOND, GRASS_PIXELS_PER_SECOND, FINISH_MARGIN, LAP_LENGTH_METERS } from '../race-sim.js';
import { jevRequest, parseJevDecision } from './jev-driver.mjs';
const course = buildCourse();
const near = (a, b, epsilon = 0.0001) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);

test('every movement vector and surface speed agrees with actual physics through camera rotations and zooms', () => {
  for (const index of [0, 4, 9, 17]) for (const delta of [-1.4, 0, 0.8]) for (const grass of [false, true]) {
    const view = course.sectorViews[index];
    const camera = { ...createCamera(course, index), angle: view.angle + delta, scale: view.scale * 1.3 };
    const centre = pointAtDistance(course, course.track.sectors[index].startDistance + 50);
    for (const [direction, keys] of DIRECTION_KEYS) {
      const driver = { ...createDriver(course), ...centre, index: course.track.points.findIndex(p => p.distance >= course.track.sectors[index].startDistance + 50), offTrack: grass };
      const before = worldToScreen(view, driver.x, driver.y);
      const observation = buildObservation(course, driver, camera, index, course.track.sectors[index].endDistance);
      const report = stepDriver(course, driver, keys, camera, 1 / 60);
      assert.equal(report.hitWall, false);
      const after = worldToScreen(view, driver.x, driver.y);
      const vector = observation.movementUnitVectors[direction];
      near(after.x - before.x, vector[0] * observation.currentPixelsPerFrame);
      near(after.y - before.y, vector[1] * observation.currentPixelsPerFrame);
      near(observation.currentPixelsPerFrame, (grass ? GRASS_PIXELS_PER_SECOND : ASPHALT_PIXELS_PER_SECOND) / 60 / 1.3);
      near(observation.roadHalfWidthPx, ROAD_HALF_WIDTH * view.scale, 0.006);
      near(observation.corridorHalfWidthPx, CORRIDOR_HALF_WIDTH * view.scale, 0.006);
    }
  }
});

test('positive swing sends right upward; vectors and speeds converge as camera eases', () => {
  const view = course.sectorViews[4];
  const camera = { ...createCamera(course, 4), angle: view.angle + Math.PI / 2, scale: view.scale * 2 };
  near(windowSwingDegrees(camera, view), 90);
  assert.deepEqual(movementVectors(camera, view).right, [0, -1]);
  for (let i = 0; i < 180; i++) updateCamera(course, camera, 4, 1 / 60);
  near(windowSwingDegrees(camera, view), 0);
  near(camera.scale, view.scale);
  near(movementVectors(camera, view).right[0], 1);
});

test('local road is car relative, ordered, and anchored at actual location despite monotonic progress', () => {
  const driver = createDriver(course), camera = createCamera(course, 0);
  driver.distance = 400; // Backtracking must not move the visible near-road geometry forward.
  const observation = buildObservation(course, driver, camera, 0, course.track.sectors[0].endDistance);
  const zero = observation.roadAhead.find(p => p[0] === 0);
  near(zero[1], 0, 0.01); near(zero[2], 0, 0.01);
  assert.deepEqual(observation.car, { x: 0, y: 0, onGrass: false });
  assert.ok(observation.roadAhead.length <= 18);
  assert.ok(observation.roadAhead.every((p, i, a) => i === 0 || a[i - 1][0] < p[0]));
  assert.equal(observation.roadAhead.at(-1)[0], 300);
  const before = observation.roadAhead.map(p => p.slice(1));
  driver.x += 2;
  const after = buildObservation(course, driver, camera, 0, course.track.sectors[0].endDistance);
  assert.notDeepEqual(before, after.roadAhead.map(p => p.slice(1)));
});

test('gate uses the real final threshold and previous movement is reprojected into new sector axes', () => {
  const driver = createDriver(course), camera = createCamera(course, 17);
  const previous = { moves: [{ direction: 'right', frames: 2 }], ranFrames: 2, dx: 12, dy: -7, gained: 3, grass: 1, walls: 0 };
  const end = LAP_LENGTH_METERS - FINISH_MARGIN;
  const observation = buildObservation(course, driver, camera, 17, end, previous);
  const centre = pointAtDistance(course, end);
  const expected = projectVector(camera, centre.x - driver.x, centre.y - driver.y);
  observation.gate[0].forEach((v, i) => near((v + observation.gate[1][i]) / 2, expected[i], 0.006));
  assert.deepEqual(observation.previousAction.moves, previous.moves);
  assert.equal(observation.previousAction.ranFrames, 2);
  projectVector(camera, 12, -7).forEach((v, i) => near(observation.previousAction.displacementPx[i], v, 0.006));
});

test('typed Choice and JSON interfaces share objective and six-frame control; schema matches adapter', async () => {
  const typed = drivingPrompt({ reactive: true, typedChoice: true });
  const json = drivingPrompt({ reactive: true, typedChoice: false });
  assert.equal(typed.split('\nAnswer the typed')[0], json.split('\nReturn only JSON')[0]);
  assert.ok(!typed.includes('"plan"'));
  const request = jevRequest({ movementRules: typed });
  assert.equal(request.questions.direction.type, 'choice');
  assert.deepEqual(Object.keys(request.questions.direction.criteria), [...DIRECTION_KEYS.keys()]);
  const schema = JSON.parse(await readFile(new URL('./racer-reactive.schema.json', import.meta.url)));
  const action = parseJevDecision({ answers: { direction: { type: 'choice', choice: 'none', confidence: 1,
    probabilities: Object.fromEntries([...DIRECTION_KEYS.keys()].map(k => [k, Number(k === 'none')])) } } });
  assert.equal(schema.properties.plan.items.properties.frames.const, action.plan[0].frames);
  assert.equal(action.plan[0].frames, ACTION_FRAMES);
  assert.equal(schema.properties.plan.maxItems, 1);
});
