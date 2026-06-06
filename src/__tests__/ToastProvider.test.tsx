import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import {
  ToastProvider,
  useToast,
  ToastViewport,
  type ToastOptions,
} from "../index";

function Trigger({
  message,
  options,
}: {
  message: string;
  options?: ToastOptions;
}) {
  const { toast } = useToast();
  return <button onClick={() => toast(message, options)}>show</button>;
}

function App({
  options,
  maxVisible,
  defaultPosition,
}: {
  options?: ToastOptions;
  maxVisible?: number;
  defaultPosition?: ToastOptions["position"];
}) {
  return (
    <ToastProvider
      defaultDuration={3000}
      maxVisible={maxVisible}
      defaultPosition={defaultPosition}
    >
      <Trigger message="Saved!" options={options} />
      <ToastViewport />
    </ToastProvider>
  );
}

function click(text: string) {
  act(() => {
    screen.getByText(text).click();
  });
}

describe("ToastProvider + useToast (fake timers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders a toast and auto-dismisses after the duration", () => {
    render(<App options={{ duration: 2000 }} />);
    expect(screen.queryByTestId("toast")).toBeNull();

    click("show");
    expect(screen.getByTestId("toast-message")).toHaveTextContent("Saved!");

    act(() => vi.advanceTimersByTime(1999));
    expect(screen.queryByTestId("toast")).not.toBeNull();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("keeps sticky toasts (duration 0) visible indefinitely", () => {
    render(<App options={{ duration: 0 }} />);
    click("show");
    act(() => vi.advanceTimersByTime(1_000_000));
    expect(screen.getByTestId("toast-message")).toHaveTextContent("Saved!");
  });

  it("dismisses a toast when the close button is clicked", () => {
    render(<App options={{ duration: 0 }} />);
    click("show");
    expect(screen.getByTestId("toast")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("toast-dismiss"));
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("enforces the max-stack cap by dropping the oldest", () => {
    function Many() {
      const { toast } = useToast();
      return (
        <button
          onClick={() => {
            toast("a", { duration: 0 });
            toast("b", { duration: 0 });
            toast("c", { duration: 0 });
          }}
        >
          burst
        </button>
      );
    }
    render(
      <ToastProvider maxVisible={2}>
        <Many />
        <ToastViewport />
      </ToastProvider>,
    );
    click("burst");
    const messages = screen
      .getAllByTestId("toast-message")
      .map((el) => el.textContent);
    expect(messages).toEqual(["b", "c"]);
  });
});

describe("variant helpers", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  function Variants() {
    const { success, error, info, warning } = useToast();
    return (
      <>
        <button onClick={() => success("ok", { duration: 0 })}>ok</button>
        <button onClick={() => error("bad", { duration: 0 })}>bad</button>
        <button onClick={() => info("fyi", { duration: 0 })}>fyi</button>
        <button onClick={() => warning("hmm", { duration: 0 })}>hmm</button>
      </>
    );
  }

  it("tags toasts with the correct semantic type", () => {
    render(
      <ToastProvider>
        <Variants />
        <ToastViewport />
      </ToastProvider>,
    );
    click("ok");
    click("bad");
    click("fyi");
    click("hmm");
    const types = screen
      .getAllByTestId("toast")
      .map((el) => el.getAttribute("data-toast-type"));
    expect(types).toEqual(["success", "error", "info", "warning"]);
  });

  it("uses role=alert / aria-live=assertive for error toasts", () => {
    render(
      <ToastProvider>
        <Variants />
        <ToastViewport />
      </ToastProvider>,
    );
    click("bad");
    const el = screen.getByTestId("toast");
    expect(el).toHaveAttribute("role", "alert");
    expect(el).toHaveAttribute("aria-live", "assertive");
  });

  it("uses role=status / aria-live=polite for info toasts", () => {
    render(
      <ToastProvider>
        <Variants />
        <ToastViewport />
      </ToastProvider>,
    );
    click("fyi");
    const el = screen.getByTestId("toast");
    expect(el).toHaveAttribute("role", "status");
    expect(el).toHaveAttribute("aria-live", "polite");
  });
});

describe("positions", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders toasts in their own position region", () => {
    render(<App options={{ duration: 0, position: "bottom-left" }} />);
    click("show");
    const region = screen.getByLabelText("Notifications (bottom-left)");
    expect(region).toBeInTheDocument();
    expect(region.getAttribute("data-toast-viewport")).toBe("bottom-left");
  });

  it("honours the provider default position", () => {
    render(<App options={{ duration: 0 }} defaultPosition="bottom-center" />);
    click("show");
    expect(
      screen.getByLabelText("Notifications (bottom-center)"),
    ).toBeInTheDocument();
  });
});

