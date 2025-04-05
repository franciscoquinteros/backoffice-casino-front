"use client"

import * as React from "react"
import { useMemo } from "react"
import {
  CircleCheckBig,
  Hourglass,
  LampDesk,
  Landmark,
  MessagesSquare,
  PieChart,
  Ticket,
  Users,
  User,
  UserRound,
  LucideIcon
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth" // Ajusta la ruta según donde tengas useAuth

// Definir el tipo para los elementos de navegación
interface NavItem {
  title: string;
  url: string; // URL es obligatoria según el error
  icon: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[];
}

// Datos estáticos del sidebar para los distintos roles
const superAdminItems: NavItem[] = [
  {
    title: "Oficinas",
    url: "/dashboard/office-configuration",
    icon: LampDesk,
    isActive: true,
  },
  {
    title: "Usuarios",
    url: "/dashboard/users", // URL explícita que apunta a la página principal de usuarios
    icon: Users,
    items: [
      {
        title: "Usuarios Internos",
        url: "/dashboard/users",
      },
      {
        title: "Usuarios Externos",
        url: "/dashboard/external-users",
      }
    ]
  },
  {
    title: "Cuentas para transferencias",
    url: "/dashboard/transfer-accounts",
    icon: Landmark,
  },
  {
    title: "Reportes",
    url: "/dashboard/reports",
    icon: PieChart,
  },
];

const adminItems: NavItem[] = [
  {
    title: "Usuarios",
    url: "/dashboard/users",
    icon: Users,
    isActive: true,
    items: [
      {
        title: "Usuarios Internos",
        url: "/dashboard/users",
      },
      {
        title: "Usuarios Externos",
        url: "/dashboard/external-users",
      }
    ]
  },
  {
    title: "Cuentas para transferencias",
    url: "/dashboard/transfer-accounts",
    icon: Landmark,
  },
  {
    title: "Reportes",
    url: "/dashboard/reports",
    icon: PieChart,
  },
];

const managerItems: NavItem[] = [
  {
    title: "Usuarios",
    url: "/dashboard/users",
    icon: Users,
    isActive: true,
    items: [
      {
        title: "Usuarios Internos",
        url: "/dashboard/users",
      },
      {
        title: "Usuarios Externos",
        url: "/dashboard/external-users",
      }
    ]
  },
  {
    title: "Cuentas para transferencias",
    url: "/dashboard/transfer-accounts",
    icon: Landmark,
  },
];

const operatorItems: NavItem[] = [
  {
    title: "Usuarios",
    url: "/dashboard/users",
    icon: Users,
    isActive: true,
    items: [
      {
        title: "Usuarios Internos",
        url: "/dashboard/users",
      },
      {
        title: "Usuarios Externos",
        url: "/dashboard/external-users",
      }
    ]
  },
];

const ticketsItems: NavItem[] = [
  {
    title: "Chat con clientes",
    url: "/dashboard/chat",
    icon: MessagesSquare,
  },
  {
    title: "Tickets",
    url: "/dashboard/tickets",
    icon: Ticket,
  },
];

const projectsItems: NavItem[] = [
  {
    title: "Monitoreo pendientes",
    url: "/dashboard/web-monitoring",
    icon: Hourglass,
  },
  {
    title: "Monitoreo de completados",
    url: "/dashboard/transfer-monitoring",
    icon: CircleCheckBig,
  },
];


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, isSuperAdmin, isAdmin, isManager, isOperator } = useAuth();

  const userData = useMemo(() => ({
    name: user?.name,
    email: user?.email
  }), [user?.name, user?.email]);

  const filteredItems = useMemo(() => {
    // Super Admin (Joaquin) - Acceso a todo, con Oficinas primero
    if (isSuperAdmin) {
      return {
        navMain: superAdminItems,
        tickets: ticketsItems,
        projects: projectsItems,
      };
    }

    // Admin (dueño de oficina) - Acceso a todo excepto configuración de oficinas
    if (isAdmin) {
      return {
        navMain: adminItems,
        tickets: ticketsItems,
        projects: projectsItems,
      };
    }

    // Encargado (gestión completa sin reportes financieros)
    if (isManager) {
      return {
        navMain: managerItems,
        tickets: ticketsItems,
        projects: projectsItems,
      };
    }

    // Operador (chat, tickets, depósitos)
    return {
      navMain: operatorItems,
      tickets: ticketsItems,
      projects: projectsItems,
    };
  }, [isSuperAdmin, isAdmin, isManager, isOperator]);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarContent>
        {filteredItems.navMain.length > 0 && (
          <NavMain items={filteredItems.navMain} blockTitle="General" />
        )}
        {filteredItems.tickets.length > 0 && (
          <NavMain items={filteredItems.tickets} blockTitle="Tickets" />
        )}
        {filteredItems.projects.length > 0 && (
          <NavMain items={filteredItems.projects} blockTitle="Monitoreos" />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData as { name: string; email: string }} />
      </SidebarFooter>
    </Sidebar>
  )
}