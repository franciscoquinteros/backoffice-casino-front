"use client"

import * as React from "react"
import { useMemo } from "react"
import {
  LampDesk,
  Landmark,
  MessagesSquare,
  PieChart,
  Ticket,
  Users,
  LucideIcon,
  ArrowRightLeft
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { useAuth, User } from "@/hooks/useAuth"

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
  },
  {
    title: "Usuarios",
    url: "/dashboard/users",
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
    title: "Usuarios Externos",
    url: "/dashboard/external-users",
    icon: Users,
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
    title: "Depósitos y Retiros",
    url: "/dashboard/transactions",
    icon: ArrowRightLeft,
    items: [
      {
        title: "Depósitos Pendientes",
        url: "/dashboard/transactions/deposit-pending",
      },
      {
        title: "Depósitos Directos",
        url: "/dashboard/transactions/deposit-direct",
      },
      {
        title: "Depósitos Completados",
        url: "/dashboard/transactions/deposit-completed",
      },
      {
        title: "Retiros Pendientes",
        url: "/dashboard/transactions/withdrawals-pending",
      },
      {
        title: "Retiros Completados",
        url: "/dashboard/transactions/withdrawals-completed",
      }
    ]
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, isSuperAdmin, isAdmin, isManager } = useAuth();

  const userData = useMemo(() => ({
    name: user?.name,
    email: user?.email
  }), [user?.name, user?.email]);

  const filteredItems = useMemo(() => {
    // Super Admin - Acceso a todo
    if (isSuperAdmin) {
      return {
        navMain: superAdminItems,
        tickets: ticketsItems,
        projects: projectsItems,
      };
    }

    // Admin - Acceso a todo excepto configuración de oficinas
    if (isAdmin) {
      return {
        navMain: adminItems,
        tickets: ticketsItems,
        projects: projectsItems,
      };
    }

    // Encargado - Todo menos reportes
    if (isManager) {
      return {
        navMain: managerItems,
        tickets: ticketsItems,
        projects: projectsItems,
      };
    }

    // Operador - Acceso limitado
    return {
      navMain: operatorItems,
      tickets: ticketsItems,
      projects: projectsItems.filter(item => {
        if (item.title === "Depósitos y Retiros") {
          return {
            ...item,
            items: item.items?.filter(subItem =>
              subItem.title.includes('Depósitos')
            )
          };
        }
        return false;
      }),
    };
  }, [isSuperAdmin, isAdmin, isManager]);

  // Filtrar los items de proyectos basado en el estado de withdrawal del usuario
  const filteredProjectsItems = useMemo(() => {
    // Si es admin o superadmin, mostrar todo
    if (isAdmin || isSuperAdmin) return projectsItems;

    // Si es encargado, mostrar todo
    if (isManager) return projectsItems;

    // Si es operador, solo mostrar depósitos
    const baseItems = [...projectsItems];
    const transactionsItem = baseItems.find(item => item.title === "Depósitos y Retiros");

    if (transactionsItem && transactionsItem.items) {
      transactionsItem.items = transactionsItem.items.filter(item =>
        item.title.includes('Depósitos')
      );
    }

    return baseItems;
  }, [isAdmin, isSuperAdmin, isManager]);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarContent>
        {filteredItems.navMain.length > 0 && (
          <NavMain items={filteredItems.navMain} blockTitle="General" />
        )}
        {filteredItems.tickets.length > 0 && (
          <NavMain items={filteredItems.tickets} blockTitle="Tickets" />
        )}
        {filteredProjectsItems.length > 0 && (
          <NavMain items={filteredProjectsItems} blockTitle="Monitoreos" />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData as { name: string; email: string }} />
      </SidebarFooter>
    </Sidebar>
  )
}