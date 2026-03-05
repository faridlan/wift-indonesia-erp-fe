import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Users, ShoppingCart, Package, CreditCard, User, LogOut, Home, UserCog, CalendarRange, BarChart, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

const baseNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { to: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { to: "/dashboard/reports", label: "Reports", icon: BarChart },
  { to: "/dashboard/profile", label: "Profile", icon: User },
];

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { signOut, role } = useAuth();
  const location = useLocation();

  const adminItems = [
    { to: "/dashboard/po-periods", label: "PO Periods", icon: CalendarRange },
  ];
  const superadminItems = [
    { to: "/dashboard/users", label: "Users", icon: UserCog },
  ];

  const navItems = [
    ...baseNavItems,
    ...(role === "admin" || role === "superadmin" ? adminItems : []),
    ...(role === "superadmin" ? superadminItems : []),
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex w-64 border-r bg-sidebar-background p-4 flex-col shrink-0",
        "h-full"
      )}>
        <h2 className="mb-6 text-lg font-bold tracking-wider text-sidebar-foreground">WIFT INDONESIA</h2>
        <nav className="flex-1 space-y-1 overflow-y-auto pr-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === item.to
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" onClick={signOut} className="justify-start gap-3 mt-4 shrink-0">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </aside>

      {/* Mobile header + drawer */}
      <div className="md:hidden fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-4 bg-background border-b p-3">
        <div className="flex items-center gap-3">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="ghost" className="p-2">
                <Menu className="h-5 w-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <h3 className="text-lg font-bold">WIFT INDONESIA</h3>
              </DrawerHeader>
              <nav className="flex flex-col gap-2 p-4">
                {navItems.map((item) => (
                  <DrawerClose asChild key={item.to}>
                    <Link to={item.to} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DrawerClose>
                ))}
              </nav>
              <DrawerFooter>
                <Button variant="ghost" onClick={signOut} className="justify-start gap-3">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" className="mt-2">Tutup</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
          <h2 className="text-lg font-bold tracking-wider text-sidebar-foreground">WIFT INDONESIA</h2>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 md:pt-6 pt-16 overflow-auto">{children}</main>
    </div>
  );
};

export default DashboardLayout;
