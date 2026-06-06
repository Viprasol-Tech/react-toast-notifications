import type { Toast } from "./types";

/** Default time before auto-dismiss, in milliseconds. */
export const DEFAULT_DURATION = 4000;

/** Default maximum number of toasts kept in the store at once. */
export const DEFAULT_MAX_VISIBLE = 4;

export interface ToastState {
  /** Ordered list, oldest first. */
  toasts: Toast[];
  /** Maximum number of toasts retained. */
  maxVisible: number;
}

export type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "REMOVE"; id: string }
  | { type: "EXPIRE"; id: string; now: number }
  | { type: "CLEAR" };

/**
 * Build the initial reducer state.
 *
 * @param maxVisible - Hard cap on retained toasts. Values < 1 are clamped to 1.
 */
export function createInitialState(
  maxVisible: number = DEFAULT_MAX_VISIBLE,
): ToastState {
  return { toasts: [], maxVisible: Math.max(1, Math.floor(maxVisible)) };
}

/**
 * Pure toast reducer. All state transitions flow through here so the queue,
 * cap, and expiry semantics can be unit-tested without React.
 */
export function toastReducer(
  state: ToastState,
  action: ToastAction,
): ToastState {
  switch (action.type) {
    case "ADD": {
      // Avoid duplicate ids (idempotent add).
      if (state.toasts.some((t) => t.id === action.toast.id)) {
        return state;
      }
      const next = [...state.toasts, action.toast];
      // Enforce the max-visible cap by dropping the oldest entries.
      const overflow = next.length - state.maxVisible;
      const toasts = overflow > 0 ? next.slice(overflow) : next;
      return { ...state, toasts };
    }
    case "REMOVE": {
      const toasts = state.toasts.filter((t) => t.id !== action.id);
      if (toasts.length === state.toasts.length) return state;
      return { ...state, toasts };
    }
    case "EXPIRE": {
      // Only remove if the toast is actually due (defensive against stale timers).
      const toast = state.toasts.find((t) => t.id === action.id);
      if (!toast) return state;
      if (toast.duration <= 0) return state; // sticky toasts never expire
      if (action.now < toast.createdAt + toast.duration) return state;
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    }
    case "CLEAR": {
      if (state.toasts.length === 0) return state;
      return { ...state, toasts: [] };
    }
    default:
      return state;
  }
}
