"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { NotificationBadge } from "./notification-badge"
import { useNotifications } from "@/lib/NotificationContext"

export function NavMain({
  items,
  blockTitle,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
  blockTitle: string
}) {
  const pathname = usePathname()
  const { unreadMessages, unreadChats } = useNotifications();
  const totalChatNotifications = unreadMessages + unreadChats;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{blockTitle}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`)
          const hasSubItems = Boolean(item.items && item.items.length > 0)

          return (
            <NavMenuItem
              key={item.title}
              item={item}
              isActive={isActive}
              hasSubItems={hasSubItems}
              totalChatNotifications={totalChatNotifications}
            />
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

// Componente para cada ítem de navegación
function NavMenuItem({
  item,
  isActive,
  hasSubItems,
  totalChatNotifications
}: {
  item: {
    title: string
    url: string
    icon: LucideIcon
    items?: {
      title: string
      url: string
    }[]
  },
  isActive: boolean,
  hasSubItems: boolean,
  totalChatNotifications: number
}) {
  const [isOpen, setIsOpen] = useState(isActive)

  return (
    <Collapsible
      asChild
      defaultOpen={isActive}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SidebarMenuItem>
        {hasSubItems ? (
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.title} className="flex justify-between w-full">
              <div className="flex items-center gap-2">
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
              </div>
              <ChevronRight
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
        ) : (
          <SidebarMenuButton asChild tooltip={item.title}>
            <Link href={item.url} className="flex items-center gap-2">
              <item.icon className="w-4 h-4" />
              <span>{item.title}</span>
              {item.title === 'Chat con clientes' && <NotificationBadge count={totalChatNotifications} />}
            </Link>
          </SidebarMenuButton>
        )}

        {hasSubItems && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items?.map((subItem) => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton asChild>
                    <Link href={subItem.url}>
                      <span>{subItem.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  )
}
