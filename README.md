<div align="center">

<img src="docs/assets/logo.png" alt="react-toast-notifications logo" width="120" />

# react-toast-notifications

**Toast notification system for React with a provider and hook.**

_Built and maintained by Viprasol Tech_

[![CI](https://github.com/Viprasol-Tech/react-toast-notifications/actions/workflows/ci.yml/badge.svg)](https://github.com/Viprasol-Tech/react-toast-notifications/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/react-toast-notifications.svg)](https://www.npmjs.com/package/react-toast-notifications)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org/)

</div>

## Features

- **Provider + hook API** — wrap your app in `<ToastProvider>` and call `useToast()` anywhere.
- **Real queue logic** — a pure, unit-tested reducer handles add / remove / expire transitions.
- **Max-visible cap** — oldest toasts are dropped automatically once the cap is reached.
- **Auto-dismiss** — per-toast `duration` with `0` meaning sticky (never auto-dismisses).
- **Injectable timer** — swap the clock for deterministic tests with fake timers.
- **Drop-in viewport** — ship the bundled `<ToastViewport>` or render your own from `useToast().toasts`.
- **Strict TypeScript** — fully typed public API, zero `any`.

## Install

```bash
npm i react-toast-notifications
```

## Usage

```tsx
import {
  ToastProvider,
  ToastViewport,
  useToast,
} from "react-toast-notifications";

function SaveButton() {
  const { toast } = useToast();
  return (
    <button
      onClick={() =>
        toast("Profile saved!", { type: "success", duration: 4000 })
      }
    >
      Save
    </button>
  );
}

export default function App() {
  return (
    <ToastProvider maxVisible={4} defaultDuration={4000}>
      <SaveButton />
      <ToastViewport />
    </ToastProvider>
  );
}
```

Need full control over rendering? Skip `<ToastViewport>` and read state directly:

```tsx
const { toasts, dismiss } = useToast();
return toasts.map((t) => (
  <div key={t.id} onClick={() => dismiss(t.id)}>
    {t.message}
  </div>
));
```

## API

### `<ToastProvider>` props

| Prop              | Type             | Default       | Description                                                  |
| ----------------- | ---------------- | ------------- | ------------------------------------------------------------ |
| `children`        | `ReactNode`      | —             | Subtree that can call `useToast()`.                          |
| `maxVisible`      | `number`         | `4`           | Hard cap on retained toasts; oldest are dropped past it.     |
| `defaultDuration` | `number`         | `4000`        | Auto-dismiss time (ms) used when a toast omits one.          |
| `timer`           | `Timer`          | global clock  | Injectable scheduler (`set` / `clear` / `now`) for testing.  |

### `useToast()` returns

| Member    | Signature                                              | Description                              |
| --------- | ----------------------------------------------------- | ---------------------------------------- |
| `toasts`  | `Toast[]`                                              | Live list, oldest first.                 |
| `toast`   | `(message, { type?, duration? }?) => string`          | Enqueue a toast; returns its id.         |
| `dismiss` | `(id: string) => void`                                | Remove a toast by id.                    |
| `clear`   | `() => void`                                           | Remove all toasts.                       |

`type` is one of `"info" | "success" | "warning" | "error"`. A `duration` of `0` (or negative) makes the toast sticky.

The pure `toastReducer`, `createInitialState`, and the `Timer` interface are also exported for advanced use and testing.

## A short note

The auto-dismiss logic is driven by an injectable `Timer`, so tests can use fake timers and assert exact dismissal boundaries deterministically — no flaky `setTimeout` races.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md) before opening a PR.

## Contact — Viprasol Tech Private Limited

- Website: [viprasol.com](https://viprasol.com)
- Email: [support@viprasol.com](mailto:support@viprasol.com)
- Telegram: [t.me/viprasol_help](https://t.me/viprasol_help) | WhatsApp: +91 96336 52112
- GitHub: [@Viprasol-Tech](https://github.com/Viprasol-Tech) | [LinkedIn](https://www.linkedin.com/in/viprasol/) | X [@viprasol](https://twitter.com/viprasol)

## License

[MIT](LICENSE) (c) 2025 Viprasol Tech Private Limited
