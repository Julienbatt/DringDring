"use client";
import { useEffect, useState } from "react";
import HQAdminLayout from "@/components/HQAdminLayout";
import { apiAuthGet, apiAuthPut } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { PageLoader, PageError } from "@/components/loading/PageState";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

type HQAdminProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  region: string;
  company: string;
  phone?: string;
  avatar?: string;
  lastLogin: string;
  createdAt: string;
  permissions: string[];
  preferences: {
    language: string;
    timezone: string;
    notifications: boolean;
    theme: string;
  };
};

export default function HQAdminProfilePage() {
  const { user, status } = useProtectedRoute({ redirectTo: "/login?role=hq-admin" });
  const [profile, setProfile] = useState<HQAdminProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    region: '',
    company: '',
    language: 'fr',
    timezone: 'Europe/Zurich',
    notifications: true,
    theme: 'light'
  });

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        setError(null);
        const data = await apiAuthGet<HQAdminProfile>("/test/hq-admin/profile");
        setProfile(data);
        setFormData({
          name: data.name,
          email: data.email,
          phone: data.phone || "",
          region: data.region,
          company: data.company,
          language: data.preferences.language,
          timezone: data.preferences.timezone,
          notifications: data.preferences.notifications,
          theme: data.preferences.theme,
        });
      } catch (err: any) {
        console.error("Error fetching profile:", err);
        setError(err.message || "Une erreur est survenue lors du chargement du profil.");
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiAuthPut("/test/hq-admin/profile", formData);
      setProfile(prev => prev ? {
        ...prev,
        ...formData,
        preferences: {
          ...prev.preferences,
          language: formData.language,
          timezone: formData.timezone,
          notifications: formData.notifications,
          theme: formData.theme
        }
      } : null);
      setIsEditing(false);
      showToast("Profil mis à jour avec succès", "success");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      showToast("Erreur lors de la sauvegarde du profil", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name,
        email: profile.email,
        phone: profile.phone || '',
        region: profile.region,
        company: profile.company,
        language: profile.preferences.language,
        timezone: profile.preferences.timezone,
        notifications: profile.preferences.notifications,
        theme: profile.preferences.theme
      });
    }
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (status === "loading" || status === "redirecting") {
    return (
      <HQAdminLayout>
        <PageLoader title="Chargement du profil..." />
      </HQAdminLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <HQAdminLayout>
        <PageError title="Erreur" description={error} />
      </HQAdminLayout>
    );
  }

  return (
    <HQAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
            <p className="mt-2 text-gray-600">
              Gérez vos informations personnelles et préférences
            </p>
          </div>
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
              >
                ✏️ Modifier
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profil principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations personnelles */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Informations Personnelles
                </h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nom complet
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{profile?.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{profile?.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Téléphone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{profile?.phone || 'Non renseigné'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Région
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.region}
                        onChange={(e) => setFormData(prev => ({...prev, region: e.target.value}))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="Valais">Valais</option>
                        <option value="Vaud">Vaud</option>
                        <option value="Genève">Genève</option>
                        <option value="Fribourg">Fribourg</option>
                      </select>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{profile?.region}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Entreprise
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({...prev, company: e.target.value}))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{profile?.company}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Préférences */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Préférences
                </h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Langue
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.language}
                        onChange={(e) => setFormData(prev => ({...prev, language: e.target.value}))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="en">English</option>
                      </select>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">
                        {formData.language === 'fr' ? 'Français' : 
                         formData.language === 'de' ? 'Deutsch' : 'English'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fuseau horaire
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData(prev => ({...prev, timezone: e.target.value}))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="Europe/Zurich">Europe/Zurich</option>
                        <option value="Europe/Paris">Europe/Paris</option>
                        <option value="UTC">UTC</option>
                      </select>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{profile?.preferences.timezone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Thème
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.theme}
                        onChange={(e) => setFormData(prev => ({...prev, theme: e.target.value}))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="light">Clair</option>
                        <option value="dark">Sombre</option>
                        <option value="auto">Automatique</option>
                      </select>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">
                        {formData.theme === 'light' ? 'Clair' : 
                         formData.theme === 'dark' ? 'Sombre' : 'Automatique'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.notifications}
                      onChange={(e) => setFormData(prev => ({...prev, notifications: e.target.checked}))}
                      disabled={!isEditing}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Recevoir les notifications
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Avatar et infos de base */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6 text-center">
                <div className="mx-auto h-20 w-20 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-purple-600">
                    {profile?.name.charAt(0)}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900">{profile?.name}</h3>
                <p className="text-sm text-gray-500">{profile?.role}</p>
                <p className="text-sm text-gray-500">{profile?.company}</p>
              </div>
            </div>

            {/* Informations de compte */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Informations de Compte
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Rôle</dt>
                    <dd className="text-sm text-gray-900">{profile?.role}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Dernière connexion</dt>
                    <dd className="text-sm text-gray-900">{formatDate(profile?.lastLogin || '')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Membre depuis</dt>
                    <dd className="text-sm text-gray-900">{formatDate(profile?.createdAt || '')}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Permissions */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Permissions
                </h3>
                <ul className="space-y-2">
                  {profile?.permissions.map((permission, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Actions Rapides
                </h3>
                <div className="space-y-3">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                    🔐 Changer le mot de passe
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                    📧 Modifier l'email
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                    📱 Authentification 2FA
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">
                    🗑️ Supprimer le compte
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HQAdminLayout>
  );
}



