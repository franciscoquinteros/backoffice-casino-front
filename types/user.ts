export interface User {
  id: string
  username: string
  email: string; // Añadido
  name: string;  // Añadido
  role: string
  office: string | number
  status: string
  withdrawal: 'enabled' | 'disabled'
  createdAt: Date
} 