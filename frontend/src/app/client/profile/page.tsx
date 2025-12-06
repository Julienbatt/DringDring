"use client";
import { useEffect, useState } from "react";
import ClientLayout from "@/components/ClientLayout";
import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { apiAuthDelete, apiAuthGet, apiAuthPut, getMe, type Me } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { auth } from "@/lib/firebase";
import { getIdToken, onAuthStateChanged } from "firebase/auth";

type ClientProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address: {
    street: string;
    streetNumber: string;
    zip: string;
    city: string;
  };
  floor?: string;
  entryCode?: string;
  cms?: boolean;
};

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  streetNumber: string;
  zip: string;
  city: string;
  floor: string;
  entryCode: string;
  cms: boolean;
};

const emptyForm: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  street: "",
  streetNumber: "",
  zip: "",
  city: "Sion",
  floor: "",
  entryCode: "",
  cms: false,
};

export default function ClientProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMe(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const token = await getIdToken(user, true);
        const info = await getMe(token);
        setMe(info);
        if (info.clientId) {
          await loadProfile(info.clientId);
        } else {
          setError("Votre compte client est incomplet.");
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error retrieving client info:", err);
        setError("Impossible de charger votre profil.");
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loadProfile = async (clientId: string) => {
    try {
      setError(null);
      setLoading(true);
      const data = await apiAuthGet<ClientProfile>(`/clients/${clientId}`);
      setProfile(data);
      setFormData({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || "",
        phone: data.phone || "",
        street: data.address.street,
        streetNumber: data.address.streetNumber,
        zip: data.address.zip,
        city: data.address.city,
        floor: data.floor || "",
        entryCode: data.entryCode || "",
        cms: !!data.cms,
      });
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError(err.message || "Impossible de charger votre profil.");
    } finally {
      setLoading(false);
    }
  };

  const clientId = me?.clientId;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setSaving(true);
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: {
          street: formData.street.trim(),
          streetNumber: formData.streetNumber.trim(),
          zip: formData.zip.trim(),
          city: formData.city.trim(),
        },
        floor: formData.floor.trim() || undefined,
        entryCode: formData.entryCode.trim() || undefined,
        cms: formData.cms,
      };
      const updated = await apiAuthPut<ClientProfile>(
        `/clients/${clientId}`,
        payload
      );
      setProfile(updated);
      showToast("Profil mis à jour avec succès", "success");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      showToast(err.message || "Erreur lors de la mise à jour du profil", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!clientId) return;
    if (!confirm("Supprimer votre compte DringDring ? Cette action est définitive.")) {
      return;
    }
    try {
      await apiAuthDelete(`/clients/${clientId}`);
      showToast("Compte supprimé avec succès", "success");
      await auth.signOut();
      window.location.href = "/";
    } catch (err: any) {
      console.error("Error deleting account:", err);
      showToast(err.message || "Impossible de supprimer le compte", "error");
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
        <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <Breadcrumbs />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon profil</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Prénom"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
                <InputField
                  label="Nom"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Téléphone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+41 79 000 00 00"
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Adresse</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <InputField
                    label="Rue"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    wrapperClassName="md:col-span-2"
                    required
                  />
                  <InputField
                    label="N°"
                    name="streetNumber"
                    value={formData.streetNumber}
                    onChange={handleInputChange}
                    required
                  />
                  <InputField
                    label="NPA"
                        name="zip"
                        value={formData.zip}
                        onChange={handleInputChange}
                        required
                      />
                  <InputField
                    label="Ville"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <InputField
                    label="Étage"
                    name="floor"
                    value={formData.floor}
                    onChange={handleInputChange}
                    placeholder="2A"
                  />
                  <InputField
                    label="Code d'entrée"
                    name="entryCode"
                    value={formData.entryCode}
                    onChange={handleInputChange}
                    placeholder="A1234"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="cms"
                  checked={formData.cms}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                Bénéficiaire CMS (tarif réduit)
              </label>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => clientId && loadProfile(clientId)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Réinitialiser
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg h-fit">
          <div className="px-4 py-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Mon compte</h2>
            <div>
              <p className="text-sm text-gray-600">Identifiant client</p>
              <p className="font-mono text-sm text-gray-900 mt-1">
                {profile?.id || "—"}
              </p>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50"
              >
                Supprimer mon compte
              </button>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  wrapperClassName?: string;
};

function InputField({ label, wrapperClassName = "", className = "", ...props }: InputProps) {
  return (
    <div className={wrapperClassName}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        {...props}
        className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${className}`}
      />
    </div>
  );
}
