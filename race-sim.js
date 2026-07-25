/**
 * Nordschleife driving model — the single source of truth for how a car moves.
 *
 * Nothing in here touches the DOM, so the browser game and the offline Opus 5
 * harness (`scripts/run-opus-racer.mjs`) run byte-for-byte identical physics.
 * The model is not given a shortcut: it presses the same four keys the player
 * does, through the same `stepDriver`, against the same corridor.
 */

import {
  buildTrack,
  fitSector,
  LAP_LENGTH_METERS,
  ROAD_HALF_WIDTH,
  CORRIDOR_HALF_WIDTH,
} from './nordschleife.js';

export { LAP_LENGTH_METERS, ROAD_HALF_WIDTH, CORRIDOR_HALF_WIDTH };

// The car's pace is fixed in screen pixels per second, so every sector window
// feels the same to drive no matter how far it has to zoom out.
export const ASPHALT_PIXELS_PER_SECOND = 170;
export const GRASS_PIXELS_PER_SECOND = 74;
export const CAMERA_EASE = 5.4;
export const START_DISTANCE = 14;
export const FINISH_MARGIN = 8;

export const VIEW_WIDTH = 900;
export const VIEW_HEIGHT = 600;

/**
 * Build the circuit plus everything derived from it. `viewWidth`/`viewHeight`
 * matter because the sector windows — and therefore the zoom the car is driven
 * at — are fitted to the canvas size.
 */
export function buildCourse(viewWidth = VIEW_WIDTH, viewHeight = VIEW_HEIGHT) {
  const track = buildTrack();

  // Signed curvature per sample, used for kerb placement and the AI racing line.
  for (let index = 0; index < track.points.length; index += 1) {
    const previous = track.points[Math.max(0, index - 1)];
    const next = track.points[Math.min(track.points.length - 1, index + 1)];
    let turn = next.angle - previous.angle;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    track.points[index].curvature = turn / Math.max(1, next.distance - previous.distance);
  }

  // Smoothed copy: raw curvature flickers between samples, which would break the
  // kerbs into confetti. Kerb runs are decided on this instead.
  const CURVATURE_SMOOTHING = 3;
  for (let index = 0; index < track.points.length; index += 1) {
    let sum = 0;
    let count = 0;
    for (let offset = -CURVATURE_SMOOTHING; offset <= CURVATURE_SMOOTHING; offset += 1) {
      const sample = track.points[index + offset];
      if (!sample) continue;
      sum += sample.curvature;
      count += 1;
    }
    track.points[index].smoothCurvature = sum / count;
  }

  const sectorViews = track.sectors.map((sector) => fitSector(track, sector, viewWidth, viewHeight));

  // Map lap distance onto cumulative screen pixels so racers can be paced in the
  // same units as the player, even while they are in a different window.
  let runningPixels = 0;
  const sectorPixels = track.sectors.map((sector, index) => {
    const entry = {
      startPixels: runningPixels,
      pixels: (sector.endDistance - sector.startDistance) * sectorViews[index].scale,
      scale: sectorViews[index].scale,
    };
    runningPixels += entry.pixels;
    return entry;
  });

  return { track, sectorViews, sectorPixels, lapPixels: runningPixels };
}

/* ------------------------------- geometry ------------------------------- */

export function sectorIndexAt(course, distance) {
  const { sectors } = course.track;
  for (let index = sectors.length - 1; index >= 0; index -= 1) {
    if (distance >= sectors[index].startDistance) return index;
  }
  return 0;
}

export function pixelsToDistance(course, pixels) {
  if (pixels >= course.lapPixels) return LAP_LENGTH_METERS;
  let index = 0;
  while (index < course.sectorPixels.length - 1
    && pixels >= course.sectorPixels[index + 1].startPixels) index += 1;
  return course.track.sectors[index].startDistance
    + (pixels - course.sectorPixels[index].startPixels) / course.sectorPixels[index].scale;
}

/** Interpolate the centreline at an absolute lap distance. */
export function pointAtDistance(course, distance) {
  const points = course.track.points;
  const target = Math.max(0, Math.min(LAP_LENGTH_METERS, distance));
  let low = 0;
  let high = points.length - 1;
  while (low < high - 1) {
    const middle = (low + high) >> 1;
    if (points[middle].distance <= target) low = middle;
    else high = middle;
  }
  const a = points[low];
  const b = points[high];
  const mix = (target - a.distance) / Math.max(0.001, b.distance - a.distance);
  return {
    x: a.x + (b.x - a.x) * mix,
    y: a.y + (b.y - a.y) * mix,
    angle: a.angle,
    curvature: a.curvature,
  };
}

