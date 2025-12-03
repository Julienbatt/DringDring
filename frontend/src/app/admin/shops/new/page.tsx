"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthGate from "@/components/AuthGate";
import Layout from "@/components/Layout";
import Breadcrumbs from "@/components/Breadcrumbs";
import { createShop } from "@/lib/api";
import { showToast } from "@/lib/toast";
import PricingConfig, { PricingConfig as PricingConfigType } from "@/components/PricingConfig";

const CANTONS = [
  "AG",
  "AI",
  "AR",
  "BE",
  "BL",
  "BS",
  "FR",
  "GE",
  "GL",
  "GR",
  "JU",
  "LU",
  "NE",
  "NW",
  "OW",
  "SG",
  "SH",
  "SO",
  "SZ",
  "TG",
  "TI",
  "UR",
  "VD",
  "VS",
  "ZG",
  "ZH",
] as const;

const DEFAULT_SHEET_NAME = "Clients - Historique des transactions";

const optionalText = (message?: string, maxLength = 120) =>
  z
    .string()
    .trim()
    .max(maxLength, message || `Texte trop long (≤ ${maxLength} caractères)`)
    .or(z.literal(""));

const shopFormSchema = z.object({
  name: z.string().trim().min(3, "Nom requis (≥ 3 caractères)"),
  email: z.string().trim().email("Email invalide").or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s().-]{6,20}$/, "Téléphone invalide (6-20 caractères, chiffres et +-.() )"),
  street: z.string().trim().min(3, "Rue obligatoire"),
  streetNumber: z.string().trim().min(1, "N° obligatoire").max(10, "N° trop long"),
  zip: z.string().trim().regex(/^\d{4}$/, "NPA suisse à 4 chiffres"),
  city: z.string().trim().min(2, "Localité obligatoire"),
  spreadsheetId: optionalText("ID Google Sheet trop long (≤ 120 caractères)"),
  sheetName: optionalText("Nom de feuille trop long (≤ 120 caractères)"),
  regionId: z.enum(CANTONS).or(z.literal("")),
});

type ShopFormValues = z.infer<typeof shopFormSchema>;

const defaultValues: ShopFormValues = {
  name: "",
  email: "",
  phone: "",
  street: "",
  streetNumber: "",
  zip: "",
  city: "",
  spreadsheetId: "",
  sheetName: DEFAULT_SHEET_NAME,
  regionId: "",
};

const sanitizeDigits = (value: string, maxLength?: number) => {
  const digitsOnly = value.replace(/\D/g, "");
  return typeof maxLength === "number" ? digitsOnly.slice(0, maxLength) : digitsOnly;
};

