"use client";

import type { ReactNode } from "react";

export type DashboardLayoutProps = {
  breadcrumbs?: ReactNode;
  header: ReactNode;
  children: ReactNode;
  sidebar?: ReactNode;
};

export function DashboardLayout({ breadcrumbs, header, children, sidebar }: DashboardLayoutProps) {
  const content = (
    <div className={sidebar ? "grid gap-6 lg:grid-cols-[2fr,1fr]" : "space-y-6"}>
      <section className="space-y-6">{children}</section>
      {sidebar ? <aside className="space-y-4">{sidebar}</aside> : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      {breadcrumbs}
      {header}
        {content}
      </div>
    </div>
  );
}

export default DashboardLayout;



