import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Users, ShoppingCart, Package, CreditCard, User, LogOut, Home,
  UserCog, CalendarRange, BarChart, Menu, Tags, Target,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { to: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { to: "/dashboard/leads", label: "Leads", icon: Target },
  { to: "/dashboard/reports", label: "Reports", icon: BarChart },
  { to: "/dashboard/profile", label: "Profile", icon: User },
];

const adminItems = [
  { to: "/dashboard/po-periods", label: "PO Periods", icon: CalendarRange },
  { to: "/dashboard/products", label: "Products", icon: Package },
  { to: "/dashboard/categories", label: "Categories", icon: Tags },
];

const superadminItems = [
  { to: "/dashboard/users", label: "Users", icon: UserCog },
];

function AppSidebar() {
  const { signOut, role } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const navItems = [
    ...baseNavItems,
    ...(role === "admin" || role === "superadmin" ? adminItems : []),
    ...(role === "superadmin" ? superadminItems : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <h2 className="text-lg font-bold tracking-wider text-sidebar-foreground">
            WIFT INDONESIA
          </h2>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup defaultOpen>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.to}
                    tooltip={item.label}
                  >
                    <Link to={item.to}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Logout">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b bg-background px-4 shrink-0">
            <SidebarTrigger />
            <span className="ml-3 text-sm font-bold tracking-wider text-foreground md:hidden">
              WIFT INDONESIA
            </span>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
