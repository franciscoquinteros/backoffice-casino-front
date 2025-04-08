"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { toast } from "sonner"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!emailRef.current?.value || !passwordRef.current?.value) {
      toast.error("Por favor, ingresa tu email y contraseña")
      return
    }

    setIsLoading(true)

    try {
      // Try the login
      const result = await signIn("credentials", {
        email: emailRef.current.value,
        password: passwordRef.current.value,
        redirect: false,
      })

      if (result?.error) {
        // If login fails, check if the account exists and is inactive
        if (result.error === 'Configuration' || result.error === 'CredentialsSignin') {
          try {
            const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/check-status?email=${encodeURIComponent(emailRef.current.value)}`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            });
            
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              
              // Only show inactive message if the user actually exists and is inactive
              if (checkData && checkData.status === 'inactive') {
                toast.error("Tu cuenta está desactivada. Contacta al administrador.");
                setIsLoading(false);
                return;
              }
            }
          } catch {
            // Silently handle status check error
          }
          
          // If we get here, it's just invalid credentials or user doesn't exist
          toast.error("Credenciales inválidas");
        } else if (result.error.includes('inactive_user') || result.error.includes('inactive')) {
          toast.error("Tu cuenta está desactivada. Contacta al administrador.");
        } else {
          toast.error("Credenciales inválidas");
        }
        
        setIsLoading(false);
        return;
      }

      toast.success("Inicio de sesión exitoso");

      // Redirección al chat
      setTimeout(() => {
        router.push("/dashboard/chat");
        router.refresh();
      }, 300);
    } catch (error) {
      if (error instanceof Error && 
          (error.message.includes('inactive_user') || error.message.includes('inactive'))) {
        toast.error("Tu cuenta está desactivada. Contacta al administrador.");
      } else {
        toast.error("Error al iniciar sesión");
      }
      
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-xl font-bold">Cocos Admin</h1>
          </div>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                ref={emailRef}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Contraseña</Label>
              </div>
              <Input
                id="password"
                type="password"
                required
                ref={passwordRef}
              />
            </div>
            <Button disabled={isLoading} type="submit" className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}