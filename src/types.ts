/** Visual / semantic category of a toast. */
export type ToastType = "info" | "success" | "warning" | "error";

/** Options accepted when enqueuing a toast. */
export interface ToastOptions {
  /** Semantic type. Defaults to `"info"`. */
  type?: ToastType;
  /**
   * Time in milliseconds before the toast auto-dismisses.
   * Use `0` (or a negative number) to disable auto-dismiss.
   * Defaults to `4000`.
   */
  duration?: number;
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
}
