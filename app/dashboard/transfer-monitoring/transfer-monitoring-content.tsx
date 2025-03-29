"use client";

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton';
import { SkeletonLoader } from "@/components/skeleton-loader";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: string | number;
  type: 'deposit' | 'withdraw';
  amount: number;
  status?: 'Pending' | 'Aceptado' | 'approved' | string;
  date_created?: string;
  description?: string;
  payment_method_id?: string;
  payer_email?: string;
  cbu?: string;
  wallet_address?: string;
  idCliente?: string | number;
}

export function TransferMonitoringContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tableColumns: ColumnConfig[] = [
    { width: 'w-[70px]', cell: { type: 'text', widthClass: 'w-12' } },    // ID
    { cell: { type: 'text', widthClass: 'w-24' } },                       // Tipo
    { cell: { type: 'text', widthClass: 'w-20' } },                       // Monto
    { cell: { type: 'text', widthClass: 'w-full' } },                     // Descripción
    { cell: { type: 'badge', widthClass: 'w-24' } },                      // Estado
    { cell: { type: 'text', widthClass: 'w-40' } },                       // Fecha de Creación
    { cell: { type: 'text', widthClass: 'w-32' } },                       // Método/Cuenta
    { cell: { type: 'text', widthClass: 'w-40' } },                       // Email/Cuenta Destino
    { cell: { type: 'badge', widthClass: 'w-24', align: 'center' } },     // Estado (antes Acción)
  ];

  useEffect(() => {
    setIsLoading(true);

    const fetchData = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions`);
        if (!response.ok) {
          throw new Error(`Error al obtener transacciones: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Datos recibidos del backend:', data);

        setTimeout(() => {
          setTransactions(data);
          setIsLoading(false);
        }, 800);
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Error en el fetch:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusBadge = (status?: string) => {
    if (!status || status === 'Pending') {
      return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
    }
    if (status === 'Aceptado' || status === 'approved') {
      return <Badge className="bg-green-100 text-green-800">Aceptado</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const HeaderContent = (
    <h1 className="text-2xl font-bold mb-4">Historial de Transferencias Aprobadas</h1>
  );

  const HeaderSkeleton = (
    <Skeleton className="h-8 w-64 mb-4" />
  );

  // Filtrar solo las transacciones aprobadas
  const approvedTransactions = transactions.filter(
    transaction => transaction.status === 'approved' || transaction.status === 'Aceptado'
  );

  const TableContent = approvedTransactions.length === 0 ? (
    <Card className="p-8 text-center">
      <p className="text-muted-foreground">
        {error ? `Error: ${error}` : "No hay transacciones aprobadas disponibles"}
      </p>
    </Card>
  ) : (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha de Creación</TableHead>
            <TableHead>Método/Cuenta</TableHead>
            <TableHead>Email/Cuenta Destino</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {approvedTransactions.map((transaction) => (
            <TableRow key={transaction.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">{transaction.id}</TableCell>
              <TableCell>{transaction.type === 'deposit' ? 'Depósito' : 'Retiro'}</TableCell>
              <TableCell>
                {(() => {
                  try {
                    // Intentar manejar cualquier formato posible de amount
                    const amountValue = transaction.amount;
                    if (typeof amountValue === 'number') {
                      return '$' + amountValue.toFixed(2);
                    } else if (amountValue === null || amountValue === undefined) {
                      return '$0.00';
                    } else {
                      // Intenta convertir a número, con fallback a 0 si no es posible
                      const parsedAmount = parseFloat(String(amountValue).replace(/[^0-9.-]+/g, ''));
                      return '$' + (isNaN(parsedAmount) ? 0 : parsedAmount).toFixed(2);
                    }
                  } catch (error) {
                    console.error('Error formateando amount:', error, transaction);
                    return '$0.00';
                  }
                })()}
              </TableCell>
              <TableCell>{transaction.description || 'Sin descripción'}</TableCell>
              <TableCell>{getStatusBadge(transaction.status)}</TableCell>
              <TableCell>
                {transaction.date_created
                  ? new Date(transaction.date_created).toLocaleString()
                  : 'No disponible'}
              </TableCell>
              <TableCell>
                {transaction.payment_method_id || transaction.cbu || 'No disponible'}
              </TableCell>
              <TableCell>
                {transaction.payer_email || transaction.wallet_address || 'No disponible'}
              </TableCell>
              <TableCell>
                <Badge className="bg-green-100 text-green-800">Aceptado</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="container mx-auto p-4">
      <SkeletonLoader
        skeleton={HeaderSkeleton}
        isLoading={isLoading}
      >
        {HeaderContent}
      </SkeletonLoader>

      <SkeletonLoader
        skeleton={
          <Card>
            <TableSkeleton columns={tableColumns} rowCount={8} />
          </Card>
        }
        isLoading={isLoading}
      >
        {TableContent}
      </SkeletonLoader>
    </div>
  );
}