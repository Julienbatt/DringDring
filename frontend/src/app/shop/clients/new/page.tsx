"use client";
import { useState } from "react";
import AuthGate from "@/components/AuthGate";
import { apiAuthPost } from "@/lib/api";
import { showToast } from "@/lib/toast";
import Link from "next/link";

type ClientData = {
  firstName: string;
  lastName: string;
  address: {
    street: string;
    streetNumber: string;
    zip: string;
    city: string;
  };
  email: string;
  phone: string;
  floor?: string;
  entryCode?: string;
  cms: boolean;
};

export default function NewClientPage() {
  const [formData, setFormData] = useState<ClientData>({
    firstName: "",
    lastName: "",
    address: {
      street: "",
      streetNumber: "",
      zip: "",
      city: "Sion"
    },
    email: "",
    phone: "",
    floor: "",
    entryCode: "",
    cms: false
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await apiAuthPost<{id: string}>("/clients", formData);
      showToast(`Client créé avec succès (ID: ${result.id})`, 'success');
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        address: {
          street: "",
          streetNumber: "",
          zip: "",
          city: "Sion"
        },
        email: "",
        phone: "",
        floor: "",
        entryCode: "",
        cms: false
      });
    } catch (error: any) {
      showToast(error.message || "Erreur lors de la création du client", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <AuthGate>
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <Link 
                  href="/shop"
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← Retour
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Nouveau Client</h1>
                  <p className="text-sm text-gray-600">Ajouter un client au système</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Form */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Informations du client</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Nom et Prénom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Adresse */}
              <div className="space-y-4">
                <h3 className="text-md font-medium text-gray-900">Adresse</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rue *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address.street}
                      onChange={(e) => handleInputChange('address.street', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      N° *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address.streetNumber}
                      onChange={(e) => handleInputChange('address.streetNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      NPA *
                    </label>
                    <input
                      type="text"
                      required
                      pattern="[0-9]{4}"
                      value={formData.address.zip}
                      onChange={(e) => handleInputChange('address.zip', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1950"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ville *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Étage
                    </label>
                    <input
                      type="text"
                      value={formData.floor}
                      onChange={(e) => handleInputChange('floor', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2ème étage"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code d'entrée
                    </label>
                    <input
                      type="text"
                      value={formData.entryCode}
                      onChange={(e) => handleInputChange('entryCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="A1234"
                    />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-4">
                <h3 className="text-md font-medium text-gray-900">Contact</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+41 79 000 00 00"
                    />
                  </div>
                </div>
              </div>

              {/* CMS */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="cms"
                  checked={formData.cms}
                  onChange={(e) => handleInputChange('cms', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="cms" className="ml-2 block text-sm text-gray-700">
                  Bénéficiaire CMS (réduction tarifaire)
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <Link
                  href="/shop"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Création..." : "Créer le client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </AuthGate>
  );
}

