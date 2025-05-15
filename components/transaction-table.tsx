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
  AlertTriangle,
  Loader2
} from "lucide-react";
import { Transaction } from "@/components/transaction-service";
import { SimpleErrorModal } from "@/components/error-modal";

interface TransactionTableProps {
  transactions: Transaction[];
  showApproveButton?: boolean;
  onTransactionApproved?: (updatedTransaction: Transaction) => void;
  onTransactionRejected?: (transaction: Transaction) => void;
  isRefreshing?: boolean;
  hideIdColumn?: boolean;
}

export function TransactionTable({
  transactions,
  showApproveButton = false,
  onTransactionApproved,
  onTransactionRejected,
  isRefreshing = false,
  hideIdColumn = false
}: TransactionTableProps) {
  const [sortField, setSortField] = useState<keyof Transaction>('date_created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [processingId, setProcessingId] = useState<string | number | null>(null);


  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  });


  // Función para cerrar el modal
  const closeErrorModal = () => {
    console.log("CERRANDO MODAL");
    setErrorModal({
      isOpen: false,
      title: '',
      message: ''
    });
  };



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
  const handleApprove = (transaction: Transaction) => {
    if (processingId === transaction.id) return; // Evita doble click

    // Llama a la función del padre si existe
    if (onTransactionApproved) {
      setProcessingId(transaction.id); // Marca como procesando (visualmente)
      console.log("Notificando al padre para aprobar:", transaction.id);
      try {
        onTransactionApproved(transaction); // <-- Llama a la PROP del padre
        // El padre se encargará de llamar al servicio, mostrar toasts,
        // y eventualmente recargar la lista (lo que limpiará processingId vía useEffect)
      } catch (error) {
        // Si el handler del padre lanza un error síncrono (poco común)
        console.error("Error calling onTransactionApproved:", error);
        setProcessingId(null); // Limpia estado local si falla la llamada al handler
      }
      // Quitamos el finally de aquí, el estado se limpia por useEffect o en el padre
    } else {
      console.warn("onTransactionApproved prop is missing from TransactionTable");
    }
  };

  // Maneja el rechazo de una transacción
  const handleReject = (transaction: Transaction) => {
    if (processingId === transaction.id) return;

    if (onTransactionRejected) {
      setProcessingId(transaction.id); // Marca como procesando
      console.log("Notificando al padre para rechazar:", transaction.id);
      try {
        onTransactionRejected(transaction); // <-- Llama a la PROP del padre
      } catch (error) {
        console.error("Error calling onTransactionRejected:", error);
        setProcessingId(null);
      }
    } else {
      console.warn("onTransactionRejected prop is missing from TransactionTable");
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

  const formatId = (id: string | number) => {
    const idString = id.toString();
    if (idString.length <= 8) return idString;

    // Dividir el ID en grupos de 8 dígitos
    const chunks = [];
    for (let i = 0; i < idString.length; i += 8) {
      chunks.push(idString.slice(i, i + 8));
    }
    return chunks.join('\n');
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
    } else if (status === 'Error') {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          <span>Error</span>
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
    <>
      <Card className={isRefreshing ? "opacity-70 transition-opacity" : ""}>
        <div className="flex justify-between p-4">
          {isRefreshing && (
            <div className="flex items-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
              <span className="text-sm text-muted-foreground">Actualizando...</span>
            </div>
          )}
          <div className={isRefreshing ? "ml-auto" : "w-full flex justify-end"}>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {!hideIdColumn && (
                <TableHead
                  className="cursor-pointer w-[80px]"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center">
                    ID
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
              )}
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('idCliente')}
              >
                <div className="flex items-center">
                  Cliente
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Referencia</TableHead>
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
              <TableHead>CBU/Cuenta</TableHead>
              <TableHead>Nombre Cuenta</TableHead>
              {showApproveButton && <TableHead>Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.map((transaction, index) => (
              <TableRow key={`${transaction.id}-${index}`} className="hover:bg-muted/50">
                {!hideIdColumn && (
                  <TableCell className="font-medium w-[80px] whitespace-pre-line">
                    {formatId(transaction.id)}
                  </TableCell>
                )}
                <TableCell>{transaction.idCliente || 'No disponible'}</TableCell>
                <TableCell>
                  {transaction.type === 'withdraw' && transaction.payer_identification?.number
                    ? transaction.payer_identification.number
                    : transaction.type === 'deposit' && transaction.external_reference
                      ? transaction.external_reference
                      : 'No disponible'}
                </TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell className="font-medium">
                  {formatAmount(transaction.amount)}
                </TableCell>
                <TableCell>
                  {renderStatusBadge(transaction.status)}
                </TableCell>
                <TableCell>{formatDate(transaction.date_created)}</TableCell>
                <TableCell>
                  {transaction.payer_email ||
                    transaction.wallet_address ||
                    transaction.cbu ||
                    'No disponible'}
                </TableCell>
                <TableCell>
                  {transaction.account_name || 'No disponible'}
                </TableCell>
                {showApproveButton && (
                  <TableCell>
                    {transaction.status === 'Pending' ? (
                      <div className="flex space-x-2">
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleApprove(transaction); }}
                          disabled={processingId === transaction.id || isRefreshing}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 text-xs"
                        >
                          {processingId === transaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          <span className={processingId === transaction.id ? "ml-1" : "ml-1"}>Aceptar</span>
                        </Button>
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleReject(transaction); }}
                          disabled={processingId === transaction.id || isRefreshing}
                          size="sm"
                          variant="destructive"
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs"
                        >
                          {processingId === transaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          <span className={processingId === transaction.id ? "ml-1" : "ml-1"}>Rechazar</span>
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

      <SimpleErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={closeErrorModal}
      />
    </>

  );
}