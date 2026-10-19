// Preserve every live trial, including adapter failures; see results/README.md.
import { jevLap as r1 } from './results/jev-2026-10-18-r1.js';
import { jevLap as r2 } from './results/jev-2026-10-18-r2.js';
import { jevLap as r3 } from './results/jev-2026-10-18-r3.js';
import { jevLap as r4 } from './results/jev-2026-10-18-r4.js';
export const matchedRuns = [
  { label: 'Jev r1 · adapter stopped', lap: r1, artifact: './results/jev-2026-10-18-r1.js' },
  { label: 'Jev r2 · adapter stopped', lap: r2, artifact: './results/jev-2026-10-18-r2.js' },
  { label: 'Jev r3 · adapter stopped', lap: r3, artifact: './results/jev-2026-10-18-r3.js' },
  { label: 'Jev r4 · corrected adapter', lap: r4, artifact: './results/jev-2026-10-18-r4.js' },
];
