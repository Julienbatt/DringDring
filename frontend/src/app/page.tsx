"use client";
import Link from "next/link";
import { useState, useCallback } from "react";

type HoveredCardType = 'client' | 'shop' | null;

export default function HomePage() {
  const [hoveredCard, setHoveredCard] = useState<HoveredCardType>(null);
  
  const handleMouseEnter = useCallback((card: HoveredCardType) => {
    setHoveredCard(card);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredCard(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <h1 className="ml-3 text-2xl font-bold text-gray-900">DringDring</h1>
            </div>
            <div className="text-sm text-gray-600">
              Livraisons à domicile • Sion et région
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Livraisons à domicile
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Service de livraison de courses pour les magasins partenaires de Sion
          </p>
          <div className="bg-green-100 border border-green-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-green-800 font-medium">
              🚚 Livraisons écologiques • 💰 Tarifs attractifs • 🏪 Magasins locaux
            </p>
          </div>
        </div>

        {/* User Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Client */}
          <Link 
            href="/client"
            className="group"
            onMouseEnter={() => handleMouseEnter('client')}
            onMouseLeave={handleMouseLeave}
          >
            <div className={`bg-white rounded-xl shadow-lg p-8 text-center transition-all duration-300 ${
              hoveredCard === 'client' 
                ? 'transform scale-105 shadow-xl border-2 border-blue-500' 
                : 'hover:shadow-xl border-2 border-transparent hover:border-blue-200'
            }`}>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                Je suis un client
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Consultez vos livraisons et gérez votre profil
              </p>
              <div className="text-blue-600 font-medium group-hover:text-blue-700">
                Accéder à mon espace →
              </div>
            </div>
          </Link>

          {/* Magasin */}
          <Link 
            href="/login/shop"
            className="group"
            onMouseEnter={() => handleMouseEnter('shop')}
            onMouseLeave={handleMouseLeave}
          >
            <div className={`bg-white rounded-xl shadow-lg p-8 text-center transition-all duration-300 ${
              hoveredCard === 'shop' 
                ? 'transform scale-105 shadow-xl border-2 border-green-500' 
                : 'hover:shadow-xl border-2 border-transparent hover:border-green-200'
            }`}>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                Je suis un magasin
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Gérez vos livraisons et clients
              </p>
              <div className="text-green-600 font-medium group-hover:text-green-700">
                Se connecter →
              </div>
            </div>
          </Link>

          {/* Admin notice */}
          <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              HQ & Administrations
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Ces interfaces seront disponibles dès que les APIs correspondantes seront prêtes.
            </p>
            <div className="text-gray-500 font-medium">
              Bientôt disponible
            </div>
          </div>


        </div>

        {/* Features Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Comment ça marche ?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛒</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">1. Faites vos courses</h4>
              <p className="text-gray-600 text-sm">Dans un magasin partenaire de Sion</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">2. Demandez la livraison</h4>
              <p className="text-gray-600 text-sm">Le magasin organise la livraison via DringDring</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚚</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">3. Recevez chez vous</h4>
              <p className="text-gray-600 text-sm">Livraison écologique à domicile</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400">
              © 2025 DringDring • Service de livraison à domicile • Sion, Suisse
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
