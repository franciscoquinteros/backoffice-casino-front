import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useAuth(requireAuth = true) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Solo realizamos redirecciones cuando el estado de autenticación es definitivo
    if (status !== 'loading') {
      if (requireAuth && status === 'unauthenticated') {
        router.push('/auth/login');
      } else if (!requireAuth && status === 'authenticated') {
        router.push('/dashboard/chat');
      }
    }
  }, [status, requireAuth, router]);

  const logout = async () => {
    try {
      // Mostrar un indicador de carga
      toast.loading('Cerrando sesión...');
      
      // Llamar a signOut con redirect: false para manejar la redirección manualmente
      await signOut({ 
        redirect: false
      });
      
      // Limpiar cualquier estado local si es necesario
      localStorage.removeItem('user-preferences');
      
      // Mostrar toast de éxito
      toast.success('Sesión cerrada correctamente');
      
      // Redirigir al login - usamos router.push que es más confiable
      router.push('/auth/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
      // Intentar redirección incluso en caso de error
      router.push('/auth/login');
    }
  }

  // Verificar si el usuario es SuperAdmin (Joaquin)
  const isSuperAdmin = session?.user?.email === 'joaquin@example.com' || session?.user?.role === 'superadmin';
  
  return {
    user: session?.user,
    role: session?.user?.role,
    isSuperAdmin,
    isAdmin: session?.user?.role === 'admin',
    isManager: session?.user?.role === 'encargado',
    isOperator: session?.user?.role === 'operador',
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    logout
  };
}