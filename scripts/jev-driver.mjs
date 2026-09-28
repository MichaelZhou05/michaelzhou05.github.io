/** TypeSafe's Choice API -> one fixed-duration move; never generates a racing line. */
export const JEV_ACTION_FRAMES = 12;
export const JEV_DIRECTIONS = [
  'up', 'down', 'left', 'right', 'up+left', 'up+right', 'down+left', 'down+right', 'none',
];

export function jevRequest(state, model = 'jev-latest') {
  return {
    model,
    state,
    questions: {
      direction: {
        type: 'choice',
        instructions: `Which direction should the car move for the next ${JEV_ACTION_FRAMES} frames (0.2 simulated seconds) to reach the sector gate quickly while staying on asphalt? Plan ahead using the road polyline. Choose exactly one direction; a fresh observation follows this move.`,
        criteria: Object.fromEntries(JEV_DIRECTIONS.map((direction) => [direction,
          direction === 'none' ? 'Stop for 12 frames; the lap clock still runs.' : `Hold ${direction} for 12 frames in screen coordinates.`,
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
    || Math.abs(Object.values(probabilities).reduce((sum, value) => sum + value, 0) - 1) > 0.01
    || probabilities[answer.choice] + 1e-6 < Math.max(...Object.values(probabilities))) {
    throw new Error('Jev returned an invalid probability distribution');
  }
  if (!Number.isFinite(answer.confidence) || answer.confidence < 0 || answer.confidence > 1) {
    throw new Error('Jev returned invalid confidence');
  }
  return {
    plan: [{ direction: answer.choice, frames: JEV_ACTION_FRAMES }],
    note: 'Jev Choice; fixed 12-frame action',
    probabilities,
    confidence: answer.confidence,
  };
}

export async function askJev(state, { model = 'jev-latest', apiKey = process.env.TYPESAFE_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('Set TYPESAFE_API_KEY in your terminal to record a real Jev lap. Never put it in browser code.');
  const response = await fetchImpl('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(jevRequest(state, model)),
    signal: AbortSignal.timeout(30_000),
  });
  // Do not print provider bodies: diagnostics should never echo credentials.
  if (!response.ok) throw new Error(`Jev HTTP ${response.status}${response.status === 429 ? ' rate limit' : ''}`);
  const payload = await response.json();
  return { decision: parseJevDecision(payload), model: payload.model, usage: payload.usage };
}
