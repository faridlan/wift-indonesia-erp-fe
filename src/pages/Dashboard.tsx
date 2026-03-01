import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrders, useOrderCustomers } from "@/hooks/api/useOrders";
import { usePayments } from "@/hooks/api/usePayments";
import { useSalesProfiles } from "@/hooks/api/useProfile";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Dashboard = () => {
  const { user, role } = useAuth();
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: customers = [], isLoading: customersLoading } = useOrderCustomers();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: salesProfiles = [] } = useSalesProfiles(role);

  const isAdminOrSuperadmin = role === "admin" || role === "superadmin";

  const isLoading = ordersLoading || customersLoading || paymentsLoading;

  const totalRevenue = useMemo(() => {
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const totalOrders = orders.length;
  const totalCustomers = customers.length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;

  // Monthly sales data for the last 6 months
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const monthOrders = orders.filter((o) => {
        if (!o.created_at) return false;
        const orderDate = new Date(o.created_at);
        return isWithinInterval(orderDate, { start, end });
      });

      const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);

      months.push({
        name: format(date, "MMM yy", { locale: localeId }),
        pendapatan: monthRevenue,
        orders: monthOrders.length,
      });
    }
    return months;
  }, [orders]);

  // Per-sales summary (admin/superadmin only)
  const perSalesSummary = useMemo(() => {
    if (!isAdminOrSuperadmin) return [];
    return salesProfiles.map((sales) => {
      const salesOrders = orders.filter((o) => o.sales_id === sales.id);
      const salesCustomers = customers.filter((c) => c.sales_id === sales.id);
      const salesOrderIds = new Set(salesOrders.map((o) => o.id));
      const salesRevenue = payments
        .filter((p) => salesOrderIds.has(p.order_id))
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const completed = salesOrders.filter((o) => o.status === "completed").length;
      return {
        id: sales.id,
        name: sales.full_name || sales.id,
        orders: salesOrders.length,
        customers: salesCustomers.length,
        revenue: salesRevenue,
        completed,
      };
    });
  }, [isAdminOrSuperadmin, salesProfiles, orders, customers, payments]);

  const statCards = [
    {
      title: "Total Pendapatan",
      value: `Rp ${totalRevenue.toLocaleString("id-ID")}`,
      icon: DollarSign,
      description: isAdminOrSuperadmin ? "Dari semua pembayaran (semua sales)" : "Dari semua pembayaran",
    },
    {
      title: "Total Order",
      value: totalOrders,
      icon: ShoppingCart,
      description: isAdminOrSuperadmin ? `${completedOrders} selesai (semua sales)` : `${completedOrders} selesai`,
    },
    {
      title: "Total Customer",
      value: totalCustomers,
      icon: Users,
      description: isAdminOrSuperadmin ? "Customer terdaftar (semua sales)" : "Customer terdaftar",
    },
    {
      title: "Tingkat Selesai",
      value: totalOrders > 0 ? `${Math.round((completedOrders / totalOrders) * 100)}%` : "0%",
      icon: TrendingUp,
      description: "Order selesai",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang, {user?.email}
          {isAdminOrSuperadmin && " (Admin)"}
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Per-sales summary (admin/superadmin only) */}
          {isAdminOrSuperadmin && perSalesSummary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ringkasan per Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sales</TableHead>
                      <TableHead className="text-right">Order</TableHead>
                      <TableHead className="text-right">Selesai</TableHead>
                      <TableHead className="text-right">Customer</TableHead>
                      <TableHead className="text-right">Pendapatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perSalesSummary.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right">{row.orders}</TableCell>
                        <TableCell className="text-right">{row.completed}</TableCell>
                        <TableCell className="text-right">{row.customers}</TableCell>
                        <TableCell className="text-right">Rp {row.revenue.toLocaleString("id-ID")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Tren Penjualan (6 Bulan Terakhir){isAdminOrSuperadmin ? " — Semua Sales" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, "Pendapatan"]}
                    />
                    <Bar dataKey="pendapatan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
