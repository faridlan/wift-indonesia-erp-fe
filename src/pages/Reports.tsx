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
import { Badge } from "@/components/ui/badge";
import { FileDown, ShoppingCart, Package, Banknote } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format, startOfMonth, startOfYear } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { generateReportPDF } from "@/lib/generate-report";

interface ReportRow {
  label: string;
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
  const [salesFilter, setSalesFilter] = useState<string>("all");
  const [tab, setTab] = useState("po");

  // Filter orders by role & sales filter
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (!isAdminOrSuperadmin) {
      filtered = filtered.filter((o) => o.sales_id === user?.id);
    } else if (salesFilter !== "all") {
      filtered = filtered.filter((o) => o.sales_id === salesFilter);
    }
    return filtered;
  }, [orders, isAdminOrSuperadmin, salesFilter, user?.id]);

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

  // === Per PO ===
  const poRows = useMemo((): ReportRow[] => {
    const sorted = [...poPeriods].sort((a, b) => b.start_date.localeCompare(a.start_date));
    return sorted.map((po) => {
      const poOrders = filteredOrders.filter((o) => o.po_period_id === po.id);
      let totalPcs = 0;
      let totalRevenue = 0;
      for (const o of poOrders) {
        const items = itemsByOrder[o.id] || [];
        totalPcs += items.reduce((s, i) => s + i.quantity, 0);
        totalRevenue += o.total_price || 0;
      }
      return {
        label: `${po.name} (${po.start_date} — ${po.end_date})`,
        totalOrders: poOrders.length,
        totalPcs,
        totalRevenue,
      };
    });
  }, [poPeriods, filteredOrders, itemsByOrder]);

  // === Per Bulan (last 12 months) ===
  const monthRows = useMemo((): ReportRow[] => {
    const months: ReportRow[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(startOfMonth(d), "yyyy-MM");
      const label = format(d, "MMMM yyyy", { locale: localeID });
      const monthOrders = filteredOrders.filter((o) => {
        if (!o.created_at) return false;
        return format(new Date(o.created_at), "yyyy-MM") === key;
      });
      let totalPcs = 0;
      let totalRevenue = 0;
      for (const o of monthOrders) {
        const items = itemsByOrder[o.id] || [];
        totalPcs += items.reduce((s, i) => s + i.quantity, 0);
        totalRevenue += o.total_price || 0;
      }
      months.push({ label, totalOrders: monthOrders.length, totalPcs, totalRevenue });
    }
    return months;
  }, [filteredOrders, itemsByOrder]);

  // === Per Tahun (last 5 years) ===
  const yearRows = useMemo((): ReportRow[] => {
    const years: ReportRow[] = [];
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const yr = now.getFullYear() - i;
      const key = String(yr);
      const label = key;
      const yrOrders = filteredOrders.filter((o) => {
        if (!o.created_at) return false;
        return format(startOfYear(new Date(o.created_at)), "yyyy") === key;
      });
      let totalPcs = 0;
      let totalRevenue = 0;
      for (const o of yrOrders) {
        const items = itemsByOrder[o.id] || [];
        totalPcs += items.reduce((s, i) => s + i.quantity, 0);
        totalRevenue += o.total_price || 0;
      }
      years.push({ label, totalOrders: yrOrders.length, totalPcs, totalRevenue });
    }
    return years;
  }, [filteredOrders, itemsByOrder]);

  const currentRows = tab === "po" ? poRows : tab === "month" ? monthRows : yearRows;

  // Totals
  const totalOrders = currentRows.reduce((s, r) => s + r.totalOrders, 0);
  const totalPcs = currentRows.reduce((s, r) => s + r.totalPcs, 0);
  const totalRevenue = currentRows.reduce((s, r) => s + r.totalRevenue, 0);

  const tabTitle = tab === "po" ? "Per PO Period" : tab === "month" ? "Per Bulan" : "Per Tahun";
  const salesName = isAdminOrSuperadmin && salesFilter !== "all"
    ? salesProfiles.find((s) => s.id === salesFilter)?.full_name || ""
    : isAdminOrSuperadmin ? "Semua Sales" : undefined;

  const handleExportPDF = () => {
    generateReportPDF({
      title: `Laporan ${tabTitle}`,
      subtitle: `Data ${tab === "po" ? "per PO Period" : tab === "month" ? "12 bulan terakhir" : "5 tahun terakhir"}`,
      rows: currentRows,
      salesName: salesName || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Laporan</h1>
          <p className="text-muted-foreground">Ringkasan jumlah order, PCS, dan pendapatan.</p>
        </div>
        <Button onClick={handleExportPDF} variant="outline">
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Sales filter for admin/superadmin */}
      {isAdminOrSuperadmin && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Filter Sales:</span>
          <Select value={salesFilter} onValueChange={setSalesFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Semua Sales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Sales</SelectItem>
              {salesProfiles.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.full_name || s.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="po">Per PO</TabsTrigger>
          <TabsTrigger value="month">Per Bulan</TabsTrigger>
          <TabsTrigger value="year">Per Tahun</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-4 mt-4">
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Grafik {tabTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentRows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={tab === "po" ? -20 : 0} textAnchor={tab === "po" ? "end" : "middle"} height={tab === "po" ? 80 : 40} />
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

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan {tabTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Jumlah Order</TableHead>
                    <TableHead className="text-right">Total PCS</TableHead>
                    <TableHead className="text-right">Total Pendapatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Belum ada data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {currentRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{r.label}</TableCell>
                          <TableCell className="text-right">{r.totalOrders}</TableCell>
                          <TableCell className="text-right">{r.totalPcs.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right">Rp {r.totalRevenue.toLocaleString("id-ID")}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">{totalOrders}</TableCell>
                        <TableCell className="text-right">{totalPcs.toLocaleString("id-ID")}</TableCell>
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
