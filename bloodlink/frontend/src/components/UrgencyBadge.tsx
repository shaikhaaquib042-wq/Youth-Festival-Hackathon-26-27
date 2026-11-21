"use client";

import React, { memo } from "react";

interface UrgencyBadgeProps {
  urgency: "CRITICAL" | "URGENT" | "SCHEDULED" | string;
}

export const UrgencyBadge = memo<UrgencyBadgeProps>(({ urgency }) => {
  if (urgency === "CRITICAL") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--tint)] text-[var(--rt)] border border-[var(--rt)]/30"
        role="status"
        aria-label="Critical urgency"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--rt)] animate-ping" />
        CRITICAL
      </span>
    );
  }

  if (urgency === "URGENT") {
    return (
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#D97706]/40"
        role="status"
        aria-label="Urgent status"
      >
        URGENT
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--ln)] text-[var(--mu)]"
      role="status"
      aria-label="Scheduled request"
    >
      SCHEDULED
    </span>
  );
});

UrgencyBadge.displayName = "UrgencyBadge";
