"use client";

import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";
import type { ReactNode } from "react";

export type StatsCardProps = {
  label: string;
  value: number | string | null | undefined;
  icon?: ReactNode;
  tone?: "blue" | "green" | "purple" | "orange" | "pink";
  variant?: "currency" | "number" | "percent" | "raw";
  hint?: string;
  trend?: string;
};

const toneMap: Record<NonNullable<StatsCardProps["tone"]>, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
};

export function StatsCard({
  label,
  value,
  hint,
  icon,
  trend,
  tone = "blue",
  variant = "number",
}: StatsCardProps) {
  const displayValue =
    typeof value === "string"
      ? value
      : variant === "currency"
      ? formatCurrency(value)
      : variant === "percent"
      ? formatPercent(value)
      : variant === "raw"
      ? `${value ?? "—"}`
      : formatNumber(value);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg text-white ${toneMap[tone]}`}
        >
          {icon ?? "📊"}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{displayValue}</p>
          {hint && <p className="text-xs text-gray-400">{hint}</p>}
          {trend && (
            <p className="text-xs font-semibold text-green-600" data-testid="stats-card-trend">
              {trend}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}



