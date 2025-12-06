"use client";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiAuthGet } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import PausedScreen from "@/components/PausedScreen";
import { ENABLE_SUPER_ADMIN_FEATURES } from "@/lib/featureFlags";

type SuperAdminStats = {
  totalUsers: number;
  totalShops: number;
  totalDeliveries: number;
  totalRevenue: number;
  activeRegions: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
};

type SystemAlert = {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
};

export default function SuperAdminPage() {
  if (!ENABLE_SUPER_ADMIN_FEATURES) {
    return (
      <PausedScreen
        title="Espace Super Admin en pause"
        description="Les outils de supervision globale seront remis en ligne une fois les APIs disponibles."
      />
    );
  }

  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        router.push('/login?role=admin');
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (user) {
      loadSuperAdminData();
    }
  }, [user]);

  const loadSuperAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data for real-time calculations
      const [deliveriesData, shopsData, usersData] = await Promise.all([
        apiAuthGet<any[]>("/test/super-admin/deliveries"),
        apiAuthGet<any[]>("/test/super-admin/shops"),
        apiAuthGet<any[]>("/test/super-admin/users")
      ]);
      
      // Calculate real-time statistics
      const calculatedStats = calculateRealTimeStats(deliveriesData, shopsData, usersData);
      setStats(calculatedStats);
      
      // Generate system alerts
      const systemAlerts = generateSystemAlerts(deliveriesData, shopsData, usersData);
      setAlerts(systemAlerts);
      
    } catch (error) {
      console.error("Erreur chargement données super admin:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRealTimeStats = (deliveries: any[], shops: any[], users: any[]): SuperAdminStats => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Total users
    const totalUsers = users.length;
    
    // Total shops
    const totalShops = shops.length;
    
    // Total deliveries
    const totalDeliveries = deliveries.length;
    
    // Total revenue
    const totalRevenue = deliveries.reduce((sum, d) => sum + d.totalAmount, 0);
    
    // Active regions (unique regions with recent activity)
    const activeRegions = new Set(
      deliveries
        .filter(d => new Date(d.date) >= thirtyDaysAgo)
        .map(d => d.region)
        .filter(Boolean)
    ).size;
    
    // System health calculation
    const systemHealth = calculateSystemHealth(deliveries, shops, users);
    
    return {
      totalUsers,
      totalShops,
      totalDeliveries,
      totalRevenue,
      activeRegions,
      systemHealth
    };
  };

  const calculateSystemHealth = (deliveries: any[], shops: any[], users: any[]): 'excellent' | 'good' | 'warning' | 'critical' => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Check recent activity
    const recentDeliveries = deliveries.filter(d => new Date(d.date) >= oneDayAgo).length;
    const recentUsers = users.filter(u => new Date(u.createdAt || now) >= oneDayAgo).length;
    
    // Check for errors (simulation)
    const errorRate = Math.random() * 0.05; // 0-5% error rate
    const avgResponseTime = Math.random() * 200; // 0-200ms response time
    
    if (errorRate < 0.01 && avgResponseTime < 100 && recentDeliveries > 0) {
      return 'excellent';
    } else if (errorRate < 0.03 && avgResponseTime < 200 && recentDeliveries > 0) {
      return 'good';
    } else if (errorRate < 0.05 && avgResponseTime < 500) {
      return 'warning';
    } else {
      return 'critical';
    }
  };

  const generateSystemAlerts = (deliveries: any[], shops: any[], users: any[]): SystemAlert[] => {
    const alerts: SystemAlert[] = [];
    const now = new Date();
    
    // Recent shop additions
    const recentShops = shops.filter(s => 
      new Date(s.createdAt || now) >= new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );
    if (recentShops.length > 0) {
      alerts.push({
        id: "shop-" + Date.now(),
        type: 'info',
        message: `Nouveau magasin ${recentShops[0].name} ajouté`,
        timestamp: now.toLocaleString('fr-CH')
      });
    }
    
    // Recent user registrations
    const recentUsers = users.filter(u => 
      new Date(u.createdAt || now) >= new Date(now.getTime() - 2 * 60 * 60 * 1000)
    );
    if (recentUsers.length > 0) {
      alerts.push({
        id: "user-" + Date.now(),
        type: 'info',
        message: `${recentUsers.length} nouveaux utilisateurs enregistrés`,
        timestamp: now.toLocaleString('fr-CH')
      });
    }
    
    // System performance alerts
    const avgDeliveryTime = deliveries.length > 0 ? 
      deliveries.reduce((sum, d) => sum + (d.deliveryTime || 30), 0) / deliveries.length : 0;
    
    if (avgDeliveryTime > 45) {
      alerts.push({
        id: "performance-" + Date.now(),
        type: 'warning',
        message: 'Temps de livraison moyen élevé',
        timestamp: now.toLocaleString('fr-CH')
      });
    }
    
    // Revenue milestone
    const totalRevenue = deliveries.reduce((sum, d) => sum + d.totalAmount, 0);
    if (totalRevenue > 100000) {
      alerts.push({
        id: "revenue-" + Date.now(),
        type: 'info',
        message: `Objectif de revenus atteint: ${totalRevenue.toLocaleString()} CHF`,
        timestamp: now.toLocaleString('fr-CH')
      });
    }
    
    return alerts.slice(0, 5); // Limit to 5 alerts
  };

  if (!user) {
    return null; // Redirection en cours
  }

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Chargement des données système..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <Breadcrumbs />
        <div className="mt-6">
          <div className="max-w-7xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">👑 Super Administration</h1>
              <p className="mt-2 text-gray-600">Gestion globale du système DringDring</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">👥</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Utilisateurs</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.totalUsers || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">🏪</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Magasins</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.totalShops || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">📦</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Livraisons</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.totalDeliveries || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">💰</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Revenus</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.totalRevenue ? `${stats.totalRevenue.toLocaleString()} CHF` : '0 CHF'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                        stats?.systemHealth === 'excellent' ? 'bg-green-500' :
                        stats?.systemHealth === 'good' ? 'bg-blue-500' :
                        stats?.systemHealth === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        <span className="text-white text-sm font-bold">⚡</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Système</dt>
                        <dd className="text-lg font-medium text-gray-900 capitalize">
                          {stats?.systemHealth || 'excellent'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats supplémentaires */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">🌍</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Régions actives</p>
                    <p className="text-2xl font-bold text-green-900">
                      {stats?.activeRegions || 0}
                    </p>
                    <p className="text-sm text-green-700">
                      Avec activité récente
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">📊</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Performance</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {stats?.totalDeliveries && stats?.totalShops ? 
                        Math.round(stats.totalDeliveries / stats.totalShops) : 0} livraisons/magasin
                    </p>
                    <p className="text-sm text-blue-700">
                      Moyenne globale
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">📈</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">Croissance</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {stats?.totalUsers && stats?.totalShops ? 
                        Math.round(stats.totalUsers / stats.totalShops) : 0} utilisateurs/magasin
                    </p>
                    <p className="text-sm text-purple-700">
                      Ratio d'adoption
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Rapides */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Gestion Système
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Link
                      href="/admin/super/users"
                      className="group bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg">👥</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                            Utilisateurs
                          </h4>
                          <p className="text-sm text-gray-500">Gérer les utilisateurs</p>
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/admin/super/regions"
                      className="group bg-green-50 rounded-lg p-4 hover:bg-green-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg">🌍</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-gray-900 group-hover:text-green-700">
                            Régions
                          </h4>
                          <p className="text-sm text-gray-500">Gérer les régions</p>
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/admin/super/chains"
                      className="group bg-purple-50 rounded-lg p-4 hover:bg-purple-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg">🏢</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-gray-900 group-hover:text-purple-700">
                            Enseignes
                          </h4>
                          <p className="text-sm text-gray-500">Gérer les enseignes</p>
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/admin/super/system"
                      className="group bg-orange-50 rounded-lg p-4 hover:bg-orange-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg">⚙️</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-gray-900 group-hover:text-orange-700">
                            Système
                          </h4>
                          <p className="text-sm text-gray-500">Configuration</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Alertes Système
                  </h3>
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                        alert.type === 'error' ? 'bg-red-50 border-red-400' :
                        alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <span className={`text-sm ${
                              alert.type === 'error' ? 'text-red-400' :
                              alert.type === 'warning' ? 'text-yellow-400' :
                              'text-blue-400'
                            }`}>
                              {alert.type === 'error' ? '❌' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-gray-700">{alert.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
