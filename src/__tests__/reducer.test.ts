import { describe, it, expect } from "vitest";
import {
  toastReducer,
  createInitialState,
  DEFAULT_MAX_VISIBLE,
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

  it("drops the oldest when exceeding maxVisible", () => {
    let state: ToastState = createInitialState(2);
    for (const id of ["a", "b", "c"]) {
      state = toastReducer(state, { type: "ADD", toast: makeToast(id) });
    }
    expect(state.toasts.map((t) => t.id)).toEqual(["b", "c"]);
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
});

describe("toastReducer CLEAR", () => {
  it("removes everything", () => {
    let state = createInitialState();
    state = toastReducer(state, { type: "ADD", toast: makeToast("a") });
    state = toastReducer(state, { type: "ADD", toast: makeToast("b") });
    state = toastReducer(state, { type: "CLEAR" });
    expect(state.toasts).toHaveLength(0);
  });

  it("is a no-op when already empty", () => {
    const state = createInitialState();
    expect(toastReducer(state, { type: "CLEAR" })).toBe(state);
  });
});
