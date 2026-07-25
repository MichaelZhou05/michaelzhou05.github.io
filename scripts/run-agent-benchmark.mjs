import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COURSE_LENGTH_METERS,
  HAZARDS,
  LANE_CENTERS,
  SIMULATION_HZ,
  simulateRace,
} from '../race-core.js';

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, '..', 'agent-benchmark.js');

/**
 * Transparent observation-only policy. It scores each lane by nearby hazards,
 * adds a small lane-change cost, and steers toward the lowest-cost lane.
 */
export function createBenchmarkPolicy() {
  const lookahead = 112;
  let targetLane = 0;

  return (observation) => {
    const scores = [-1, 0, 1].map((lane) => {
      const hazardRisk = observation.upcomingHazards.reduce((risk, hazard) => {
        if (hazard.lane !== lane || hazard.distance > lookahead) return risk;
        const urgency = 1 - Math.max(0, hazard.distance) / lookahead;
        const severity = hazard.kind === 'car' ? 1.35 : 1;
        // Quadratic urgency ignores distant noise, avoiding a late lane swap
        // across an obstacle while still leaving ample steering room.
        return risk + severity * urgency * urgency * 5;
      }, 0);

      const center = LANE_CENTERS[lane + 1];
      const movementCost = Math.abs(center - observation.x) * 0.12;
      const switchingCost = lane === targetLane ? 0 : 0.04;
      return { lane, score: hazardRisk + movementCost + switchingCost };
    });

    scores.sort((a, b) => a.score - b.score || Math.abs(a.lane) - Math.abs(b.lane) || a.lane - b.lane);
    targetLane = scores[0].lane;

    const targetX = LANE_CENTERS[targetLane + 1];
    if (Math.abs(targetX - observation.x) < 0.025) return 0;
    return targetX < observation.x ? -1 : 1;
  };
}

const result = simulateRace(createBenchmarkPolicy(), { replayHz: 12 });
const benchmark = {
  model: 'GPT-5.6 Sol',
  course: {
    name: 'Neon Three-Lane Sprint',
    lengthMeters: COURSE_LENGTH_METERS,
    simulationHz: SIMULATION_HZ,
    lanes: LANE_CENTERS.length,
    hazards: HAZARDS.length,
  },
  finishTime: Number(result.finishTime.toFixed(3)),
  collisions: result.collisions,
  replayHz: 12,
  replay: result.replay,
  policy: 'Scores all three lanes using hazards within 112 m, favors lower risk with a small lane-change penalty, then steers smoothly toward the safest lane center.',
};

const source = `// Generated deterministically by scripts/run-agent-benchmark.mjs.\n`
  + `export const agentBenchmark = ${JSON.stringify(benchmark, null, 2)};\n`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, source, 'utf8');

console.log(`Wrote ${outputPath}`);
console.log(`Finish: ${benchmark.finishTime.toFixed(3)}s | Collisions: ${benchmark.collisions} | Replay samples: ${benchmark.replay.length}`);
