import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast, ToastViewport } from "../index";

function Trigger({
  message,
  duration,
}: {
  message: string;
  duration?: number;
}) {
  const { toast } = useToast();
  return (
    <button onClick={() => toast(message, { duration })}>show</button>
  );
}

function App({ duration }: { duration?: number }) {
  return (
    <ToastProvider defaultDuration={3000}>
      <Trigger message="Saved!" duration={duration} />
      <ToastViewport />
    </ToastProvider>
  );
}

describe("ToastProvider + useToast (fake timers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders a toast when toast() is called and auto-dismisses after the duration", () => {
    render(<App duration={2000} />);

    expect(screen.queryByTestId("toast")).toBeNull();

    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByTestId("toast-message")).toHaveTextContent("Saved!");

    // Just before the duration: still visible.
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(screen.queryByTestId("toast")).not.toBeNull();

    // Crossing the duration boundary: auto-dismissed.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("keeps sticky toasts (duration 0) visible indefinitely", () => {
    render(<App duration={0} />);
    act(() => {
      screen.getByText("show").click();
    });
    act(() => {
      vi.advanceTimersByTime(1_000_000);
    });
    expect(screen.getByTestId("toast-message")).toHaveTextContent("Saved!");
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
