import { useToast, usePauseControls } from "./ToastProvider";
import type { Toast, ToastPosition } from "./types";

/** All supported anchors, in a stable render order. */
const POSITIONS: ToastPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export interface ToastViewportProps {
  /** Optional className applied to each position container. */
  className?: string;
  /**
   * Optional per-position className resolver, useful for applying CSS that
   * positions each stack (e.g. fixed corner placement).
   */
  classNameFor?: (position: ToastPosition) => string | undefined;
  /** Accessible label for each notifications region. Defaults to "Notifications". */
  label?: string;
}

/**
 * Renders the current toasts from context, grouped into one region per
 * position. A bare, dependency-free view you can drop in or replace with your
 * own renderer using `useToast().toasts`.
 *
 * Accessibility:
 * - Each position is a labelled `region`.
 * - `error`/`warning` toasts use `role="alert"` + `aria-live="assertive"`;
 *   others use `role="status"` + `aria-live="polite"`.
 * - Hover and keyboard focus pause the auto-dismiss timer when the toast opts
 *   in (the provider default).
 */
export function ToastViewport({
  className,
  classNameFor,
  label = "Notifications",
}: ToastViewportProps): JSX.Element {
  const { toasts, dismiss } = useToast();
  const { pause, resume } = usePauseControls();

  return (
    <>
      {POSITIONS.map((position) => {
        const items = toasts.filter((t) => t.position === position);
        if (items.length === 0) return null;
        return (
          <div
            key={position}
            className={classNameFor?.(position) ?? className}
            role="region"
            aria-label={`${label} (${position})`}
            data-toast-viewport={position}
          >
            {items.map((t) => (
              <ToastItem
                key={t.id}
                toast={t}
                onDismiss={dismiss}
                onPause={pause}
                onResume={resume}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

function ToastItem({
  toast: t,
  onDismiss,
  onPause,
  onResume,
}: ToastItemProps): JSX.Element {
  const assertive = t.type === "error" || t.type === "warning";
  const hoverHandlers = t.pauseOnHover
    ? {
        onMouseEnter: () => onPause(t.id),
        onMouseLeave: () => onResume(t.id),
        onFocus: () => onPause(t.id),
        onBlur: () => onResume(t.id),
      }
    : {};

  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      aria-atomic="true"
      data-toast-type={t.type}
      data-toast-paused={t.remaining !== null ? "" : undefined}
      data-testid="toast"
      tabIndex={0}
      {...hoverHandlers}
    >
      {t.icon != null && (
        <span data-testid="toast-icon" aria-hidden="true">
          {t.icon}
        </span>
      )}
      <div data-toast-content="">
        {t.title != null && (
          <strong data-testid="toast-title">{t.title}</strong>
        )}
        <span data-testid="toast-message">{t.message}</span>
      </div>
      {t.action != null && (
        <button
          type="button"
          data-testid="toast-action"
          onClick={() => {
            t.action?.onClick(t.id);
            if (t.action?.dismissOnClick ?? true) onDismiss(t.id);
          }}
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss notification"
        data-testid="toast-dismiss"
        onClick={() => onDismiss(t.id)}
      >
        x
      </button>
    </div>
  );
}
