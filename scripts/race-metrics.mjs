// Public list-price estimates are not invoices or subscription charges.
export const PRICING = {
  checkedAt: '2026-10-18',
  jev: { models: ['jev-1.13.0', 'jev-1.14.0'], inputPerMillion: 0.042, outputPerMillion: 0, source: 'https://docs.typesafe.ai/models' },
};
export function jevCost(model, usage) {
  if (!PRICING.jev.models.includes(model) || !Number.isInteger(usage?.input_tokens) || usage.input_tokens < 0) return null;
  return usage.input_tokens * PRICING.jev.inputPerMillion / 1e6;
}
export function latencySummary(attempts) {
  const values = attempts.filter(a => a.status === 'ok').map(a => a.responseMs).sort((a, b) => a - b);
  const percentile = p => values.length ? values[Math.ceil(p * values.length) - 1] : null;
  return { calls: values.length, attempts: attempts.length, failed: attempts.length - values.length,
    total: attempts.reduce((n, a) => n + a.responseMs, 0),
    mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    p50: percentile(0.5), p95: percentile(0.95) };
}
export function validateReactive(plan) {
  if (plan.moves.length !== 1 || plan.moves[0].frames !== 12) throw new Error('Reactive mode requires exactly one 12-frame action');
  return plan;
}
