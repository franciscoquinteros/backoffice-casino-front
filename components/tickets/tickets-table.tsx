"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TicketChatModal } from "./ticket-chat-modal"
import { Ticket } from "./tickets-client"
import { Card } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface TicketsTableProps {
  tickets: Ticket[]
}

export function TicketsTable({ tickets = [] }: TicketsTableProps) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [agentId] = useState<string>("12345")
  const [ticketsState, setTicketsState] = useState<Ticket[]>(tickets);

  useEffect(() => {
    setTicketsState(tickets);
  }, [tickets]);

  const handleTicketUpdated = (updatedTicket: Ticket) => {
    setTicketsState(currentTickets => 
      currentTickets.map(ticket => 
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      )
    );
    // También actualiza el ticket seleccionado si es el mismo
    if (selectedTicket && selectedTicket.id === updatedTicket.id) {
      setSelectedTicket(updatedTicket);
    }
  };

  const getStatusColor = (status: string = ""): string => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
      case 'solved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A'
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: es })
    } catch (error) {
      return 'Fecha inválida ' + error
    }
  }

  if (!Array.isArray(ticketsState) || ticketsState.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No hay tickets disponibles</p>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Operador Asignado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Actualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketsState.map((ticket) => (
              <TableRow
                key={ticket.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedTicket(ticket)}
              >
                <TableCell className="font-medium">#{ticket.id || 'N/A'}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{ticket.user?.name || 'Usuario desconocido'}</span>
                    <span className="text-sm text-muted-foreground">
                      {ticket.user?.email || 'Sin email'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{ticket.subject || 'Sin asunto'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground line-clamp-2">
                    {ticket.description || 'Sin descripción'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status || 'Desconocido'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {ticket.internal_assignee ? (
                    <div className="flex flex-col">
                      <span className="font-medium">{ticket.internal_assignee.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {ticket.internal_assignee.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin asignar</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{formatDate(ticket.created_at)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{formatDate(ticket.updated_at)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {selectedTicket && (
        <TicketChatModal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          user={selectedTicket.user}
          ticketId={selectedTicket.id}
          agentId={agentId}
          onTicketUpdated={handleTicketUpdated}
        />
      )}
    </>
  )
}