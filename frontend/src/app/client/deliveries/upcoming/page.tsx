"use client";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { apiAuthGet } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

type Delivery = {
  id: string;
  date: string;
  time: string;
  status: string;
  bags: number;
  amount?: number;
  shopName?: string;
  courierNotes?: string;
};

export default function ClientUpcomingDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        router.push('/login?role=client');
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (user) {
      loadDeliveries();
    }
  }, [user]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      // Pour l'instant, on simule des données
      // TODO: Remplacer par l'appel API réel quand le backend sera prêt
      const mockDeliveries: Delivery[] = [
        {
          id: "1",
          date: "2025-10-27",
          time: "14:30",
          status: "confirmed",
          bags: 2,
          amount: 25.50,
          shopName: "Migros Sion",
          courierNotes: "Code d'accès: 1234"
        },
        {
          id: "2", 
          date: "2025-10-28",
          time: "10:00",
          status: "scheduled",
          bags: 1,
          amount: 15.00,
          shopName: "Coop Martigny"
        }
      ];
      setDeliveries(mockDeliveries);
    } catch (error: any) {
      console.error("Erreur chargement livraisons:", error);
      setError("Erreur lors du chargement des livraisons");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // Redirection en cours
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement de vos livraisons...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <Breadcrumbs />
        <div className="mt-6">
          <div className="max-w-4xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Mes livraisons à venir</h1>
              <p className="mt-2 text-gray-600">Suivez vos prochaines livraisons</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-md">
                {error}
              </div>
            )}

            {deliveries.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune livraison à venir</h3>
                <p className="text-gray-600">Vous n'avez pas de livraisons programmées pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {delivery.date} à {delivery.time}
                              </h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                delivery.status === 'confirmed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {delivery.status === 'confirmed' ? 'Confirmée' : 'Programmée'}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>Magasin:</strong> {delivery.shopName}</p>
                              <p><strong>Sacs:</strong> {delivery.bags} • <strong>Montant:</strong> {delivery.amount} CHF</p>
                              {delivery.courierNotes && (
                                <p><strong>Notes:</strong> {delivery.courierNotes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Détails →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}



