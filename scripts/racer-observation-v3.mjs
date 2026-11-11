/** Candidate input representations. Pure geometry; no action search, scores or selected steering. */
import { pointAtDistance, locate, ROAD_HALF_WIDTH, CORRIDOR_HALF_WIDTH, ASPHALT_PIXELS_PER_SECOND, GRASS_PIXELS_PER_SECOND } from '../race-sim.js';
import { ACTION_FRAMES, worldToScreen, movementVectors, projectVector } from './racer-protocol.mjs';
const round = n => Number(n.toFixed(2));
export const V3_OBJECTIVE = 'Choose one arrow-key action to drive along the road toward the sector finish. Stay on asphalt. If on grass, first return to the nearby road. Follow the ordered road points through bends; do not drive straight toward a distant finish across grass. There is no inertia or steering: keys move the car directly. All actions last 6 frames (0.1 seconds). Diagonals have the same total speed as cardinal moves. A new observation follows each action.';
export function candidateState(course, driver, camera, index, gateDistance, previous, variant) {
  const view = course.sectorViews[index];
  const origin = variant === 'relative-named' ? worldToScreen(view, driver.x, driver.y) : {x:0,y:0};
  const position = p => {
    const screen = worldToScreen(view, p.x, p.y);
    return { x: round(screen.x-origin.x), y: round(screen.y-origin.y) };
  };
  const nearest = locate(course, driver.x, driver.y, driver.index);
  const road = [];
  // Near detail at 20-pixel arc-distance intervals, continuous context through the actual gate.
  const start = Math.max(0, nearest.distance - 20 / view.scale);
  for (let d = start; d < gateDistance; d += 20 / view.scale) road.push(position(pointAtDistance(course,d)));
  road.push(position(pointAtDistance(course,gateDistance)));
  const gate = pointAtDistance(course,gateDistance);
  const nx = -Math.sin(gate.angle)*ROAD_HALF_WIDTH, ny = Math.cos(gate.angle)*ROAD_HALF_WIDTH;
  const nearestPosition = position(pointAtDistance(course,nearest.distance));
  const carPosition = position(driver);
  const relativeRoad = { x: round(nearestPosition.x-carPosition.x), y: round(nearestPosition.y-carPosition.y) };
  const describe = v => `${Math.abs(v.x)} px ${v.x < 0 ? 'left' : 'right'}, ${Math.abs(v.y)} px ${v.y < 0 ? 'above' : 'below'} the car`;
  return {
    coordinates: variant === 'relative-named'
      ? 'Pixels relative to car: positive x is right; positive y is DOWN. Negative y is UP.'
      : 'Screen pixels: x increases RIGHT; y increases DOWN. Coordinates share the same fixed sector view.',
    car: { ...carPosition, surface: driver.offTrack ? 'grass' : 'asphalt' },
    nearestRoadCenter: nearestPosition,
    nearestRoadRelativeToCar: describe(relativeRoad),
    roadHalfWidthPixels: round(ROAD_HALF_WIDTH*view.scale),
    wallDistanceFromRoadCenterPixels: round(CORRIDOR_HALF_WIDTH*view.scale),
    roadCenterlineInForwardOrder: road,
    sectorFinish: { center: position(gate), endpoints:[position({x:gate.x-nx,y:gate.y-ny}),position({x:gate.x+nx,y:gate.y+ny})] },
    actionDurationFrames: ACTION_FRAMES,
    asphaltPixelsPerFrame: round(ASPHALT_PIXELS_PER_SECOND/60*view.scale/camera.scale),
    grassPixelsPerFrame: round(GRASS_PIXELS_PER_SECOND/60*view.scale/camera.scale),
    previousAction: previous ? { keys: previous.moves, displacementPixels: projectVector(view,previous.dx,previous.dy).map(round), grassFrames:previous.grass,wallFrames:previous.walls } : null,
    initialMovementUnitVectors: movementVectors(camera,view),
  };
}
export function candidateQuestion(state) {
  const descriptions = Object.fromEntries(Object.entries(state.initialMovementUnitVectors).map(([key,[dx,dy]]) => [key,
    key === 'none' ? 'Stop moving. This consumes time without making progress.'
      : `Move ${dx===0?'':`${Math.abs(dx)} units ${dx<0?'LEFT':'RIGHT'}`} ${dy===0?'':`${Math.abs(dy)} units ${dy<0?'UP':'DOWN'}`}. Initial displacement per frame: x=${dx}, y=${dy}, multiplied by the current surface speed. Press ${key}.`,
  ]));
  return {type:'choice',instructions:V3_OBJECTIVE,criteria:descriptions};
}
