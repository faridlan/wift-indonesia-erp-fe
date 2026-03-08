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
import { FileDown, ShoppingCart, Package, Banknote, AlertCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { generateReportPDF } from "@/lib/generate-report";
import { compactRupiah } from "@/lib/utils";

const formatRp = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

/** Take first 2 words of a name */
const shortName = (name: string) => name.split(/\s+/).slice(0, 2).join(" ");

interface SalesRow {
  salesId: string;
  salesName: string;
  totalOrders: number;
  totalPcs: number;
  totalRevenue: number;
  sisaTagihan: number;
  pcsWift: number;
  pcsLuar: number;
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
          sisaTagihan: 0,
          pcsWift: 0,
          pcsLuar: 0,
        };
      }
      const row = map[o.sales_id];
      row.totalOrders += 1;
      const items = itemsByOrder[o.id] || [];
      for (const it of items) {
        row.totalPcs += it.quantity;
        if (it.work_type === "luar") {
          row.pcsLuar += it.quantity;
        } else {
          row.pcsWift += it.quantity;
        }
      }
      row.totalRevenue += o.total_price || 0;
      row.sisaTagihan += (o.total_price || 0) - (o.amount_paid || 0);
    }

    if (!isAdminOrSuperadmin && user?.id && !map[user.id]) {
      map[user.id] = {
        salesId: user.id,
        salesName: "Anda",
        totalOrders: 0,
        totalPcs: 0,
        totalRevenue: 0,
        sisaTagihan: 0,
        pcsWift: 0,
        pcsLuar: 0,
      };
    }

    return Object.values(map).sort((a, b) => b.totalPcs - a.totalPcs);
  }, [filteredOrders, itemsByOrder, salesProfiles, isAdminOrSuperadmin, user?.id]);

  const totalOrders = salesRows.reduce((s, r) => s + r.totalOrders, 0);
  const totalPcs = salesRows.reduce((s, r) => s + r.totalPcs, 0);
  const totalRevenue = salesRows.reduce((s, r) => s + r.totalRevenue, 0);
  const totalSisaTagihan = salesRows.reduce((s, r) => s + r.sisaTagihan, 0);
  const totalPcsWift = salesRows.reduce((s, r) => s + r.pcsWift, 0);
  const totalPcsLuar = salesRows.reduce((s, r) => s + r.pcsLuar, 0);

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

  const trendData = useMemo(() => {
    const months = [];
    const relevantOrders = isAdminOrSuperadmin ? orders : orders.filter((o) => o.sales_id === user?.id);
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthOrders = relevantOrders.filter((o) => {
        if (!o.created_at) return false;
        return isWithinInterval(new Date(o.created_at), { start, end });
      });
      const revenue = monthOrders.reduce((s, o) => s + (o.total_price || 0), 0);
      const orderIds = new Set(monthOrders.map((o) => o.id));
      const pcs = allOrderItems
        .filter((it) => it.order_id && orderIds.has(it.order_id))
        .reduce((s, it) => s + (it.quantity || 0), 0);

      months.push({
        name: format(date, "MMM yy", { locale: localeID }),
        pendapatan: revenue,
        order: monthOrders.length,
        pcs,
      });
    }
    return months;
  }, [orders, allOrderItems, isAdminOrSuperadmin, user?.id]);

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
    if (tab === "year") return yearFilter || "Semua Tahun";
    return "Semua Waktu";
  };

  /** Build a descriptive PDF title */
  const getPDFTitle = () => {
    if (tab === "po") {
      if (poFilter !== "all") {
        const po = poPeriods.find((p) => p.id === poFilter);
        if (po) {
          const startFmt = format(new Date(po.start_date), "d MMM yyyy", { locale: localeID });
          const endFmt = format(new Date(po.end_date), "d MMM yyyy", { locale: localeID });
          return `Laporan ${po.name} ${startFmt} - ${endFmt}`;
        }
      }
      return "Laporan Per PO Period";
    }
    if (tab === "month") {
      if (monthFilter) {
        const d = new Date(monthFilter + "-01");
        return `Laporan ${format(d, "MMMM yyyy", { locale: localeID })}`;
      }
      return "Laporan Per Bulan";
    }
    if (tab === "year") {
      return yearFilter ? `Laporan Tahun ${yearFilter}` : "Laporan Per Tahun";
    }
    return "Laporan All Time";
  };

  const handleExportPDF = () => {
    generateReportPDF({
      title: getPDFTitle(),
      subtitle: `Filter: ${getFilterLabel()}`,
      rows: salesRows.map((r) => ({
        label: shortName(r.salesName),
        totalOrders: r.totalOrders,
        totalPcs: r.totalPcs,
        totalRevenue: r.totalRevenue,
        sisaTagihan: r.sisaTagihan,
        pcsWift: r.pcsWift,
        pcsLuar: r.pcsLuar,
      })),
      salesName: undefined,
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Laporan Detail</h1>
          <p className="text-sm text-muted-foreground">Ringkasan order, PCS & pendapatan per sales.</p>
        </div>
        <Button onClick={handleExportPDF} variant="outline" size="sm" className="self-start sm:self-auto">
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card>
          <CardContent className="p-3 md:pt-6 md:p-6">
            <div className="flex flex-col items-center gap-1 md:flex-row md:gap-3">
              <div className="rounded-lg bg-primary/10 p-2"><ShoppingCart className="h-4 w-4 text-primary" /></div>
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
              <div className="rounded-lg bg-primary/10 p-2"><Package className="h-4 w-4 text-primary" /></div>
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
              <div className="rounded-lg bg-primary/10 p-2"><Banknote className="h-4 w-4 text-primary" /></div>
              <div className="text-center md:text-left min-w-0">
                <p className="text-[10px] md:text-sm text-muted-foreground">Omzet</p>
                <p className="text-sm md:text-2xl font-bold text-foreground leading-tight">
                  <span className="md:hidden">{compactRupiah(totalRevenue)}</span>
                  <span className="hidden md:inline">{formatRp(totalRevenue)}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:pt-6 md:p-6">
            <div className="flex flex-col items-center gap-1 md:flex-row md:gap-3">
              <div className="rounded-lg bg-destructive/10 p-2"><AlertCircle className="h-4 w-4 text-destructive" /></div>
              <div className="text-center md:text-left min-w-0">
                <p className="text-[10px] md:text-sm text-muted-foreground">Sisa Tagihan</p>
                <p className={`text-sm md:text-2xl font-bold leading-tight ${totalSisaTagihan > 0 ? "text-destructive" : "text-foreground"}`}>
                  <span className="md:hidden">{compactRupiah(totalSisaTagihan)}</span>
                  <span className="hidden md:inline">{formatRp(totalSisaTagihan)}</span>
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
            <TabsTrigger value="all" className="flex-1 sm:flex-none text-xs sm:text-sm">All Time</TabsTrigger>
          </TabsList>

          <div className="w-full sm:w-auto">
            {tab === "po" && (
              <Select value={poFilter} onValueChange={setPOFilter}>
                <SelectTrigger className="w-full sm:w-64 text-xs sm:text-sm"><SelectValue placeholder="Semua PO" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua PO Period</SelectItem>
                  {[...poPeriods].sort((a, b) => b.start_date.localeCompare(a.start_date)).map((po) => (
                    <SelectItem key={po.id} value={po.id}>{po.name} ({po.start_date} — {po.end_date})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {tab === "month" && (
              <Select value={monthFilter || "all"} onValueChange={(v) => setMonthFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-56 text-xs sm:text-sm"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {availableMonths.map((m) => (
                    <SelectItem key={m} value={m}>{format(new Date(m + "-01"), "MMMM yyyy", { locale: localeID })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {tab === "year" && (
              <Select value={yearFilter || "all"} onValueChange={(v) => setYearFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-40 text-xs sm:text-sm"><SelectValue placeholder="Semua Tahun" /></SelectTrigger>
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
          {/* Sales bar chart */}
          {salesRows.length > 0 && (
            <Card className="hidden sm:block">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base">Grafik per Sales — {getFilterLabel()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] md:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesRows.map(r => ({ ...r, salesName: shortName(r.salesName) }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="salesName" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis yAxisId="left" tickFormatter={(v) => v.toLocaleString("id-ID")} tick={{ fontSize: 10 }} width={40} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 10 }} width={45} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", color: "hsl(var(--foreground))" }}
                        formatter={(value: number, name: string) => {
                          if (name === "totalRevenue") return [formatRp(value), "Omzet"];
                          if (name === "totalPcs") return [value.toLocaleString("id-ID"), "PCS"];
                          return [value, "Order"];
                        }}
                      />
                      <Legend formatter={(v) => v === "totalOrders" ? "Order" : v === "totalPcs" ? "PCS" : "Omzet"} wrapperStyle={{ fontSize: 11 }} />
                      <Bar yAxisId="left" dataKey="totalOrders" fill="hsl(var(--primary))" name="totalOrders" />
                      <Bar yAxisId="left" dataKey="totalPcs" fill="hsl(var(--accent-foreground))" name="totalPcs" />
                      <Bar yAxisId="right" dataKey="totalRevenue" fill="hsl(var(--muted-foreground))" name="totalRevenue" opacity={0.5} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm md:text-base">Ringkasan per Sales — {getFilterLabel()}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 md:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[40px] text-xs uppercase font-bold text-center">No</TableHead>
                      {role !== "sales" && <TableHead className="text-xs uppercase font-bold min-w-[90px]">Sales</TableHead>}
                      <TableHead className="text-right text-xs uppercase font-bold">Order</TableHead>
                      <TableHead className="text-right text-xs uppercase font-bold">PCS</TableHead>
                      <TableHead className="text-center text-xs uppercase font-bold" colSpan={2}>
                        <span className="hidden md:inline">Tipe Pengerjaan</span>
                        <span className="md:hidden">Tipe</span>
                      </TableHead>
                      <TableHead className="text-right text-xs uppercase font-bold min-w-[80px]">Omzet</TableHead>
                      <TableHead className="text-right text-xs uppercase font-bold min-w-[80px]">Tagihan</TableHead>
                    </TableRow>
                    <TableRow className="border-b">
                      <TableHead />
                      {role !== "sales" && <TableHead />}
                      <TableHead />
                      <TableHead />
                      <TableHead className="text-center text-[10px] uppercase text-muted-foreground font-semibold">Wift</TableHead>
                      <TableHead className="text-center text-[10px] uppercase text-muted-foreground font-semibold">Luar</TableHead>
                      <TableHead />
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={role !== "sales" ? 8 : 7} className="text-center text-muted-foreground py-10 text-sm">
                          Belum ada data transaksi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {salesRows.map((r, i) => (
                          <TableRow key={r.salesId} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="text-center text-xs text-muted-foreground">{i + 1}</TableCell>
                            {role !== "sales" && <TableCell className="font-semibold text-xs">{shortName(r.salesName)}</TableCell>}
                            <TableCell className="text-right text-xs font-mono">{r.totalOrders}</TableCell>
                            <TableCell className="text-right text-xs font-mono">{r.totalPcs.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-center text-xs font-mono">{r.pcsWift.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-center text-xs font-mono">{r.pcsLuar.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-right text-xs font-mono font-medium whitespace-nowrap">
                              <span className="md:hidden">{compactRupiah(r.totalRevenue)}</span>
                              <span className="hidden md:inline">{formatRp(r.totalRevenue)}</span>
                            </TableCell>
                            <TableCell className={`text-right text-xs font-mono whitespace-nowrap ${r.sisaTagihan > 0 ? "text-destructive" : "text-foreground"}`}>
                              <span className="md:hidden">{compactRupiah(r.sisaTagihan)}</span>
                              <span className="hidden md:inline">{formatRp(r.sisaTagihan)}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-primary/5 font-bold border-t-2">
                          <TableCell colSpan={role !== "sales" ? 2 : 1} className="text-xs text-center py-3">TOTAL</TableCell>
                          <TableCell className="text-right text-xs font-mono">{totalOrders}</TableCell>
                          <TableCell className="text-right text-xs font-mono text-primary">{totalPcs.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-center text-xs font-mono">{totalPcsWift.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-center text-xs font-mono">{totalPcsLuar.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right text-xs font-mono text-primary whitespace-nowrap">
                            <span className="md:hidden">{compactRupiah(totalRevenue)}</span>
                            <span className="hidden md:inline">{formatRp(totalRevenue)}</span>
                          </TableCell>
                          <TableCell className={`text-right text-xs font-mono whitespace-nowrap ${totalSisaTagihan > 0 ? "text-destructive font-bold" : "text-foreground"}`}>
                            <span className="md:hidden">{compactRupiah(totalSisaTagihan)}</span>
                            <span className="hidden md:inline">{formatRp(totalSisaTagihan)}</span>
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

      {/* Trend chart (always visible) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base">Tren Penjualan (12 Bulan Terakhir)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] md:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} width={45} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={35} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", color: "hsl(var(--foreground))" }}
                  formatter={(value: number, name: string) => {
                    if (name === "pendapatan") return [formatRp(value), "Omzet"];
                    if (name === "pcs") return [value.toLocaleString("id-ID"), "PCS"];
                    return [value, "Order"];
                  }}
                />
                <Legend formatter={(v) => v === "pendapatan" ? "Omzet" : v === "pcs" ? "PCS" : "Order"} wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="pendapatan" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="order" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="pcs" stroke="hsl(var(--accent-foreground))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
