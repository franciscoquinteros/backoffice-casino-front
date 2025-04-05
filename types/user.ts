export interface User {
  id: string
  username: string
  email: string; // Añadido
  name: string;  // Añadido
  role: string
  office: string | number
  status: string
  receivesWithdrawals: boolean
  withdrawal?: string
  createdAt: Date
} 