/**
 * Sample the recorded lap at `time`, interpolating between the stored frames.
 * Frames are `[time, x, y, heading]`, so a full lap stays a small payload.
 */
export function sampleLap(lap, time) {
  const frames = lap.frames;
  const last = frames[frames.length - 1];
  if (time >= last[0]) return { x: last[1], y: last[2], heading: last[3], done: true, finished: lap.finished === true };

  let low = 0;
  let high = frames.length - 1;
  while (low < high - 1) {
    const middle = (low + high) >> 1;
    if (frames[middle][0] <= time) low = middle;
    else high = middle;
  }
  const a = frames[low];
  const b = frames[high];
  const mix = (time - a[0]) / Math.max(0.0001, b[0] - a[0]);

  let turn = b[3] - a[3];
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;

  return {
    x: a[1] + (b[1] - a[1]) * mix,
    y: a[2] + (b[2] - a[2]) * mix,
    heading: a[3] + turn * mix,
    done: false,
    finished: false,
  };
}

