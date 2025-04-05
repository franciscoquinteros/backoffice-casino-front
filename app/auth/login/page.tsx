'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

interface FormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoading: isSessionLoading } = useAuth(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  })

  // Obtener la URL de retorno si existe
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard/chat'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (response?.error) {
        setError('Credenciales inválidas');
        toast.error('Credenciales inválidas');
        setIsLoading(false);
        return;
      }

      toast.success('Inicio de sesión exitoso');
      
      // Permitir que la sesión se establezca correctamente antes de redireccionar
      setTimeout(() => {
        // Usar la URL de callback si existe, si no, ir a chat
        router.push(callbackUrl);
        router.refresh();
      }, 300);
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      setError('Error al iniciar sesión');
      toast.error('Error al iniciar sesión');
      setIsLoading(false);
    }
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
                disabled={isLoading}
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLoading}
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isSessionLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}