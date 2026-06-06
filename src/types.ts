import type { ReactNode } from "react";

/** Visual / semantic category of a toast. */
export type ToastType = "info" | "success" | "warning" | "error" | "loading";

/**
 * Where the toast stack is anchored on screen. Six corners/edges are supported.
 */
export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/** A clickable action rendered inside a toast. */
export interface ToastAction {
  /** Visible button label. */
  label: string;
  /**
   * Invoked when the action button is clicked. Receives the toast id so the
   * handler can dismiss/update the originating toast if desired.
   */
  onClick: (id: string) => void;
  /**
   * When `true` (the default) the toast is dismissed automatically after the
   * handler runs. Set to `false` to keep the toast on screen.
   */
  dismissOnClick?: boolean;
}

/** Options accepted when enqueuing a toast. */
export interface ToastOptions {
  /** Semantic type. Defaults to `"info"`. */
  type?: ToastType;
  /**
   * Time in milliseconds before the toast auto-dismisses.
   * Use `0` (or a negative number) to disable auto-dismiss.
   * Defaults to the provider's `defaultDuration` (4000).
   */
  duration?: number;
  /** Anchor for this toast. Overrides the provider default for this toast only. */
  position?: ToastPosition;
  /** Optional action button rendered alongside the message. */
  action?: ToastAction;
  /** Optional title rendered above the message in bold. */
  title?: string;
  /**
   * Whether hovering the toast pauses its auto-dismiss timer.
   * Overrides the provider default for this toast only.
   */
  pauseOnHover?: boolean;
  /**
   * Stable id to reuse. When provided and a toast with this id already exists,
   * the existing toast is updated in place instead of a new one being created.
   * Useful for progress / promise flows.
   */
  id?: string;
  /** Optional arbitrary icon node rendered before the content. */
  icon?: ReactNode;
}

/** A fully-resolved toast living in the store. */
export interface Toast {
  /** Stable unique id. */
  id: string;
  /** Display message. */
  message: string;
  /** Resolved semantic type. */
  type: ToastType;
  /** Resolved duration in ms (`0` means sticky). */
  duration: number;
  /** Epoch ms at which the toast was created. */
  createdAt: number;
  /** Resolved anchor for this toast. */
  position: ToastPosition;
  /** Optional action button. */
  action?: ToastAction;
  /** Optional bold title. */
  title?: string;
  /** Whether hover pauses this toast's timer. */
  pauseOnHover: boolean;
  /** Optional icon node. */
  icon?: ReactNode;
  /**
   * Remaining time (ms) at the moment the timer was last paused, or `null`
   * when the toast is running normally. Used to resume after a hover-pause.
   */
  remaining: number | null;
}

/**
 * Configuration for {@link ToastContextValue.promise}. Each field is either a
 * static message or a function of the resolved/rejected value.
 */
export interface PromiseMessages<T> {
  /** Shown immediately while the promise is pending. */
  loading: string;
  /** Shown on fulfillment. A function receives the resolved value. */
  success: string | ((value: T) => string);
  /** Shown on rejection. A function receives the thrown error. */
  error: string | ((error: unknown) => string);
}
