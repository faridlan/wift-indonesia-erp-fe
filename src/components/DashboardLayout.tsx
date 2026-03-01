import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Users, ShoppingCart, Package, CreditCard, User, LogOut, Home, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { to: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { to: "/dashboard/profile", label: "Profile", icon: User },
];

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { signOut, role } = useAuth();
  const location = useLocation();

  const navItems =
    role === "superadmin"
      ? [...baseNavItems, { to: "/dashboard/users", label: "Users", icon: UserCog }]
      : baseNavItems;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-sidebar-background p-4 flex flex-col">
        <h2 className="mb-6 text-lg font-bold tracking-wider text-sidebar-foreground">WIFT INDONESIA</h2>
        <nav className="flex-1 space-y-1">
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
        <Button variant="ghost" onClick={signOut} className="justify-start gap-3 mt-4">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
};

export default DashboardLayout;
