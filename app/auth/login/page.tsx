'use client'

import { Suspense } from 'react'
import { LoginForm } from '@/components/login-form' // Asegúrate de que la ruta sea correcta

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Suspense fallback={
        <div className="flex justify-center items-center h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }>
        <LoginForm className="w-full max-w-md" />
      </Suspense>
    </div>
  )
}