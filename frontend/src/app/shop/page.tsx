"use client";
import { useEffect, useState } from "react";
import ShopLayout from "@/components/ShopLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getMe, apiAuthGet, type Me } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { getIdToken, onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Types matching backend response
type DashboardStats = {
  today: { deliveries: number; totalBags: number; totalAmount: number };
  week: { deliveries: number; totalBags: number; totalAmount: number };
  month: { deliveries: number; totalBags: number; totalAmount: number };
  topEmployees: { name: string; deliveries: number }[];
  topSectors: { name: string; deliveries: number }[];
  lastUpdated?: string;
};

type Delivery = {
  id: string;
  shopId: string;
  clientId: string;
  startWindow: string;
  bags: number;
  amount?: number;
  status?: string; // Optional, might not be in backend yet
};

export default function ShopMainPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcoming, setUpcoming] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { 
        setMe(null); 
        setStats(null);
        setUpcoming([]);
        setLoading(false);
        return; 
      }
      try {
        const t = await getIdToken(user, true);
        const m = await getMe(t);
        setMe(m);
        if (m.shopId) {
          await loadShopData(m.shopId);
        } else {
           setLoading(false);
        }
      } catch (e: any) {
        console.error("Auth error:", e);
        setMe(null);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loadShopData = async (shopId: string) => {
    setLoading(true);
    try {
      // Parallel fetch for stats and upcoming deliveries
      const [statsData, deliveriesData] = await Promise.all([
        apiAuthGet<DashboardStats>(\`/shops/\${shopId}/dashboard\`),
        apiAuthGet<{deliveries: Delivery[]}>(
          \`/deliveries?shopId=\${shopId}&futureOnly=true&limit=5&sort=asc\`
        )
      ]);
      
      setStats(statsData);
      setUpcoming(deliveriesData.deliveries || []);
    } catch (error: any) {
      console.error("Error loading shop data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ShopLayout>
        <LoadingSpinner text="Chargement du dashboard magasin..." />
      </ShopLayout>
    );
  }

  if (!me?.shopId) {
     return (
      <ShopLayout>
        <div className="p-8 text-center">
            <h2 className="text-xl text-red-600">Aucun magasin associé à ce compte.</h2>
            <p className="mt-2">Contactez votre administrateur.</p>
        </div>
      </ShopLayout>
     )
  }

  return (
    <ShopLayout>
      <div>
        <Breadcrumbs />
        <div className="mt-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Magasin</h1>
            <p className="mt-2 text-gray-600">Gérez vos livraisons et clients</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📦</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Livraisons aujourd&apos;hui</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats?.today.deliveries || 0}
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
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">🎒</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Sacs ce mois</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats?.month.totalBags || 0}
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
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">💰</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">CA ce mois</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats?.month.totalAmount ? \`\${stats.month.totalAmount.toFixed(0)} CHF\` : '0 CHF'}
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
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📊</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Livraisons ce mois</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats?.month.deliveries || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Principal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Livraison + */}
            <Link 
              href="/delivery/new"
              className="group bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-blue-500 hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">Livraison +</h3>
                <p className="text-gray-600 text-sm group-hover:text-blue-500 transition-colors">Créer une nouvelle livraison</p>
              </div>
            </Link>

            {/* Clients + */}
            <Link 
              href="/shop/clients/new"
              className="group bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-green-500 hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">Clients +</h3>
                <p className="text-gray-600 text-sm group-hover:text-green-500 transition-colors">Ajouter un nouveau client</p>
              </div>
            </Link>

            {/* Edit Profile */}
            <Link 
              href="/shop/profile"
              className="group bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-purple-500 hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">Edit Profile</h3>
                <p className="text-gray-600 text-sm group-hover:text-purple-500 transition-colors">Modifier les données du magasin</p>
              </div>
            </Link>
          </div>

          {/* Section Livraisons à venir */}
          <div className="bg-white rounded-lg shadow-md mb-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Prochaines livraisons</h2>
                <p className="text-sm text-gray-600">Aperçu des livraisons futures</p>
              </div>
              <Link 
                href="/shop/deliveries"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Voir tout →
              </Link>
            </div>
            <div className="p-6">
              {upcoming.length > 0 ? (
                 <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Heure</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sacs</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {upcoming.map(d => {
                        const date = new Date(d.startWindow);
                        return (
                          <tr key={d.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {format(date, "dd.MM.yyyy")}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {format(date, "HH:mm")}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{d.bags}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {d.amount ? \`\${d.amount.toFixed(2)} CHF\` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                 </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  Aucune livraison à venir.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}
