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
import { FileDown, ShoppingCart, Package, Banknote } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format } from "date-fns";
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

  const [poFilter, setPOFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("");

  const itemsByOrder = useMemo(() => {
    const map: Record<string, typeof allOrderItems> = {};
    for (const item of allOrderItems) {
      if (!item.order_id) continue;
      if (!map[item.order_id]) map[item.order_id] = [];
      map[item.order_id].push(item);
    }
    return map;
  }, [allOrderItems]);

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

    if (!isAdminOrSuperadmin) {
      filtered = filtered.filter((o) => o.sales_id === user?.id);
    }

    return filtered;
  }, [orders, tab, poFilter, monthFilter, yearFilter, isAdminOrSuperadmin, user?.id]);

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

  const totalOrders = salesRows.reduce((s, r) => s + r.totalOrders, 0);
  const totalPcs = salesRows.reduce((s, r) => s + r.totalPcs, 0);
  const totalRevenue = salesRows.reduce((s, r) => s + r.totalRevenue, 0);

  const availableYears = useMemo(() => {
    const yrs = new Set<string>();
    for (const o of orders) {
      if (o.created_at) yrs.add(format(new Date(o.created_at), "yyyy"));
    }
    return Array.from(yrs).sort().reverse();
  }, [orders]);

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
      rows: salesRows.map((r) => ({
        label: r.salesName,
        totalOrders: r.totalOrders,
        totalPcs: r.totalPcs,
        totalRevenue: r.totalRevenue,
      })),
      salesName: undefined,
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Laporan</h1>
          <p className="text-sm text-muted-foreground">Ringkasan order, PCS & pendapatan per sales.</p>
        </div>
        <Button onClick={handleExportPDF} variant="outline" size="sm" className="self-start sm:self-auto">
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card>
          <CardContent className="p-3 md:pt-6 md:p-6">
            <div className="flex flex-col items-center gap-1 md:flex-row md:gap-3">
              <div className="rounded-lg bg-primary/10 p-2 md:p-3">
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] md:text-sm text-muted-foreground">Order</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">{totalOrders.toLocaleString("id-ID")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:pt-6 md:p-6">
            <div className="flex flex-col items-center gap-1 md:flex-row md:gap-3">
              <div className="rounded-lg bg-primary/10 p-2 md:p-3">
                <Package className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] md:text-sm text-muted-foreground">PCS</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">{totalPcs.toLocaleString("id-ID")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:pt-6 md:p-6">
            <div className="flex flex-col items-center gap-1 md:flex-row md:gap-3">
              <div className="rounded-lg bg-primary/10 p-2 md:p-3">
                <Banknote className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] md:text-sm text-muted-foreground">Pendapatan</p>
                <p className="text-base md:text-2xl font-bold text-foreground leading-tight">
                  <span className="hidden sm:inline">Rp </span>{totalRevenue.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="po" className="flex-1 sm:flex-none text-xs sm:text-sm">Per PO</TabsTrigger>
            <TabsTrigger value="month" className="flex-1 sm:flex-none text-xs sm:text-sm">Per Bulan</TabsTrigger>
            <TabsTrigger value="year" className="flex-1 sm:flex-none text-xs sm:text-sm">Per Tahun</TabsTrigger>
          </TabsList>

          {/* Filter inline */}
          <div className="w-full sm:w-auto">
            {tab === "po" && (
              <Select value={poFilter} onValueChange={setPOFilter}>
                <SelectTrigger className="w-full sm:w-64 text-xs sm:text-sm">
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
            )}

            {tab === "month" && (
              <Select value={monthFilter || "all"} onValueChange={(v) => setMonthFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-56 text-xs sm:text-sm">
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
            )}

            {tab === "year" && (
              <Select value={yearFilter || "all"} onValueChange={(v) => setYearFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-40 text-xs sm:text-sm">
                  <SelectValue placeholder="Semua Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <TabsContent value={tab} className="space-y-4 mt-4">
          {/* Chart - hidden on very small screens */}
          <Card className="hidden sm:block">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm md:text-base">Grafik per Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] md:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesRows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="salesName" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis yAxisId="left" tickFormatter={(v) => v.toLocaleString("id-ID")} tick={{ fontSize: 10 }} width={40} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 10 }} width={45} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "totalRevenue") return [`Rp ${value.toLocaleString("id-ID")}`, "Pendapatan"];
                        if (name === "totalPcs") return [value.toLocaleString("id-ID"), "PCS"];
                        return [value, "Order"];
                      }}
                    />
                    <Legend formatter={(v) => v === "totalOrders" ? "Order" : v === "totalPcs" ? "PCS" : "Pendapatan"} wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="totalOrders" fill="hsl(var(--primary))" name="totalOrders" />
                    <Bar yAxisId="left" dataKey="totalPcs" fill="hsl(var(--accent-foreground))" name="totalPcs" />
                    <Bar yAxisId="right" dataKey="totalRevenue" fill="hsl(var(--muted-foreground))" name="totalRevenue" opacity={0.5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Table - mobile-optimized with horizontal scroll */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm md:text-base">
                Ringkasan per Sales — {getFilterLabel()}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 md:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[50px] text-xs uppercase font-bold text-center">No</TableHead>
                      {role !== "sales" && (
                        <TableHead className="text-xs uppercase font-bold min-w-[120px]">Sales</TableHead>
                      )}
                      <TableHead className="text-right text-xs uppercase font-bold">Order</TableHead>
                      <TableHead className="text-right text-xs uppercase font-bold">PCS</TableHead>
                      <TableHead className="text-right text-xs uppercase font-bold min-w-[120px]">Pendapatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={role !== "sales" ? 5 : 4}
                          className="text-center text-muted-foreground py-10 text-sm"
                        >
                          Belum ada data transaksi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {salesRows.map((r, i) => (
                          <TableRow key={r.salesId} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="text-center text-xs text-muted-foreground">{i + 1}</TableCell>
                            {role !== "sales" && (
                              <TableCell className="font-semibold text-xs tracking-tight">
                                {r.salesName}
                              </TableCell>
                            )}
                            <TableCell className="text-right text-xs font-mono">{r.totalOrders}</TableCell>
                            <TableCell className="text-right text-xs font-mono">{r.totalPcs.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-right text-xs font-mono font-medium whitespace-nowrap">
                              Rp {r.totalRevenue.toLocaleString("id-ID")}
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Footer Total */}
                        <TableRow className="bg-primary/5 font-bold border-t-2">
                          {/* Gabungkan kolom No dan Sales untuk label TOTAL jika bukan role sales */}
                          <TableCell colSpan={role !== "sales" ? 2 : 1} className="text-xs text-center py-3">
                            TOTAL
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">{totalOrders}</TableCell>
                          <TableCell className="text-right text-xs font-mono text-primary">
                            {totalPcs.toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-primary whitespace-nowrap text-base">
                            Rp {totalRevenue.toLocaleString("id-ID")}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
