import ReportsDashboard from "@/app/report/report"
import { RoleGuard } from "@/components/role-guard"

export default function Page() {
  return (
    <RoleGuard allowedRoles={['admin', 'encargado', 'superadmin']}>
      <div className="container mx-auto dark:text-white">
        <h1 className="text-2xl font-bold mb-4">Reportes</h1>
        <ReportsDashboard />
      </div>
    </RoleGuard>
  )
}