import type { Toast, ToastPosition, ToastType } from "./types";

/** Default time before auto-dismiss, in milliseconds. */
export const DEFAULT_DURATION = 4000;

/** Default maximum number of toasts kept in the store at once. */
export const DEFAULT_MAX_VISIBLE = 4;

/** Default screen anchor for the toast stack. */
export const DEFAULT_POSITION: ToastPosition = "top-right";

export interface ToastState {
  /** Ordered list, oldest first. */
  toasts: Toast[];
  /** Maximum number of toasts retained. */
  maxVisible: number;
}

/** Partial fields that {@link toastReducer} can patch onto an existing toast. */
export interface ToastPatch {
  message?: string;
  type?: ToastType;
  duration?: number;
  title?: string;
  remaining?: number | null;
}

export type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "UPDATE"; id: string; patch: ToastPatch; now: number }
  | { type: "REMOVE"; id: string }
  | { type: "EXPIRE"; id: string; now: number }
  | { type: "PAUSE"; id: string; now: number }
  | { type: "RESUME"; id: string; now: number }
  | { type: "CLEAR"; position?: ToastPosition };

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
 * cap, expiry, update, and pause/resume semantics can be unit-tested without
 * React.
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
    case "UPDATE": {
      const idx = state.toasts.findIndex((t) => t.id === action.id);
      if (idx === -1) return state;
      const prev = state.toasts[idx];
      const patch = action.patch;
      // When the duration changes we restart the lifecycle from `now` so the
      // new duration is measured fresh (e.g. promise resolve -> success toast).
      const durationChanged =
        patch.duration !== undefined && patch.duration !== prev.duration;
      const updated: Toast = {
        ...prev,
        ...patch,
        createdAt: durationChanged ? action.now : prev.createdAt,
        remaining: patch.remaining !== undefined ? patch.remaining : prev.remaining,
      };
      const toasts = state.toasts.slice();
      toasts[idx] = updated;
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
      if (toast.remaining !== null) return state; // currently paused
      if (action.now < toast.createdAt + toast.duration) return state;
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    }
    case "PAUSE": {
      const idx = state.toasts.findIndex((t) => t.id === action.id);
      if (idx === -1) return state;
      const prev = state.toasts[idx];
      // Sticky or already-paused toasts have nothing to pause.
      if (prev.duration <= 0 || prev.remaining !== null) return state;
      const elapsed = action.now - prev.createdAt;
      const remaining = Math.max(0, prev.duration - elapsed);
      const toasts = state.toasts.slice();
      toasts[idx] = { ...prev, remaining };
      return { ...state, toasts };
    }
    case "RESUME": {
      const idx = state.toasts.findIndex((t) => t.id === action.id);
      if (idx === -1) return state;
      const prev = state.toasts[idx];
      if (prev.remaining === null) return state; // not paused
      // Re-anchor createdAt so `remaining` ms remain until expiry.
      const toasts = state.toasts.slice();
      toasts[idx] = {
        ...prev,
        createdAt: action.now - (prev.duration - prev.remaining),
        remaining: null,
      };
      return { ...state, toasts };
    }
    case "CLEAR": {
      if (state.toasts.length === 0) return state;
      if (action.position) {
        const toasts = state.toasts.filter(
          (t) => t.position !== action.position,
        );
        if (toasts.length === state.toasts.length) return state;
        return { ...state, toasts };
      }
      return { ...state, toasts: [] };
    }
    default:
      return state;
  }
}
