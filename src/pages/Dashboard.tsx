import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrders, useOrderCustomers } from "@/hooks/api/useOrders";
import { usePayments } from "@/hooks/api/usePayments";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";

const Dashboard = () => {
  const { user } = useAuth();
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: customers = [], isLoading: customersLoading } = useOrderCustomers();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();

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

  const statCards = [
    {
      title: "Total Pendapatan",
      value: `Rp ${totalRevenue.toLocaleString("id-ID")}`,
      icon: DollarSign,
      description: "Dari semua pembayaran",
    },
    {
      title: "Total Order",
      value: totalOrders,
      icon: ShoppingCart,
      description: `${completedOrders} selesai`,
    },
    {
      title: "Total Customer",
      value: totalCustomers,
      icon: Users,
      description: "Customer terdaftar",
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
        <p className="text-muted-foreground">Selamat datang, {user?.email}</p>
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

          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tren Penjualan (6 Bulan Terakhir)</CardTitle>
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
