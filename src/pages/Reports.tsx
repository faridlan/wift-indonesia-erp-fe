/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/api/useOrders";
import { useOrderItems } from "@/hooks/api/useOrderItems";
import { usePOPeriods } from "@/hooks/api/usePOPeriods";
import { useSalesProfiles } from "@/hooks/api/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown, ShoppingCart, Package, Banknote } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format, startOfMonth, startOfYear } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { generateReportPDF } from "@/lib/generate-report";

interface SalesRow {
  salesId: string;
  salesName: string;
  totalOrders: number;
  totalPcs: number;
  totalRevenue: number;
}

const Reports = () => {
  const { user, role } = useAuth();
  const { data: orders = [] } = useOrders();
  const { data: allOrderItems = [] } = useOrderItems();
  const { data: poPeriods = [] } = usePOPeriods();
  const { data: salesProfiles = [] } = useSalesProfiles(role);

  const isAdminOrSuperadmin = role === "admin" || role === "superadmin";
  const [tab, setTab] = useState("po");

  // Filters
  const [poFilter, setPOFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>(""); // yyyy-MM
  const [yearFilter, setYearFilter] = useState<string>(""); // yyyy

  // Build items map: order_id -> items[]
  const itemsByOrder = useMemo(() => {
    const map: Record<string, typeof allOrderItems> = {};
    for (const item of allOrderItems) {
      if (!item.order_id) continue;
      if (!map[item.order_id]) map[item.order_id] = [];
      map[item.order_id].push(item);
    }
    return map;
  }, [allOrderItems]);

  // Filter orders based on tab & filters
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (tab === "po") {
      if (poFilter !== "all") {
        filtered = filtered.filter((o) => o.po_period_id === poFilter);
      }
    } else if (tab === "month") {
      if (monthFilter) {
        filtered = filtered.filter((o) => {
          if (!o.created_at) return false;
          return format(new Date(o.created_at), "yyyy-MM") === monthFilter;
        });
      }
    } else if (tab === "year") {
      if (yearFilter) {
        filtered = filtered.filter((o) => {
          if (!o.created_at) return false;
          return format(new Date(o.created_at), "yyyy") === yearFilter;
        });
      }
    }

    // Sales role: only own orders
    if (!isAdminOrSuperadmin) {
      filtered = filtered.filter((o) => o.sales_id === user?.id);
    }

    return filtered;
  }, [orders, tab, poFilter, monthFilter, yearFilter, isAdminOrSuperadmin, user?.id]);

  // Build per-sales rows
  const salesRows = useMemo((): SalesRow[] => {
    const map: Record<string, SalesRow> = {};

    for (const o of filteredOrders) {
      if (!map[o.sales_id]) {
        const profile = salesProfiles.find((s) => s.id === o.sales_id);
        map[o.sales_id] = {
          salesId: o.sales_id,
          salesName: profile?.full_name || o.sales_id,
          totalOrders: 0,
          totalPcs: 0,
          totalRevenue: 0,
        };
      }
      const row = map[o.sales_id];
      row.totalOrders += 1;
      const items = itemsByOrder[o.id] || [];
      row.totalPcs += items.reduce((s, i) => s + i.quantity, 0);
      row.totalRevenue += o.total_price || 0;
    }

    // For non-admin, also show own row even if no profile in salesProfiles
    if (!isAdminOrSuperadmin && user?.id && !map[user.id]) {
      map[user.id] = {
        salesId: user.id,
        salesName: "Anda",
        totalOrders: 0,
        totalPcs: 0,
        totalRevenue: 0,
      };
    }

    return Object.values(map).sort((a, b) => b.totalPcs - a.totalPcs);
  }, [filteredOrders, itemsByOrder, salesProfiles, isAdminOrSuperadmin, user?.id]);

  // Totals
  const totalOrders = salesRows.reduce((s, r) => s + r.totalOrders, 0);
  const totalPcs = salesRows.reduce((s, r) => s + r.totalPcs, 0);
  const totalRevenue = salesRows.reduce((s, r) => s + r.totalRevenue, 0);

  // Available years for filter
  const availableYears = useMemo(() => {
    const yrs = new Set<string>();
    for (const o of orders) {
      if (o.created_at) yrs.add(format(new Date(o.created_at), "yyyy"));
    }
    return Array.from(yrs).sort().reverse();
  }, [orders]);

  // Available months for filter
  const availableMonths = useMemo(() => {
    const mos = new Set<string>();
    for (const o of orders) {
      if (o.created_at) mos.add(format(new Date(o.created_at), "yyyy-MM"));
    }
    return Array.from(mos).sort().reverse();
  }, [orders]);

  const getFilterLabel = () => {
    if (tab === "po") {
      if (poFilter === "all") return "Semua PO Period";
      const po = poPeriods.find((p) => p.id === poFilter);
      return po ? `${po.name} (${po.start_date} — ${po.end_date})` : "";
    }
    if (tab === "month") {
      if (!monthFilter) return "Semua Bulan";
      const d = new Date(monthFilter + "-01");
      return format(d, "MMMM yyyy", { locale: localeID });
    }
    if (tab === "year") {
      return yearFilter || "Semua Tahun";
    }
    return "";
  };

  const handleExportPDF = () => {
    const tabTitle = tab === "po" ? "Per PO Period" : tab === "month" ? "Per Bulan" : "Per Tahun";
    generateReportPDF({
      title: `Laporan ${tabTitle}`,
      subtitle: `Filter: ${getFilterLabel()}`,
      rows: salesRows.map((r, i) => ({
        label: r.salesName,
        totalOrders: r.totalOrders,
        totalPcs: r.totalPcs,
        totalRevenue: r.totalRevenue,
      })),
      salesName: undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Laporan</h1>
          <p className="text-muted-foreground">Ringkasan jumlah order, PCS, dan pendapatan per sales.</p>
        </div>
        <Button onClick={handleExportPDF} variant="outline">
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Order</p>
                <p className="text-2xl font-bold text-foreground">{totalOrders.toLocaleString("id-ID")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total PCS</p>
                <p className="text-2xl font-bold text-foreground">{totalPcs.toLocaleString("id-ID")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                <p className="text-2xl font-bold text-foreground">Rp {totalRevenue.toLocaleString("id-ID")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v); }}>
        <TabsList>
          <TabsTrigger value="po">Per PO</TabsTrigger>
          <TabsTrigger value="month">Per Bulan</TabsTrigger>
          <TabsTrigger value="year">Per Tahun</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {tab === "po" && (
            <>
              <span className="text-sm font-medium text-muted-foreground">Filter PO:</span>
              <Select value={poFilter} onValueChange={setPOFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Semua PO" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua PO Period</SelectItem>
                  {[...poPeriods].sort((a, b) => b.start_date.localeCompare(a.start_date)).map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.name} ({po.start_date} — {po.end_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {tab === "month" && (
            <>
              <span className="text-sm font-medium text-muted-foreground">Filter Bulan:</span>
              <Select value={monthFilter || "all"} onValueChange={(v) => setMonthFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Semua Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {availableMonths.map((m) => (
                    <SelectItem key={m} value={m}>
                      {format(new Date(m + "-01"), "MMMM yyyy", { locale: localeID })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {tab === "year" && (
            <>
              <span className="text-sm font-medium text-muted-foreground">Filter Tahun:</span>
              <Select value={yearFilter || "all"} onValueChange={(v) => setYearFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Semua Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <TabsContent value={tab} className="space-y-4 mt-4">
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Grafik per Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesRows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="salesName" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" tickFormatter={(v) => v.toLocaleString("id-ID")} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(0)}jt`} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "totalRevenue") return [`Rp ${value.toLocaleString("id-ID")}`, "Pendapatan"];
                        if (name === "totalPcs") return [value.toLocaleString("id-ID"), "PCS"];
                        return [value, "Order"];
                      }}
                    />
                    <Legend formatter={(v) => v === "totalOrders" ? "Jumlah Order" : v === "totalPcs" ? "Total PCS" : "Pendapatan"} />
                    <Bar yAxisId="left" dataKey="totalOrders" fill="hsl(var(--primary))" name="totalOrders" />
                    <Bar yAxisId="left" dataKey="totalPcs" fill="hsl(var(--accent-foreground))" name="totalPcs" />
                    <Bar yAxisId="right" dataKey="totalRevenue" fill="hsl(var(--muted-foreground))" name="totalRevenue" opacity={0.5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Table per Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan per Sales — {getFilterLabel()}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">No</TableHead>
                    <TableHead>Nama Sales</TableHead>
                    <TableHead className="text-right">Jumlah Order</TableHead>
                    <TableHead className="text-right">Total PCS</TableHead>
                    <TableHead className="text-right">Total Pendapatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Belum ada data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {salesRows.map((r, i) => (
                        <TableRow key={r.salesId}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">{r.salesName}</TableCell>
                          <TableCell className="text-right">{r.totalOrders}</TableCell>
                          <TableCell className="text-right">{r.totalPcs.toLocaleString("id-ID")} pcs</TableCell>
                          <TableCell className="text-right">Rp {r.totalRevenue.toLocaleString("id-ID")}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell></TableCell>
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">{totalOrders}</TableCell>
                        <TableCell className="text-right">{totalPcs.toLocaleString("id-ID")} pcs</TableCell>
                        <TableCell className="text-right">Rp {totalRevenue.toLocaleString("id-ID")}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
