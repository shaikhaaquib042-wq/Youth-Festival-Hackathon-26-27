"use client";

import React, { memo, useState, useEffect } from "react";

interface CountdownTimerProps {
  deadline: string;
  onExpire?: () => void;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export const CountdownTimer = memo<CountdownTimerProps>(({
  deadline,
  onExpire,
  label = "Arrival Window",
  size = "md",
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    minutes: string;
    seconds: string;
    isExpired: boolean;
  }>({ minutes: "00", seconds: "00", isExpired: false });

  useEffect(() => {
    const calc = () => {
      const target = new Date(deadline).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ minutes: "00", seconds: "00", isExpired: true });
        onExpire?.();
        return;
      }

      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({
        minutes: m.toString().padStart(2, "0"),
        seconds: s.toString().padStart(2, "0"),
        isExpired: false,
      });
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  return (
    <div className="flex flex-col items-end">
      {label && (
        <span className="text-[10px] text-[var(--mu)] uppercase font-semibold tracking-wider">
          {label}
        </span>
      )}
      <div
        className={`font-mono font-bold tracking-tight tabular-nums flex items-center gap-0.5 ${
          timeLeft.isExpired
            ? "text-[var(--mu)] text-xs"
            : size === "lg"
            ? "text-xl text-[var(--ok)]"
            : size === "md"
            ? "text-sm text-[var(--ok)]"
            : "text-xs text-[var(--ok)]"
        }`}
        aria-live="polite"
      >
        {timeLeft.isExpired ? (
          <span>Window Expired</span>
        ) : (
          <>
            <span className="bg-[var(--okt)] px-1.5 py-0.5 rounded">{timeLeft.minutes}</span>
            <span>:</span>
            <span className="bg-[var(--okt)] px-1.5 py-0.5 rounded">{timeLeft.seconds}</span>
          </>
        )}
      </div>
    </div>
  );
});

CountdownTimer.displayName = "CountdownTimer";
