/** Explicit route orientation and signed feedback; geometry only, never an action policy. */
import { locate, pointAtDistance } from '../race-sim.js';
import { candidateState, candidateQuestion } from './racer-observation-v3.mjs';
import { worldToScreen } from './racer-protocol.mjs';
const round = n => Number(n.toFixed(2));
export const V4_OBJECTIVE = 'Drive FORWARD along the asphalt road, completing the route in minimum time. Nearby road ahead defines forward; the distant finish may be behind a bend, so moving directly toward its screen position can drive backward. Use nearbyRoadAhead to follow bends in route order. Stay on asphalt; if on grass, return to the nearby road while advancing when possible. Positive signedRouteProgressPixels means forward; negative means backward. Avoid reversing or oscillating. There is no inertia or steering: keys move the car directly. All actions last 6 frames (0.1 seconds); diagonals have the same total speed as cardinal moves. A fresh observation follows each action.';
export function orientedState(course, driver, camera, index, gateDistance, previous) {
  const state = candidateState(course, driver, camera, index, gateDistance, previous, 'absolute-named');
  const view = course.sectorViews[index];
  const nearest = locate(course, driver.x, driver.y, driver.index);
  const screenAt = distance => {
    const p = pointAtDistance(course, distance);
    return worldToScreen(view, p.x, p.y);
  };
  const at = screenAt(nearest.distance), ahead = screenAt(Math.min(gateDistance, nearest.distance + 1 / view.scale));
  const length = Math.hypot(ahead.x - at.x, ahead.y - at.y);
  const describe = (x, y) => `${Math.abs(x)} pixels ${x < 0 ? 'left' : 'right'}, ${Math.abs(y)} pixels ${y < 0 ? 'above' : 'below'} the car`;
  const nearbyRoadAhead = [0, 20, 40, 60, 100, 160].filter(px => nearest.distance + px / view.scale < gateDistance).map(px => {
    const p = screenAt(nearest.distance + px / view.scale);
    const dx = round(p.x - state.car.x), dy = round(p.y - state.car.y);
    return { aheadAlongRoadPixels: px, x: round(p.x), y: round(p.y), relativeToCar: describe(dx, dy) };
  });
  if (previous) {
    const before = locate(course, driver.x - previous.dx, driver.y - previous.dy, driver.index);
    state.previousAction.signedRouteProgressPixels = round((nearest.distance - before.distance) * view.scale);
  }
  return {
    coordinates: state.coordinates,
    car: state.car,
    roadHalfWidthPixels: state.roadHalfWidthPixels,
    nearestRoadCenter: state.nearestRoadCenter,
    nearestRoadRelativeToCar: state.nearestRoadRelativeToCar,
    forwardRoadUnitVector: { x: round((ahead.x - at.x) / (length || 1)), y: round((ahead.y - at.y) / (length || 1)) },
    nearbyRoadAhead,
    ...Object.fromEntries(Object.entries(state).filter(([key]) => !['coordinates', 'car', 'roadHalfWidthPixels', 'nearestRoadCenter', 'nearestRoadRelativeToCar'].includes(key))),
  };
}
export function orientedQuestion(state) {
  return { ...candidateQuestion(state), instructions: V4_OBJECTIVE };
}
