"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";

interface AuthGateProps {
  children: React.ReactNode;
  requiredRole?: 'shop' | 'client' | 'admin' | 'hqAdmin' | 'superAdmin';
  redirectTo?: string;
}

export default function AuthGate({ 
  children, 
  requiredRole, 
  redirectTo 
}: AuthGateProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      if (!user) {
        // Si pas connecté, rediriger vers la page de login
        const loginUrl = redirectTo || '/login';
        router.push(loginUrl);
        return;
      }

      // Vérifier le rôle selon la route
      const userRole = getUserRoleFromPath(pathname);
      if (requiredRole && userRole !== requiredRole) {
        // Rediriger vers la bonne interface selon le rôle
        redirectToCorrectInterface(userRole);
        return;
      }
    });

    return () => unsub();
  }, [router, redirectTo, pathname]);

  const getUserRoleFromPath = (path: string): string => {
    if (path.startsWith('/shop')) return 'shop';
    if (path.startsWith('/client')) return 'client';
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/delivery/new')) return 'shop'; // Création de livraison = magasin
    return 'client'; // Par défaut
  };

  const redirectToCorrectInterface = (role: string) => {
    switch (role) {
      case 'shop':
        router.push('/shop');
        break;
      case 'client':
        router.push('/client');
        break;
      case 'admin':
        router.push('/admin');
        break;
      default:
        router.push('/');
    }
  };

  // Afficher un loading pendant la vérification
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Si pas connecté, ne pas afficher le contenu (redirection en cours)
  if (!user) {
    return null;
  }

  // Afficher le contenu protégé
  return <>{children}</>;
}