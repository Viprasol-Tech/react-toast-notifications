import { useToast } from "./ToastProvider";
import type { Toast } from "./types";

export interface ToastViewportProps {
  /** Optional className applied to the viewport container. */
  className?: string;
}

/**
 * Renders the current toasts from context. A bare, dependency-free view you can
 * drop in or replace with your own renderer using `useToast().toasts`.
 */
export function ToastViewport({ className }: ToastViewportProps): JSX.Element {
  const { toasts, dismiss } = useToast();
  return (
    <div
      className={className}
      role="region"
      aria-label="Notifications"
      data-toast-viewport=""
    >
      {toasts.map((t: Toast) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          data-toast-type={t.type}
          data-testid="toast"
        >
          <span data-testid="toast-message">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismiss(t.id)}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
