import type { ActionCardProps } from "@/components/dashboard/ActionCard";

export const superDashboardMock = {
  global: {
    chains: 12,
    regions: 34,
    shops: 420,
    deliveries: 12_400,
    revenue: 4_250_000,
  },
  alerts: [
    { id: "alert-1", severity: "high", message: "Incident critique Genève" },
    { id: "alert-2", severity: "medium", message: "Retard de reporting Vaud" },
  ],
  topChains: [
    { name: "Swiss Fresh", deliveries: 4_200, revenue: 1_320_000 },
    { name: "Alpine Foods", deliveries: 3_100, revenue: 990_000 },
  ],
};
export const superActions: ActionCardProps[] = [
  {
    title: "Utilisateurs",
    description: "Contrôler les accès et rôles",
    href: "/admin/super/users",
    icon: "👥",
    tone: "blue",
  },
  {
    title: "Régions",
    description: "Superviser les zones actives",
    href: "/admin/super/regions",
    icon: "🌍",
    tone: "green",
  },
  {
    title: "Enseignes",
    description: "Gérer les chaines partenaires",
    href: "/admin/super/chains",
    icon: "🏢",
    tone: "purple",
  },
  {
    title: "Configuration",
    description: "Paramètres système avancés",
    href: "/admin/super/system",
    icon: "⚙️",
    tone: "orange",
  },
];



