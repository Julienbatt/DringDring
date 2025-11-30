"use client";
import { useEffect, useState } from "react";
import ShopLayout from "@/components/ShopLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthGet, apiAuthPut } from "@/lib/api";
import { showToast } from "@/lib/toast";
import Link from "next/link";

type ShopProfile = {
  id: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  openingHours?: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  departments?: string[];
  notes?: string;
  createdAt: string;
  lastUpdated: string;
};

export default function ShopProfilePage() {
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    zip: '',
    country: 'Suisse',
    phone: '',
    email: '',
    contactPerson: '',
    notes: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const profileData = await apiAuthGet<ShopProfile>("/test/shop/profile");
        setProfile(profileData);
        setFormData({
          name: profileData.name,
          address: profileData.address,
          city: profileData.city,
          zip: profileData.zip,
          country: profileData.country,
          phone: profileData.phone || '',
          email: profileData.email || '',
          contactPerson: profileData.contactPerson || '',
          notes: profileData.notes || ''
        });
      } catch (err: any) {
        console.error("Error fetching profile:", err);
        setError(err.message || "Une erreur est survenue lors du chargement du profil.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedProfile = await apiAuthPut<ShopProfile>("/test/shop/profile", formData);
      setProfile(updatedProfile);
      showToast("Profil magasin mis à jour avec succès", "success");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      showToast(err.message || "Erreur lors de la mise à jour du profil", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ShopLayout>
        <LoadingSpinner text="Chargement du profil magasin..." />
      </ShopLayout>
    );
  }

  if (error) {
    return (
      <ShopLayout>
        <Breadcrumbs />
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      </ShopLayout>
    );
  }

  return (
    <ShopLayout>
      <Breadcrumbs />
      <div className="mt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profil Magasin</h1>
          <p className="mt-2 text-gray-600">Gérez les informations de votre magasin</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Form */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                  Informations du magasin
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Nom du magasin *
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Adresse *
                    </label>
                    <input
                      type="text"
                      name="address"
                      id="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                        NPA *
                      </label>
                      <input
                        type="text"
                        name="zip"
                        id="zip"
                        value={formData.zip}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                        Ville *
                      </label>
                      <input
                        type="text"
                        name="city"
                        id="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                        Pays *
                      </label>
                      <select
                        name="country"
                        id="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="Suisse">Suisse</option>
                        <option value="France">France</option>
                        <option value="Allemagne">Allemagne</option>
                        <option value="Italie">Italie</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">
                      Personne de contact
                    </label>
                    <input
                      type="text"
                      name="contactPerson"
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Informations supplémentaires sur le magasin..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Link
                      href="/shop"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Annuler
                    </Link>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? "Sauvegarde..." : "Sauvegarder"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Shop Info & Actions */}
          <div className="space-y-6">
            {/* Shop Info */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Informations du magasin
                </h3>
                {profile && (
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Magasin créé le</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(profile.createdAt).toLocaleDateString('fr-CH')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Dernière mise à jour</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(profile.lastUpdated).toLocaleDateString('fr-CH')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">ID Magasin</dt>
                      <dd className="text-sm text-gray-900 font-mono">{profile.id}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Actions rapides
                </h3>
                <div className="space-y-3">
                  <Link
                    href="/shop"
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    Retour au dashboard
                  </Link>
                  <Link
                    href="/shop/deliveries"
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Voir les livraisons
                  </Link>
                  <Link
                    href="/delivery/new"
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Créer une livraison
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}