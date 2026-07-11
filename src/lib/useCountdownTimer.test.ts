import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCountdownTimer } from "./useCountdownTimer";

describe("useCountdownTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with null secondsLeft", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdownTimer(onExpire));
    expect(result.current.secondsLeft).toBeNull();
  });

  it("start() sets initial seconds and counts down", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdownTimer(onExpire));

    act(() => {
      result.current.start(10);
    });
    expect(result.current.secondsLeft).toBe(10);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.secondsLeft).toBe(7);
  });

  it("calls onExpire when timer reaches 0", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdownTimer(onExpire));

    act(() => {
      result.current.start(2);
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.secondsLeft).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("does not go below 0", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdownTimer(onExpire));

    act(() => {
      result.current.start(1);
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.secondsLeft).toBe(0);
  });

  it("startDeadline() works with a future deadline", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdownTimer(onExpire));
    const deadlineMs = Date.now() + 5000;

    act(() => {
      result.current.startDeadline(deadlineMs);
    });
    expect(result.current.secondsLeft).toBe(5);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.secondsLeft).toBe(2);
  });

  it("startDeadline() accounts for server offset", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdownTimer(onExpire));
    const deadlineMs = Date.now() + 10000;

    act(() => {
      result.current.startDeadline(deadlineMs, 5000);
    });
    // With offset of 5000ms, server time is 5s ahead, so only 5s left
    expect(result.current.secondsLeft).toBe(5);
  });
});
