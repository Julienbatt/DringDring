"use client";
import { useEffect, useMemo, useState } from "react";
import HQAdminLayout from "@/components/HQAdminLayout";
import { apiAuthGet } from "@/lib/api";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { PageLoader, PageError } from "@/components/loading/PageState";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActionCard } from "@/components/dashboard/ActionCard";

type HQUser = {
  id: string;
  name: string;
  email: string;
  role: 'shop_manager' | 'shop_employee' | 'hq_admin';
  shopName?: string;
  region: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
  createdAt: string;
  permissions: string[];
};

const actionCards = [
  { title: "Inviter un utilisateur", description: "Envoyer une invitation email", icon: "✉️", tone: "purple" as const },
  { title: "Attribuer un rôle", description: "Gestion fine des permissions", icon: "🛡️", tone: "blue" as const },
  { title: "Exporter la liste", description: "CSV / Excel en un clic", icon: "📤", tone: "green" as const },
  { title: "Review sécurité", description: "Vérifier les connexions", icon: "🔐", tone: "orange" as const },
];

export default function HQAdminUsersPage() {
  const { user, status } = useProtectedRoute({ redirectTo: "/login?role=hq-admin" });
  const [users, setUsers] = useState<HQUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "pending">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "shop_manager" | "shop_employee" | "hq_admin">("all");

  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      try {
        setError(null);
        const data = await apiAuthGet<HQUser[]>("/test/hq-admin/users");
        setUsers(data);
      } catch (err: any) {
        console.error("Error fetching HQ users:", err);
        setError("Impossible de charger les utilisateurs.");
      }
    };
    fetchUsers();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: HQUser['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: HQUser['status']) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'inactive':
        return 'Inactif';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  const getRoleText = (role: HQUser['role']) => {
    switch (role) {
      case 'shop_manager':
        return 'Gérant de magasin';
      case 'shop_employee':
        return 'Employé de magasin';
      case 'hq_admin':
        return 'HQ Admin';
      default:
        return role;
    }
  };

  const getRoleColor = (role: HQUser['role']) => {
    switch (role) {
      case 'shop_manager':
        return 'bg-blue-100 text-blue-800';
      case 'shop_employee':
        return 'bg-gray-100 text-gray-800';
      case 'hq_admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = users.filter(user => {
    const statusMatch = filter === 'all' || user.status === filter;
    const roleMatch = roleFilter === 'all' || user.role === roleFilter;
    return statusMatch && roleMatch;
  });

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const pending = users.filter((u) => u.status === "pending").length;
    const managers = users.filter((u) => u.role === "shop_manager").length;
    return { total, active, pending, managers };
  }, [users]);

  if (status === "loading" || status === "redirecting") {
    return (
      <HQAdminLayout>
        <PageLoader title="Chargement des utilisateurs..." />
      </HQAdminLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <HQAdminLayout>
        <PageError title="Erreur" description={error} />
      </HQAdminLayout>
    );
  }

  return (
    <HQAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Utilisateurs</h1>
            <p className="mt-2 text-gray-600">
              Gestion des utilisateurs de vos magasins
            </p>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium">
            + Ajouter un utilisateur
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Total utilisateurs" value={stats.total} icon="👥" tone="blue" />
          <StatsCard label="Actifs" value={stats.active} icon="✅" tone="green" />
          <StatsCard label="En attente" value={stats.pending} icon="⏳" tone="orange" />
          <StatsCard label="Gérants" value={stats.managers} icon="👨‍💼" tone="purple" />
        </div>

        {/* Actions */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {actionCards.map((action) => (
            <ActionCard key={action.title} {...action} />
          ))}
        </section>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Status Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtre par statut
                </label>
                <div className="flex space-x-2">
                  {[
                    { key: 'all', label: 'Tous' },
                    { key: 'active', label: 'Actifs' },
                    { key: 'inactive', label: 'Inactifs' },
                    { key: 'pending', label: 'En attente' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key as any)}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        filter === key
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtre par rôle
                </label>
                <div className="flex space-x-2">
                  {[
                    { key: 'all', label: 'Tous' },
                    { key: 'shop_manager', label: 'Gérants' },
                    { key: 'shop_employee', label: 'Employés' },
                    { key: 'hq_admin', label: 'HQ Admin' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setRoleFilter(key as any)}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        roleFilter === key
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Liste des Utilisateurs ({filteredUsers.length})
            </h3>
            {filteredUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Aucun utilisateur trouvé pour ces filtres.
              </p>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Magasin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Région
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dernière connexion
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-purple-600">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                            {getRoleText(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.shopName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.region}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                            {getStatusText(user.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.lastLogin)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-purple-600 hover:text-purple-900 mr-3">
                            Modifier
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            Détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </HQAdminLayout>
  );
}



