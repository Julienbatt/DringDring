"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type BreadcrumbItem = {
  name: string;
  href: string;
};

const breadcrumbMap: Record<string, BreadcrumbItem[]> = {
  "/shop": [
    { name: "Accueil", href: "/shop" }
  ],
  "/shop/deliveries": [
    { name: "Accueil", href: "/shop" },
    { name: "Livraisons", href: "/shop/deliveries" }
  ],
  "/shop/clients": [
    { name: "Accueil", href: "/shop" },
    { name: "Clients", href: "/shop/clients" }
  ],
  "/shop/clients/new": [
    { name: "Accueil", href: "/shop" },
    { name: "Clients", href: "/shop/clients" },
    { name: "Nouveau client", href: "/shop/clients/new" }
  ],
  "/shop/profile": [
    { name: "Accueil", href: "/shop" },
    { name: "Profil", href: "/shop/profile" }
  ],
  "/shop/reports": [
    { name: "Accueil", href: "/shop" },
    { name: "Rapports", href: "/shop/reports" }
  ],
  "/delivery/new": [
    { name: "Accueil", href: "/shop" },
    { name: "Livraisons", href: "/shop/deliveries" },
    { name: "Nouvelle livraison", href: "/delivery/new" }
  ],
  "/client": [
    { name: "Mon Dashboard", href: "/client" }
  ],
  "/client/deliveries": [
    { name: "Mon Dashboard", href: "/client" },
    { name: "Mes Livraisons", href: "/client/deliveries" }
  ],
  "/client/profile": [
    { name: "Mon Dashboard", href: "/client" },
    { name: "Mon Profil", href: "/client/profile" }
  ],
  "/admin/hq": [
    { name: "Dashboard HQ", href: "/admin/hq" }
  ],
  "/admin/shops": [
    { name: "Dashboard HQ", href: "/admin/hq" },
    { name: "Magasins", href: "/admin/shops" }
  ],
  "/admin/shops/new": [
    { name: "Dashboard HQ", href: "/admin/hq" },
    { name: "Magasins", href: "/admin/shops" },
    { name: "Nouveau magasin", href: "/admin/shops/new" }
  ],
  "/admin/users": [
    { name: "Dashboard HQ", href: "/admin/hq" },
    { name: "Utilisateurs", href: "/admin/users" }
  ],
  "/admin/reports": [
    { name: "Dashboard HQ", href: "/admin/hq" },
    { name: "Rapports Globaux", href: "/admin/reports" }
  ]
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  
  // Find exact match or closest parent
  let breadcrumbs = breadcrumbMap[pathname];
  
  if (!breadcrumbs) {
    // Try to find a parent path
    const pathSegments = pathname.split('/').filter(Boolean);
    for (let i = pathSegments.length; i > 0; i--) {
      const parentPath = '/' + pathSegments.slice(0, i).join('/');
      if (breadcrumbMap[parentPath]) {
        breadcrumbs = breadcrumbMap[parentPath];
        break;
      }
    }
  }

  if (!breadcrumbs || breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-4">
        {breadcrumbs.map((item, index) => (
          <li key={item.href} className="flex">
            <div className="flex items-center">
              {index > 0 && (
                <svg
                  className="flex-shrink-0 h-5 w-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="ml-4 text-sm font-medium text-gray-500">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  {item.name}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

