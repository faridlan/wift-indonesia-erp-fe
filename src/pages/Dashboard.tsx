import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrders, useOrderCustomers } from "@/hooks/api/useOrders";
import { useSalesProfiles } from "@/hooks/api/useProfile";
import { useActivePOPeriod } from "@/hooks/api/usePOPeriods";
import { useOrderItems } from "@/hooks/api/useOrderItems";
import { DollarSign, ShoppingCart, Users, AlertCircle, Trophy, Crown, Medal, Award } from "lucide-react";
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatRp = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
const formatRpCompact = (v: number) => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1).replace('.0', '')} M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1).replace('.0', '')} Jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)} Rb`;
  return formatRp(v);
};

type WorkTypeFilter = "all" | "wift" | "luar";

const Dashboard = () => {
  const { user, role } = useAuth();
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: customers = [] } = useOrderCustomers();
  const { data: salesProfiles = [] } = useSalesProfiles(role);
  const { data: allOrderItems = [] } = useOrderItems();
  const { data: activePO, isLoading: poLoading } = useActivePOPeriod();

  const [workTypeFilter, setWorkTypeFilter] = useState<WorkTypeFilter>("all");

  const isAdmin = role === "admin" || role === "superadmin";

  // Filter orders by active PO
  const poOrders = useMemo(() => {
    if (!activePO) return orders;
    return orders.filter((o) => o.po_period_id === activePO.id);
  }, [orders, activePO]);

  // Group order IDs by work type from order_items
  const orderIdsByWorkType = useMemo(() => {
    const wiftOrderIds = new Set<string>();
    const luarOrderIds = new Set<string>();
    const poOrderIds = new Set(poOrders.map((o) => o.id));

    allOrderItems.forEach((it) => {
      if (!it.order_id || !poOrderIds.has(it.order_id)) return;
      if (it.work_type === "wift") {
        wiftOrderIds.add(it.order_id);
      } else {
        luarOrderIds.add(it.order_id);
      }
    });

    return { wiftOrderIds, luarOrderIds };
  }, [allOrderItems, poOrders]);

  // Filtered orders based on tab
  const filteredOrders = useMemo(() => {
    if (workTypeFilter === "all") return poOrders;
    const ids = workTypeFilter === "wift" ? orderIdsByWorkType.wiftOrderIds : orderIdsByWorkType.luarOrderIds;
    return poOrders.filter((o) => ids.has(o.id));
  }, [poOrders, workTypeFilter, orderIdsByWorkType]);

  // Filtered order items based on tab
  const filteredOrderItems = useMemo(() => {
    const orderIds = new Set(filteredOrders.map((o) => o.id));
    return allOrderItems.filter((it) => {
      if (!it.order_id || !orderIds.has(it.order_id)) return false;
      if (workTypeFilter === "all") return true;
      if (workTypeFilter === "wift") return it.work_type === "wift";
      return it.work_type !== "wift";
    });
  }, [allOrderItems, filteredOrders, workTypeFilter]);

  // Filter customers that have orders
  const filteredCustomerIds = useMemo(() => {
    const ids = new Set<string>();
    filteredOrders.forEach((o) => { if (o.customer_id) ids.add(o.customer_id); });
    return ids;
  }, [filteredOrders]);

  const filteredCustomers = useMemo(() => customers.filter((c) => filteredCustomerIds.has(c.id)), [customers, filteredCustomerIds]);

  // For tab: recalculate totals from filtered items (not order total_price, since an order can have mixed work types)
  // But for simplicity & accuracy with existing triggers, we use order-level totals when "all", otherwise sum item-level
  const totalOmzet = useMemo(() => {
    if (workTypeFilter === "all") return filteredOrders.reduce((s, o) => s + (o.total_price || 0), 0);
    // For filtered tabs, sum item subtotals only
    return filteredOrderItems.reduce((s, it) => s + (it.quantity * it.price_per_unit), 0);
  }, [filteredOrders, filteredOrderItems, workTypeFilter]);

  const totalPaid = useMemo(() => {
    if (workTypeFilter === "all") return filteredOrders.reduce((s, o) => s + (o.amount_paid || 0), 0);
    // Can't split payments by work type, so show order-level paid for filtered orders
    return filteredOrders.reduce((s, o) => s + (o.amount_paid || 0), 0);
  }, [filteredOrders, workTypeFilter]);

  const sisaTagihan = totalOmzet - totalPaid;

  // Ringkasan per sales
  const salesSummary = useMemo(() => {
    const map: Record<string, {
      name: string; pcs: number; orders: number; customers: Set<string>; omzet: number; sisaTagihan: number;
    }> = {};

    const profiles = isAdmin ? salesProfiles : salesProfiles.filter((s) => s.id === user?.id);

    profiles.forEach((s) => {
      map[s.id] = { name: s.full_name || s.id, pcs: 0, orders: 0, customers: new Set(), omzet: 0, sisaTagihan: 0 };
    });

    filteredOrders.forEach((o) => {
      if (!map[o.sales_id]) {
        map[o.sales_id] = { name: o.sales_id, pcs: 0, orders: 0, customers: new Set(), omzet: 0, sisaTagihan: 0 };
      }
      const row = map[o.sales_id];
      row.orders += 1;
      if (o.customer_id) row.customers.add(o.customer_id);
      if (workTypeFilter === "all") {
        row.omzet += o.total_price || 0;
        row.sisaTagihan += (o.total_price || 0) - (o.amount_paid || 0);
      }
    });

    // For non-"all" tabs, calculate omzet from items
    if (workTypeFilter !== "all") {
      filteredOrderItems.forEach((it) => {
        if (!it.order_id) return;
        const ord = filteredOrders.find((o) => o.id === it.order_id);
        if (!ord || !map[ord.sales_id]) return;
        map[ord.sales_id].omzet += it.quantity * it.price_per_unit;
      });
      // sisaTagihan for filtered tabs: use order-level since payments can't be split
      filteredOrders.forEach((o) => {
        if (map[o.sales_id]) {
          // Already counted orders above, just set sisaTagihan based on item omzet vs order paid proportionally
        }
      });
      // Simple approach: sisaTagihan = omzet - proportional paid
      Object.values(map).forEach((row) => {
        row.sisaTagihan = Math.max(0, row.omzet); // approximate for filtered view
      });
    }

    filteredOrderItems.forEach((it) => {
      if (!it.order_id) return;
      const ord = filteredOrders.find((o) => o.id === it.order_id);
      if (!ord || !map[ord.sales_id]) return;
      map[ord.sales_id].pcs += it.quantity || 0;
    });

    return Object.entries(map).map(([id, v]) => ({
      id,
      name: v.name,
      pcs: v.pcs,
      orders: v.orders,
      customers: v.customers.size,
      omzet: v.omzet,
      sisaTagihan: v.sisaTagihan,
    }));
  }, [filteredOrders, filteredOrderItems, salesProfiles, isAdmin, user?.id, workTypeFilter]);

  // Ranking sorted by omzet (always use ALL orders)
  const salesRanking = useMemo(() => {
    const orderIdSet = new Set(poOrders.map((o) => o.id));
    const map: Record<string, { name: string; pcs: number; orders: number; omzet: number }> = {};

    salesProfiles.forEach((s) => {
      map[s.id] = { name: s.full_name || s.id, pcs: 0, orders: 0, omzet: 0 };
    });

    poOrders.forEach((o) => {
      if (!map[o.sales_id]) map[o.sales_id] = { name: o.sales_id, pcs: 0, orders: 0, omzet: 0 };
      map[o.sales_id].orders += 1;
      map[o.sales_id].omzet += o.total_price || 0;
    });

    allOrderItems.forEach((it) => {
      if (!it.order_id || !orderIdSet.has(it.order_id)) return;
      const ord = poOrders.find((o) => o.id === it.order_id);
      if (ord && map[ord.sales_id]) map[ord.sales_id].pcs += it.quantity || 0;
    });

    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.omzet - a.omzet);
  }, [poOrders, allOrderItems, salesProfiles]);

  const isLoading = ordersLoading || poLoading;

  const getRankIcon = (idx: number) => {
    if (idx === 0) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (idx === 1) return <Medal className="h-4 w-4 text-gray-400" />;
    if (idx === 2) return <Award className="h-4 w-4 text-amber-600" />;
    return <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>;
  };

  const totalPcs = filteredOrderItems.reduce((s, it) => s + (it.quantity || 0), 0);

  const statCards = [
    {
      title: "Sisa Tagihan",
      value: formatRpCompact(sisaTagihan),
      fullValue: formatRp(sisaTagihan),
      icon: AlertCircle,
      color: "text-destructive",
    },
    {
      title: "Total Omzet",
      value: formatRpCompact(totalOmzet),
      fullValue: formatRp(totalOmzet),
      icon: DollarSign,
      color: "text-primary",
    },
    {
      title: "Total Order",
      value: filteredOrders.length,
      fullValue: null,
      icon: ShoppingCart,
      color: "text-primary",
    },
    {
      title: "Total Customer",
      value: filteredCustomers.length,
      fullValue: null,
      icon: Users,
      color: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Dashboard</h1>
        {activePO ? (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">{activePO.status === "open" ? "PO Aktif" : activePO.status}</Badge>
            <span className="text-sm text-muted-foreground">
              {activePO.name} ({activePO.start_date} — {activePO.end_date})
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Tidak ada PO aktif — menampilkan semua data</p>
        )}
      </div>

      {/* Work Type Tabs */}
      <Tabs value={workTypeFilter} onValueChange={(v) => setWorkTypeFilter(v as WorkTypeFilter)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="wift">Wift</TabsTrigger>
          <TabsTrigger value="luar">Luar</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {statCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2">
                  <CardTitle className="text-[11px] md:text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold text-foreground truncate" title={stat.fullValue || undefined}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Ringkasan per Sales */}
          {isAdmin && salesSummary.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base md:text-lg">
                  Ringkasan per Sales
                  {workTypeFilter !== "all" && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {workTypeFilter === "wift" ? "Wift" : "Luar"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 md:px-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-xs font-bold min-w-[100px]">Sales</TableHead>
                        <TableHead className="text-right text-xs font-bold">PCS</TableHead>
                        <TableHead className="text-right text-xs font-bold">Order</TableHead>
                        <TableHead className="text-right text-xs font-bold">Customer</TableHead>
                        <TableHead className="text-right text-xs font-bold min-w-[110px]">Omzet</TableHead>
                        {workTypeFilter === "all" && (
                          <TableHead className="text-right text-xs font-bold min-w-[110px]">Sisa Tagihan</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesSummary.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium text-xs">{row.name}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{row.pcs.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{row.orders}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{row.customers}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{formatRp(row.omzet)}</TableCell>
                          {workTypeFilter === "all" && (
                            <TableCell className={`text-right text-xs font-mono ${row.sisaTagihan > 0 ? "text-destructive" : "text-green-600"}`}>
                              {formatRp(row.sisaTagihan)}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {/* Total row */}
                      <TableRow className="bg-primary/5 font-bold border-t-2">
                        <TableCell className="text-xs">TOTAL</TableCell>
                        <TableCell className="text-right text-xs font-mono">{salesSummary.reduce((s, r) => s + r.pcs, 0).toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right text-xs font-mono">{salesSummary.reduce((s, r) => s + r.orders, 0)}</TableCell>
                        <TableCell className="text-right text-xs font-mono">{filteredCustomers.length}</TableCell>
                        <TableCell className="text-right text-xs font-mono">{formatRp(totalOmzet)}</TableCell>
                        {workTypeFilter === "all" && (
                          <TableCell className={`text-right text-xs font-mono ${sisaTagihan > 0 ? "text-destructive font-bold" : "text-green-600"}`}>
                            {formatRp(sisaTagihan)}
                          </TableCell>
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sales own stats (non-admin) */}
          {!isAdmin && salesSummary.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base md:text-lg">Ringkasan Anda</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {salesSummary.map((row) => (
                    <div key={row.id} className="space-y-3">
                      <div><span className="text-xs text-muted-foreground">PCS</span><p className="text-lg font-bold">{row.pcs.toLocaleString("id-ID")}</p></div>
                      <div><span className="text-xs text-muted-foreground">Order</span><p className="text-lg font-bold">{row.orders}</p></div>
                      <div><span className="text-xs text-muted-foreground">Customer</span><p className="text-lg font-bold">{row.customers}</p></div>
                      <div><span className="text-xs text-muted-foreground">Omzet</span><p className="text-lg font-bold">{formatRp(row.omzet)}</p></div>
                      {workTypeFilter === "all" && (
                        <div><span className="text-xs text-muted-foreground">Sisa Tagihan</span><p className={`text-lg font-bold ${row.sisaTagihan > 0 ? "text-destructive" : "text-green-600"}`}>{formatRp(row.sisaTagihan)}</p></div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Peringkat Sales - always uses ALL data */}
          {isAdmin && salesRanking.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <CardTitle className="text-base md:text-lg">Peringkat Sales</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-0 md:px-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-xs font-bold w-[50px] text-center">Rank</TableHead>
                        <TableHead className="text-xs font-bold min-w-[100px]">Sales</TableHead>
                        <TableHead className="text-right text-xs font-bold">PCS</TableHead>
                        <TableHead className="text-right text-xs font-bold">Order</TableHead>
                        <TableHead className="text-right text-xs font-bold min-w-[110px]">Omzet</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesRanking.map((row, idx) => (
                        <TableRow key={row.id} className={idx < 3 ? "bg-yellow-500/5" : ""}>
                          <TableCell className="text-center">{getRankIcon(idx)}</TableCell>
                          <TableCell className="font-medium text-xs">{row.name}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{row.pcs.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{row.orders}</TableCell>
                          <TableCell className="text-right text-xs font-mono font-medium">{formatRp(row.omzet)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
