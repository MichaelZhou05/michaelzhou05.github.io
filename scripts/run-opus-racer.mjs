/**
 * Puts a real model behind the wheel of the Nordschleife lap.
 *
 * There is no driving-line heuristic in this file. The model is shown the same
 * thing the player is shown — the sector window, the road as it appears on the
 * 900x600 canvas, and where its car currently sits in it — and it replies with
 * arrow-key presses. Those presses go through `stepDriver` from `race-sim.js`,
 * which is the exact function the browser calls on the player's keyboard input.
 * Whatever the model does with the grass, the corridor walls and the clock is
 * what gets recorded.
 *
 * Inference runs through either the Claude Code or Codex CLI in headless mode.
 * The whole lap is one resumed session, so the model carries what it learned
 * from sector to sector.
 *
 * Output: a replayable recording of the lap it drove.
 *
 *   node scripts/run-opus-racer.mjs --agent opus [--sectors 18]
 *   node scripts/run-opus-racer.mjs --agent sol [--sectors 18]
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  ASPHALT_PIXELS_PER_SECOND,
  buildCourse,
  createCamera,
  createDriver,
  CORRIDOR_HALF_WIDTH,
  FINISH_MARGIN,
  GRASS_PIXELS_PER_SECOND,
  LAP_LENGTH_METERS,
  locate,
  ROAD_HALF_WIDTH,
  stepDriver,
  updateCamera,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from '../race-sim.js';

const here = dirname(fileURLToPath(import.meta.url));

const TICK = 1 / 60;
const RECORD_HZ = 20;

const MAX_PLAN_FRAMES = 420;      // ~7 s of driving, longer than any sector
const MAX_CALLS_PER_SECTOR = 5;   // the model gets to correct itself mid-sector
const SECTOR_FRAME_BUDGET = 1500; // ~25 s; a sector this slow is abandoned
const CLI_TIMEOUT_MS = 240_000;

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const agentName = readArg('--agent', 'opus');
const AGENTS = {
  opus: {
    provider: 'claude',
    model: 'claude-opus-5',
    reasoningEffort: null,
    output: 'opus-lap.js',
    exportName: 'opusLap',
  },
  sol: {
    provider: 'codex',
    model: 'gpt-5.6-sol',
    reasoningEffort: 'xhigh',
    output: 'sol-lap.js',
    exportName: 'solLap',
  },
};
const agent = AGENTS[agentName];
if (!agent) throw new Error(`Unknown --agent ${agentName}. Use opus or sol.`);

const MODEL = agent.model;
const outputPath = resolve(here, '..', readArg('--out', agent.output));
const sectorLimit = Number(readArg('--sectors', '0')) || Infinity;
const planSchemaPath = resolve(here, 'racer-plan.schema.json');
const resumeLapArg = readArg('--resume-lap', '');
const resumeLap = resumeLapArg
  ? (await import(`${pathToFileURL(resolve(here, '..', resumeLapArg)).href}?resume=${Date.now()}`))[agent.exportName]
  : null;
const startSector = Math.max(0, Number(readArg('--start-sector', resumeLap ? '18' : '1')) - 1);

const course = buildCourse(VIEW_WIDTH, VIEW_HEIGHT);
const { track } = course;

/* ------------------------------ what it sees ------------------------------ */

/** The projection the canvas uses, so screen coordinates mean the same thing. */
function worldToScreen(camera, x, y) {
  const dx = x - camera.x;
  const dy = y - camera.y;
  const cos = Math.cos(camera.angle);
  const sin = Math.sin(camera.angle);
  return {
    x: VIEW_WIDTH / 2 + (dx * cos + dy * sin) * camera.scale,
    y: VIEW_HEIGHT / 2 - (dy * cos - dx * sin) * camera.scale,
  };
}

const round = (value, places = 0) => Number(value.toFixed(places));

/**
 * The road ahead, in screen pixels, from just behind the car to the sector's
 * exit gate. This is the whole of what the model gets to plan against.
 */
