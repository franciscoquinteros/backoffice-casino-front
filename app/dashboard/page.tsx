'use client'

import { redirect } from "next/navigation"
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { isLoading, isSuperAdmin } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (isSuperAdmin) {
        redirect("/dashboard/super")
      } else {
        redirect("/dashboard/chat")
      }
    }
  }, [isLoading, isSuperAdmin])

  // Show nothing while determining where to redirect
  return null
}
