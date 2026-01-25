import Sidebar from './components/Sidebar'
import { AuthProvider } from './providers/AuthProvider'
import AdminContextGate from './components/AdminContextGate'

export const dynamic = 'force-dynamic'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AdminContextGate>{children}</AdminContextGate>
        </div>
      </div>
    </AuthProvider>
  )
}