function roadAhead(view, sector, fromDistance) {
  const points = [];
  const start = Math.max(0, fromDistance - 60);
  const end = Math.min(LAP_LENGTH_METERS, sector.endDistance + 120);
  const stepMeters = Math.max(18, (end - start) / 48);

  for (let distance = start; distance <= end; distance += stepMeters) {
    const point = pointOn(distance);
    const screen = worldToScreen(view, point.x, point.y);
    points.push([round(screen.x), round(screen.y)]);
  }
  return points;
}

function pointOn(distance) {
  const points = track.points;
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
  return { x: a.x + (b.x - a.x) * mix, y: a.y + (b.y - a.y) * mix, angle: a.angle };
}

/** Screen-space endpoints of the gate that closes the sector. */
function gateOn(view, sector) {
  const point = pointOn(sector.endDistance);
  const nx = -Math.sin(point.angle);
  const ny = Math.cos(point.angle);
  const left = worldToScreen(view, point.x - nx * ROAD_HALF_WIDTH, point.y - ny * ROAD_HALF_WIDTH);
  const right = worldToScreen(view, point.x + nx * ROAD_HALF_WIDTH, point.y + ny * ROAD_HALF_WIDTH);
  return [[round(left.x), round(left.y)], [round(right.x), round(right.y)]];
}

/* --------------------------------- the model --------------------------------- */

const SYSTEM_PROMPT = `You are driving a car around a top-down scale replica of the Nürburgring
Nordschleife, on the same 900x600 screen a human player sees, using the same four arrow keys.

HOW THE CAR MOVES — read carefully, it is not a normal car:
- There is no inertia, no throttle and no steering radius. The car translates instantly in the
  direction of whichever keys are held, at a fixed speed, and stops dead when no key is held.
- Screen axes: x grows RIGHT, y grows DOWN. "up" moves toward y=0. Diagonals like "up+right" are
  allowed and move at the same total speed as a single key (they are normalised), so a diagonal is
  never a shortcut — the fastest route is simply the shortest one.
- One frame is 1/60 s. On asphalt you cover PX_ASPHALT pixels per frame. On grass you cover only
  PX_GRASS pixels per frame, so leaving the road is expensive.
- The asphalt is ROAD_W pixels either side of the centreline. Past that is grass. At CORRIDOR_W
  pixels you hit the treeline, which is a hard wall — you get shoved back and lose the time.
- Holding no key ("none") wastes time; you are timed from the moment the lap starts.

YOUR JOB each turn: you are given the centreline of the current sector as a screen-space polyline,
your car's screen position, and the gate that ends the sector. Reply with a key programme that
drives your car along that road and through the gate as fast as you can. Think of it as a sequence
of straight-line moves: each move is a direction held for a number of frames, and the car travels
(frames x pixels-per-frame) pixels in that direction. Chain enough short moves to trace the curves —
a corner needs several segments, not one.

REPLY FORMAT — output nothing but a single JSON object, no prose, no code fences:
{"plan": [{"direction":"up","frames":24},{"direction":"up+right","frames":18}], "note":"short remark about your line"}
Directions: "up", "down", "left", "right", "up+left", "up+right", "down+left", "down+right", "none".
Frame counts are integers from 1 to 240. The whole plan must be at most MAX_FRAMES frames.
You may stop short of the gate and get another turn with fresh feedback — but every frame is on the
clock, so prefer to cover the whole sector in one plan when the road ahead is clear to you.

ONE CATCH: when a new sector window opens, the camera swings round to frame it and takes about half a
second to settle. The coordinates you are given are for the settled window, so while it is still
swinging your keys are deflected by roughly "windowSwingDegrees" (given when it applies, positive =
your movement is rotated clockwise on screen), decaying to zero over about 30 frames. A player sees
this happen and drives round it; budget for it in your opening move.`
  .replace('PX_ASPHALT', (ASPHALT_PIXELS_PER_SECOND / 60).toFixed(2))
  .replace('PX_GRASS', (GRASS_PIXELS_PER_SECOND / 60).toFixed(2))
  .replace('ROAD_W', String(round(ROAD_HALF_WIDTH)))
  .replace('CORRIDOR_W', String(round(CORRIDOR_HALF_WIDTH)))
  .replace('MAX_FRAMES', String(MAX_PLAN_FRAMES));

