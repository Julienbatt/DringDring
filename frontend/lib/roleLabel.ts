const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super admin',
  admin_region: 'Entreprise regionale de livraison',
  shop: 'Commerce',
  city: 'Ville',
  hq: 'Siege',
  courier: 'Coursier',
  customer: 'Client',
}

export function roleLabel(role?: string) {
  if (!role) return ''
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ')
}
