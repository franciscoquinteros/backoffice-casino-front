// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names with Tailwind CSS optimization
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Función para formatear moneda
export function formatCurrency(amount: number | undefined): string {
  if (amount === undefined) return '$0.00';

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Función para formatear fecha
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Función para formatear tiempo transcurrido
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Menos de un minuto
  if (secondsAgo < 60) {
    return 'hace un momento';
  }

  // Menos de una hora
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) {
    return `hace ${minutesAgo} ${minutesAgo === 1 ? 'minuto' : 'minutos'}`;
  }

  // Menos de un día
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return `hace ${hoursAgo} ${hoursAgo === 1 ? 'hora' : 'horas'}`;
  }

  // Menos de una semana
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) {
    return `hace ${daysAgo} ${daysAgo === 1 ? 'día' : 'días'}`;
  }

  // Más de una semana
  return formatDate(date);
}