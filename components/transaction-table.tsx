"use client";

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowUpDown,
  CheckCircle,
  Download,
  Clock,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { Transaction, transactionService } from "@/components/transaction-service";

interface TransactionTableProps {
  transactions: Transaction[];
  showApproveButton?: boolean;
  onTransactionApproved?: (updatedTransaction: Transaction) => void;
  onTransactionRejected?: (transaction: Transaction) => void;
}

export function TransactionTable({
  transactions,
  showApproveButton = false,
  onTransactionApproved,
  onTransactionRejected
}: TransactionTableProps) {
  const [sortField, setSortField] = useState<keyof Transaction>('date_created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [processingId, setProcessingId] = useState<string | number | null>(null);

  // Ordenar transacciones
  const sortedTransactions = [...transactions].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === bValue) return 0;

    // Manejo para diferentes tipos de datos
    if (sortField === 'date_created') {
      const aDate = new Date(a.date_created || '');
      const bDate = new Date(b.date_created || '');
      return sortDirection === 'asc'
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    }

    // Para valores numéricos
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Para strings
    const aString = String(aValue || '').toLowerCase();
    const bString = String(bValue || '').toLowerCase();
    return sortDirection === 'asc'
      ? aString.localeCompare(bString)
      : bString.localeCompare(aString);
  });

  // Cambia el campo de ordenamiento o la dirección
  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Maneja la aprobación de una transacción
  const handleApprove = async (transaction: Transaction) => {
    try {
      setProcessingId(transaction.id);
      const updatedTransaction = await transactionService.approveTransaction(transaction);

      if (onTransactionApproved) {
        onTransactionApproved(updatedTransaction);
      }

      // Opcional: mostrar mensaje de éxito
      console.log('Transacción aprobada exitosamente');
    } catch (error) {
      console.error('Error al aprobar la transacción:', error);
      // Opcional: mostrar mensaje de error
    } finally {
      setProcessingId(null);
    }
  };

  // Maneja el rechazo de una transacción
  const handleReject = async (transaction: Transaction) => {
    try {
      setProcessingId(transaction.id);

      // Llamar al servicio de rechazo
      const rejectedTransaction = await transactionService.rejectTransaction(transaction);

      // Notificar al componente padre
      if (onTransactionRejected) {
        onTransactionRejected(rejectedTransaction);
      }

      console.log('Transacción rechazada exitosamente');
    } catch (error) {
      console.error('Error al rechazar la transacción:', error);
    } finally {
      setProcessingId(null);
    }
  };

  // Formateadores de datos
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleString('es-AR');
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatMethod = (method?: string) => {
    if (!method) return 'No disponible';

    switch (method) {
      case 'bank_transfer': return 'Transferencia bancaria';
      case 'mercado_pago': return 'Mercado Pago';
      case 'cvu': return 'CVU';
      default: return method;
    }
  };

  // Renderizar el badge de estado apropiado
  const renderStatusBadge = (status: string) => {
    if (status === 'Pending') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Pendiente</span>
        </Badge>
      );
    } else if (status === 'Aceptado' || status === 'approved') {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          <span>Aceptado</span>
        </Badge>
      );
    } else if (status === 'Rechazado') {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          <span>Rechazado</span>
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>{status}</span>
        </Badge>
      );
    }
  };

  // Renderizado condicional para tabla vacía
  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No hay transacciones que coincidan con los filtros seleccionados
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex justify-end p-4">
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Download className="h-4 w-4" />
          <span>Exportar</span>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort('id')}
            >
              <div className="flex items-center">
                ID
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort('idCliente')}
            >
              <div className="flex items-center">
                Cliente
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort('amount')}
            >
              <div className="flex items-center">
                Monto
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>Estado</TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort('date_created')}
            >
              <div className="flex items-center">
                Fecha
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort('payment_method_id')}
            >
              <div className="flex items-center">
                Método
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>Email/Cuenta</TableHead>
            {showApproveButton && <TableHead>Acción</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.map((transaction, index) => (
            <TableRow key={`${transaction.id}-${index}`} className="hover:bg-muted/50">
              <TableCell className="font-medium">{transaction.id}</TableCell>
              <TableCell>{transaction.idCliente || 'No disponible'}</TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell className="font-medium">
                {formatAmount(transaction.amount)}
              </TableCell>
              <TableCell>
                {renderStatusBadge(transaction.status)}
              </TableCell>
              <TableCell>{formatDate(transaction.date_created)}</TableCell>
              <TableCell>{formatMethod(transaction.payment_method_id)}</TableCell>
              <TableCell>
                {transaction.payer_email ||
                  transaction.wallet_address ||
                  transaction.cbu ||
                  'No disponible'}
              </TableCell>
              {showApproveButton && (
                <TableCell>
                  {transaction.status === 'Pending' ? (
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleApprove(transaction)}
                        disabled={processingId === transaction.id}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span>Aceptar</span>
                      </Button>
                      <Button
                        onClick={() => handleReject(transaction)}
                        disabled={processingId === transaction.id}
                        size="sm"
                        variant="destructive"
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        <span>Rechazar</span>
                      </Button>
                    </div>
                  ) : (
                    renderStatusBadge(transaction.status)
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}