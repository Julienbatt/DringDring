"use client";
import { ReactNode } from "react";
import AuthGate from "./AuthGate";
import RoleBasedNavigation from "./RoleBasedNavigation";
import Navigation from "./Navigation";
import ToastContainer from "./Toast";

type LayoutProps = {
  children: ReactNode;
  title?: string;
  showNavigation?: boolean;
};

export default function Layout({ 
  children, 
  title = "DringDring",
  showNavigation = true 
}: LayoutProps) {
  return (
    <AuthGate>
      <RoleBasedNavigation>
        <ToastContainer />
        <div className="h-screen flex overflow-hidden bg-gray-100">
          {showNavigation && <Navigation />}
        
        {/* Main content */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          {/* Top bar */}
          <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
            <div className="flex-1 px-4 flex justify-between">
              <div className="flex-1 flex">
                <div className="w-full flex md:ml-0">
                  <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                    <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                      placeholder="Rechercher..."
                      type="search"
                    />
                  </div>
                </div>
              </div>
              <div className="ml-4 flex items-center md:ml-6">
                {/* Notifications */}
                <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <span className="sr-only">Voir les notifications</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0115 0v5z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
      </RoleBasedNavigation>
    </AuthGate>
  );
}
