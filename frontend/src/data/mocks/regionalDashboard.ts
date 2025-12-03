import type { ActionCardProps } from "@/components/dashboard/ActionCard";

export const regionalDashboardMock = {
  manager: {
    name: "Claire Dupont",
    region: "Vaud",
  },
  shops: [
    { id: "shop-1", name: "Lausanne Gare", status: "active", deliveries: 42, revenue: 12_400 },
    { id: "shop-2", name: "Lausanne Flon", status: "active", deliveries: 31, revenue: 9_850 },
    { id: "shop-3", name: "Vevey Centre", status: "inactive", deliveries: 0, revenue: 0 },
  ],
  kpis: {
    deliveriesWeek: 120,
    deliveriesTrend: 8.2,
    satisfaction: 4.6,
    incidents: 1,
  },
};
export const regionalActions: ActionCardProps[] = [
  {
    title: "Magasins",
    description: "Gérer les magasins",
    href: "/admin/regional/shops",
    icon: "🏪",
    tone: "blue",
  },
  {
    title: "Coursiers",
    description: "Coordonner les équipes terrain",
    href: "/admin/regional/couriers",
    icon: "🚴",
    tone: "green",
  },
  {
    title: "Livraisons",
    description: "Suivi temps réel",
    href: "/admin/regional/deliveries",
    icon: "📦",
    tone: "purple",
  },
  {
    title: "Rapports",
    description: "Analyses régionales",
    href: "/admin/regional/reports",
    icon: "📊",
    tone: "orange",
  },
];



