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
import { Button } from "@/components/ui/button";
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton';
import { SkeletonLoader } from "@/components/skeleton-loader";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: string | number;
  type?: 'deposit' | 'withdraw';
  description: string;
  amount: number;
  status?: string;
  date_created?: string;
  payment_method_id?: string;
  payer_email?: string;
  wallet_address?: string;
  cbu?: string;
  idCliente?: string | number;
}

export function WebMonitoringContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | number | null>(null);

  const tableColumns: ColumnConfig[] = [
    { width: 'w-[100px]', cell: { type: 'text', widthClass: 'w-20' } },
    { cell: { type: 'text', widthClass: 'w-24' } },
    { cell: { type: 'text', widthClass: 'w-full' } },
    { cell: { type: 'text', widthClass: 'w-24' } },
    { cell: { type: 'badge', widthClass: 'w-24' } },
    { cell: { type: 'text', widthClass: 'w-40' } },
    { cell: { type: 'text', widthClass: 'w-32' } },
    { cell: { type: 'text', widthClass: 'w-40' } },
    { cell: { type: 'action', widthClass: 'w-24', align: 'center' } },
  ];

  const handleButtonClick = async (id: string | number): Promise<void> => {
    setProcessingId(id);
    await handleAccept(id);
    setProcessingId(null);
  }

  // Función simple para mostrar alertas en lugar de toast
  const showAlert = (message: string) => {
    console.log(message);
    // Opcional: si quieres mostrar un alert nativo
    // alert(message);
  };

  useEffect(() => {
    setIsLoading(true);

    const fetchTransactions = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions`);
        if (!response.ok) {
          throw new Error(`Error al obtener transacciones: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Datos recibidos del backend:', data);

        setTimeout(() => {
          setTransactions(data);
          setError(null);
          setIsLoading(false);
        }, 800);
      } catch (err) {
        console.error('Error en el fetch:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setIsLoading(false);
      }
    };

    fetchTransactions();

    // Función para actualizar periódicamente (polling)
    const intervalId = setInterval(() => {
      console.log('Actualizando transacciones...');
      fetchTransactions();
    }, 30000); // Cada 30 segundos

    // Limpiar intervalo al desmontar
    return () => {
      clearInterval(intervalId);
    };
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

  async function handleAccept(id: string | number): Promise<void> {
    try {
      const transaction = transactions.find(t => t.id === id);

      if (!transaction) {
        console.error('Transaction not found');
        return;
      }

      // Determinar el tipo de transacción
      const transactionType = transaction.type ||
        (transaction.description?.toLowerCase().includes('deposit') ? 'deposit' : 'withdraw');

      // Usar el proxy HTTPS en el backend de Railway en lugar de llamar directamente a la IP
      const endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL}/proxy/${transactionType}`;

      console.log('Llamando endpoint proxy para confirmar:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: transaction.idCliente || '',
          amount: transaction.amount,
          transaction_id: transaction.id.toString()
        }),
      });

      // Intentar obtener el cuerpo de la respuesta
      let responseBody;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text();
      }

      console.log('Respuesta del servidor proxy:', responseBody);

      if (!response.ok) {
        throw new Error(`Error al confirmar la transacción: ${response.status}`);
      }

      setTransactions(prevTransactions =>
        prevTransactions.map(tx =>
          tx.id === id ? { ...tx, status: 'Aceptado' } : tx
        )
      );

      console.log('Transacción confirmada exitosamente');
      showAlert('Transacción aceptada correctamente');

    } catch (error) {
      console.error('Error al confirmar la transacción:', error);
      showAlert('Error al aceptar la transacción');

      setTransactions(prevTransactions =>
        prevTransactions.map(transaction =>
          transaction.id === id ? { ...transaction, status: 'Pending' } : transaction
        )
      );
    }
  }

  const HeaderContent = (
    <h1 className="text-2xl font-bold mb-4">Monitoreo de Transferencias</h1>
  );

  const HeaderSkeleton = (
    <Skeleton className="h-8 w-64 mb-4" />
  );



  const ButtonSkeleton = (
    <div className="flex justify-between items-center mb-4">
      <Skeleton className="h-10 w-56" />
    </div>
  );

  // Aquí mostramos todas las transacciones (sin filtrar)
  const TableContent = transactions.length === 0 ? (
    <Card className="p-8 text-center">
      <p className="text-muted-foreground">
        {error ? `Error: ${error}` : "No hay transacciones disponibles"}
      </p>
    </Card>
  ) : (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID de Pago</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha de Creación</TableHead>
            <TableHead>Método de Pago</TableHead>
            <TableHead>Email/Cuenta Destino</TableHead>
            <TableHead>Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">{transaction.id}</TableCell>
              <TableCell>
                {transaction.type === 'deposit' ? 'Depósito' :
                  transaction.type === 'withdraw' ? 'Retiro' :
                    transaction.description?.toLowerCase().includes('deposit') ? 'Depósito' : 'Retiro'}
              </TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>
                {(() => {
                  try {
                    const amountValue = transaction.amount;
                    if (typeof amountValue === 'number') {
                      return '$' + amountValue.toFixed(2);
                    } else if (amountValue === null || amountValue === undefined) {
                      return '$0.00';
                    } else {
                      const parsedAmount = parseFloat(String(amountValue).replace(/[^0-9.-]+/g, ''));
                      return '$' + (isNaN(parsedAmount) ? 0 : parsedAmount).toFixed(2);
                    }
                  } catch (error) {
                    console.error('Error formateando amount:', error, transaction);
                    return '$0.00';
                  }
                })()}
              </TableCell>
              <TableCell>{getStatusBadge(transaction.status)}</TableCell>
              <TableCell>
                {transaction.date_created
                  ? new Date(transaction.date_created).toLocaleString()
                  : 'No disponible'}
              </TableCell>
              <TableCell>{transaction.payment_method_id || 'No disponible'}</TableCell>
              <TableCell>
                {transaction.payer_email || transaction.wallet_address || transaction.cbu || 'No disponible'}
              </TableCell>
              <TableCell>
                {transaction.status === 'Aceptado' || transaction.status === 'approved' ? (
                  <Badge className="bg-green-100 text-green-800">Aceptado</Badge>
                ) : (
                  <Button
                    onClick={() => handleButtonClick(transaction.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1"
                    disabled={transaction.status === 'Aceptado' || transaction.status === 'approved' || processingId === transaction.id}
                  >
                    {processingId === transaction.id ? 'Procesando...' : 'Pendiente'}
                  </Button>
                )}
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