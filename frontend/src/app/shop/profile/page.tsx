"use client";
import { useEffect, useState } from "react";
import ShopLayout from "@/components/ShopLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthGet, updateShop, type Shop, type ShopUpdate, type Me } from "@/lib/api";
import { showToast } from "@/lib/toast";
import Link from "next/link";

type ShopFormState = {
  name: string;
  street: string;
  streetNumber: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  departments: string;
};

export default function ShopProfilePage() {
  const [profile, setProfile] = useState<Shop | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ShopFormState>({
    name: "",
    street: "",
    streetNumber: "",
    zip: "",
    city: "",
    phone: "",
    email: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    departments: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const me = await apiAuthGet<Me>("/auth/me");
        if (!me.shopId) {
          throw new Error("Aucun magasin associé à ce compte.");
        }
        setShopId(me.shopId);
        const profileData = await apiAuthGet<Shop>(`/shops/${me.shopId}`);
        setProfile(profileData);
        setFormData({
          name: profileData.name,
          street: profileData.address?.street || "",
          streetNumber: profileData.address?.streetNumber || "",
          city: profileData.address?.city || "",
          zip: profileData.address?.zip || "",
          phone: profileData.phone || "",
          email: profileData.email || "",
          contactName: profileData.contacts?.[0]?.name || "",
          contactEmail: profileData.contacts?.[0]?.email || "",
          contactPhone: profileData.contacts?.[0]?.phone || "",
          departments: (profileData.departments || []).join(", "),
        });
      } catch (err: any) {
        console.error("Error fetching profile:", err);
        setError(err.message || "Une erreur est survenue lors du chargement du profil.");
        showToast(err.message || "Impossible de charger le profil magasin.", "error");
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
    if (!shopId) {
      showToast("Aucun magasin associé à cet utilisateur.", "error");
      return;
    }
    setSaving(true);
    try {
      const departmentsArray = formData.departments
        .split(/[,\\n]/)
        .map((entry) => entry.trim())
        .filter(Boolean);

      const payload: ShopUpdate = {
        name: formData.name,
        address: {
          street: formData.street,
          streetNumber: formData.streetNumber,
          zip: formData.zip,
          city: formData.city,
        },
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        contacts: formData.contactName
          ? [
              {
                name: formData.contactName,
                email: formData.contactEmail || undefined,
                phone: formData.contactPhone || undefined,
              },
            ]
          : [],
        departments: departmentsArray,
      };

      const updatedProfile = await updateShop(shopId, payload);
      setProfile(updatedProfile);
      showToast("Profil magasin mis à jour avec succès", "success");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      showToast(err.message || "Erreur lors de la mise à jour du profil", "error");
    } finally {
      setSaving(false);
    }
  };

  const formatDateValue = (value?: string) =>
    value ? new Date(value).toLocaleDateString("fr-CH") : "Non disponible";

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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                        Rue *
                      </label>
                      <input
                        type="text"
                        name="street"
                        id="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="streetNumber" className="block text-sm font-medium text-gray-700">
                        N°
                      </label>
                      <input
                        type="text"
                        name="streetNumber"
                        id="streetNumber"
                        value={formData.streetNumber}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
                      Personne de contact
                    </label>
                    <input
                      type="text"
                      name="contactName"
                      id="contactName"
                      value={formData.contactName}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Nom et pr?nom"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                        Email contact
                      </label>
                      <input
                        type="email"
                        name="contactEmail"
                        id="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
                        T?l?phone contact
                      </label>
                      <input
                        type="tel"
                        name="contactPhone"
                        id="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="departments" className="block text-sm font-medium text-gray-700">
                      D?partements / remarques
                    </label>
                    <textarea
                      name="departments"
                      id="departments"
                      rows={3}
                      value={formData.departments}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="S?pare chaque d?partement par une virgule ou un retour ? la ligne"
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
                        {formatDateValue(profile.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Dernière mise à jour</dt>
                      <dd className="text-sm text-gray-900">
                        {formatDateValue(profile.updatedAt || profile.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Adresse</dt>
                      <dd className="text-sm text-gray-900">
                        {profile.address
                          ? `${profile.address.street ?? ""} ${profile.address.streetNumber ?? ""}, ${profile.address.zip ?? ""} ${profile.address.city ?? ""}`.trim()
                          : "Non renseignée"}
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
