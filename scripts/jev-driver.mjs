/** OpenRouter's Decisions API -> one fixed-duration move; never generates a racing line. */
import { ACTION_FRAMES, DIRECTION_KEYS } from './racer-protocol.mjs';
export const JEV_ACTION_FRAMES = ACTION_FRAMES;
export const JEV_DIRECTIONS = [...DIRECTION_KEYS.keys()];

export function jevRequest(state, model = 'typesafe/jev-1.13', question = null) {
  return {
    model,
    state,
    questions: {
      direction: question ?? {
        type: 'choice',
        instructions: `Which direction should the car move for the next ${JEV_ACTION_FRAMES} frames (${JEV_ACTION_FRAMES / 60} simulated seconds) to reach the sector gate quickly while staying on asphalt? Use the car-relative road and movementUnitVectors in state. Choose exactly one direction; a fresh observation follows this move.`,
        criteria: Object.fromEntries(JEV_DIRECTIONS.map((direction) => [direction,
          direction === 'none' ? `Stop for ${JEV_ACTION_FRAMES} frames; the lap clock still runs.` : `Hold ${direction} for ${JEV_ACTION_FRAMES} frames along its movementUnitVectors direction.`,
        ])),
      },
    },
  };
}

export function parseJevDecision(response) {
  const answer = response?.answers?.direction;
  if (answer?.type !== 'choice' || !JEV_DIRECTIONS.includes(answer.choice)) {
    throw new Error('Jev returned an invalid direction choice');
  }
  const probabilities = answer.probabilities;
  if (!probabilities || Object.keys(probabilities).length !== JEV_DIRECTIONS.length
    || JEV_DIRECTIONS.some((key) => !Number.isFinite(probabilities[key]) || probabilities[key] < 0 || probabilities[key] > 1)
    || Math.abs(Object.values(probabilities).reduce((sum, value) => sum + value, 0) - 1) > 0.01 + 1e-9) {
    const error = new Error('Jev returned an invalid probability distribution');
    error.validation = {
      probabilityCount: probabilities && typeof probabilities === 'object' ? Object.keys(probabilities).length : 0,
      probabilities: Object.fromEntries(JEV_DIRECTIONS.map(key => [key, Number.isFinite(probabilities?.[key]) ? probabilities[key] : null])),
      choice: answer.choice,
    };
    throw error;
  }
  if (!Number.isFinite(answer.confidence) || answer.confidence < 0 || answer.confidence > 1) {
    throw new Error('Jev returned invalid confidence');
  }
  return {
    plan: [{ direction: answer.choice, frames: JEV_ACTION_FRAMES }],
    note: `Jev Choice; fixed ${JEV_ACTION_FRAMES}-frame action`,
    probabilities,
    confidence: answer.confidence,
    choiceMatchesArgmax: probabilities[answer.choice] + 1e-6 >= Math.max(...Object.values(probabilities)),
  };
}

export async function askJev(state, { model = 'typesafe/jev-1.13', apiKey = process.env.OPENROUTER_API_KEY, fetchImpl = fetch, question = null } = {}) {
  if (!apiKey) throw new Error('Set OPENROUTER_API_KEY in your terminal to record a real Jev lap. Never put it in browser code.');
  const response = await fetchImpl('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(jevRequest(state, model, question)),
    signal: AbortSignal.timeout(30_000),
  });
  // Do not print provider bodies: diagnostics should never echo credentials.
  if (!response.ok) throw new Error(`Jev HTTP ${response.status}${response.status === 429 ? ' rate limit' : ''}`);
  const payload = await response.json();
  return { decision: parseJevDecision(payload), model: payload.model, usage: payload.usage, requestId: payload.id ?? null, provider: payload.provider ?? null };
}
