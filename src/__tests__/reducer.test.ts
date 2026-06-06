import { describe, it, expect } from "vitest";
import {
  toastReducer,
  createInitialState,
  DEFAULT_MAX_VISIBLE,
  DEFAULT_POSITION,
  type ToastState,
} from "../reducer";
import type { Toast } from "../types";

function makeToast(id: string, overrides: Partial<Toast> = {}): Toast {
  return {
    id,
    message: `msg-${id}`,
    type: "info",
    duration: 1000,
    createdAt: 0,
    position: DEFAULT_POSITION,
    pauseOnHover: true,
    remaining: null,
    ...overrides,
  };
}

describe("createInitialState", () => {
  it("uses the default cap", () => {
    expect(createInitialState().maxVisible).toBe(DEFAULT_MAX_VISIBLE);
  });

  it("clamps invalid caps to at least 1", () => {
    expect(createInitialState(0).maxVisible).toBe(1);
    expect(createInitialState(-5).maxVisible).toBe(1);
    expect(createInitialState(3.9).maxVisible).toBe(3);
  });

  it("starts with no toasts", () => {
    expect(createInitialState().toasts).toEqual([]);
  });
});

describe("toastReducer ADD", () => {
  it("appends toasts oldest-first", () => {
    let state = createInitialState(4);
    state = toastReducer(state, { type: "ADD", toast: makeToast("a") });
    state = toastReducer(state, { type: "ADD", toast: makeToast("b") });
    expect(state.toasts.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("ignores duplicate ids", () => {
    let state = createInitialState(4);
    state = toastReducer(state, { type: "ADD", toast: makeToast("a") });
    const after = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { message: "changed" }),
    });
    expect(after).toBe(state);
    expect(after.toasts).toHaveLength(1);
  });

  it("drops the oldest when exceeding maxVisible (max-stack)", () => {
    let state: ToastState = createInitialState(2);
    for (const id of ["a", "b", "c"]) {
      state = toastReducer(state, { type: "ADD", toast: makeToast(id) });
    }
    expect(state.toasts.map((t) => t.id)).toEqual(["b", "c"]);
  });

  it("preserves per-toast position and action metadata", () => {
    let state = createInitialState();
    const onClick = () => {};
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", {
        position: "bottom-left",
        action: { label: "Undo", onClick },
        title: "Heads up",
      }),
    });
    const t = state.toasts[0];
    expect(t.position).toBe("bottom-left");
    expect(t.action?.label).toBe("Undo");
    expect(t.title).toBe("Heads up");
  });
});

describe("toastReducer UPDATE", () => {
  it("patches message and type in place", () => {
    let state = createInitialState();
    state = toastReducer(state, { type: "ADD", toast: makeToast("a") });
    state = toastReducer(state, {
      type: "UPDATE",
      id: "a",
      patch: { message: "done", type: "success" },
      now: 50,
    });
    expect(state.toasts[0].message).toBe("done");
    expect(state.toasts[0].type).toBe("success");
  });

  it("re-anchors createdAt when the duration changes", () => {
    let state = createInitialState();
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { createdAt: 0, duration: 1000 }),
    });
    state = toastReducer(state, {
      type: "UPDATE",
      id: "a",
      patch: { duration: 3000 },
      now: 500,
    });
    expect(state.toasts[0].createdAt).toBe(500);
    expect(state.toasts[0].duration).toBe(3000);
  });

  it("keeps createdAt when the duration is unchanged", () => {
    let state = createInitialState();
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { createdAt: 0, duration: 1000 }),
    });
    state = toastReducer(state, {
      type: "UPDATE",
      id: "a",
      patch: { message: "x", duration: 1000 },
      now: 500,
    });
    expect(state.toasts[0].createdAt).toBe(0);
  });

  it("is a no-op for unknown ids", () => {
    let state = createInitialState();
    state = toastReducer(state, { type: "ADD", toast: makeToast("a") });
    const after = toastReducer(state, {
      type: "UPDATE",
      id: "zzz",
      patch: { message: "x" },
      now: 0,
    });
    expect(after).toBe(state);
  });
});

describe("toastReducer REMOVE", () => {
  it("removes by id", () => {
    let state = createInitialState();
    state = toastReducer(state, { type: "ADD", toast: makeToast("a") });
    state = toastReducer(state, { type: "ADD", toast: makeToast("b") });
    state = toastReducer(state, { type: "REMOVE", id: "a" });
    expect(state.toasts.map((t) => t.id)).toEqual(["b"]);
  });

  it("is a no-op for unknown ids (referential stability)", () => {
    let state = createInitialState();
    state = toastReducer(state, { type: "ADD", toast: makeToast("a") });
    const after = toastReducer(state, { type: "REMOVE", id: "zzz" });
    expect(after).toBe(state);
  });
});

