"use client";

import Link from "next/link";

const quickLinks = [
  { href: "/hq-admin", label: "HQ Admin" },
  { href: "/admin/regional", label: "Régional" },
  { href: "/shop/dashboard", label: "Shop" },
  { href: "/client", label: "Client" },
];

export default function LegacyDashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-sm uppercase tracking-wide text-indigo-600">Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Point d’entrée legacy</h1>
          <p className="mt-3 text-gray-600">
            Cette page existe pour conserver la compatibilité avec les anciennes worktrees.
            Utilise les liens ci-dessous pour accéder aux nouvelles sections.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-400 hover:shadow"
            >
              <h2 className="text-lg font-semibold text-gray-900">{link.label}</h2>
              <p className="mt-1 text-sm text-gray-500">{link.href}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}


