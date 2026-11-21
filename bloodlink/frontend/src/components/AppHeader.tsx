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
    <header className="flex items-center justify-between border-b border-[var(--ln)] pb-3.5 mb-5" role="banner">
      <div className="flex items-center gap-2.5 min-w-0">
        {bloodGroup ? (
          <div
            className="bg-badge w-10 h-10 text-sm font-mono shadow-sm flex-none"
            aria-label={`Blood group ${bloodGroup}`}
          >
            {bloodGroup}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--tint)] text-[var(--rt)] flex items-center justify-center flex-none">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
              <path d="M12 2s7 7.2 7 12a7 7 0 0 1-14 0c0-4.8 7-12 7-12z" />
            </svg>
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[var(--ink)] tracking-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-[var(--mu)] truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-none pl-2">
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
            className="text-xs font-semibold text-[var(--mu)] hover:text-[var(--ink)] px-2 py-1 rounded-lg hover:bg-[var(--ln)]/30 transition-all"
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
