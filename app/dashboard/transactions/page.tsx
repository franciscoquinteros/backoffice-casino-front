// app/dashboard/transactions/page.tsx
import { redirect } from 'next/navigation';

export default function TransactionsPage() {
  // Redirigir a la página de depósitos pendientes por defecto
  redirect('/dashboard/transactions/deposit-pending');
}