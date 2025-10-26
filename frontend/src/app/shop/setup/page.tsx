"use client";
import { useState } from "react";
import AuthGate from "@/components/AuthGate";
import { apiAuthPost } from "@/lib/api";

export default function ShopSetupPage() {
  const [form, setForm] = useState({
    name: "",
    street: "",
    streetNumber: "",
    zip: "1950",
    city: "Sion",
    email: "",
    phone: "",
    contactsCsv: "",
    departmentsCsv: "",
  });
  const [result, setResult] = useState<string>("");

  const submit = async () => {
    try {
      const contacts = form.contactsCsv
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((name) => ({ name }));
      const departments = form.departmentsCsv
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const payload = {
        name: form.name,
        address: {
          street: form.street,
          streetNumber: form.streetNumber,
          zip: form.zip,
          city: form.city,
        },
        email: form.email,
        phone: form.phone,
        contacts,
        departments,
      };
      const res = await apiAuthPost<{ id: string }>("/shops", payload);
      setResult(`Shop created with id: ${res.id}`);
    } catch (e: any) {
      setResult(e?.message || "Failed");
    }
  };

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <AuthGate>
      <main className="p-6 space-y-3 max-w-2xl">
        <h1 className="text-2xl font-bold">Shop setup</h1>
        <div className="grid grid-cols-2 gap-3">
          <input className="border p-2 col-span-2" placeholder="Nom du magasin" value={form.name} onChange={update("name")} />
          <input className="border p-2" placeholder="Rue" value={form.street} onChange={update("street")} />
          <input className="border p-2" placeholder="N°" value={form.streetNumber} onChange={update("streetNumber")} />
          <input className="border p-2" placeholder="NPA" value={form.zip} onChange={update("zip")} />
          <input className="border p-2" placeholder="Ville" value={form.city} onChange={update("city")} />
          <input className="border p-2" placeholder="Email" value={form.email} onChange={update("email")} />
          <input className="border p-2" placeholder="Téléphone" value={form.phone} onChange={update("phone")} />
          <input className="border p-2 col-span-2" placeholder="Contacts (comma-separated)" value={form.contactsCsv} onChange={update("contactsCsv")} />
          <input className="border p-2 col-span-2" placeholder="Départements (comma-separated)" value={form.departmentsCsv} onChange={update("departmentsCsv")} />
        </div>
        <button className="px-4 py-2 bg-black text-white rounded" onClick={submit}>Create shop</button>
        {result && <p className="text-sm">{result}</p>}
      </main>
    </AuthGate>
  );
}


