"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type ActionCardProps = {
  title: string;
  description: string;
  href?: string;
  icon?: ReactNode;
  tone?: "blue" | "green" | "purple" | "orange";
  onClick?: () => void;
};

const toneStyles: Record<NonNullable<ActionCardProps["tone"]>, string> = {
  blue: "bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:ring-blue-200",
  green: "bg-green-50 text-green-700 hover:bg-green-100 focus-visible:ring-green-200",
  purple: "bg-purple-50 text-purple-700 hover:bg-purple-100 focus-visible:ring-purple-200",
  orange: "bg-orange-50 text-orange-700 hover:bg-orange-100 focus-visible:ring-orange-200",
};

export function ActionCard({
  title,
  description,
  href,
  icon = "⚡",
  tone = "blue",
  onClick,
}: ActionCardProps) {
  const className = `flex flex-col gap-2 rounded-2xl border border-transparent p-4 transition focus-visible:outline-none focus-visible:ring-2 ${toneStyles[tone]}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        <ActionCardContent icon={icon} title={title} description={description} />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      <ActionCardContent icon={icon} title={title} description={description} />
    </button>
  );
}

const ActionCardContent = ({
  icon,
  title,
  description,
}: Pick<ActionCardProps, "icon" | "title" | "description">) => (
  <div className="text-left">
    <div className="mb-2 text-xl">{icon}</div>
    <p className="text-sm font-semibold text-gray-900">{title}</p>
    <p className="text-xs text-gray-600">{description}</p>
  </div>
);



