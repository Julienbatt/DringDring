import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DringDring - Plateforme de Livraison Locale",
  description: "Votre plateforme de livraison locale, rapide et solidaire. Gérez vos livraisons, consultez vos statistiques et profitez d'un service de qualité.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <div id="toast-root" className="fixed top-4 right-4 z-50 space-y-2"></div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
