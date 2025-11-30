"use client";
import { useEffect, useState } from "react";
import ClientLayout from "@/components/ClientLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthGet, apiAuthPut } from "@/lib/api";
import { showToast } from "@/lib/toast";
import Link from "next/link";

type ClientProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  preferredDeliveryTime?: string;
  notes?: string;
  createdAt: string;
  lastLogin: string;
};

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    country: 'Suisse',
    preferredDeliveryTime: '',
    notes: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const profileData = await apiAuthGet<ClientProfile>("/test/client/profile");
        setProfile(profileData);
        setFormData({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          phone: profileData.phone || '',
          address: profileData.address,
          city: profileData.city,
          zip: profileData.zip,
          country: profileData.country,
          preferredDeliveryTime: profileData.preferredDeliveryTime || '',
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
      const updatedProfile = await apiAuthPut<ClientProfile>("/test/client/profile", formData);
      setProfile(updatedProfile);
      showToast("Profil mis à jour avec succès", "success");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      showToast(err.message || "Erreur lors de la mise à jour du profil", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      await apiAuthPut("/test/client/delete-account", {});
      showToast("Compte supprimé avec succès", "success");
      // Rediriger vers la page d'accueil
      window.location.href = '/';
    } catch (err: any) {
      console.error("Error deleting account:", err);
      showToast(err.message || "Erreur lors de la suppression du compte", "error");
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <LoadingSpinner text="Chargement de votre profil..." />
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
      <div className="mt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
          <p className="mt-2 text-gray-600">Gérez vos informations personnelles et préférences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Form */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                  Informations personnelles
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        Prénom *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        id="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                        Nom *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        id="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

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
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Suisse">Suisse</option>
                        <option value="France">France</option>
                        <option value="Allemagne">Allemagne</option>
                        <option value="Italie">Italie</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="preferredDeliveryTime" className="block text-sm font-medium text-gray-700">
                      Heure de livraison préférée
                    </label>
                    <select
                      name="preferredDeliveryTime"
                      id="preferredDeliveryTime"
                      value={formData.preferredDeliveryTime}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Aucune préférence</option>
                      <option value="morning">Matin (8h-12h)</option>
                      <option value="afternoon">Après-midi (12h-17h)</option>
                      <option value="evening">Soir (17h-20h)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes personnelles
                    </label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Instructions spéciales, allergies, préférences..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Link
                      href="/client"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Annuler
                    </Link>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Sauvegarde..." : "Sauvegarder"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Account Info & Actions */}
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Informations du compte
                </h3>
                {profile && (
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Membre depuis</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(profile.createdAt).toLocaleDateString('fr-CH')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Dernière connexion</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(profile.lastLogin).toLocaleDateString('fr-CH')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">ID Client</dt>
                      <dd className="text-sm text-gray-900 font-mono">{profile.id}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-red-900 mb-4">
                  Zone de danger
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Supprimer votre compte supprimera définitivement toutes vos données et livraisons.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  Supprimer mon compte
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}