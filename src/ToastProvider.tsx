import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type {
  PromiseMessages,
  Toast,
  ToastOptions,
  ToastPosition,
  ToastType,
} from "./types";
import {
  DEFAULT_DURATION,
  DEFAULT_MAX_VISIBLE,
  DEFAULT_POSITION,
  createInitialState,
  toastReducer,
  type ToastPatch,
} from "./reducer";
import { defaultTimer, type Timer } from "./timer";

let counter = 0;
/** Generate a process-unique toast id. */
function nextId(): string {
  counter += 1;
  return `toast-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Convenience options for the typed helpers (`toast.success` etc.). */
export type ToastHelperOptions = Omit<ToastOptions, "type">;

export interface ToastContextValue {
  /** Live list of toasts, oldest first. */
  toasts: Toast[];
  /** Enqueue a toast; returns its id. */
  toast: (message: string, options?: ToastOptions) => string;
  /** Enqueue a `success` toast. */
  success: (message: string, options?: ToastHelperOptions) => string;
  /** Enqueue an `error` toast. */
  error: (message: string, options?: ToastHelperOptions) => string;
  /** Enqueue an `info` toast. */
  info: (message: string, options?: ToastHelperOptions) => string;
  /** Enqueue a `warning` toast. */
  warning: (message: string, options?: ToastHelperOptions) => string;
  /** Enqueue a sticky `loading` toast (duration defaults to 0). */
  loading: (message: string, options?: ToastHelperOptions) => string;
  /**
   * Drive a toast through a promise lifecycle: shows `loading` immediately,
   * then swaps to `success`/`error` when the promise settles. Resolves with the
   * promise's own value (re-throws on rejection) so it can be awaited.
   */
  promise: <T>(
    promise: Promise<T>,
    messages: PromiseMessages<T>,
    options?: ToastHelperOptions,
  ) => Promise<T>;
  /** Patch an existing toast in place. No-op for unknown ids. */
  update: (id: string, patch: ToastPatch) => void;
  /** Imperatively dismiss a toast by id. */
  dismiss: (id: string) => void;
  /** Remove every toast, or every toast at `position` when provided. */
  clear: (position?: ToastPosition) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Internal channel used by {@link ToastViewport} to drive pause/resume from
 * hover events without exposing those imperative methods on the public API.
 */
interface PauseControls {
  pause: (id: string) => void;
  resume: (id: string) => void;
}
const PauseControlContext = createContext<PauseControls | null>(null);

export interface ToastProviderProps {
  children: ReactNode;
  /** Maximum number of toasts shown at once. Defaults to 4. */
  maxVisible?: number;
  /** Default auto-dismiss duration (ms) when a toast omits one. Defaults to 4000. */
  defaultDuration?: number;
  /** Default screen anchor for toasts. Defaults to `"top-right"`. */
  defaultPosition?: ToastPosition;
  /** Whether toasts pause their timer on hover by default. Defaults to `true`. */
  pauseOnHover?: boolean;
  /** Injectable timer for deterministic tests. Defaults to the global clock. */
  timer?: Timer;
}

/**
 * Provides toast state and the `useToast` API to descendants. Auto-dismiss is
 * driven by the injectable {@link Timer}, making behavior deterministic in
 * tests. Supports per-toast positions, variant helpers, action buttons,
 * pause-on-hover, in-place updates, and promise-driven lifecycles.
 */
export function ToastProvider({
  children,
  maxVisible = DEFAULT_MAX_VISIBLE,
  defaultDuration = DEFAULT_DURATION,
  defaultPosition = DEFAULT_POSITION,
  pauseOnHover = true,
  timer = defaultTimer,
}: ToastProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(
    toastReducer,
    maxVisible,
    createInitialState,
  );

  // Track scheduled timers per toast id so we can cancel on manual dismiss.
  const timersRef = useRef<Map<string, unknown>>(new Map());
  // Mirror of the latest toasts so stable callbacks can read current state
  // without being re-created on every render.
  const toastsRef = useRef<Toast[]>(state.toasts);
  toastsRef.current = state.toasts;

  const clearTimer = useCallback(
    (id: string) => {
      const token = timersRef.current.get(id);
      if (token !== undefined) {
        timer.clear(token);
        timersRef.current.delete(id);
      }
    },
    [timer],
  );

  /** (Re)schedule the auto-dismiss timer for a toast given its remaining ms. */
  const scheduleExpiry = useCallback(
    (id: string, ms: number) => {
      clearTimer(id);
      if (ms <= 0) return;
      const token = timer.set(() => {
        timersRef.current.delete(id);
        dispatch({ type: "EXPIRE", id, now: timer.now() });
      }, ms);
      timersRef.current.set(id, token);
    },
    [clearTimer, timer],
  );

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const clear = useCallback((position?: ToastPosition) => {
    dispatch({ type: "CLEAR", position });
  }, []);

  const update = useCallback(
    (id: string, patch: ToastPatch) => {
      dispatch({ type: "UPDATE", id, patch, now: timer.now() });
      if (patch.duration !== undefined) {
        scheduleExpiry(id, patch.duration);
      }
    },
    [scheduleExpiry, timer],
  );

  const toast = useCallback(
    (message: string, options: ToastOptions = {}): string => {
      const id = options.id ?? nextId();
      const duration = options.duration ?? defaultDuration;
      const type: ToastType = options.type ?? "info";

      // Reuse: update the existing toast in place rather than duplicating.
      const exists = toastsRef.current.some((t) => t.id === id);
      if (exists) {
        dispatch({
          type: "UPDATE",
          id,
          patch: { message, type, duration, title: options.title },
          now: timer.now(),
        });
        scheduleExpiry(id, duration);
        return id;
      }

      const item: Toast = {
        id,
        message,
        type,
        duration,
        createdAt: timer.now(),
        position: options.position ?? defaultPosition,
        action: options.action,
        title: options.title,
        pauseOnHover: options.pauseOnHover ?? pauseOnHover,
        icon: options.icon,
        remaining: null,
      };
      dispatch({ type: "ADD", toast: item });
      scheduleExpiry(id, duration);
      return id;
    },
    [defaultDuration, defaultPosition, pauseOnHover, scheduleExpiry, timer],
  );

  const makeHelper = useCallback(
    (type: ToastType, durationDefault?: number) =>
      (message: string, options: ToastHelperOptions = {}): string =>
        toast(message, {
          ...options,
          type,
          duration: options.duration ?? durationDefault,
        }),
    [toast],
  );

  const success = useMemo(() => makeHelper("success"), [makeHelper]);
  const error = useMemo(() => makeHelper("error"), [makeHelper]);
  const info = useMemo(() => makeHelper("info"), [makeHelper]);
  const warning = useMemo(() => makeHelper("warning"), [makeHelper]);
  // Loading toasts are sticky by default (caller usually resolves them).
  const loading = useMemo(() => makeHelper("loading", 0), [makeHelper]);

  const pause = useCallback(
    (id: string) => {
      clearTimer(id);
      dispatch({ type: "PAUSE", id, now: timer.now() });
    },
    [clearTimer, timer],
  );

  const resume = useCallback(
    (id: string) => {
      const current = toastsRef.current.find((t) => t.id === id);
      const remaining = current?.remaining;
      dispatch({ type: "RESUME", id, now: timer.now() });
      if (remaining != null && remaining > 0) {
        scheduleExpiry(id, remaining);
      }
    },
    [scheduleExpiry, timer],
  );

  const promise = useCallback(
    <T,>(
      p: Promise<T>,
      messages: PromiseMessages<T>,
      options: ToastHelperOptions = {},
    ): Promise<T> => {
      const id = options.id ?? nextId();
      toast(messages.loading, {
        ...options,
        id,
        type: "loading",
        duration: 0,
      });
      return p.then(
        (value) => {
          const msg =
            typeof messages.success === "function"
              ? messages.success(value)
              : messages.success;
          dispatch({
            type: "UPDATE",
            id,
            patch: { message: msg, type: "success", duration: defaultDuration },
            now: timer.now(),
          });
          scheduleExpiry(id, defaultDuration);
          return value;
        },
        (err: unknown) => {
          const msg =
            typeof messages.error === "function"
              ? messages.error(err)
              : messages.error;
          dispatch({
            type: "UPDATE",
            id,
            patch: { message: msg, type: "error", duration: defaultDuration },
            now: timer.now(),
          });
          scheduleExpiry(id, defaultDuration);
          throw err;
        },
      );
    },
    [defaultDuration, scheduleExpiry, toast, timer],
  );

  // Cancel timers for toasts that have left the store (manual dismiss / clear).
  useEffect(() => {
    const live = new Set(state.toasts.map((t) => t.id));
    for (const [id, token] of timersRef.current) {
      if (!live.has(id)) {
        timer.clear(token);
        timersRef.current.delete(id);
      }
    }
  }, [state.toasts, timer]);

  // Clean up all pending timers on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const token of timers.values()) timer.clear(token);
      timers.clear();
    };
  }, [timer]);

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts: state.toasts,
      toast,
      success,
      error,
      info,
      warning,
      loading,
      promise,
      update,
      dismiss,
      clear,
    }),
    [
      state.toasts,
      toast,
      success,
      error,
      info,
      warning,
      loading,
      promise,
      update,
      dismiss,
      clear,
    ],
  );

  const pauseValue = useMemo<PauseControls>(
    () => ({ pause, resume }),
    [pause, resume],
  );

  return (
    <ToastContext.Provider value={value}>
      <PauseControlContext.Provider value={pauseValue}>
        {children}
      </PauseControlContext.Provider>
    </ToastContext.Provider>
  );
}

/** @internal Access hover pause/resume controls (used by the viewport). */
export function usePauseControls(): PauseControls {
  return (
    useContext(PauseControlContext) ?? {
      pause: () => {},
      resume: () => {},
    }
  );
}

/**
 * Access the toast API. Must be called inside a {@link ToastProvider}.
 *
 * @throws if used outside a provider.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
