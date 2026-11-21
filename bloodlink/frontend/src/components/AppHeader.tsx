"use client";

import React, { memo } from "react";
import Link from "next/link";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  bloodGroup?: string;
  badge?: string;
  badgeType?: "ok" | "default" | "critical";
  backHref?: string;
  backLabel?: string;
}

export const AppHeader = memo<AppHeaderProps>(({
  title,
  subtitle,
  bloodGroup,
  badge,
  badgeType = "ok",
  backHref,
  backLabel = "Back",
}) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--ln)] pb-4 gap-3" role="banner">
      <div className="flex items-center gap-3 min-w-0">
        {bloodGroup && (
          <div
            className="bg-badge w-10 h-10 text-sm font-mono shadow-xs flex-none"
            aria-label={`Blood group ${bloodGroup}`}
          >
            {bloodGroup}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[var(--ink)] tracking-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-[var(--mu)] truncate mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-none">
        {badge && (
          <span
            className={`tg ${badgeType === "ok" ? "ok" : ""}`}
            role="status"
          >
            {badge}
          </span>
        )}
        {backHref && (
          <Link
            href={backHref}
            className="text-xs font-semibold text-[var(--mu)] hover:text-[var(--ink)] px-2.5 py-1.5 rounded-lg border border-[var(--ln)] bg-[var(--sf)]"
            aria-label={backLabel}
          >
            {backLabel}
          </Link>
        )}
      </div>
    </header>
  );
});

AppHeader.displayName = "AppHeader";
