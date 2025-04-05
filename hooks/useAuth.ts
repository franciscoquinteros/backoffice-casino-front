import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useAuth(requireAuth = true) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (!requireAuth && status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, requireAuth, router]);

  const logout = async () => {
    try {
      // Mostrar un indicador de carga (opcional)
      toast.loading('Cerrando sesión...');

      // Llamar a signOut con callbackUrl específico
      await signOut({
        redirect: false,
        callbackUrl: '/auth/login'
      });

      // Limpiar cualquier estado local si es necesario
      localStorage.removeItem('user-preferences');

      // Mostrar toast de éxito
      toast.success('Sesión cerrada correctamente');

      // Redirigir al login
      setTimeout(() => {
        router.push('/auth/login');
        router.refresh();
      }, 100);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
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