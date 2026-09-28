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
  status.textContent = `Jev recording: ${jevLap.drivenAt}. ${jevLap.finished ? 'The blue car replays this completed run.' : 'This trial did not finish and is not ranked.'}`;
  if (Number.isFinite(jevLap.responseLatencyMs?.mean)) {
    status.textContent += ` Mean response time: ${jevLap.responseLatencyMs.mean} ms per successful call, including the network round trip. Different control mode from Opus/Sol; compare with care.`;
  }
}