describe("action buttons", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("invokes the action handler and dismisses by default", () => {
    const onClick = vi.fn();
    render(
      <App options={{ duration: 0, action: { label: "Undo", onClick } }} />,
    );
    click("show");
    expect(screen.getByTestId("toast-action")).toHaveTextContent("Undo");
    fireEvent.click(screen.getByTestId("toast-action"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("keeps the toast when dismissOnClick is false", () => {
    const onClick = vi.fn();
    render(
      <App
        options={{
          duration: 0,
          action: { label: "Retry", onClick, dismissOnClick: false },
        }}
      />,
    );
    click("show");
    fireEvent.click(screen.getByTestId("toast-action"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("toast")).toBeInTheDocument();
  });
});

describe("title and icon", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders an optional title and icon", () => {
    render(<App options={{ duration: 0, title: "Heads up", icon: <i>!</i> }} />);
    click("show");
    expect(screen.getByTestId("toast-title")).toHaveTextContent("Heads up");
    expect(screen.getByTestId("toast-icon")).toBeInTheDocument();
  });
});

describe("pause-on-hover", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("pauses the timer while hovered and resumes on mouse leave", () => {
    render(<App options={{ duration: 1000 }} />);
    click("show");

    act(() => vi.advanceTimersByTime(400));
    // Hover: timer should freeze.
    fireEvent.mouseEnter(screen.getByTestId("toast"));
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.queryByTestId("toast")).not.toBeNull();
    expect(screen.getByTestId("toast")).toHaveAttribute("data-toast-paused");

    // Leave: 600ms remain.
    fireEvent.mouseLeave(screen.getByTestId("toast"));
    act(() => vi.advanceTimersByTime(599));
    expect(screen.queryByTestId("toast")).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("does not pause when pauseOnHover is disabled for the toast", () => {
    render(<App options={{ duration: 1000, pauseOnHover: false }} />);
    click("show");
    fireEvent.mouseEnter(screen.getByTestId("toast"));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("pauses on keyboard focus and resumes on blur", () => {
    render(<App options={{ duration: 1000 }} />);
    click("show");
    fireEvent.focus(screen.getByTestId("toast"));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByTestId("toast")).not.toBeNull();
    fireEvent.blur(screen.getByTestId("toast"));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByTestId("toast")).toBeNull();
  });
});

describe("dismiss-all / clear", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  function ClearApp() {
    const { toast, clear } = useToast();
    return (
      <>
        <button
          onClick={() => {
            toast("a", { duration: 0, position: "top-right" });
            toast("b", { duration: 0, position: "bottom-left" });
          }}
        >
          two
        </button>
        <button onClick={() => clear()}>clear-all</button>
        <button onClick={() => clear("top-right")}>clear-tr</button>
        <ToastViewport />
      </>
    );
  }

  it("clears all toasts", () => {
    render(
      <ToastProvider>
        <ClearApp />
      </ToastProvider>,
    );
    click("two");
    expect(screen.getAllByTestId("toast")).toHaveLength(2);
    click("clear-all");
    expect(screen.queryAllByTestId("toast")).toHaveLength(0);
  });

  it("clears only toasts at a given position", () => {
    render(
      <ToastProvider>
        <ClearApp />
      </ToastProvider>,
    );
    click("two");
    click("clear-tr");
    const remaining = screen
      .getAllByTestId("toast-message")
      .map((e) => e.textContent);
    expect(remaining).toEqual(["b"]);
  });
});

describe("promise toasts", () => {
  // Real timers here: these tests exercise the promise lifecycle, not the
  // auto-dismiss clock, and real microtask flushing keeps React's act() happy.
  function PromiseApp({
    p,
    onChain,
  }: {
    p: Promise<string>;
    onChain: (chain: Promise<unknown>) => void;
  }) {
    const { promise } = useToast();
    return (
      <>
        <button
          onClick={() => {
            onChain(
              promise(p, {
                loading: "Saving...",
                success: (v) => `Saved ${v}`,
                error: "Failed",
              }).catch(() => {}),
            );
          }}
        >
          go
        </button>
        <ToastViewport />
      </>
    );
  }

  it("shows loading then success", async () => {
    let resolve!: (v: string) => void;
    const p = new Promise<string>((r) => {
      resolve = r;
    });
    let chain: Promise<unknown> = Promise.resolve();
    render(
      <ToastProvider defaultDuration={2000}>
        <PromiseApp p={p} onChain={(c) => (chain = c)} />
      </ToastProvider>,
    );
    click("go");
    expect(screen.getByTestId("toast-message")).toHaveTextContent("Saving...");
    expect(screen.getByTestId("toast")).toHaveAttribute(
      "data-toast-type",
      "loading",
    );

    await act(async () => {
      resolve("file");
      await chain;
    });
    expect(screen.getByTestId("toast-message")).toHaveTextContent("Saved file");
    expect(screen.getByTestId("toast")).toHaveAttribute(
      "data-toast-type",
      "success",
    );
  });

  it("shows error on rejection and re-throws", async () => {
    let reject!: (e: unknown) => void;
    const p = new Promise<string>((_r, rej) => {
      reject = rej;
    });
    let chain: Promise<unknown> = Promise.resolve();
    render(
      <ToastProvider defaultDuration={2000}>
        <PromiseApp p={p} onChain={(c) => (chain = c)} />
      </ToastProvider>,
    );
    click("go");
    await act(async () => {
      reject(new Error("boom"));
      await chain;
    });
    expect(screen.getByTestId("toast-message")).toHaveTextContent("Failed");
    expect(screen.getByTestId("toast")).toHaveAttribute(
      "data-toast-type",
      "error",
    );
  });
});

describe("update + id reuse", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("updates an existing toast in place via update()", () => {
    function UpdateApp() {
      const { toast, update } = useToast();
      return (
        <>
          <button onClick={() => toast("first", { id: "x", duration: 0 })}>
            create
          </button>
          <button onClick={() => update("x", { message: "second" })}>
            edit
          </button>
          <ToastViewport />
        </>
      );
    }
    render(
      <ToastProvider>
        <UpdateApp />
      </ToastProvider>,
    );
    click("create");
    expect(screen.getAllByTestId("toast")).toHaveLength(1);
    click("edit");
    expect(screen.getAllByTestId("toast")).toHaveLength(1);
    expect(screen.getByTestId("toast-message")).toHaveTextContent("second");
  });

  it("reuses a toast when toast() is called with an existing id", () => {
    render(<App options={{ id: "dup", duration: 0 }} />);
    click("show");
    click("show");
    expect(screen.getAllByTestId("toast")).toHaveLength(1);
  });
});

describe("useToast guard", () => {
  it("throws outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Bad() {
      useToast();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/within a <ToastProvider>/);
    spy.mockRestore();
  });
});
