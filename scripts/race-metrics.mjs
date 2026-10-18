// OpenRouter-reported request charges; not an estimate from direct-provider rates.
export const PRICING = {
  checkedAt: '2026-10-18',
  source: 'https://openrouter.ai/blog/insights/what-is-jev/',
  costField: 'usage.cost',
  currency: 'USD',
};
export function jevCost(usage) {
  return typeof usage?.cost === 'number' && Number.isFinite(usage.cost) && usage.cost >= 0
    ? usage.cost : null;
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
