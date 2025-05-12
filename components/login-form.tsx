// Ejemplo: components/auth/LoginForm.tsx (o donde esté tu form)
"use client";

import { useState, FormEvent, useEffect } from 'react'; // Importa FormEvent
import { signIn } from "next-auth/react";
import { useRouter } from 'next/navigation'; // Para redirección
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Importa de shadcn
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OfficeOption {
  id: number | string;
  name: string;
}


// Quita useOffices si ya no cargas el dropdown aquí
// import { useOffices } from "@/components/hooks/use-offices";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Asume que tienes un layout básico, ajusta estilos según necesidad
export function LoginForm({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  // Estados para los campos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [viewOfficeId, setViewOfficeId] = useState(''); // Input para el ID de oficina opcional
  const [officeList, setOfficeList] = useState<OfficeOption[]>([]);
  const [isLoadingOffices, setIsLoadingOffices] = useState(false);

  // Lógica simple para determinar si el email PODRÍA ser de un superadmin
  // Ajusta esto a tu caso real (ej: email exacto, dominio específico)
  const isPotentiallySuperAdmin = email.toLowerCase() === 'admin@admin.com' || email.endsWith('@superadmin.com');

  useEffect(() => {
    const fetchOffices = async () => {
      if (isPotentiallySuperAdmin && officeList.length === 0) { // Solo carga si es superadmin y la lista está vacía
        setIsLoadingOffices(true);
        try {
          // Llama al endpoint PÚBLICO (sin token)
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/offices`);
          if (!response.ok) { throw new Error('Failed to fetch offices'); }
          const data: OfficeOption[] = await response.json();
          // Asume que la API devuelve un array de {id, name}
          setOfficeList(data || []);
          console.log("Offices loaded for selector:", data);
        } catch (error) {
          console.error("Error fetching offices for selector:", error);
          toast.error("No se pudieron cargar las oficinas para seleccionar.");
          setOfficeList([]); // Asegura que esté vacío en error
        } finally {
          setIsLoadingOffices(false);
        }
      } else if (!isPotentiallySuperAdmin) {
        // Si deja de ser superadmin, limpia la lista y la selección
        setOfficeList([]);
        setViewOfficeId('');
      }
    };

    fetchOffices();
    // Depende de isPotentiallySuperAdmin para reaccionar al cambio de email
  }, [isPotentiallySuperAdmin, officeList.length]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor, ingresa email y contraseña.");
      return;
    }
    setIsLoading(true);

    // Construye las credenciales a enviar a NextAuth
    const credentials: Record<string, string> = {
      email,
      password,
    };
    // Añade viewOfficeId SOLO si el campo es visible y tiene valor
    if (isPotentiallySuperAdmin && viewOfficeId.trim()) {
      credentials.viewOfficeId = viewOfficeId.trim();
      console.log("Attempting login as Superadmin viewing office:", credentials.viewOfficeId);
    } else {
      console.log("Attempting login with default office.");
    }


    try {
      const result = await signIn("credentials", {
        ...credentials,
        redirect: false, // Importante manejar la redirección manualmente
      });

      setIsLoading(false); // Quita el loading después de la respuesta

      if (result?.error) {
        console.error("SignIn Error:", result.error);
        // Mapea errores conocidos si es necesario
        if (result.error === 'CredentialsSignin') {
          toast.error("Credenciales inválidas.");
        } else if (result.error.toLowerCase().includes('inactive')) {
          toast.error("Tu cuenta está desactivada.");
        } else if (result.error.toLowerCase().includes('office assignment')) {
          toast.error("Error de configuración de oficina.");
        }
        else {
          toast.error("Error al iniciar sesión: " + result.error);
        }
      } else if (result?.ok && !result.error) {
        // Éxito
        toast.success("Inicio de sesión exitoso");
        // Redirige al dashboard o donde necesites
        router.push('/dashboard'); // Ajusta la ruta destino
        router.refresh(); // Refresca para asegurar que la sesión se actualice bien en layout/header
      } else {
        // Caso inesperado
        toast.error("Respuesta inesperada del servidor de autenticación.");
      }
    } catch (error: unknown) {
      setIsLoading(false);
      console.error("Submit Error:", error);
      toast.error(error instanceof Error ? error.message : "Error inesperado durante el inicio de sesión.");
    }
  };

  return (
    <div className={cn("w-full max-w-sm mx-auto", className)} {...props}> {/* Aplica className y otras props */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email" type="email" placeholder="tu@email.com" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password" type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* --- Selector Condicional para Super Admin --- */}
          {isPotentiallySuperAdmin && (
            <div className="grid gap-2">
              <Label htmlFor="viewOfficeId">Ver Oficina (Solo SuperAdmin)</Label>
              <Select
                value={viewOfficeId} // El valor es el ID string
                onValueChange={setViewOfficeId} // Actualiza el ID seleccionado
                disabled={isLoadingOffices || isLoading}
              >
                <SelectTrigger id="viewOfficeId">
                  <SelectValue placeholder={isLoadingOffices ? "Cargando oficinas..." : "Elegir oficina"} />
                </SelectTrigger>
                <SelectContent>
                  {/* Opción para usar la oficina por defecto */}
                  {/* Mapea las oficinas cargadas */}
                  {officeList.map(office => (
                    <SelectItem key={office.id.toString()} value={office.id.toString()}>
                      {office.name} ({office.id})
                    </SelectItem>
                  ))}
                  {/* Muestra mensaje si la carga falló */}
                  {!isLoadingOffices && officeList.length === 0 && (
                    <SelectItem value="error" disabled>No se cargaron oficinas</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Selecciona la oficina que deseas visualizar al iniciar sesión.</p>
            </div>
          )}
          {/* --- Fin Selector Condicional --- */}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? "Iniciando..." : "Iniciar Sesión"}
          </Button>
        </div>
      </form>
    </div>
  );
}