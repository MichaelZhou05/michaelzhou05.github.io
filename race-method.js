import { jevLap } from './jev-lap.js';

// Keep the page honest when a real recording replaces the empty garage slot.
if (jevLap?.frames?.length > 1) {
  const summary = document.querySelector('#jev-trial-summary');
  if (summary) {
    const outcome = document.createElement('strong');
    outcome.textContent = jevLap.finished
      ? `Latest Jev trial: completed in ${jevLap.finishTime.toFixed(3)} simulated seconds. `
      : `Latest Jev trial: ${jevLap.distance.toLocaleString()} m, DNF. `;
    const cost = Number.isFinite(jevLap.costUsd) ? `$${jevLap.costUsd.toFixed(6)} reported cost.` : 'Total cost unknown because some request costs are unavailable.';
    summary.replaceChildren(outcome, document.createTextNode(
      `${jevLap.offTrackSeconds} seconds on grass; ${jevLap.wallHits} wall-hit frames; `
      + `${jevLap.responseLatencyMs.calls}/${jevLap.responseLatencyMs.attempts} valid requests. ${cost} `
      + 'This is one development trial, not a matched comparison with the legacy Opus/GPT laps.',
    ));
  }
  const status = document.querySelector('#jev-record-status');
  status.textContent = `Jev recording: ${jevLap.drivenAt}. ${jevLap.finished ? 'The blue car replays this completed run.' : 'The blue car replays this trial, stops at its recorded endpoint, and is classified DNF.'}`;
  if (Number.isFinite(jevLap.responseLatencyMs?.mean)) {
    status.textContent += ` Mean response time: ${jevLap.responseLatencyMs.mean.toFixed(1)} ms per successful call, including the network round trip. Different control mode from Opus/Sol; compare with care.`;
  }
}

import { matchedRuns } from './race-results.js';
const body = document.querySelector('#matched-results');
for (const { label, lap, artifact } of matchedRuns) {
  if (![1, 2].includes(lap.measurementVersion) || ![6, 12].includes(lap.actionFrames)) continue;
  if (body.querySelector('[data-empty]')) body.replaceChildren();
  const row = document.createElement('tr');
  const heading = document.createElement('th');
  heading.scope = 'row';
  const link = document.createElement('a');
  link.href = artifact;
  link.textContent = `${label} · ${lap.actionFrames} frames`;
  heading.append(link);
  const audit = document.createElement('a');
  audit.href = `${artifact}.audit.jsonl`;
  audit.textContent = ' · audit';
  heading.append(audit);
  row.append(heading);
  const ms = value => Number.isFinite(value) ? `${value.toFixed(0)} ms` : 'Unknown';
  const latency = lap.responseLatencyMs;
  for (const value of [
    lap.finished ? `${lap.finishTime.toFixed(3)} s` : `Incomplete · ${lap.distance} m`,
    `${lap.offTrackSeconds} s / ${lap.wallHits}`,
    ms(latency?.p50), ms(latency?.p95),
    Number.isFinite(lap.wallTimeMs) ? `${(lap.wallTimeMs / 1000).toFixed(1)} s` : 'Unknown',
    `${latency?.calls ?? '?'} / ${latency?.attempts ?? '?'}`,
    Number.isFinite(lap.costUsd) ? `$${lap.costUsd.toFixed(6)} · ${lap.costBasis}` : 'Unknown',
  ]) {
    const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
  }
  body.append(row);
}
