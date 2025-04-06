import { useState, useEffect } from "react";

// Actualizamos la interfaz para incluir todos los campos necesarios
export interface Office {
  id: number;
  name: string;
  whatsapp: string;
  telegram: string;
  firstDepositBonus: string;
  perpetualBonus: string;
  minDeposit: string;
  minWithdrawal: string;
  minWithdrawalWait: string;
  status: string;
  agentAssigned: string;
  // Otros campos que podrían ser relevantes
}

export function useOffices() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para refrescar manualmente las oficinas
  const refreshOffices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/offices`);
      if (!response.ok) {
        throw new Error('Error al obtener las oficinas');
      }
      const data = await response.json();
      console.log('Datos de oficinas cargados:', data);
      setOffices(data);
    } catch (error) {
      console.error('Error al cargar oficinas:', error);
      setError('No se pudieron cargar las oficinas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshOffices();
  }, []);

  // Retornar solo las oficinas activas, formateadas para componentes Select
  // Nota: Mantenemos dos formatos para compatibilidad
  const activeOffices = offices
    .filter(office => office.status === "active")
    .map(office => ({
      // Para sistemas existentes que usan el nombre como valor
      value: office.id.toString(), 
      label: office.name
    }));

  // Creamos un mapa más flexible que pueda manejar varios formatos de ID
  const officesMap: Record<string, string> = {};
  
  // Llenamos el mapa con diferentes formatos de claves para mayor compatibilidad
  offices.forEach(office => {
    // Aseguramos tener el ID tanto como string como en su formato original
    officesMap[office.id.toString()] = office.name;
    officesMap[office.id] = office.name;
    
    // También mapeamos por nombre para retrocompatibilidad
    officesMap[office.name.toLowerCase()] = office.name;
  });

  // Función mejorada para convertir ID a nombre de oficina
  const getOfficeName = (id: string | number | null | undefined): string => {
    if (!id) return "No asignada";
    
    if (id === "remote" || id === "Remote") return "Remoto";
    
    // Convertimos a string para búsqueda estándar
    const officeIdStr = id.toString();
    
    // Primero buscamos exactamente como nos llega
    if (officesMap[id]) return officesMap[id];
    
    // Buscamos como string
    if (officesMap[officeIdStr]) return officesMap[officeIdStr];
    
    // Intentamos buscar con variaciones de formato
    const normalizedId = officeIdStr.toLowerCase();
    if (officesMap[normalizedId]) return officesMap[normalizedId];
    
    // Si todo falla, mostramos el ID con un mensaje claro
    return `Desconocida (ID: ${id})`;
  };

  return {
    offices,
    activeOffices,
    officesMap,
    getOfficeName,
    isLoading,
    error,
    refreshOffices,
  };
} 