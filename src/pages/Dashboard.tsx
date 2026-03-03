import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrders, useOrderCustomers } from "@/hooks/api/useOrders";
import { usePayments } from "@/hooks/api/usePayments";
import { useSalesProfiles } from "@/hooks/api/useProfile";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo, useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfYear, endOfYear } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrderItems } from "@/hooks/api/useOrderItems";

const Dashboard = () => {
  const { user, role } = useAuth();
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: customers = [], isLoading: customersLoading } = useOrderCustomers();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: salesProfiles = [] } = useSalesProfiles(role);
  const { data: allOrderItems = [] } = useOrderItems();

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
      const pcs = allOrderItems
        .filter((it) => salesOrderIds.has(it.order_id))
        .reduce((sum, it) => sum + (it.quantity || 0), 0);
      const completed = salesOrders.filter((o) => o.status === "completed").length;
      return {
        id: sales.id,
        name: sales.full_name || sales.id,
        orders: salesOrders.length,
        customers: salesCustomers.length,
        revenue: salesRevenue,
        pcs,
        completed,
      };
    });
  }, [isAdminOrSuperadmin, salesProfiles, orders, customers, payments]);

  // Ranking per sales per month/year
  const [rankingMode, setRankingMode] = useState<"month" | "year">("month");
  const currentMonth = format(new Date(), "yyyy-MM");
  const currentYear = format(new Date(), "yyyy");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    orders.forEach((o) => {
      if (!o.created_at) return;
      const key = format(new Date(o.created_at), "yyyy-MM");
      months.add(key);
    });
    return Array.from(months).sort();
  }, [orders]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    orders.forEach((o) => {
      if (!o.created_at) return;
      const key = format(new Date(o.created_at), "yyyy");
      years.add(key);
    });
    return Array.from(years).sort();
  }, [orders]);

  const salesRanking = useMemo(() => {
    if (!isAdminOrSuperadmin) return [];

    // determine period range
    let start: Date | null = null;
    let end: Date | null = null;
    if (rankingMode === "month") {
      try {
        const [y, m] = selectedMonth.split("-").map(Number);
        start = startOfMonth(new Date(y, m - 1, 1));
        end = endOfMonth(new Date(y, m - 1, 1));
      } catch {
        start = null;
        end = null;
      }
    } else {
      try {
        const y = Number(selectedYear);
        start = startOfYear(new Date(y, 0, 1));
        end = endOfYear(new Date(y, 0, 1));
      } catch {
        start = null;
        end = null;
      }
    }

    const orderIdToSales = new Map<string, string | null>();
    orders.forEach((o) => orderIdToSales.set(o.id, o.sales_id || null));

    // filter order items by period
    const itemsInPeriod = allOrderItems.filter((it) => {
      const ord = orders.find((o) => o.id === it.order_id);
      if (!ord || !ord.created_at) return false;
      const d = new Date(ord.created_at);
      if (!start || !end) return false;
      return isWithinInterval(d, { start, end });
    });

    const perSalesMap: Record<string, { pcs: number; orders: Set<string>; revenue: number }> = {};
    for (const it of itemsInPeriod) {
      const salesId = orderIdToSales.get(it.order_id) || "unknown";
      if (!perSalesMap[salesId]) perSalesMap[salesId] = { pcs: 0, orders: new Set(), revenue: 0 };
      perSalesMap[salesId].pcs += it.quantity || 0;
      perSalesMap[salesId].orders.add(it.order_id);
    }

    // revenue per sales in period
    payments.forEach((p) => {
      const ord = orders.find((o) => o.id === p.order_id);
      if (!ord || !ord.created_at) return;
      const d = new Date(ord.created_at);
      if (!start || !end) return;
      if (!isWithinInterval(d, { start, end })) return;
      const salesId = ord.sales_id || "unknown";
      if (!perSalesMap[salesId]) perSalesMap[salesId] = { pcs: 0, orders: new Set(), revenue: 0 };
      perSalesMap[salesId].revenue += p.amount || 0;
    });

    const rows = Object.entries(perSalesMap).map(([salesId, v]) => {
      const profile = salesProfiles.find((s) => s.id === salesId);
      return {
        id: salesId,
        name: profile?.full_name || salesId,
        pcs: v.pcs,
        orders: v.orders.size,
        revenue: v.revenue,
      };
    }).sort((a, b) => b.pcs - a.pcs);

    return rows;
  }, [isAdminOrSuperadmin, orders, allOrderItems, payments, salesProfiles, rankingMode, selectedMonth, selectedYear]);

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
                      <TableHead className="text-right">PCS</TableHead>
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
                        <TableCell className="text-right">{row.pcs}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Sales ranking per month/year */}
          {isAdminOrSuperadmin && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-lg">Peringkat Sales</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">Mode:</div>
                  <div className="flex items-center gap-1">
                    <button
                      className={`px-2 py-1 rounded ${rankingMode === "month" ? "bg-primary text-primary-foreground" : "bg-muted/10"}`}
                      onClick={() => setRankingMode("month")}
                    >
                      Bulan
                    </button>
                    <button
                      className={`px-2 py-1 rounded ${rankingMode === "year" ? "bg-primary text-primary-foreground" : "bg-muted/10"}`}
                      onClick={() => setRankingMode("year")}
                    >
                      Tahun
                    </button>
                  </div>

                  {rankingMode === "month" ? (
                    <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={m} value={m}>{format(new Date(m + "-01"), "MMM yyyy")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={selectedYear} onValueChange={(v) => setSelectedYear(v)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead className="text-right">PCS</TableHead>
                        <TableHead className="text-right">Order</TableHead>
                        <TableHead className="text-right">Pendapatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesRanking.map((s, idx) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">#{idx + 1}</TableCell>
                          <TableCell>{s.name}</TableCell>
                          <TableCell className="text-right">{s.pcs}</TableCell>
                          <TableCell className="text-right">{s.orders}</TableCell>
                          <TableCell className="text-right">Rp {s.revenue.toLocaleString("id-ID")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