describe("toastReducer EXPIRE", () => {
  it("removes a toast only once its duration has elapsed", () => {
    let state = createInitialState();
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { createdAt: 100, duration: 1000 }),
    });

    // Not yet due.
    const early = toastReducer(state, { type: "EXPIRE", id: "a", now: 500 });
    expect(early).toBe(state);

    // Due exactly at createdAt + duration.
    const due = toastReducer(state, { type: "EXPIRE", id: "a", now: 1100 });
    expect(due.toasts).toHaveLength(0);
  });

  it("never expires sticky (duration <= 0) toasts", () => {
    let state = createInitialState();
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { duration: 0 }),
    });
    const after = toastReducer(state, {
      type: "EXPIRE",
      id: "a",
      now: 1_000_000,
    });
    expect(after).toBe(state);
    expect(after.toasts).toHaveLength(1);
  });

  it("never expires a paused toast", () => {
    let state = createInitialState();
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { createdAt: 0, duration: 1000, remaining: 400 }),
    });
    const after = toastReducer(state, {
      type: "EXPIRE",
      id: "a",
      now: 10_000,
    });
    expect(after).toBe(state);
    expect(after.toasts).toHaveLength(1);
  });
});

describe("toastReducer PAUSE / RESUME", () => {
  it("captures remaining time on pause", () => {
    let state = createInitialState();
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { createdAt: 0, duration: 1000 }),
    });
    state = toastReducer(state, { type: "PAUSE", id: "a", now: 300 });
    expect(state.toasts[0].remaining).toBe(700);
  });

  it("clamps remaining to zero when paused after expiry window", () => {
    let state = createInitialState();
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { createdAt: 0, duration: 1000 }),
    });
    state = toastReducer(state, { type: "PAUSE", id: "a", now: 5000 });
    expect(state.toasts[0].remaining).toBe(0);
  });

  it("does not pause sticky toasts", () => {
    let state = createInitialState();
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { duration: 0 }),
    });
    const after = toastReducer(state, { type: "PAUSE", id: "a", now: 100 });
    expect(after).toBe(state);
  });

  it("is idempotent: pausing an already-paused toast is a no-op", () => {
    let state = createInitialState();
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { createdAt: 0, duration: 1000 }),
    });
    state = toastReducer(state, { type: "PAUSE", id: "a", now: 300 });
    const again = toastReducer(state, { type: "PAUSE", id: "a", now: 800 });
    expect(again).toBe(state);
    expect(again.toasts[0].remaining).toBe(700);
  });

  it("resume re-anchors createdAt so the remaining time is preserved", () => {
    let state = createInitialState();
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { createdAt: 0, duration: 1000 }),
    });
    state = toastReducer(state, { type: "PAUSE", id: "a", now: 300 });
    // Resume much later; 700ms should still remain from `now`.
    state = toastReducer(state, { type: "RESUME", id: "a", now: 10_000 });
    expect(state.toasts[0].remaining).toBeNull();
    expect(state.toasts[0].createdAt).toBe(10_000 - 300);
    // Not yet due 699ms later, due 700ms later.
    expect(
      toastReducer(state, { type: "EXPIRE", id: "a", now: 10_699 }),
    ).toBe(state);
    expect(
      toastReducer(state, { type: "EXPIRE", id: "a", now: 10_700 }).toasts,
    ).toHaveLength(0);
  });

  it("resume on a non-paused toast is a no-op", () => {
    let state = createInitialState();
    state = toastReducer(state, { type: "ADD", toast: makeToast("a") });
    const after = toastReducer(state, { type: "RESUME", id: "a", now: 0 });
    expect(after).toBe(state);
  });
});

describe("toastReducer CLEAR", () => {
  it("removes everything (dismiss-all)", () => {
    let state = createInitialState();
    state = toastReducer(state, { type: "ADD", toast: makeToast("a") });
    state = toastReducer(state, { type: "ADD", toast: makeToast("b") });
    state = toastReducer(state, { type: "CLEAR" });
    expect(state.toasts).toHaveLength(0);
  });

  it("clears only a given position when provided", () => {
    let state = createInitialState();
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { position: "top-right" }),
    });
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("b", { position: "bottom-left" }),
    });
    state = toastReducer(state, { type: "CLEAR", position: "top-right" });
    expect(state.toasts.map((t) => t.id)).toEqual(["b"]);
  });

  it("is a no-op when the position has no toasts", () => {
    let state = createInitialState();
    state = toastReducer(state, {
      type: "ADD",
      toast: makeToast("a", { position: "top-right" }),
    });
    const after = toastReducer(state, {
      type: "CLEAR",
      position: "bottom-left",
    });
    expect(after).toBe(state);
  });

  it("is a no-op when already empty", () => {
    const state = createInitialState();
    expect(toastReducer(state, { type: "CLEAR" })).toBe(state);
  });
});
