/** Shared observation/control contract. Geometry only: never scores or selects an action. */
import {
  ASPHALT_PIXELS_PER_SECOND, GRASS_PIXELS_PER_SECOND, ROAD_HALF_WIDTH,
  CORRIDOR_HALF_WIDTH, LAP_LENGTH_METERS, VIEW_WIDTH, VIEW_HEIGHT,
  pointAtDistance, locate,
} from '../race-sim.js';

export const ACTION_FRAMES = 6;
export const PROTOCOL_VERSION = 'local-road-v2-six-frames';
export const DIRECTION_KEYS = new Map([
  ['up', { up: true }], ['down', { down: true }],
  ['left', { left: true }], ['right', { right: true }],
  ['up+left', { up: true, left: true }], ['up+right', { up: true, right: true }],
  ['down+left', { down: true, left: true }], ['down+right', { down: true, right: true }],
  ['none', {}],
]);
const round = (n, places = 2) => Number(n.toFixed(places));

export function projectVector(view, dx, dy) {
  const c = Math.cos(view.angle), s = Math.sin(view.angle);
  return [(dx * c + dy * s) * view.scale, (dx * s - dy * c) * view.scale];
}
export function worldToScreen(view, x, y) {
  const [dx, dy] = projectVector(view, x - view.x, y - view.y);
  return { x: VIEW_WIDTH / 2 + dx, y: VIEW_HEIGHT / 2 + dy };
}
export function windowSwingDegrees(camera, view) {
  let delta = camera.angle - view.angle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta * 180 / Math.PI; // Positive = counterclockwise in settled screen axes.
}
export function movementVectors(camera, view) {
  return Object.fromEntries([...DIRECTION_KEYS].map(([name, keys]) => {
    const x = Number(!!keys.right) - Number(!!keys.left);
    const y = Number(!!keys.down) - Number(!!keys.up);
    const length = Math.hypot(x, y) || 1;
    const c = Math.cos(camera.angle), s = Math.sin(camera.angle);
    const vector = projectVector({ ...view, scale: 1 }, (x * c + y * s) / length, (x * s - y * c) / length);
    return [name, vector.map(n => round(n, 5))];
  }));
}

export function buildObservation(course, driver, camera, index, gateDistance, previousAction = null) {
  const view = course.sectorViews[index], sector = course.track.sectors[index];
  const relative = point => projectVector(view, point.x - driver.x, point.y - driver.y).map(n => round(n));
  // Use the actual nearest road position, not monotonic scored progress, for recovery after backing up.
  const nearest = locate(course, driver.x, driver.y, driver.index);
  const road = [];
  for (let aheadPx = -40; aheadPx <= 300; aheadPx += 20) {
    const distance = Math.max(0, Math.min(LAP_LENGTH_METERS, nearest.distance + aheadPx / view.scale));
    if (road.at(-1)?.distance === distance) continue;
    road.push({ distance, point: [round((distance - nearest.distance) * view.scale), ...relative(pointAtDistance(course, distance))] });
  }
  const gate = pointAtDistance(course, gateDistance);
  const nx = -Math.sin(gate.angle) * ROAD_HALF_WIDTH, ny = Math.cos(gate.angle) * ROAD_HALF_WIDTH;
  const speedScale = view.scale / camera.scale / 60;
  return {
    protocolVersion: PROTOCOL_VERSION,
    sector: `${index + 1}/${course.track.sectors.length} — ${sector.name} (${sector.note})`,
    car: { x: 0, y: 0, onGrass: driver.offTrack },
    roadAhead: road.map(p => p.point),
    gate: [relative({ x: gate.x - nx, y: gate.y - ny }), relative({ x: gate.x + nx, y: gate.y + ny })],
    metresToGate: round(gateDistance - driver.distance),
    lapProgressPercent: round(driver.distance / LAP_LENGTH_METERS * 100, 1),
    roadHalfWidthPx: round(ROAD_HALF_WIDTH * view.scale),
    corridorHalfWidthPx: round(CORRIDOR_HALF_WIDTH * view.scale),
    asphaltPixelsPerFrame: round(ASPHALT_PIXELS_PER_SECOND * speedScale, 4),
    grassPixelsPerFrame: round(GRASS_PIXELS_PER_SECOND * speedScale, 4),
    currentPixelsPerFrame: round((driver.offTrack ? GRASS_PIXELS_PER_SECOND : ASPHALT_PIXELS_PER_SECOND) * speedScale, 4),
    windowSwingDegrees: round(windowSwingDegrees(camera, view)),
    movementUnitVectors: movementVectors(camera, view),
    previousAction: previousAction ? {
      moves: previousAction.moves, ranFrames: previousAction.ranFrames,
      displacementPx: projectVector(view, previousAction.dx, previousAction.dy).map(n => round(n)),
      progressMetres: round(previousAction.gained), grassFrames: previousAction.grass, wallFrames: previousAction.walls,
    } : null,
  };
}