let sessionId = readArg('--session', null);
let totalCostUsd = 0;
let calls = resumeLap?.modelCalls ?? 0;
let inputTokens = resumeLap?.usage?.inputTokens ?? 0;
let cachedInputTokens = resumeLap?.usage?.cachedInputTokens ?? 0;
let outputTokens = resumeLap?.usage?.outputTokens ?? 0;

/** One headless turn against the model. The session is resumed so it remembers. */
function askClaude(prompt) {
  const first = sessionId === null;
  if (first) sessionId = randomUUID();

  const argv = [
    '-p',
    '--model', MODEL,
    first ? '--session-id' : '--resume', sessionId,
    '--system-prompt', SYSTEM_PROMPT,
    '--allowed-tools', '',
    '--setting-sources', '',
    '--output-format', 'json',
    prompt,
  ];

  return new Promise((resolvePromise, reject) => {
    const child = spawn('claude', argv, { cwd: here, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`claude timed out after ${CLI_TIMEOUT_MS} ms`));
    }, CLI_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude exited ${code}: ${stderr.trim() || stdout.trim()}`));
        return;
      }
      try {
        const envelope = JSON.parse(stdout);
        if (envelope.is_error) throw new Error(envelope.result ?? 'model reported an error');
        totalCostUsd += envelope.total_cost_usd ?? 0;
        calls += 1;
        resolvePromise(envelope.result ?? '');
      } catch (error) {
        reject(new Error(`could not read claude output: ${error.message}`));
      }
    });
  });
}

function codexBinary() {
  if (process.env.CODEX_BIN) return process.env.CODEX_BIN;
  const appBinary = '/Applications/ChatGPT.app/Contents/Resources/codex';
  return existsSync(appBinary) ? appBinary : 'codex';
}

/** One structured, read-only Codex turn. Later turns resume the same thread. */
function askCodex(prompt) {
  const first = sessionId === null;
  const fullPrompt = first
    ? `${SYSTEM_PROMPT}\n\nDo not inspect files or call tools. Drive only from the screen state below.\n\n${prompt}`
    : prompt;
  const common = [
    '--json',
    '--model', MODEL,
    '--config', `model_reasoning_effort="${agent.reasoningEffort}"`,
    '--skip-git-repo-check',
    '--ignore-user-config',
    '--ignore-rules',
    '--output-schema', planSchemaPath,
  ];
  const argv = first
    ? ['exec', ...common, '--sandbox', 'read-only', fullPrompt]
    : ['exec', 'resume', ...common, sessionId, fullPrompt];

  return new Promise((resolvePromise, reject) => {
    const child = spawn(codexBinary(), argv, { cwd: here, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`codex timed out after ${CLI_TIMEOUT_MS} ms`));
    }, CLI_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`codex exited ${code}: ${stderr.trim() || stdout.trim()}`));
        return;
      }

      try {
        let reply = '';
        for (const line of stdout.split('\n').filter(Boolean)) {
          const event = JSON.parse(line);
          if (event.type === 'thread.started') sessionId = event.thread_id;
          if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
            reply = event.item.text ?? reply;
          }
          if (event.type === 'turn.completed' && event.usage) {
            inputTokens += event.usage.input_tokens ?? 0;
            cachedInputTokens += event.usage.cached_input_tokens ?? 0;
            outputTokens += event.usage.output_tokens ?? 0;
          }
          if (event.type === 'turn.failed' || event.type === 'error') {
            throw new Error(event.error?.message ?? event.message ?? 'model turn failed');
          }
        }
        if (!sessionId) throw new Error('Codex did not return a thread id');
        if (!reply) throw new Error('Codex did not return a final key programme');
        calls += 1;
        resolvePromise(reply);
      } catch (error) {
        reject(new Error(`could not read codex output: ${error.message}`));
      }
    });
  });
}

const ask = agent.provider === 'codex' ? askCodex : askClaude;

async function askWithRetry(prompt) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await ask(prompt);
    } catch (error) {
      lastError = error;
      if (!/rate limit|stream disconnected|reconnecting/i.test(error.message) || attempt === 3) throw error;
      const delay = 15_000 * (attempt + 1);
      process.stdout.write(`  ! transient model limit; retrying in ${delay / 1000}s\n`);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, delay));
    }
  }
  throw lastError;
}

const DIRECTIONS = new Map([
  ['none', {}],
  ['up', { up: true }],
  ['down', { down: true }],
  ['left', { left: true }],
  ['right', { right: true }],
  ['up+left', { up: true, left: true }],
  ['up+right', { up: true, right: true }],
  ['down+left', { down: true, left: true }],
  ['down+right', { down: true, right: true }],
]);

/** Pull the plan out of the reply and reject anything that isn't a legal key programme. */
function parsePlan(reply) {
  const text = reply.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object in reply');

  const payload = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(payload.plan) || payload.plan.length === 0) throw new Error('plan is empty');

  const moves = [];
  let frames = 0;
  for (const entry of payload.plan) {
    const direction = Array.isArray(entry) ? entry[0] : entry?.direction;
    const frameValue = Array.isArray(entry) ? entry[1] : entry?.frames;
    if (direction === undefined || frameValue === undefined) throw new Error(`bad move: ${JSON.stringify(entry)}`);
    const name = String(direction).toLowerCase().replace(/\s+/g, '');
    const keys = DIRECTIONS.get(name);
    if (!keys) throw new Error(`unknown direction "${direction}"`);

    const count = Math.round(Number(frameValue));
    if (!Number.isFinite(count) || count < 1 || count > 240) throw new Error(`bad frame count "${frameValue}"`);

    frames += count;
    if (frames > MAX_PLAN_FRAMES) break;
    moves.push({ name, keys, frames: count });
  }
  if (moves.length === 0) throw new Error('plan had no usable moves');
  return { moves, note: typeof payload.note === 'string' ? payload.note.slice(0, 160) : '' };
}

/* ---------------------------------- the lap ---------------------------------- */

const driver = createDriver(course);
const camera = createCamera(course, startSector);
let activeSector = startSector;
let raceTime = resumeLap?.finishTime ?? 0;
let frameCount = Math.round(raceTime * 60);
let offTrackFrames = Math.round((resumeLap?.offTrackSeconds ?? 0) * 60);
let wallHits = resumeLap?.wallHits ?? 0;

const recording = resumeLap?.frames ? [...resumeLap.frames] : [];
const recordEvery = Math.round(60 / RECORD_HZ);
const record = () => {
  recording.push([
    Number(raceTime.toFixed(3)),
    Math.round(driver.x),
    Math.round(driver.y),
    Number(driver.heading.toFixed(3)),
  ]);
};
if (resumeLap?.frames?.length) {
  const last = resumeLap.frames[resumeLap.frames.length - 1];
  driver.x = last[1];
  driver.y = last[2];
  driver.heading = last[3];
  let distanceIndex = 0;
  while (distanceIndex < track.points.length - 2
    && track.points[distanceIndex + 1].distance <= resumeLap.distance) distanceIndex += 1;
  const found = locate(course, driver.x, driver.y, distanceIndex);
  driver.distance = Math.max(resumeLap.distance, found.distance);
  driver.index = found.index;
  driver.offset = found.offset;
  driver.offTrack = Math.abs(found.offset) > ROAD_HALF_WIDTH;
  driver.offTrackCount = resumeLap.offTrackCount;
} else {
  record();
}

/**
 * How far the still-swinging camera currently deflects the model's keys from
 * the settled window it is planning in. Positive reads as clockwise on screen.
 */
function windowSwingDegrees(view) {
  let delta = camera.angle - view.angle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return round(delta * (180 / Math.PI), 1);
}

/** Run one move through the shared physics. Stops early at the sector gate. */
function runMove(move, gateDistance) {
  const before = driver.distance;
  let ranFrames = 0;
  let leftTrackEvents = 0;
  let grassFrames = 0;
  let walls = 0;

  for (let frame = 0; frame < move.frames; frame += 1) {
    const report = stepDriver(course, driver, move.keys, camera, TICK);
    raceTime += TICK;
    frameCount += 1;
    ranFrames += 1;

    if (report.leftTrack) { leftTrackEvents += 1; driver.offTrackCount += 1; }
    if (report.offTrack) { grassFrames += 1; offTrackFrames += 1; }
    if (report.hitWall) { walls += 1; wallHits += 1; }

    updateCamera(course, camera, activeSector, TICK);
    if (frameCount % recordEvery === 0) record();

    if (driver.distance >= gateDistance) break;
  }

  return { ranFrames, gained: driver.distance - before, leftTrackEvents, grassFrames, walls };
}

const sectorLog = resumeLap?.sectors ? resumeLap.sectors.slice(0, startSector) : [];

for (let index = startSector; index < track.sectors.length && index < startSector + sectorLimit; index += 1) {
  activeSector = index;
  const sector = track.sectors[index];
  const view = course.sectorViews[index];
  const isFinalSector = index === track.sectors.length - 1;
  // The lap ends a few metres before the theoretical centreline end, exactly as
  // the browser's finish check does.
  const gateDistance = isFinalSector ? LAP_LENGTH_METERS - FINISH_MARGIN : sector.endDistance;
  const sectorStartTime = raceTime;
  const sectorStartDistance = driver.distance;
  let sectorFrames = 0;
  let feedback = '';
  let note = '';

  for (let call = 0; call < MAX_CALLS_PER_SECTOR; call += 1) {
    if (driver.distance >= gateDistance) break;

    const car = worldToScreen(view, driver.x, driver.y);
    const swing = windowSwingDegrees(view);
    const observation = {
      sector: `${index + 1}/${track.sectors.length} — ${sector.name} (${sector.note})`,
      car: { x: round(car.x), y: round(car.y), onGrass: driver.offTrack },
      // The centreline as drawn on screen, from just behind the car to the gate.
      road: roadAhead(view, sector, driver.distance),
      gate: gateOn(view, sector),
      metresToGate: round(gateDistance - driver.distance),
      lapProgressPercent: round((driver.distance / LAP_LENGTH_METERS) * 100, 1),
      roadHalfWidthPx: round(ROAD_HALF_WIDTH * view.scale),
      corridorHalfWidthPx: round(CORRIDOR_HALF_WIDTH * view.scale),
      pixelsPerFrame: round((ASPHALT_PIXELS_PER_SECOND / 60) * (view.scale / camera.scale), 2),
      ...(Math.abs(swing) >= 1 ? { windowSwingDegrees: swing } : {}),
      ...(isFinalSector ? { finalSector: 'this gate is the finish line' } : {}),
    };

    const prompt = [
      call === 0 && index === 0
        ? 'Lap start. You are on the grid at the first sector window.'
        : (feedback || 'New sector window. The camera has swung round to frame this stretch.'),
      '',
      'Screen state:',
      JSON.stringify(observation),
      '',
      '"road" is the centreline as a list of [x, y] screen points in the direction of travel;'
      + ' "gate" is the two ends of the line you must cross to finish this sector.',
      'Reply with the JSON key programme only.',
    ].join('\n');

    let plan;
    try {
      plan = parsePlan(await askWithRetry(prompt));
    } catch (error) {
      feedback = `Your last reply could not be used (${error.message}). Reply with the JSON object only.`;
      process.stdout.write(`  ! ${error.message}\n`);
      continue;
    }

    let ran = 0;
    let gained = 0;
    let grass = 0;
    let walls = 0;
    for (const move of plan.moves) {
      const result = runMove(move, gateDistance);
      ran += result.ranFrames;
      gained += result.gained;
      grass += result.grassFrames;
      walls += result.walls;
      sectorFrames += result.ranFrames;
      if (driver.distance >= gateDistance || sectorFrames > SECTOR_FRAME_BUDGET) break;
    }

    note = plan.note || note;
    const carAfter = worldToScreen(view, driver.x, driver.y);
    const done = driver.distance >= gateDistance;

    process.stdout.write(
      `  sector ${String(index + 1).padStart(2, '0')} call ${call + 1}: `
      + `${plan.moves.length} moves, ${ran} frames, +${gained.toFixed(0)} m`
      + `${grass ? `, ${grass} frames on grass` : ''}${walls ? `, ${walls} wall hits` : ''}`
      + `${done ? ' — through the gate' : ''}\n`,
    );

    if (done) break;
    if (sectorFrames > SECTOR_FRAME_BUDGET) {
      process.stdout.write('  ! sector budget spent, moving on\n');
      break;
    }

    feedback = [
      `Result of your last programme: it ran ${ran} frames (${(ran / 60).toFixed(2)} s) and gained`,
      `${gained.toFixed(0)} m. You are now at screen [${round(carAfter.x)}, ${round(carAfter.y)}],`,
      driver.offTrack ? 'currently ON THE GRASS — get back on the asphalt.' : 'on the asphalt.',
      grass ? `You spent ${grass} frames on grass.` : '',
      walls ? `You hit the treeline ${walls} times.` : '',
      `Still ${round(gateDistance - driver.distance)} m to the gate. Continue from here.`,
    ].filter(Boolean).join(' ');
  }

  const sectorTime = raceTime - sectorStartTime;
  sectorLog.push({
    sector: index + 1,
    name: sector.name,
    seconds: Number(sectorTime.toFixed(2)),
    metres: Math.round(driver.distance - sectorStartDistance),
    note,
  });
  process.stdout.write(
    `  → ${sector.name} done in ${sectorTime.toFixed(2)} s`
    + ` (lap ${(driver.distance / 1000).toFixed(2)} km`
    + `${agent.provider === 'claude' ? `, $${totalCostUsd.toFixed(3)} so far` : ''})\n`,
  );
}

/* --------------------------------- the record --------------------------------- */

record();

const finished = driver.distance >= LAP_LENGTH_METERS - FINISH_MARGIN;
const lap = {
  model: MODEL,
  ...(agent.reasoningEffort ? { reasoningEffort: agent.reasoningEffort } : {}),
  drivenAt: new Date().toISOString().slice(0, 10),
  finishTime: Number(raceTime.toFixed(3)),
  finished,
  distance: Math.round(driver.distance),
  offTrackCount: driver.offTrackCount,
  offTrackSeconds: Number((offTrackFrames / 60).toFixed(2)),
  wallHits,
  modelCalls: calls,
  costUsd: Number(totalCostUsd.toFixed(4)),
  ...(agent.provider === 'codex' ? {
    usage: { inputTokens, cachedInputTokens, outputTokens },
  } : {}),
  recordHz: RECORD_HZ,
  sectors: sectorLog,
  // [time, world x, world y, heading] — the line the model actually drove.
  frames: recording,
};

const source = `/**\n`
  + ` * A lap of the Nordschleife driven by ${MODEL}.\n`
  + ` *\n`
  + ` * Generated by scripts/run-opus-racer.mjs --agent ${agentName}. The model was shown the sector window\n`
  + ` * exactly as the player sees it and replied with arrow-key programmes; those keys\n`
  + ` * were run through race-sim.js, the same physics the player drives. This file is\n`
  + ` * the resulting line — ${lap.finishTime.toFixed(2)} s, ${lap.offTrackCount} off-track moments.\n`
  + ` */\n\n`
  + `export const ${agent.exportName} = ${JSON.stringify(lap, null, 2)
    .replace(/\[\n\s+(-?[\d.]+),\n\s+(-?[\d.]+),\n\s+(-?[\d.]+),\n\s+(-?[\d.]+)\n\s+\]/g, '[$1, $2, $3, $4]')};\n`;

await writeFile(outputPath, source, 'utf8');

process.stdout.write(
  `\nWrote ${outputPath}\n`
  + `Lap: ${lap.finishTime.toFixed(2)} s over ${(lap.distance / 1000).toFixed(2)} km`
  + `${finished ? '' : ' (INCOMPLETE)'}\n`
  + `Off-track: ${lap.offTrackCount} moments / ${lap.offTrackSeconds} s · wall hits: ${wallHits}\n`
  + `${calls} model calls`
  + `${agent.provider === 'claude' ? ` · $${totalCostUsd.toFixed(3)}` : ` · ${inputTokens} input / ${outputTokens} output tokens`}\n`,
);
