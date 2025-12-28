import RoleNav from './components/RoleNav'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <RoleNav />
      {children}
    </div>
  )
}
