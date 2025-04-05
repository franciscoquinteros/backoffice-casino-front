import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Archive, Clock, MessageSquare } from 'lucide-react'

/**
 * Componente esqueleto para el chat completo
 * Se utiliza como fallback en Suspense
 */
export function ChatPageSkeleton() {
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-180px)] gap-2 sm:gap-4">
      {/* Lista de chats skeleton */}
      <Card className="w-full md:w-1/3 mb-2 sm:mb-4 md:mb-0 overflow-hidden">
        <Tabs defaultValue="active" className="h-full flex flex-col overflow-hidden">
          <div className="p-2 sm:p-4 sm:pb-0">
            <TabsList className="w-full min-w-0 grid grid-cols-3 p-1 h-auto">
              <TabsTrigger value="active" className="flex items-center justify-center gap-0.5 py-1.5 px-0.5 sm:px-1 md:px-2 text-xs sm:text-sm overflow-hidden">
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden md:inline ml-1 truncate">Activos</span>
                <Skeleton className="ml-0.5 h-4 w-5 rounded-full" />
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center justify-center gap-0.5 py-1.5 px-0.5 sm:px-1 md:px-2 text-xs sm:text-sm overflow-hidden">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden md:inline ml-1 truncate">Pendientes</span>
                <Skeleton className="ml-0.5 h-4 w-5 rounded-full" />
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex items-center justify-center gap-0.5 py-1.5 px-0.5 sm:px-1 md:px-2 text-xs sm:text-sm overflow-hidden">
                <Archive className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden md:inline ml-1 truncate">Resueltos</span>
                <Skeleton className="ml-0.5 h-4 w-5 rounded-full" />
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 px-2 sm:px-4 pt-2 overflow-hidden">
            <TabsContent value="active" className="mt-2 space-y-2 h-full">
              {Array(4).fill(0).map((_, i) => (
                <ChatItemSkeleton key={i} />
              ))}
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Panel de chat skeleton */}
      <Card className="flex-1 flex flex-col">
        <div className="border-b p-2 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-5 w-28 sm:w-32" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-auto">
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] ${i % 2 === 0 ? 'mr-auto' : 'ml-auto'}`}>
                  <Skeleton className={`h-20 w-64 rounded-lg ${i % 2 === 0 ? 'rounded-tl-none' : 'rounded-tr-none'}`} />
                  <Skeleton className="h-3 w-24 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </Card>
    </div>
  )
}

/**
 * Skeleton para un item de chat individual
 */
function ChatItemSkeleton() {
  return (
    <div className="p-2 sm:p-3 md:p-4 rounded-lg border border-accent">
      <div className="flex flex-col gap-2">
        {/* Primera fila: Información del usuario */}
        <div className="flex justify-between items-start w-full">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-5 w-24 sm:w-32" />
            </div>
            <Skeleton className="h-3 w-20 mt-1" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Segunda fila: Badges y botones */}
        <div className="flex justify-between items-center w-full">
          <Skeleton className="h-5 w-24 sm:w-32 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </div>
    </div>
  )
} 