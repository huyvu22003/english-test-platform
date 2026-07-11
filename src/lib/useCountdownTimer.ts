import { useCallback, useEffect, useRef, useState } from "react";

interface CountdownTimer {
  secondsLeft: number | null;
  start: (durationSec: number) => void;
  startDeadline: (deadlineMs: number, serverOffsetMs?: number) => void;
}

export function useCountdownTimer(onExpire: () => void): CountdownTimer {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const deadlineRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  const start = useCallback((durationSec: number) => {
    deadlineRef.current = Date.now() + durationSec * 1000;
    offsetRef.current = 0;
    setSecondsLeft(durationSec);
    setActive(true);
  }, []);

  const startDeadline = useCallback((deadlineMs: number, serverOffsetMs = 0) => {
    deadlineRef.current = deadlineMs;
    offsetRef.current = serverOffsetMs;
    const left = Math.max(0, Math.ceil((deadlineMs - (Date.now() + serverOffsetMs)) / 1000));
    setSecondsLeft(left);
    setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const dl = deadlineRef.current;
      if (dl === null) return;
      const left = Math.max(0, Math.ceil((dl - (Date.now() + offsetRef.current)) / 1000));
      setSecondsLeft(left);
      if (left <= 0) onExpireRef.current();
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  return { secondsLeft, start, startDeadline };
}
