"use client";
import { useEffect, useState } from "react";
import HQAdminLayout from "@/components/HQAdminLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthGet } from "@/lib/api";
import PausedScreen from "@/components/PausedScreen";
import { ENABLE_HQ_FEATURES } from "@/lib/featureFlags";

type HQShop = {
  id: string;
  name: string;
  address: string;
  phone: string;
  region: string;
  status: 'active' | 'inactive';
  totalDeliveries: number;
  todayDeliveries: number;
  totalRevenue: number;
  lastActivity: string;
};

export default function HQAdminShopsPage() {
  if (!ENABLE_HQ_FEATURES) {
    return (
      <PausedScreen
        title="Magasins HQ en pause"
        description="L’administration multi-magasins sera réactivée dès que les APIs correspondantes seront prêtes."
      />
    );
  }

  const [shops, setShops] = useState<HQShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    const fetchShops = async () => {
      try {
        setLoading(true);
        const data = await apiAuthGet<HQShop[]>("/test/hq-admin/shops");
        setShops(data);
      } catch (err: any) {
        console.error("Error fetching HQ shops:", err);
        setError(err.message || "Une erreur est survenue lors du chargement des magasins.");
      } finally {
        setLoading(false);
      }
    };
    fetchShops();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: HQShop['status']) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const getStatusText = (status: HQShop['status']) => {
    return status === 'active' ? 'Actif' : 'Inactif';
  };

  const filteredShops = shops.filter(shop => {
    if (filter === 'all') return true;
    return shop.status === filter;
  });

  if (loading) {
    return (
      <HQAdminLayout>
        <LoadingSpinner text="Chargement des magasins..." />
      </HQAdminLayout>
    );
  }

  if (error) {
    return (
      <HQAdminLayout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </HQAdminLayout>
    );
  }

  return (
    <HQAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes Magasins</h1>
            <p className="mt-2 text-gray-600">
              Gestion de tous les magasins de votre enseigne
            </p>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium">
            + Ajouter un magasin
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🏪</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Magasins
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {shops.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Magasins Actifs
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {shops.filter(s => s.status === 'active').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Revenus Totaux
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(shops.reduce((sum, shop) => sum + shop.totalRevenue, 0))}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tous ({shops.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'active'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Actifs ({shops.filter(s => s.status === 'active').length})
              </button>
              <button
                onClick={() => setFilter('inactive')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'inactive'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Inactifs ({shops.filter(s => s.status === 'inactive').length})
              </button>
            </div>
          </div>
        </div>

        {/* Shops List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Liste des Magasins
            </h3>
            {filteredShops.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Aucun magasin trouvé pour ce filtre.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredShops.map((shop) => (
                  <div key={shop.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {shop.name}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {shop.address}
                        </p>
                        <p className="text-sm text-gray-500">
                          {shop.phone}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shop.status)}`}>
                        {getStatusText(shop.status)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Région:</span>
                        <span className="font-medium">{shop.region}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Livraisons totales:</span>
                        <span className="font-medium">{shop.totalDeliveries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Aujourd'hui:</span>
                        <span className="font-medium">{shop.todayDeliveries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Revenus:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(shop.totalRevenue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Dernière activité:</span>
                        <span className="font-medium text-xs">
                          {formatDate(shop.lastActivity)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex space-x-2">
                      <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm font-medium">
                        Gérer
                      </button>
                      <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                        Détails
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </HQAdminLayout>
  );
}



