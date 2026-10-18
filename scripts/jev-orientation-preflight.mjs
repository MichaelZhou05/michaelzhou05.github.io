/** Development-only direction/loop regression. Evaluator scores never enter requests. */
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fixtures, requestFor, gradeAction } from './jev-preflight.mjs';
import { verifyRacePhysics } from './verify-race-physics.mjs';
import { orientedState, orientedQuestion } from './racer-observation-v4.mjs';
import { focusedState, focusedQuestion } from './racer-observation-v5.mjs';
import { askJev, jevRequest } from './jev-driver.mjs';
import { buildCourse, stepDriver, updateCamera } from '../race-sim.js';
import { DIRECTION_KEYS } from './racer-protocol.mjs';
const course = buildCourse();
export async function orientationFixtures() {
  const { jevLap } = await import('../results/jev-2026-10-18-r6.js');
  const rows = (await readFile(new URL('../results/jev-2026-10-18-r6.js.audit.jsonl', import.meta.url), 'utf8')).trim().split('\n').map(JSON.parse).slice(1);
  const cases = await fixtures();
  let sectorCall = 0;
  verifyRacePhysics(jevLap, rows, { onObservation(f, row) {
    if (row.sector !== 7) return;
    sectorCall++;
    if ([1, 3, 7, 13, 16, 31, 91].includes(sectorCall)) cases.push({ id: `r6-sector7-call-${sectorCall}`, ...f });
  } });
  return cases;
}
export function orientationRequest(fixture, variant) {
  if (variant === 'absolute-named') return requestFor(fixture, variant);
  if (variant === 'surface-focused') {
    const state = focusedState(course, fixture.driver, fixture.camera, fixture.index, course.track.sectors[fixture.index].endDistance, fixture.previous);
    return jevRequest(state, 'typesafe/jev-1.13', focusedQuestion(state));
  }
  if (variant !== 'route-oriented') throw new Error('Unknown orientation format');
  const state = orientedState(course, fixture.driver, fixture.camera, fixture.index, course.track.sectors[fixture.index].endDistance, fixture.previous);
  return jevRequest(state, 'typesafe/jev-1.13', orientedQuestion(state));
}
export function executeDiagnosticMove(f, direction) {
  const gate = course.track.sectors[f.index].endDistance;
  const start = { ...f.driver };
  let frames = 0, grass = 0, walls = 0;
  for (let i = 0; i < 6; i++) {
    const r = stepDriver(course, f.driver, DIRECTION_KEYS.get(direction), f.camera, 1 / 60);
    frames++; grass += +r.offTrack; walls += +r.hitWall;
    updateCamera(course, f.camera, f.index, 1 / 60);
    if (f.driver.distance >= gate) break;
  }
  f.previous = { moves: [{ direction, frames }], ranFrames: frames, dx: f.driver.x - start.x, dy: f.driver.y - start.y, gained: f.driver.distance - start.distance, grass, walls };
  return { ...f.previous, reachedGate: f.driver.distance >= gate };
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const cases = await orientationFixtures();
  if (!process.argv.includes('--live')) { console.log(cases.map(f => f.id)); process.exit(0); }
  const outIndex = process.argv.indexOf('--out'), out = process.argv[outIndex + 1];
  if (outIndex < 0 || !out) throw new Error('Explicit fresh --out required');
  const pilot = process.argv.includes('--pilot');
  const variantIndex = process.argv.indexOf('--variant');
  const variant = variantIndex < 0 ? 'route-oriented' : process.argv[variantIndex + 1];
  if (!['route-oriented', 'surface-focused'].includes(variant)) throw new Error('Unknown variant');
  const variants = pilot ? [variant] : ['absolute-named', variant];
  const selected = pilot ? cases.filter(f => f.id === 'r6-sector7-call-1') : cases.filter(f => f.id !== 'r6-sector7-call-1');
  const hashes = {};
  for (const name of ['jev-orientation-preflight.mjs', 'racer-observation-v5.mjs', 'racer-observation-v4.mjs', 'racer-observation-v3.mjs', 'jev-driver.mjs']) hashes[name] = createHash('sha256').update(await readFile(new URL(name, import.meta.url))).digest('hex');
  await writeFile(out, JSON.stringify({ type: 'config', startedAt: new Date().toISOString(), pilot, maxCalls: pilot ? 150 : selected.length * variants.length, variants, fixtures: selected, hashes }) + '\n', { flag: 'wx' });
  let count = 0, cost = 0, frames = 0, grass = 0, walls = 0;
  const totals = {};
  async function call(f, variant) {
    const request = orientationRequest(f, variant), start = performance.now();
    let response;
    try { response = await askJev(request.state, { model: request.model, question: request.questions.direction }); }
    catch (error) {
      await appendFile(out, JSON.stringify({ fixture: f.id, variant, request, failure: error.message, responseMs: performance.now() - start }) + '\n');
      throw error;
    }
    if (response.model !== 'typesafe/jev-1.13-20260917') {
      await appendFile(out, JSON.stringify({ fixture: f.id, variant, request, response, failure: 'Model snapshot changed; stop diagnostic' }) + '\n');
      throw new Error('Model snapshot changed; stop diagnostic');
    }
    const direction = response.decision.plan[0].direction, grade = gradeAction(f, direction);
    const executed = pilot ? executeDiagnosticMove(f, direction) : null;
    await appendFile(out, JSON.stringify({ fixture: f.id, variant, request, response, responseMs: performance.now() - start, grade, executed }) + '\n');
    count++; cost += response.usage?.cost ?? 0;
    totals[variant] ??= { useful: 0, calls: 0 };
    totals[variant].calls++; totals[variant].useful += +grade.useful;
    console.log(`${count}: ${f.id} ${variant} ${direction} useful=${grade.useful}${executed ? ` gate=${executed.reachedGate}` : ''}`);
    return executed;
  }
  if (pilot) {
    for (let i = 0; i < 150; i++) {
      const r = await call(selected[0], variants[0]); frames += r.ranFrames; grass += r.grass; walls += r.walls;
      if (r.reachedGate) break;
    }
  } else {
    for (let i = 0; i < selected.length; i++) for (let j = 0; j < variants.length; j++) await call(selected[i], variants[(i + j) % variants.length]);
  }
  const summary = { type: 'summary', totals, reportedCostUsd: cost, ...(pilot ? { diagnosticOnly: true, reachedGate: selected[0].driver.distance >= course.track.sectors[selected[0].index].endDistance, simulationSeconds: frames / 60, grassSeconds: grass / 60, wallFrames: walls } : {}) };
  await appendFile(out, JSON.stringify(summary) + '\n'); console.log(summary);
}
