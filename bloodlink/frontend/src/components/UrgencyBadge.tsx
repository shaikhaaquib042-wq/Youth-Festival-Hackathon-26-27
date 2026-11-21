"use client";

import React, { memo } from "react";

interface UrgencyBadgeProps {
  urgency: "CRITICAL" | "URGENT" | "SCHEDULED" | string;
}

export const UrgencyBadge = memo<UrgencyBadgeProps>(({ urgency }) => {
  if (urgency === "CRITICAL") {
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#991B1B]/20"
        role="status"
        aria-label="Critical urgency"
      >
        CRITICAL
      </span>
    );
  }

  if (urgency === "URGENT") {
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#92400E]/20"
        role="status"
        aria-label="Urgent status"
      >
        URGENT
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#334155] border border-[#334155]/20"
      role="status"
      aria-label="Scheduled request"
    >
      SCHEDULED
    </span>
  );
});

UrgencyBadge.displayName = "UrgencyBadge";
