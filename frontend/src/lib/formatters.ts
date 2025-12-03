"use client";

import { format, parseISO } from "date-fns";
import { frCH } from "date-fns/locale";

const toDate = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  const normalized = value?.includes("T") ? value : `${value ?? ""}T00:00:00Z`;
  try {
    return parseISO(normalized);
  } catch {
    return new Date(0);
  }
};

const currencyFormatter = (currency = "CHF", maximumFractionDigits = 0) =>
  new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency,
    maximumFractionDigits,
  });

const numberFormatter = (options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("fr-CH", options);

export const formatCurrency = (
  value: number | undefined | null,
  options?: { currency?: string; maximumFractionDigits?: number },
) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  const formatter = currencyFormatter(options?.currency, options?.maximumFractionDigits ?? 0);
  return formatter.format(value);
};

export const formatNumber = (value: number | undefined | null, options?: Intl.NumberFormatOptions) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter(options).format(value);
};

export const formatPercent = (value: number | undefined | null, digits = 1) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(digits)} %`;
};

export const formatShortDate = (value: string | Date, pattern = "d MMM") =>
  format(toDate(value), pattern, { locale: frCH });

export const formatLongDate = (value: string | Date, pattern = "d MMM yyyy") =>
  format(toDate(value), pattern, { locale: frCH });

export const formatDateLabel = (date: string | Date) => {
  const parsed = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  return parsed.toLocaleDateString("fr-CH", {
    day: "numeric",
    month: "short",
  });
};

