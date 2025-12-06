"use client";
import Link from "next/link";

type PausedScreenProps = {
  title: string;
  description: string;
  supportEmail?: string;
};

export default function PausedScreen({
  title,
  description,
  supportEmail = "support@dringdring.ch",
}: PausedScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white shadow-xl rounded-2xl p-8 text-center border border-gray-100">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
          <span className="text-2xl">🛠️</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-600 mb-8">{description}</p>
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-white font-medium shadow-sm hover:bg-green-700 transition"
          >
            Retour à l&apos;accueil
          </Link>
          <p className="text-sm text-gray-500">
            Besoin d&apos;accéder à ces écrans ? Contacte-nous sur{" "}
            <a
              className="text-green-700 underline"
              href={`mailto:${supportEmail}`}
            >
              {supportEmail}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