export default function NewShopPage() {
  const router = useRouter();
  const [pricing, setPricing] = useState<PricingConfigType | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ShopFormValues>({
    resolver: zodResolver(shopFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const regionValue = watch("regionId");
  const zipValue = watch("zip");
  const phoneValue = watch("phone");

  const fieldError = (field?: { message?: string }) =>
    field?.message ? <p className="text-xs text-red-600">{field.message}</p> : null;

  const submit = handleSubmit(async (values) => {
    try {
      const payload = {
        name: values.name.trim(),
        address: {
          street: values.street.trim(),
          streetNumber: values.streetNumber.trim(),
          zip: values.zip.trim(),
          city: values.city.trim(),
        },
        email: values.email.trim() || undefined,
        phone: values.phone.trim(),
        contacts: [],
        departments: [],
        spreadsheetId: values.spreadsheetId.trim() || undefined,
        sheetName: values.sheetName.trim() || undefined,
        regionId: values.regionId || undefined,
        pricing: pricing || undefined,
      };

      const result = await createShop(payload);
      showToast(`Magasin ${values.name} créé (${result.id})`, "success");
      reset(defaultValues);
      setPricing(null);
      router.push(`/admin/shops?created=${encodeURIComponent(result.id)}`);
    } catch (error) {
      const message = (error as { message?: string })?.message || "Erreur lors de la création du magasin.";
      showToast(message, "error");
    }
  });

  const disabled = isSubmitting;
  const pricingSummary = useMemo(() => {
    if (!pricing) return "Aucune configuration enregistrée pour l'instant.";
    if (pricing.mode === "bags" && pricing.bags) {
      return `Mode sacs : ${pricing.bags.bagsPerStep} sacs / ${pricing.bags.pricePerStep} CHF`;
    }
    if (pricing.mode === "amount" && pricing.amount) {
      return `Mode montant : seuil ${pricing.amount.threshold} CHF (${pricing.amount.priceBelowOrEqual} / ${pricing.amount.priceAbove} CHF)`;
    }
    return "Configuration personnalisée enregistrée.";
  }, [pricing]);

  return (
    <AuthGate>
      <Layout>
        <div className="space-y-6">
          <Breadcrumbs />

          <header className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Administration · Magasins
                </p>
                <h1 className="mt-1 text-3xl font-bold text-gray-900">Nouveau magasin</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Renseignez les informations clés, associez un canton et configurez les tarifs avant l&apos;ouverture.
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <p className="font-semibold">Statut brouillon</p>
                <p className="text-xs text-blue-800">
                  Validation stricte côté client (Zod) + API. Les champs facultatifs peuvent rester vides.
                </p>
              </div>
            </div>
          </header>

          <form onSubmit={submit} className="space-y-6">
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Identité du magasin</h2>
                  <p className="text-sm text-gray-500">Nom, coordonnées et localisation postale.</p>
                </div>
                {!isDirty && <span className="text-xs text-gray-400">Champs requis marqués *</span>}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="name">
                    Nom du magasin *
                  </label>
                  <input
                    id="name"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Ex. Migros Lausanne St-François"
                    disabled={disabled}
                    {...register("name")}
                  />
                  {fieldError(errors.name)}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="email">
                    Email du magasin
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="contact@exemple.ch"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    disabled={disabled}
                    {...register("email")}
                  />
                  {fieldError(errors.email)}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="phone">
                    Téléphone *
                  </label>
                  <input
                    id="phone"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="+41 21 555 00 00"
                    value={phoneValue}
                    disabled={disabled}
                    {...register("phone")}
                    onChange={(event) => {
                      const safe = event.target.value.replace(/[^0-9+().\s-]/g, "");
                      setValue("phone", safe, { shouldDirty: true, shouldValidate: true });
                    }}
                  />
                  {fieldError(errors.phone)}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="street">
                    Rue *
                  </label>
                  <input
                    id="street"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Rue Centrale"
                    disabled={disabled}
                    {...register("street")}
                  />
                  {fieldError(errors.street)}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="streetNumber">
                    N° *
                  </label>
                  <input
                    id="streetNumber"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="12A"
                    disabled={disabled}
                    {...register("streetNumber")}
                  />
                  {fieldError(errors.streetNumber)}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="zip">
                    NPA *
                  </label>
                  <input
                    id="zip"
                    inputMode="numeric"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="1003"
                    value={zipValue}
                    disabled={disabled}
                    {...register("zip")}
                    onChange={(event) => {
                      const sanitized = sanitizeDigits(event.target.value, 4);
                      setValue("zip", sanitized, { shouldDirty: true, shouldValidate: true });
                    }}
                  />
                  {fieldError(errors.zip)}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="city">
                    Localité *
                  </label>
                  <input
                    id="city"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Lausanne"
                    disabled={disabled}
                    {...register("city")}
                  />
                  {fieldError(errors.city)}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="regionId">
                    Canton rattaché
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <select
                      id="regionId"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2"
                      value={regionValue}
                      disabled={disabled}
                      {...register("regionId")}
                      onChange={(event) => {
                        const value = event.target.value as ShopFormValues["regionId"];
                        setValue("regionId", value, { shouldDirty: true, shouldValidate: true });
                      }}
                    >
                      <option value="">(aucun canton)</option>
                      {CANTONS.map((canton) => (
                        <option key={canton} value={canton}>
                          {canton}
                        </option>
                      ))}
            </select>
                    <span className="text-xs text-gray-500">Optionnel</span>
                  </div>
                  {fieldError(errors.regionId)}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Google Sheets (export automatique)</h2>
                <p className="text-sm text-gray-500">
                  Permet la génération des exports pricing & livraisons dans une feuille spécifique.
                </p>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="spreadsheetId">
                    ID Google Spreadsheet
                  </label>
                  <input
                    id="spreadsheetId"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="1abcDEFghiJKLmnop..."
                    disabled={disabled}
                    {...register("spreadsheetId")}
                  />
                  {fieldError(errors.spreadsheetId)}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="sheetName">
                    Nom d&apos;onglet
                  </label>
                  <input
                    id="sheetName"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder={DEFAULT_SHEET_NAME}
                    disabled={disabled}
                    {...register("sheetName")}
                  />
                  {fieldError(errors.sheetName)}
          </div>
        </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Tarification & répartition</h2>
                  <p className="text-sm text-gray-500">
                    Sauvegardez une configuration cohérente avant la création pour gagner du temps côté équipes.
                  </p>
                </div>
                <p className="text-xs text-gray-500 text-right max-w-xs">{pricingSummary}</p>
              </div>

        <PricingConfig
          initialConfig={pricing || undefined}
                disabled={disabled}
          onSave={async (config) => {
            setPricing(config);
            showToast("Configuration de tarification sauvegardée", "success");
          }}
        />
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Toutes les entrées sont validées côté client (Zod) + serveur. Les champs vides sont ignorés.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    reset(defaultValues);
                    setPricing(null);
                  }}
                  disabled={disabled}
                >
                  Réinitialiser
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={disabled}
                >
                  {isSubmitting ? "Création..." : "Créer le magasin"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Layout>
    </AuthGate>
  );
}
