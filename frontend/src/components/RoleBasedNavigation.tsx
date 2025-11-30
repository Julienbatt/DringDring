"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

type UserRole = 'shop' | 'client' | 'admin' | 'hqAdmin' | 'superAdmin';

interface RoleBasedNavigationProps {
  children: React.ReactNode;
}

export default function RoleBasedNavigation({ children }: RoleBasedNavigationProps) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      if (!user) {
        // Si pas connecté, rediriger vers la page d'accueil
        router.push('/');
        return;
      }

      // Déterminer le rôle de l'utilisateur
      const role = determineUserRole(pathname, user);
      setUserRole(role);
      
      // Rediriger vers la bonne interface si nécessaire
      redirectToCorrectInterface(role, pathname);
    });

    return () => unsub();
  }, [router, pathname]);

  const determineUserRole = (path: string, user: any): UserRole => {
    // Pour l'instant, on détermine le rôle basé sur la route
    // Plus tard, on récupérera le rôle depuis le backend
    if (path.startsWith('/shop') || path.startsWith('/delivery/new')) {
      return 'shop';
    }
    if (path.startsWith('/client')) {
      return 'client';
    }
    if (path.startsWith('/admin')) {
      return 'admin';
    }
    
    // Par défaut, on considère que c'est un client
    return 'client';
  };

  const redirectToCorrectInterface = (role: UserRole, currentPath: string) => {
    // Ne pas rediriger si on est déjà sur la bonne interface
    if (currentPath.startsWith(`/${role}`)) {
      return;
    }

    // Rediriger vers l'interface appropriée
    switch (role) {
      case 'shop':
        if (!currentPath.startsWith('/shop') && !currentPath.startsWith('/delivery/new')) {
          router.push('/shop');
        }
        break;
      case 'client':
        if (!currentPath.startsWith('/client')) {
          router.push('/client');
        }
        break;
      case 'admin':
        if (!currentPath.startsWith('/admin')) {
          router.push('/admin');
        }
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirection en cours
  }

  // Afficher un message d'erreur si l'utilisateur essaie d'accéder à une interface non autorisée
  if (userRole && !isPathAllowedForRole(pathname, userRole)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Accès non autorisé
            </h2>
            <p className="text-gray-600 mb-6">
              Vous n'avez pas les permissions pour accéder à cette page.
            </p>
            <div className="space-y-3">
              <Link
                href="/client"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block text-center"
              >
                Interface Client
              </Link>
              <Link
                href="/shop"
                className="w-full border border-blue-600 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors inline-block text-center"
              >
                Interface Magasin
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const isPathAllowedForRole = (path: string, role: UserRole): boolean => {
  switch (role) {
    case 'shop':
      return path.startsWith('/shop') || path.startsWith('/delivery/new');
    case 'client':
      return path.startsWith('/client');
    case 'admin':
      return path.startsWith('/admin');
    default:
      return false;
  }
};



