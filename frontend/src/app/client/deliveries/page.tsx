"use client";
import { useEffect, useMemo, useState } from "react";
import ClientLayout from "@/components/ClientLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthGet } from "@/lib/api";
import { showToast } from "@/lib/toast";

type ClientDelivery = {
  id: string;
  startWindow: string;
  status: "scheduled" | "confirmed" | "in_progress" | "delivered" | "cancelled";
  shopName?: string;
  shopAddress?: string;
  bags: number;
  amount?: number;
};

type PageStats = {
  totalDeliveries: number;
  upcoming: number;
  delivered: number;
  totalBags: number;
};

const statusLabels: Record<ClientDelivery["status"], string> = {
  scheduled: "Planifiée",
  confirmed: "Confirmée",
  in_progress: "En cours",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export default function ClientDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<ClientDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ClientDelivery["status"]>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        setLoading(true);
        const data = await apiAuthGet<ClientDelivery[]>("/client/deliveries");
        setDeliveries(data);
      } catch (err: any) {
        console.error("Error fetching client deliveries:", err);
        setError(err.message || "Impossible de charger les livraisons.");
        showToast(err.message || "Impossible de charger les livraisons.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchDeliveries();
  }, []);

  const stats = useMemo<PageStats>(() => {
    const totalDeliveries = deliveries.length;
    const now = new Date();
    const upcoming = deliveries.filter((d) => {
      const dt = new Date(d.startWindow);
      return dt > now && d.status !== "delivered" && d.status !== "cancelled";
    }).length;
    const delivered = deliveries.filter((d) => d.status === "delivered").length;
    const totalBags = deliveries.reduce((sum, d) => sum + d.bags, 0);
    return { totalDeliveries, upcoming, delivered, totalBags };
  }, [deliveries]);

  const filteredDeliveries = useMemo(() => {
    return deliveries
      .filter((delivery) => {
        if (statusFilter !== "all" && delivery.status !== statusFilter) {
          return false;
        }
        if (searchTerm.trim()) {
          const haystack = `${delivery.shopName ?? ""} ${delivery.status}`.toLowerCase();
          return haystack.includes(searchTerm.toLowerCase());
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.startWindow).getTime() - new Date(a.startWindow).getTime()
      );
  }, [deliveries, statusFilter, searchTerm]);

  const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    return `${date.toLocaleDateString("fr-CH", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })} • ${date.toLocaleTimeString("fr-CH", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  if (loading) {
    return (
      <ClientLayout>
        <LoadingSpinner text="Chargement des livraisons..." />
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <Breadcrumbs />
      <div className="mt-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes livraisons</h1>
            <p className="mt-2 text-gray-600">
              Historique complet de vos commandes et livraisons à domicile.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Rechercher un magasin..."
              className="w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total livraisons" value={stats.totalDeliveries} />
          <StatCard title="À venir" value={stats.upcoming} accent />
          <StatCard title="Livrées" value={stats.delivered} />
          <StatCard title="Total sacs" value={stats.totalBags} />
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                {error}
              </div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="text-center text-gray-600 py-8">
                Aucune livraison ne correspond à vos filtres.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(delivery.startWindow)}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {delivery.shopName ?? "Magasin partenaire"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {delivery.bags} sac{delivery.bags > 1 ? "s" : ""} •{" "}
                        {delivery.amount
                          ? new Intl.NumberFormat("fr-CH", {
                              style: "currency",
                              currency: "CHF",
                            }).format(delivery.amount)
                          : "Montant en attente"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        delivery.status === "delivered"
                          ? "bg-green-100 text-green-800"
                          : delivery.status === "cancelled"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {statusLabels[delivery.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

function StatCard({ title, value, accent = false }: { title: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-4 py-5 bg-white ${
        accent ? "border-blue-200 shadow-md" : "border-gray-200"
      }`}
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ? "text-blue-600" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}
