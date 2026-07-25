/**
 * Deterministic three-lane race simulation shared by the browser and Node.
 *
 * `stepRace` advances exactly one 60 Hz tick. It mutates and returns the state
 * it receives, which keeps the browser game loop allocation-free.
 */

export const SIMULATION_HZ = 60;
export const FIXED_TIME_STEP = 1 / SIMULATION_HZ;
export const COURSE_LENGTH_METERS = 1200;
export const BASE_SPEED_METERS_PER_SECOND = 35;
export const LANE_CENTERS = Object.freeze([-0.72, 0, 0.72]);

// `lane` is -1 (left), 0 (center), or 1 (right). Every cluster leaves a gap.
export const HAZARDS = Object.freeze([
  { id: 'cone-01', distance: 105, lane: 0, kind: 'cone' },
  { id: 'car-02', distance: 198, lane: -1, kind: 'car' },
  { id: 'cone-03', distance: 282, lane: 1, kind: 'cone' },
  { id: 'cone-04', distance: 364, lane: -1, kind: 'cone' },
  { id: 'car-05', distance: 370, lane: 0, kind: 'car' },
  { id: 'car-06', distance: 468, lane: 1, kind: 'car' },
  { id: 'cone-07', distance: 552, lane: 0, kind: 'cone' },
  { id: 'car-08', distance: 642, lane: -1, kind: 'car' },
  { id: 'car-09', distance: 724, lane: 0, kind: 'car' },
  { id: 'cone-10', distance: 731, lane: 1, kind: 'cone' },
  { id: 'cone-11', distance: 830, lane: -1, kind: 'cone' },
  { id: 'car-12', distance: 925, lane: 1, kind: 'car' },
  { id: 'car-13', distance: 1012, lane: -1, kind: 'car' },
  { id: 'cone-14', distance: 1019, lane: 0, kind: 'cone' },
  { id: 'cone-15', distance: 1104, lane: 1, kind: 'cone' },
].map(Object.freeze));

const STEERING_UNITS_PER_SECOND = 1.24;
const EDGE_LIMIT = 0.96;
const SPEED_RECOVERY_PER_SECOND = 13;
const COLLISION_SPEED = Object.freeze({ cone: 25, car: 18 });
const COLLISION_HALF_WIDTH = Object.freeze({ cone: 0.17, car: 0.25 });

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const laneX = (lane) => LANE_CENTERS[lane + 1];

/** Create a fresh race at the starting line. */
export function createRaceState() {
  return {
    time: 0,
    distance: 0,
    progress: 0,
    x: 0,
    speed: BASE_SPEED_METERS_PER_SECOND,
    collisions: 0,
    finished: false,
    finishTime: null,

    // Internal contact ledger: a hazard can affect the car only once.
    collidedHazardIds: new Set(),
  };
}

/**
 * Advance one fixed tick. `action` is steering: -1 left, 0 straight, +1 right.
 * Forward motion is automatic.
 */
export function stepRace(state, action = 0) {
  if (state.finished) return state;

  const steering = Number.isFinite(action) ? Math.sign(clamp(action, -1, 1)) : 0;
  const previousDistance = state.distance;
  const previousTime = state.time;

  state.x = clamp(
    state.x + steering * STEERING_UNITS_PER_SECOND * FIXED_TIME_STEP,
    -EDGE_LIMIT,
    EDGE_LIMIT,
  );

  state.speed = Math.min(
    BASE_SPEED_METERS_PER_SECOND,
    state.speed + SPEED_RECOVERY_PER_SECOND * FIXED_TIME_STEP,
  );
  state.distance += state.speed * FIXED_TIME_STEP;

  // Swept distance test avoids skipping a hazard between adjacent ticks.
  for (const hazard of HAZARDS) {
    if (state.collidedHazardIds.has(hazard.id)) continue;
    if (hazard.distance < previousDistance || hazard.distance > state.distance) continue;

    if (Math.abs(state.x - laneX(hazard.lane)) <= COLLISION_HALF_WIDTH[hazard.kind]) {
      state.collidedHazardIds.add(hazard.id);
      state.collisions += 1;
      state.speed = Math.min(state.speed, COLLISION_SPEED[hazard.kind]);
    }
  }

  state.time += FIXED_TIME_STEP;

  if (state.distance >= COURSE_LENGTH_METERS) {
    // Interpolate within the final tick so the reported result is precise.
    const tickDistance = state.distance - previousDistance;
    const finishFraction = tickDistance > 0
      ? (COURSE_LENGTH_METERS - previousDistance) / tickDistance
      : 1;
    state.finishTime = previousTime + FIXED_TIME_STEP * clamp(finishFraction, 0, 1);
    state.time = state.finishTime;
    state.distance = COURSE_LENGTH_METERS;
    state.finished = true;
  }

  state.progress = clamp(state.distance / COURSE_LENGTH_METERS, 0, 1);
  return state;
}

/** Return the read-only-sized view intended for players and automated agents. */
export function getObservation(state) {
  const lookaheadMeters = 150;
  const upcomingHazards = HAZARDS
    .filter((hazard) => hazard.distance >= state.distance
      && hazard.distance - state.distance <= lookaheadMeters)
    .map((hazard) => ({
      distance: hazard.distance - state.distance,
      lane: hazard.lane,
      kind: hazard.kind,
    }));

  return {
    time: state.time,
    distance: state.distance,
    progress: state.progress,
    remaining: COURSE_LENGTH_METERS - state.distance,
    x: state.x,
    speed: state.speed,
    collisions: state.collisions,
    finished: state.finished,
    upcomingHazards,
  };
}

/**
 * Run a policy to completion and return compact replay telemetry.
 * Policies receive observations only. Replay defaults to 12 samples/second.
 */
export function simulateRace(policy, { replayHz = 12, maxSeconds = 90 } = {}) {
  if (typeof policy !== 'function') throw new TypeError('policy must be a function');
  if (!Number.isFinite(replayHz) || replayHz <= 0 || replayHz > SIMULATION_HZ) {
    throw new RangeError(`replayHz must be between 0 and ${SIMULATION_HZ}`);
  }

  const state = createRaceState();
  const replay = [];
  const sampleEveryTicks = Math.max(1, Math.round(SIMULATION_HZ / replayHz));
  const maxTicks = Math.ceil(maxSeconds * SIMULATION_HZ);

  const recordSample = () => {
    replay.push({
      time: Number(state.time.toFixed(3)),
      progress: Number(state.progress.toFixed(5)),
      x: Number(state.x.toFixed(4)),
      speed: Number(state.speed.toFixed(2)),
      collisions: state.collisions,
    });
  };

  recordSample();
  let ticks = 0;
  while (!state.finished && ticks < maxTicks) {
    const action = policy(getObservation(state));
    stepRace(state, action);
    ticks += 1;
    if (ticks % sampleEveryTicks === 0 || state.finished) recordSample();
  }

  if (!state.finished) throw new Error(`Race did not finish within ${maxSeconds} seconds`);

  return {
    finishTime: state.finishTime,
    collisions: state.collisions,
    ticks,
    replay,
  };
}

