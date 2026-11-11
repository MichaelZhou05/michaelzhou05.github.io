import test from 'node:test';
import assert from 'node:assert/strict';
import { orientationFixtures, orientationRequest, executeDiagnosticMove } from './jev-orientation-preflight.mjs';
import { buildCourse, locate, pointAtDistance } from '../race-sim.js';
import { worldToScreen } from './racer-protocol.mjs';
const course = buildCourse();
test('focused observations preserve the complete successful recovery interface on grass', async () => {
  for (const f of (await orientationFixtures()).filter(f => f.driver.offTrack)) {
    assert.deepEqual(orientationRequest(f, 'surface-focused'), orientationRequest(f, 'absolute-named'));
  }
});
test('local forward geometry follows the actual track even when the finish lies in the opposite direction', async () => {
  const cases = (await orientationFixtures()).filter(f => !f.driver.offTrack);
  for (const f of cases) {
    const s = orientationRequest(f, 'surface-focused').state;
    const nearest = locate(course, f.driver.x, f.driver.y, f.driver.index), view = course.sectorViews[f.index];
    for (const p of s.nearbyRoadAhead) {
      const point = pointAtDistance(course, nearest.distance + p.aheadAlongRoadPixels / view.scale);
      const screen = worldToScreen(view, point.x, point.y);
      assert.ok(Math.abs(screen.x - p.x) < .006 && Math.abs(screen.y - p.y) < .006);
    }
    assert.ok(Math.abs(Math.hypot(s.forwardRoadUnitVector.x, s.forwardRoadUnitVector.y) - 1) < .01);
  }
  const loop = orientationRequest(cases.find(f => f.id === 'r6-sector7-call-13'), 'surface-focused').state;
  assert.ok(loop.sectorFinish.center.x > loop.car.x);
  assert.ok(loop.forwardRoadUnitVector.x < 0 && loop.forwardRoadUnitVector.y < 0);
});
test('signed progress reports reversing, even when the high-water lap distance cannot decrease', async () => {
  const f = (await orientationFixtures()).find(f => f.id === 'r6-sector7-call-91');
  const initial = f.driver.distance;
  executeDiagnosticMove(f, 'down+right');
  assert.ok(f.driver.distance >= initial);
  assert.ok(orientationRequest(f, 'surface-focused').state.previousAction.signedRouteProgressPixels < 0);
});
