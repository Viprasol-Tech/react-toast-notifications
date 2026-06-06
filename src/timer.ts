/**
 * Minimal timer abstraction so the provider can be driven by fake timers in
 * tests (or any custom scheduler) instead of always using the global clock.
 */
export interface Timer {
  /** Schedule `cb` to run after `ms` milliseconds. Returns a cancel token. */
  set(cb: () => void, ms: number): unknown;
  /** Cancel a previously scheduled callback. */
  clear(token: unknown): void;
  /** Current epoch time in milliseconds. */
  now(): number;
}

/** The default timer, backed by the host environment's global clock. */
export const defaultTimer: Timer = {
  set: (cb, ms) => setTimeout(cb, ms),
  clear: (token) => clearTimeout(token as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
};
