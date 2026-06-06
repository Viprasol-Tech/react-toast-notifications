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
import type { Toast, ToastOptions } from "./types";
import {
  DEFAULT_DURATION,
  DEFAULT_MAX_VISIBLE,
  createInitialState,
  toastReducer,
} from "./reducer";
import { defaultTimer, type Timer } from "./timer";

let counter = 0;
/** Generate a process-unique toast id. */
function nextId(): string {
  counter += 1;
  return `toast-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ToastContextValue {
  /** Live list of toasts, oldest first. */
  toasts: Toast[];
  /** Enqueue a toast; returns its id. */
  toast: (message: string, options?: ToastOptions) => string;
  /** Imperatively dismiss a toast by id. */
  dismiss: (id: string) => void;
  /** Remove every toast. */
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export interface ToastProviderProps {
  children: ReactNode;
  /** Maximum number of toasts shown at once. Defaults to 4. */
  maxVisible?: number;
  /** Default auto-dismiss duration (ms) when a toast omits one. Defaults to 4000. */
  defaultDuration?: number;
  /** Injectable timer for deterministic tests. Defaults to the global clock. */
  timer?: Timer;
}

/**
 * Provides toast state and the `useToast` API to descendants. Auto-dismiss is
 * driven by the injectable {@link Timer}, making behavior deterministic in tests.
 */
export function ToastProvider({
  children,
  maxVisible = DEFAULT_MAX_VISIBLE,
  defaultDuration = DEFAULT_DURATION,
  timer = defaultTimer,
}: ToastProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(
    toastReducer,
    maxVisible,
    createInitialState,
  );

  // Track scheduled timers per toast id so we can cancel on manual dismiss.
  const timersRef = useRef<Map<string, unknown>>(new Map());

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  const toast = useCallback(
    (message: string, options: ToastOptions = {}): string => {
      const id = nextId();
      const duration = options.duration ?? defaultDuration;
      const item: Toast = {
        id,
        message,
        type: options.type ?? "info",
        duration,
        createdAt: timer.now(),
      };
      dispatch({ type: "ADD", toast: item });

      if (duration > 0) {
        const token = timer.set(() => {
          timersRef.current.delete(id);
          dispatch({ type: "EXPIRE", id, now: timer.now() });
        }, duration);
        timersRef.current.set(id, token);
      }
      return id;
    },
    [defaultDuration, timer],
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
    () => ({ toasts: state.toasts, toast, dismiss, clear }),
    [state.toasts, toast, dismiss, clear],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
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
