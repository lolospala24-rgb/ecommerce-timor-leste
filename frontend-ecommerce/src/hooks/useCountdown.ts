'use client';

import { useEffect, useState } from 'react';

export interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

// Shared by the homepage's FlashSaleSection, the dedicated /flash-sale page,
// and Product Detail's flash-sale block — one ticking interval per mounted
// countdown, isolated to just the small chip that renders it rather than
// forcing a rerender of a whole product grid every second.
export function useCountdown(target: string | Date | null | undefined): Countdown | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!target) {
      setRemainingMs(null);
      return;
    }
    const targetMs = new Date(target).getTime();
    const tick = () => setRemainingMs(Math.max(targetMs - Date.now(), 0));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (remainingMs == null) return null;
  const totalSeconds = Math.floor(remainingMs / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: remainingMs <= 0,
  };
}
