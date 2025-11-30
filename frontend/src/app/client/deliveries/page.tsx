"use client";
import { useEffect, useState, useMemo } from "react";
import ClientLayout from "@/components/ClientLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthGet, apiAuthPut } from "@/lib/api";
import { showToast } from "@/lib/toast";
import Link from "next/link";
import DeliveryEditModal from "@/components/DeliveryEditModal";

type ClientDelivery = {
  id: string;
  date: string;
  timeSlot: string;
  shopName: string;
  shopAddress: string;
  bags: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'delivered' | 'cancelled';
  totalAmount: number;
  notes?: string;
  createdAt: string;
};

type ClientStats = {
  totalDeliveries: number;
  totalSpent: number;
  averageOrderValue: number;
  byStatus: Record<string, number>;
  byShop: Record<string, number>;
};

export default function ClientDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<ClientDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtres avancés
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'quarter' | 'custom'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'confirmed' | 'in_progress' | 'delivered' | 'cancelled'>('all');
  const [shopFilter, setShopFilter] = useState<string>('all');
  const [amountFilter, setAmountFilter] = useState<{min: number, max: number}>({min: 0, max: 1000});
  const [bagsFilter, setBagsFilter] = useState<{min: number, max: number}>({min: 0, max: 20});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'shop' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [customDateRange, setCustomDateRange] = useState<{start: string, end: string}>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Export
  const [isExporting, setIsExporting] = useState(false);
  
  // Modal de modification
  const [editingDelivery, setEditingDelivery] = useState<ClientDelivery | null>(null);

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        setLoading(true);
        const data = await apiAuthGet<ClientDelivery[]>("/test/client/deliveries");
        setDeliveries(data);
      } catch (err: any) {
        console.error("Error fetching client deliveries:", err);
        setError(err.message || "Une erreur est survenue lors du chargement des livraisons.");
      } finally {
        setLoading(false);
      }
    };
    fetchDeliveries();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-CH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: ClientDelivery['status']) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: ClientDelivery['status']) => {
    switch (status) {
      case 'delivered':
        return 'Livrée';
      case 'confirmed':
        return 'Confirmée';
      case 'scheduled':
        return 'Programmée';
      case 'in_progress':
        return 'En cours';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  // Filtrage et tri avancés
  const filteredAndSortedDeliveries = useMemo(() => {
    let filtered = deliveries.filter(delivery => {
      const deliveryDate = new Date(delivery.date);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const deliveryDay = new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate());
      
      // Filtre par date
      let dateMatch = true;
      switch (dateFilter) {
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateMatch = deliveryDay.getTime() >= weekAgo.getTime();
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateMatch = deliveryDay.getTime() >= monthAgo.getTime();
          break;
        case 'quarter':
          const quarterAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
          dateMatch = deliveryDay.getTime() >= quarterAgo.getTime();
          break;
        case 'custom':
          const startDate = new Date(customDateRange.start);
          const endDate = new Date(customDateRange.end);
          dateMatch = deliveryDay.getTime() >= startDate.getTime() && deliveryDay.getTime() <= endDate.getTime();
          break;
        default:
          dateMatch = true;
      }

      // Filtre par statut
      const statusMatch = statusFilter === 'all' || delivery.status === statusFilter;
      
      // Filtre par magasin
      const shopMatch = shopFilter === 'all' || delivery.shopName.toLowerCase().includes(shopFilter.toLowerCase());
      
      // Filtre par montant
      const amountMatch = delivery.totalAmount >= amountFilter.min && delivery.totalAmount <= amountFilter.max;
      
      // Filtre par nombre de sacs
      const bagsMatch = delivery.bags >= bagsFilter.min && delivery.bags <= bagsFilter.max;
      
      // Filtre par recherche
      const searchMatch = searchTerm === '' || 
        delivery.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.shopAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      return dateMatch && statusMatch && shopMatch && amountMatch && bagsMatch && searchMatch;
    });

    // Tri
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'amount':
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case 'shop':
          aValue = a.shopName;
          bValue = b.shopName;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [deliveries, dateFilter, statusFilter, shopFilter, amountFilter, bagsFilter, searchTerm, sortBy, sortOrder, customDateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedDeliveries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDeliveries = filteredAndSortedDeliveries.slice(startIndex, endIndex);

  // Statistiques
  const stats = useMemo(() => {
    const total = filteredAndSortedDeliveries.length;
    const totalSpent = filteredAndSortedDeliveries.reduce((sum, d) => sum + d.totalAmount, 0);
    const averageOrderValue = total > 0 ? totalSpent / total : 0;
    const byStatus = filteredAndSortedDeliveries.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const byShop = filteredAndSortedDeliveries.reduce((acc, d) => {
      acc[d.shopName] = (acc[d.shopName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { total, totalSpent, averageOrderValue, byStatus, byShop };
  }, [filteredAndSortedDeliveries]);

  // Liste des magasins uniques
  const uniqueShops = useMemo(() => {
    const shops = [...new Set(deliveries.map(d => d.shopName))];
    return shops.sort();
  }, [deliveries]);

  // Export CSV
  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const csvContent = [
        ['ID', 'Magasin', 'Adresse', 'Date', 'Heure', 'Sacs', 'Montant', 'Statut', 'Notes'],
        ...filteredAndSortedDeliveries.map(delivery => [
          delivery.id,
          delivery.shopName,
          delivery.shopAddress,
          formatDate(delivery.date),
          formatTime(delivery.date),
          delivery.bags,
          delivery.totalAmount.toFixed(2),
          getStatusText(delivery.status),
          delivery.notes || ''
        ])
      ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `mes_livraisons_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("Export CSV réussi !", "success");
    } catch (error) {
      console.error("Erreur export CSV:", error);
      showToast("Erreur lors de l'export CSV", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setDateFilter('all');
    setStatusFilter('all');
    setShopFilter('all');
    setAmountFilter({min: 0, max: 1000});
    setBagsFilter({min: 0, max: 20});
    setSearchTerm('');
    setSortBy('date');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const handleEditDelivery = (delivery: ClientDelivery) => {
    // Vérifier si la livraison peut être modifiée
    const deliveryDate = new Date(delivery.date);
    const now = new Date();
    const isPastDelivery = deliveryDate < now || delivery.status === 'delivered' || delivery.status === 'cancelled';
    
    if (isPastDelivery) {
      showToast("Cette livraison ne peut plus être modifiée", "warning");
      return;
    }
    
    setEditingDelivery(delivery);
  };

  const handleSaveDelivery = (updatedDelivery: ClientDelivery) => {
    setDeliveries(prev => 
      prev.map(delivery => 
        delivery.id === updatedDelivery.id ? updatedDelivery : delivery
      )
    );
    setEditingDelivery(null);
  };

  if (loading) {
    return (
      <ClientLayout>
        <LoadingSpinner text="Chargement de vos livraisons..." />
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <Breadcrumbs />
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <Breadcrumbs />
      <div className="mt-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes Livraisons</h1>
            <p className="mt-2 text-gray-600">
              Consultez l'historique complet de vos livraisons
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportToCSV}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isExporting ? '⏳ Export...' : '📊 Export CSV'}
            </button>
            <Link
              href="/delivery/new"
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
            >
              + Nouvelle livraison
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🚚</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Livraisons
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.total}
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
                      Total Dépensé
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalSpent.toFixed(2)} CHF
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
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Commande Moyenne
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.averageOrderValue.toFixed(2)} CHF
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
                      Livrées
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.byStatus.delivered || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres avancés */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Filtres Avancés</h3>
              <div className="flex space-x-2">
                <button
                  onClick={resetFilters}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
                >
                  🔄 Réinitialiser
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Recherche */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔍 Recherche
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Magasin, adresse, notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filtre par date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Période
                </label>
                <div className="space-y-2">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Toutes les dates</option>
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois</option>
                    <option value="quarter">Ce trimestre</option>
                    <option value="custom">Période personnalisée</option>
                  </select>
                  {dateFilter === 'custom' && (
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={customDateRange.start}
                        onChange={(e) => setCustomDateRange(prev => ({...prev, start: e.target.value}))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="date"
                        value={customDateRange.end}
                        onChange={(e) => setCustomDateRange(prev => ({...prev, end: e.target.value}))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Filtre par magasin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏪 Magasin
                </label>
                <select
                  value={shopFilter}
                  onChange={(e) => setShopFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tous les magasins</option>
                  {uniqueShops.map(shop => (
                    <option key={shop} value={shop}>{shop}</option>
                  ))}
                </select>
              </div>

              {/* Filtre par statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📊 Statut
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="scheduled">Programmées</option>
                  <option value="confirmed">Confirmées</option>
                  <option value="in_progress">En cours</option>
                  <option value="delivered">Livrées</option>
                  <option value="cancelled">Annulées</option>
                </select>
              </div>

              {/* Tri */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔄 Tri
                </label>
                <div className="flex space-x-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="date">Date</option>
                    <option value="amount">Montant</option>
                    <option value="shop">Magasin</option>
                    <option value="status">Statut</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            {/* Filtres par montant et sacs */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Montant (CHF)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={amountFilter.min}
                    onChange={(e) => setAmountFilter(prev => ({...prev, min: Number(e.target.value)}))}
                    placeholder="Min"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="flex items-center text-gray-500">-</span>
                  <input
                    type="number"
                    value={amountFilter.max}
                    onChange={(e) => setAmountFilter(prev => ({...prev, max: Number(e.target.value)}))}
                    placeholder="Max"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🎒 Nombre de sacs
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={bagsFilter.min}
                    onChange={(e) => setBagsFilter(prev => ({...prev, min: Number(e.target.value)}))}
                    placeholder="Min"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="flex items-center text-gray-500">-</span>
                  <input
                    type="number"
                    value={bagsFilter.max}
                    onChange={(e) => setBagsFilter(prev => ({...prev, max: Number(e.target.value)}))}
                    placeholder="Max"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques des filtres */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="text-sm">
                <span className="font-medium text-blue-900">{stats.total}</span>
                <span className="text-blue-700"> livraisons trouvées</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-blue-900">{stats.totalSpent.toFixed(2)} CHF</span>
                <span className="text-blue-700"> dépensés</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-blue-900">{stats.averageOrderValue.toFixed(2)} CHF</span>
                <span className="text-blue-700"> commande moyenne</span>
              </div>
            </div>
            <div className="text-sm text-blue-700">
              Page {currentPage} sur {totalPages}
            </div>
          </div>
        </div>

        {/* Contrôles de pagination */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">
                  Afficher par page:
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="text-sm text-gray-700">
                Affichage {startIndex + 1}-{Math.min(endIndex, filteredAndSortedDeliveries.length)} sur {filteredAndSortedDeliveries.length} livraisons
              </div>
            </div>
          </div>
        </div>

        {/* Tableau des livraisons */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => setSortBy('shop')}>
                    <div className="flex items-center">
                      🏪 Magasin
                      {sortBy === 'shop' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => setSortBy('date')}>
                    <div className="flex items-center">
                      📅 Date & Heure
                      {sortBy === 'date' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    🎒 Sacs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => setSortBy('amount')}>
                    <div className="flex items-center">
                      💰 Montant
                      {sortBy === 'amount' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => setSortBy('status')}>
                    <div className="flex items-center">
                      📊 Statut
                      {sortBy === 'status' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ⚙️ Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {delivery.shopName}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {delivery.shopAddress}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(delivery.date)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTime(delivery.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="text-lg mr-1">🎒</span>
                        {delivery.bags} sac{delivery.bags > 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {delivery.totalAmount.toFixed(2)} CHF
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                        {getStatusText(delivery.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleEditDelivery(delivery)}
                        disabled={new Date(delivery.date) < new Date() || delivery.status === 'delivered' || delivery.status === 'cancelled'}
                        className="text-blue-600 hover:text-blue-900 text-xs disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        ✏️ Modifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Affichage de <span className="font-medium">{startIndex + 1}</span> à <span className="font-medium">{Math.min(endIndex, filteredAndSortedDeliveries.length)}</span> sur <span className="font-medium">{filteredAndSortedDeliveries.length}</span> résultats
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Précédent</span>
                        ←
                      </button>
                      
                      {/* Pages */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Suivant</span>
                        →
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message si aucun résultat */}
        {filteredAndSortedDeliveries.length === 0 && (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune livraison trouvée
            </h3>
            <p className="text-gray-500 mb-4">
              Essayez de modifier vos filtres pour voir plus de résultats.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}

        {/* Modal de modification */}
        <DeliveryEditModal
          delivery={editingDelivery}
          isOpen={!!editingDelivery}
          onClose={() => setEditingDelivery(null)}
          onSave={handleSaveDelivery}
        />
      </div>
    </ClientLayout>
  );
}