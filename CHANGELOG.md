# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/); versioning
follows [SemVer](https://semver.org/).

## [0.2.0] - 2025

### Added
- **Positions** - six on-screen anchors (`top-left`, `top-center`, `top-right`,
  `bottom-left`, `bottom-center`, `bottom-right`), per-toast or via the new
  `defaultPosition` provider prop. The viewport renders one labelled region per
  position.
- **Variant helpers** - `success`, `error`, `info`, `warning`, and `loading`
  shortcuts on the `useToast()` API, plus a new `"loading"` toast type.
- **Action buttons** - optional `action: { label, onClick, dismissOnClick }`
  rendered inside a toast.
- **Promise toasts** - `promise(p, { loading, success, error })` drives a single
  toast through a promise lifecycle and resolves with the promise's own value.
- **Pause-on-hover** - auto-dismiss timers freeze on hover and keyboard focus,
  resuming with the correct remaining time. Configurable per-toast and via the
  `pauseOnHover` provider prop.
- **In-place updates** - `update(id, patch)` and id reuse (`toast(msg, { id })`)
  patch an existing toast instead of duplicating it.
- **Scoped dismiss-all** - `clear(position?)` clears every toast or only those at
  a given position.
- **Optional `title` and `icon`** on each toast.
- Accessibility: `error`/`warning` toasts use `role="alert"` +
  `aria-live="assertive"`; others use `role="status"` + `aria-live="polite"`.
  Toasts are focusable and pause on focus.

### Changed
- The reducer gained `UPDATE`, `PAUSE`, and `RESUME` actions and a
  position-aware `CLEAR`; `EXPIRE` now respects paused toasts.

## [0.1.0] - 2025

### Added
- Initial release of react-toast-notifications: Toast notification system for React with a provider and hook.
