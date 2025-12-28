import { Suspense } from 'react'
import HqReport from '../reports/components/HqReport'

function HqDashboardContent() {
  return <HqReport />
}

export default function HqDashboardPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <HqDashboardContent />
    </Suspense>
  )
}
