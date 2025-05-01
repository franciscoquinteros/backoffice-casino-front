import { TicketsClient } from "@/components/tickets/tickets-client";
import { RoleGuard } from "@/components/role-guard";

export default async function TicketsPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'operador', 'encargado', 'superadmin']} fallbackUrl="/dashboard">
      <TicketsClient initialTickets={[]} />
    </RoleGuard>
  );
}