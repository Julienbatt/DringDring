"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getIdToken, onAuthStateChanged } from "firebase/auth";
import { getMe } from "@/lib/api";

type Me = {
  userId: string;
  email?: string;
  roles: string[];
  shopId?: string | null;
};

type NavigationItem = {
  name: string;
  href: string;
  icon: string;
  roles: string[];
  children?: NavigationItem[];
};

const navigationItems: NavigationItem[] = [
  // Shop Navigation
  {
    name: "Accueil",
    href: "/shop",
    icon: "🏠",
    roles: ["shop"]
  },
  {
    name: "Livraisons",
    href: "/shop/deliveries",
    icon: "📦",
    roles: ["shop"],
    children: [
      { name: "Nouvelle livraison", href: "/delivery/new", icon: "➕", roles: ["shop"] },
      { name: "Toutes les livraisons", href: "/shop/deliveries", icon: "📋", roles: ["shop"] }
    ]
  },
  {
    name: "Clients",
    href: "/shop/clients",
    icon: "👥",
    roles: ["shop"],
    children: [
      { name: "Nouveau client", href: "/shop/clients/new", icon: "➕", roles: ["shop"] },
      { name: "Liste des clients", href: "/shop/clients", icon: "📋", roles: ["shop"] }
    ]
  },
  {
    name: "Profil",
    href: "/shop/profile",
    icon: "⚙️",
    roles: ["shop"]
  },
  {
    name: "Rapports",
    href: "/shop/reports",
    icon: "📊",
    roles: ["shop"]
  },
  
  // Client Navigation
  {
    name: "Mon Dashboard",
    href: "/client",
    icon: "🏠",
    roles: ["client"]
  },
  {
    name: "Mes Livraisons",
    href: "/client/deliveries",
    icon: "📦",
    roles: ["client"]
  },
  {
    name: "Mon Profil",
    href: "/client/profile",
    icon: "👤",
    roles: ["client"]
  },
  
  // Admin Navigation
  {
    name: "Dashboard HQ",
    href: "/admin/hq",
    icon: "🏢",
    roles: ["admin", "hqAdmin"]
  },
  {
    name: "Magasins",
    href: "/admin/shops",
    icon: "🏪",
    roles: ["admin", "regionalAdmin", "hqAdmin"],
    children: [
      { name: "Nouveau magasin", href: "/admin/shops/new", icon: "➕", roles: ["admin"] },
      { name: "Liste des magasins", href: "/admin/shops", icon: "📋", roles: ["admin", "regionalAdmin", "hqAdmin"] }
    ]
  },
  {
    name: "Utilisateurs",
    href: "/admin/users",
    icon: "👥",
    roles: ["admin"]
  },
  {
    name: "Rapports Globaux",
    href: "/admin/reports",
    icon: "📊",
    roles: ["admin", "hqAdmin"]
  }
];

export default function Navigation() {
  const [me, setMe] = useState<Me | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { 
        setMe(null); 
        setLoading(false);
        return; 
      }
      try {
        const t = await getIdToken(user, true);
        const m = await getMe(t);
        setMe(m);
      } catch (e: any) {
        setMe(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const getFilteredNavigation = () => {
    if (!me) return [];
    
    return navigationItems.filter(item => 
      item.roles.some(role => me.roles?.includes(role))
    );
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  if (loading) {
    return (
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-white border-r border-gray-200">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <div className="animate-pulse h-6 w-32 bg-gray-200 rounded"></div>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!me) {
    return null;
  }

  const filteredNav = getFilteredNavigation();

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
          <span className="sr-only">Ouvrir le menu</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-white border-r border-gray-200">
            {/* Logo */}
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-gray-900">DringDring</h1>
              </div>
              
              {/* Navigation */}
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {filteredNav.map((item) => (
                  <div key={item.name}>
                    <Link
                      href={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isActive(item.href)
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      {item.name}
                    </Link>
                    
                    {/* Children */}
                    {item.children && isActive(item.href) && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                              isActive(child.href)
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                          >
                            <span className="mr-3 text-sm">{child.icon}</span>
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
            
            {/* User info */}
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex-shrink-0 w-full group block">
                <div className="flex items-center">
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {me.email}
                    </p>
                    <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                      {me.roles?.join(', ')}
                    </p>
                    <button
                      onClick={handleLogout}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {isOpen && (
        <div className="fixed inset-0 flex z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <span className="sr-only">Fermer le menu</span>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold text-gray-900">DringDring</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {filteredNav.map((item) => (
                  <div key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                        isActive(item.href)
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-4 text-lg">{item.icon}</span>
                      {item.name}
                    </Link>
                    
                    {item.children && isActive(item.href) && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            onClick={() => setIsOpen(false)}
                            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                              isActive(child.href)
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                          >
                            <span className="mr-3 text-sm">{child.icon}</span>
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
            
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex-shrink-0 w-full group block">
                <div className="flex items-center">
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700">{me.email}</p>
                    <p className="text-xs font-medium text-gray-500">{me.roles?.join(', ')}</p>
                    <button
                      onClick={handleLogout}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
