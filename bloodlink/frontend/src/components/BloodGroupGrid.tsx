"use client";

import React, { memo } from "react";
import { BLOOD_GROUPS } from "@/lib/api";

interface BloodGroupGridProps {
  value: string;
  onChange: (group: string) => void;
  label?: string;
  disabled?: boolean;
}

export const BloodGroupGrid = memo<BloodGroupGridProps>(({
  value,
  onChange,
  label = "Select Blood Group",
  disabled = false,
}) => {
  return (
    <div className="card space-y-2.5" role="group" aria-labelledby="bg-label">
      <div className="flex items-center justify-between">
        <label id="bg-label" className="text-xs font-semibold text-[var(--ink)]">
          {label}
        </label>
        <span className="text-[11px] font-mono font-bold text-[var(--rt)]" aria-live="polite">
          Selected: {value}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {BLOOD_GROUPS.map((bg) => {
          const isSelected = value === bg;
          return (
            <button
              key={bg}
              type="button"
              disabled={disabled}
              onClick={() => onChange(bg)}
              aria-pressed={isSelected}
              className={`min-h-[46px] rounded-xl text-center font-mono font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C62828] active:scale-[0.97] ${
                isSelected
                  ? "bg-[#C62828] text-white shadow-sm ring-2 ring-[#C62828]/25 scale-[1.02]"
                  : "bg-[var(--bg)] border border-[var(--ln)] text-[var(--ink)] hover:bg-[var(--ln)]/40 hover:border-[var(--mu)]/40"
              }`}
            >
              {bg}
            </button>
          );
        })}
      </div>
    </div>
  );
});

BloodGroupGrid.displayName = "BloodGroupGrid";
