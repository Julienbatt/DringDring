"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
  country: "Suisse" | "France" | "Allemagne" | "Italie";
  preferredDeliveryTime?: "morning" | "afternoon" | "evening";
  notes?: string;
  createdAt: string;
  lastLogin: string;
};

const countryOptions: ClientProfile["country"][] = ["Suisse", "France", "Allemagne", "Italie"];

const profileSchema = z.object({
  firstName: z.string().trim().min(2, "Prénom trop court"),
  lastName: z.string().trim().min(2, "Nom trop court"),
  email: z.string().trim().email("Email invalide"),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s().-]{0,20}$/, "Téléphone invalide (0-20 caractères, chiffres et +-.() )")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().min(5, "Adresse trop courte"),
  city: z.string().trim().min(2, "Ville requise"),
  zip: z.string().trim().regex(/^\d{4}$/, "NPA suisse à 4 chiffres"),
  country: z.enum(countryOptions),
  preferredDeliveryTime: z.enum(["morning", "afternoon", "evening"]).optional().or(z.literal("")),
  notes: z.string().trim().max(500, "Notes trop longues (500 caractères max)").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const defaultValues: ProfileFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  zip: "",
  country: "Suisse",
  preferredDeliveryTime: "",
  notes: "",
};

const sanitizeDigits = (value: string, length?: number) => {
  const digits = value.replace(/\D/g, "");
  return typeof length === "number" ? digits.slice(0, length) : digits;
};

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [deleting, setDeleting] = useState(false);
  const requestIdRef = useRef(0);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: "onChange",
  });

  const zipValue = watch("zip");
  const phoneValue = watch("phone");

  const loadProfile = useCallback(
    async (options?: { silent?: boolean }) => {
      const currentRequestId = ++requestIdRef.current;
      setError(null);
      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const profileData = await apiAuthGet<ClientProfile>("/test/client/profile");
        if (currentRequestId === requestIdRef.current) {
          setProfile(profileData);
          reset({
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            email: profileData.email,
            phone: profileData.phone || "",
            address: profileData.address,
            city: profileData.city,
            zip: profileData.zip,
            country: profileData.country,
            preferredDeliveryTime: profileData.preferredDeliveryTime || "",
            notes: profileData.notes || "",
          });
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (currentRequestId === requestIdRef.current) {
          console.error("Error fetching profile:", err);
          setError((err as { message?: string })?.message || "Une erreur est survenue lors du chargement du profil.");
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [reset]
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = {
        ...values,
        phone: values.phone?.trim() || undefined,
        preferredDeliveryTime: values.preferredDeliveryTime || undefined,
        notes: values.notes?.trim() || undefined,
      };
      const updatedProfile = await apiAuthPut<ClientProfile>("/test/client/profile", payload);
      setProfile(updatedProfile);
      reset({
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        email: updatedProfile.email,
        phone: updatedProfile.phone || "",
        address: updatedProfile.address,
        city: updatedProfile.city,
        zip: updatedProfile.zip,
        country: updatedProfile.country,
        preferredDeliveryTime: updatedProfile.preferredDeliveryTime || "",
        notes: updatedProfile.notes || "",
      });
      setLastUpdated(new Date());
      showToast("Profil mis à jour avec succès", "success");
    } catch (err) {
      console.error("Error updating profile:", err);
      showToast((err as { message?: string })?.message || "Erreur lors de la mise à jour du profil", "error");
    }
  });

  const handleDeleteAccount = async () => {
    if (deleting) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
      return;
    }
    try {
      setDeleting(true);
      await apiAuthPut("/test/client/delete-account", {});
      showToast("Compte supprimé avec succès", "success");
      window.location.href = '/';
    } catch (err) {
      const message = (err as { message?: string } | undefined)?.message || "Erreur lors de la suppression du compte";
      console.error("Error deleting account:", err);
      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const accountInfo = useMemo(() => {
    if (!profile) return null;
    return [
      { label: "Membre depuis", value: new Date(profile.createdAt).toLocaleDateString("fr-CH") },
      { label: "Dernière connexion", value: new Date(profile.lastLogin).toLocaleString("fr-CH") },
      { label: "ID Client", value: profile.id, isMono: true },
    ];
  }, [profile]);

  const fieldError = (field?: { message?: string }) =>
    field?.message ? <p className="mt-1 text-xs text-red-600">{field.message}</p> : null;

  const handleRefresh = () => {
    loadProfile({ silent: true });
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
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
            <p className="mt-2 text-gray-600">Gérez vos informations personnelles et préférences</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Dernière synchro : {lastUpdated.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-md border border-gray-200 px-3 py-1 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Actualisation..." : "🔄 Actualiser"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Form */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                  Informations personnelles
                </h3>
                
                <form onSubmit={onSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        Prénom *
                      </label>
                      <input
                        id="firstName"
                        className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        {...register("firstName")}
                      />
                      {fieldError(errors.firstName)}
                    </div>
                    
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                        Nom *
                      </label>
                      <input
                        id="lastName"
                        className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        {...register("lastName")}
                      />
                      {fieldError(errors.lastName)}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email *
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      {...register("email")}
                    />
                    {fieldError(errors.email)}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Téléphone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phoneValue}
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      {...register("phone")}
                      onChange={(event) => {
                        const safe = event.target.value.replace(/[^0-9+().\s-]/g, "");
                        setValue("phone", safe, { shouldDirty: true, shouldValidate: true });
                      }}
                    />
                    {fieldError(errors.phone)}
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Adresse *
                    </label>
                    <input
                      id="address"
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      {...register("address")}
                    />
                    {fieldError(errors.address)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                        NPA *
                      </label>
                      <input
                        id="zip"
                        inputMode="numeric"
                        value={zipValue}
                        className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        {...register("zip")}
                        onChange={(event) => {
                          const sanitized = sanitizeDigits(event.target.value, 4);
                          setValue("zip", sanitized, { shouldDirty: true, shouldValidate: true });
                        }}
                      />
                      {fieldError(errors.zip)}
                    </div>
                    
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                        Ville *
                      </label>
                      <input
                        id="city"
                        className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        {...register("city")}
                      />
                      {fieldError(errors.city)}
                    </div>
                    
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                        Pays *
                      </label>
                      <select
                        id="country"
                        className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        {...register("country")}
                      >
                        {countryOptions.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                      {fieldError(errors.country)}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="preferredDeliveryTime" className="block text-sm font-medium text-gray-700">
                      Heure de livraison préférée
                    </label>
                    <select
                      id="preferredDeliveryTime"
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      {...register("preferredDeliveryTime")}
                    >
                      <option value="">Aucune préférence</option>
                      <option value="morning">Matin (8h-12h)</option>
                      <option value="afternoon">Après-midi (12h-17h)</option>
                      <option value="evening">Soir (17h-20h)</option>
                    </select>
                    {fieldError(errors.preferredDeliveryTime)}
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes personnelles
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      placeholder="Instructions spéciales, allergies, préférences..."
                      {...register("notes")}
                    />
                    {fieldError(errors.notes)}
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
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? "Sauvegarde..." : isDirty ? "Sauvegarder les modifications" : "Aucune modification"}
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
                {accountInfo && (
                  <dl className="space-y-3">
                    {accountInfo.map((info) => (
                      <div key={info.label}>
                        <dt className="text-sm font-medium text-gray-500">{info.label}</dt>
                        <dd className={`text-sm text-gray-900 ${info.isMono ? "font-mono" : ""}`}>{info.value}</dd>
                      </div>
                    ))}
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
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Suppression..." : "Supprimer mon compte"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}