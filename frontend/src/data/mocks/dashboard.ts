export const dashboardMock = {
  summary: {
    totalDeliveries: 482,
    activeShops: 42,
    revenue: 312_500,
    growth: 12.4,
  },
  regions: [
    { name: "Genève", shops: 12, deliveries: 160, revenue: 102_000 },
    { name: "Vaud", shops: 9, deliveries: 110, revenue: 78_400 },
    { name: "Valais", shops: 5, deliveries: 62, revenue: 31_700 },
  ],
  actions: [
    { title: "Ajouter un shop", description: "Onboard un nouveau magasin", href: "/admin/shops/new" },
    { title: "Inviter un manager", description: "Créer un compte HQ", href: "/admin/users" },
  ],
};
export const hqStatsMock = {
  totalShops: 24,
  totalDeliveries: 1847,
  totalRevenue: 46250,
  activeRegions: 3,
  thisMonthDeliveries: 342,
  thisMonthRevenue: 8550,
};

export const hqRegionsMock = [
  { id: "1", name: "Valais", shops: 12, deliveries: 892, revenue: 22300 },
  { id: "2", name: "Vaud", shops: 8, deliveries: 623, revenue: 15575 },
  { id: "3", name: "Genève", shops: 4, deliveries: 332, revenue: 8375 },
];

import type { ActionCardProps } from "@/components/dashboard/ActionCard";

export const hqActions: ActionCardProps[] = [
  {
    title: "Gestion Régions",
    description: "Administrer les régions",
    href: "/admin/hq/regions",
    icon: "🌍",
    tone: "blue",
  },
  {
    title: "Tous les Magasins",
    description: "Voir tous les magasins",
    href: "/admin/hq/shops",
    icon: "🏪",
    tone: "green",
  },
  {
    title: "Rapports",
    description: "Analyses et exports",
    href: "/admin/hq/reports",
    icon: "📊",
    tone: "purple",
  },
];