/** Nearest centreline point, searched locally around a hint index. */
export function locate(course, x, y, hintIndex) {
  const points = course.track.points;
  const first = Math.max(0, hintIndex - 34);
  const last = Math.min(points.length - 2, hintIndex + 70);
  let best = { absOffset: Infinity, offset: 0, distance: 0, index: hintIndex };

  for (let index = first; index <= last; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = Math.max(0.0001, dx * dx + dy * dy);
    const mix = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
    const projectedX = a.x + dx * mix;
    const projectedY = a.y + dy * mix;
    const absOffset = Math.hypot(x - projectedX, y - projectedY);

    if (absOffset < best.absOffset) {
      const side = Math.sign(dx * (y - projectedY) - dy * (x - projectedX)) || 1;
      best = {
        absOffset,
        offset: absOffset * side,
        distance: a.distance + (b.distance - a.distance) * mix,
        index,
      };
    }
  }
  return best;
}

/* -------------------------------- driving -------------------------------- */

export function createDriver(course) {
  const start = pointAtDistance(course, START_DISTANCE);
  return {
    x: start.x,
    y: start.y,
    heading: start.angle,
    distance: START_DISTANCE,
    index: 0,
    offset: 0,
    offTrack: false,
    offTrackCount: 0,
    finishTime: null,
  };
}

export function createCamera(course, sectorIndex) {
  const view = course.sectorViews[sectorIndex];
  return { x: view.x, y: view.y, angle: view.angle, scale: view.scale };
}

/** Ease the window toward the active sector's framing. */
export function updateCamera(course, camera, sectorIndex, delta) {
  const view = course.sectorViews[sectorIndex];
  const blend = 1 - Math.exp(-delta * CAMERA_EASE);

  let angleDelta = view.angle - camera.angle;
  while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
  while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;

  camera.x += (view.x - camera.x) * blend;
  camera.y += (view.y - camera.y) * blend;
  camera.angle += angleDelta * blend;
  camera.scale += (view.scale - camera.scale) * blend;
  return camera;
}

/**
 * Advance one frame of driving. `keys` is the raw key state — up/down/left/right
 * — exactly as the browser collects it from the keyboard.
 *
 * Returns a small report of what the frame did, which the offline harness feeds
 * back to the model and the browser uses for its off-track flash.
 */
export function stepDriver(course, driver, keys, camera, delta) {
  const horizontal = Number(Boolean(keys.right)) - Number(Boolean(keys.left));
  const vertical = Number(Boolean(keys.down)) - Number(Boolean(keys.up));
  const magnitude = Math.hypot(horizontal, vertical);

  if (magnitude > 0) {
    // Steering is screen-relative, so rotate it back into world space and the
    // controls stay intuitive after the window swings round to a new sector.
    const screenX = horizontal / magnitude;
    const screenY = vertical / magnitude;
    const cos = Math.cos(camera.angle);
    const sin = Math.sin(camera.angle);
    const worldX = screenX * cos + screenY * sin;
    const worldY = screenX * sin - screenY * cos;

    const speed = (driver.offTrack ? GRASS_PIXELS_PER_SECOND : ASPHALT_PIXELS_PER_SECOND) / camera.scale;
    driver.x += worldX * speed * delta;
    driver.y += worldY * speed * delta;
    driver.heading = Math.atan2(worldY, worldX);
  }

  const found = locate(course, driver.x, driver.y, driver.index);
  driver.index = found.index;

  // Grass slows you; the treeline is a hard edge you cannot drive through.
  let hitWall = false;
  if (found.absOffset > CORRIDOR_HALF_WIDTH) {
    const centre = pointAtDistance(course, found.distance);
    const clamped = Math.sign(found.offset) * CORRIDOR_HALF_WIDTH;
    driver.x = centre.x - Math.sin(centre.angle) * clamped;
    driver.y = centre.y + Math.cos(centre.angle) * clamped;
    driver.offset = clamped;
    hitWall = true;
  } else {
    driver.offset = found.offset;
  }

  driver.distance = Math.max(driver.distance, found.distance);

  const wasOffTrack = driver.offTrack;
  driver.offTrack = Math.abs(driver.offset) > ROAD_HALF_WIDTH;

  // The caller owns `offTrackCount`: the browser ignores the first moments of a
  // lap so the grid box does not register, the harness counts every excursion.
  return { leftTrack: driver.offTrack && !wasOffTrack, hitWall, offTrack: driver.offTrack };
}