export const DRIVING_RULES = `Drive around the Nordschleife as fast as possible, reaching each sector gate while staying on asphalt.
There is no inertia, throttle or turning radius. Keys translate the car instantly; none stops it while the clock runs. Diagonals are normalized to the same total speed as cardinal directions.
All geometry uses settled-sector screen axes, x RIGHT and y DOWN, in pixels relative to the car at [0,0]. These axes are not the car heading. roadAhead rows are [alongRoadPx, x, y], ordered in the forward route direction: alongRoadPx=0 is the nearest road centre, negative is behind it, positive is ahead. Follow the curve through the forward points toward gate (two endpoint coordinates). The local road extends 300 pixels ahead and can continue beyond this sector's gate; the action stops early when scored progress reaches the gate. Progress is the maximum distance reached along the centreline, not a geometric line-intersection test.
roadHalfWidthPx and corridorHalfWidthPx are authoritative current widths in these coordinates. Outside the road is slow grass; the corridor edge is a hard wall that pushes the car back. asphaltPixelsPerFrame and grassPixelsPerFrame are authoritative speeds; currentPixelsPerFrame uses the current surface. One frame is 1/60 second.
movementUnitVectors gives each key's current [dx,dy] unit vector in these same axes. Multiply by currentPixelsPerFrame for the initial per-frame movement. The camera eases after a sector change: vectors and speeds change during the action, and grass changes speed. windowSwingDegrees is camera.angle minus settled view.angle: POSITIVE rotates key movement COUNTERCLOCKWISE (right deflects toward up). It decays exponentially, not in a fixed number of frames. The supplied vectors already include this rotation; do not rotate them again.
previousAction reports the keys actually executed, actual frame count, displacement reprojected into the CURRENT axes, progress gained, grass frames and wall frames. It is null only at lap start. Decide the driving action yourself from this geometry; no direction is recommended.`;

export function drivingPrompt({ reactive, typedChoice, maxPlanFrames = 420 }) {
  if (!reactive) return `${DRIVING_RULES}\nReturn only JSON: {"plan":[{"direction":"up","frames":24}],"note":"brief explanation"}. Directions are ${[...DIRECTION_KEYS.keys()].join(', ')}. Each move has 1–240 integer frames and the entire plan at most ${maxPlanFrames} frames. Choose directions and durations to trace the road; another observation follows the plan or gate.`;
  const objective = `${DRIVING_RULES}\nChoose exactly one direction for ${ACTION_FRAMES} frames (${ACTION_FRAMES / 60} simulated seconds), then receive a fresh observation. A gate may end the move early.`;
  return typedChoice
    ? `${objective}\nAnswer the typed direction Choice question using one of its nine criteria. The interface handles serialization.`
    : `${objective}\nReturn only JSON: {"plan":[{"direction":"up","frames":${ACTION_FRAMES}}],"note":""}, replacing up with your chosen direction. Exactly one move is allowed.`;
}
