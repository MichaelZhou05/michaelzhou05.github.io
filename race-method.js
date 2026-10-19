import { jevLap } from './jev-lap.js';

// Keep the page honest when a real recording replaces the empty garage slot.
if (jevLap?.frames?.length > 1) {
  const result = document.querySelector('#jev-result');
  result.replaceChildren();
  const label = document.createElement('th');
  label.scope = 'row';
  label.textContent = `${jevLap.model} · reactive`;
  result.append(label);
  for (const value of [
    jevLap.finished ? `${jevLap.finishTime.toFixed(3)} s` : 'Incomplete trial',
    `${jevLap.offTrackSeconds} s`, jevLap.wallHits, jevLap.modelCalls,
  ]) {
    const cell = document.createElement('td');
    cell.textContent = value;
    result.append(cell);
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
  if (lap.measurementVersion !== 1 || lap.controlMode !== 'reactive-choice-12-frames') continue;
  if (body.querySelector('[data-empty]')) body.replaceChildren();
  const row = document.createElement('tr');
  const heading = document.createElement('th');
  heading.scope = 'row';
  const link = document.createElement('a');
  link.href = artifact;
  link.textContent = label;
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
