import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Ticket } from '../hooks/tickets';
import { TicketChatModal } from './ticket-chat-modal';
import { useSession } from 'next-auth/react';

// Asegúrate de que esta interfaz coincida con la definida en tickets-client.tsx
interface TicketsTableProps {
  tickets: Ticket[];
  onTicketUpdated?: (updatedTicket: Ticket) => void;
}

export function TicketsTable({ tickets, onTicketUpdated }: TicketsTableProps) {
  const { data: session } = useSession();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch {
      console.error('Error parsing date:', dateString);
      return 'Fecha inválida';
    }
  };

  const getStatusVariant = (status?: string): "default" | "secondary" | "outline" | "destructive" | null | undefined => {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
      case 'open': return 'default';
      case 'new': return 'default';
      case 'pending': return 'outline';
      case 'hold': return 'outline';
      case 'solved': return 'secondary';
      case 'closed': return 'secondary';
      default: return 'outline';
    }
  };

  const handleRowClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
  };

  const handleTicketUpdated = (updatedTicket: Ticket) => {
    if (onTicketUpdated) {
      onTicketUpdated(updatedTicket);
    }
  };

  return (
    <>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">ID</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead className="w-24">Estado</TableHead>
              <TableHead>Operador Asignado</TableHead>
              <TableHead className="w-32">Creado</TableHead>
              <TableHead className="w-32">Actualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No se encontraron tickets.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(ticket)}
                >
                  <TableCell className="font-medium">{ticket.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{ticket.user?.name || 'Sin nombre'}</span>
                      <span className="text-xs text-muted-foreground">{ticket.user?.email || 'Sin email'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{ticket.subject || 'Sin asunto'}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {ticket.description || 'Sin descripción'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(ticket.status)}>
                      {ticket.status || 'Desconocido'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.internal_assignee ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{ticket.internal_assignee.name || ticket.internal_assignee.username || 'Sin nombre'}</span>
                        <span className="text-xs text-muted-foreground">{ticket.internal_assignee.email || 'Sin email'}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No asignado</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(ticket.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(ticket.updated_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedTicket && (
        <TicketChatModal
          isOpen={!!selectedTicket}
          onClose={handleCloseModal}
          user={{
            name: selectedTicket.user?.name || 'Usuario',
            email: selectedTicket.user?.email || 'Sin email'
          }}
          ticketId={selectedTicket.id}
          agentId={session?.user?.id?.toString() || ''}
          onTicketUpdated={handleTicketUpdated}
        />
      )}
    </>
  );
}