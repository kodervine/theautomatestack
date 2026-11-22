// Honest watch progress for the AutoStack Quick Class. Shared by the watch page and the tests.
// maxWatched only moves forward while the viewer is actually playing through the part they have already reached.
// A jump forward (scrubbing) does not count, and neither does playing from a point past maxWatched.

// Seconds of video time one ~1 second tick may cover. 2x speed plus timer jitter stays under this.
export const MAX_STEP = 2.5;

/**
 * How far the video may move between two ticks and still count as playback: the real time that passed
 * times the playback speed, plus a little slack. Covers 2x speed and background tabs, where browsers slow timers down.
 */
export function allowedStep(elapsedSeconds, rate = 1) {
  const e = Number.isFinite(elapsedSeconds) && elapsedSeconds > 0 ? elapsedSeconds : 1;
  const r = Number.isFinite(rate) && rate > 0 ? rate : 1;
  return Math.max(MAX_STEP, e * r + 1.5);
}

/**
 * One poll of the player. state = { maxWatched, last } (last = video time at the previous tick, or null).
 * allowed = the biggest forward step that still counts (see allowedStep). Returns the new state. Pure, so it is easy to test.
 */
export function tick(state, t, allowed = MAX_STEP) {
  const prev = state.last;
  const next = { maxWatched: state.maxWatched, last: t };
  if (prev == null || !Number.isFinite(t)) return next;
  const step = t - prev;
  const normalStep = step > 0 && step <= allowed;
  const fromWatchedPart = prev <= state.maxWatched + MAX_STEP;
  if (normalStep && fromWatchedPart && t > state.maxWatched) next.maxWatched = t;
  return next;
}

/** The fractions of the video (25, 50, 75) that maxWatched has crossed. */
export function crossedQuarters(maxWatched, duration) {
  if (!(duration > 0)) return [];
  return [25, 50, 75].filter((p) => maxWatched >= (duration * p) / 100);
}
