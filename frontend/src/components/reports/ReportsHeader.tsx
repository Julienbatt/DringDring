"use client";

import type { ReactNode } from "react";

export type ReportsHeaderProps = {
  title: string;
  subtitle?: string;
  description?: string;
  accent?: "purple" | "green";
  actions?: ReactNode;
  onExport?: (type: "pdf" | "excel") => void;
};

export default function ReportsHeader({
  title,
  subtitle,
  description,
  accent = "purple",
  actions,
  onExport,
}: ReportsHeaderProps) {
  const accentStyles =
    accent === "green"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-purple-600 hover:bg-purple-700";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Dashboard Analytics
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
        {description && <p className="mt-2 text-sm text-gray-500">{description}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        {actions}
        {onExport && (
          <>
        <button
          type="button"
              onClick={() => onExport("pdf")}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
        >
          Export PDF
        </button>
        <button
          type="button"
              onClick={() => onExport("excel")}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${accentStyles}`}
        >
          Export Excel
        </button>
          </>
        )}
      </div>
    </div>
  );
}



