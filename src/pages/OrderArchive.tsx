/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { ArrowLeft, Calendar, Eye, FileDown, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useOrders, useOrderCustomers } from "@/hooks/api/useOrders";
import { useOrderItems } from "@/hooks/api/useOrderItems";
import { usePOPeriods } from "@/hooks/api/usePOPeriods";
import { useSalesProfiles } from "@/hooks/api/useProfile";
import { generateInvoicePDF } from "@/lib/generate-invoice";
import { generateNotaPDF } from "@/lib/generate-nota";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/services/orders";

type ViewMode = "month" | "year";

const OrderArchive = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const { data: orders = [], isLoading } = useOrders();
  const { data: customers = [] } = useOrderCustomers();
  const { data: allOrderItems = [] } = useOrderItems();
  const { data: allPOPeriods = [] } = usePOPeriods();
  const { data: salesProfiles = [] } = useSalesProfiles(role);

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    // Default to previous month
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [selectedPO, setSelectedPO] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [invoiceOptionsOpen, setInvoiceOptionsOpen] = useState(false);
  const [invoiceTargetOrder, setInvoiceTargetOrder] = useState<Order | null>(null);
  const [invoiceOpts, setInvoiceOpts] = useState({ withStamp: true, withSignature: true });
  const pageSize = 15;

  const customerName = (id: string | null) => customers.find((c) => String(c.id) === String(id))?.name || "-";
  const salesName = (id: string | null) => salesProfiles.find((s) => String(s.id) === String(id))?.full_name || "-";

  // PCS per order
  const pcsPerOrder = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of allOrderItems) {
      if (item.order_id) {
        map[item.order_id] = (map[item.order_id] || 0) + item.quantity;
      }
    }
    return map;
  }, [allOrderItems]);

  // Available months from orders
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const o of orders) {
      if (o.created_at) {
        const d = new Date(o.created_at);
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
    }
    return Array.from(months).sort().reverse();
  }, [orders]);

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const o of orders) {
      if (o.created_at) {
        years.add(String(new Date(o.created_at).getFullYear()));
      }
    }
    return Array.from(years).sort().reverse();
  }, [orders]);

  // PO periods for the selected time range
  const relevantPOPeriods = useMemo(() => {
    if (viewMode === "month") {
      const [y, m] = selectedMonth.split("-").map(Number);
      return allPOPeriods.filter(p => {
        const sd = new Date(p.start_date);
        return sd.getFullYear() === y && sd.getMonth() + 1 === m;
      });
    } else {
      const y = parseInt(selectedYear);
      return allPOPeriods.filter(p => {
        const sd = new Date(p.start_date);
        return sd.getFullYear() === y;
      });
    }
  }, [viewMode, selectedMonth, selectedYear, allPOPeriods]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);

      if (viewMode === "month") {
        const [y, m] = selectedMonth.split("-").map(Number);
        if (d.getFullYear() !== y || d.getMonth() + 1 !== m) return false;
      } else {
        if (d.getFullYear() !== parseInt(selectedYear)) return false;
      }

      if (selectedPO !== "all" && o.po_period_id !== selectedPO) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        String(o.order_number).includes(term) ||
        customerName(o.customer_id).toLowerCase().includes(term)
      );
    });
  }, [orders, viewMode, selectedMonth, selectedYear, selectedPO, search, customers]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats
  const totalPcs = filteredOrders.reduce((sum, o) => sum + (pcsPerOrder[o.id] || 0), 0);
  const totalOmzet = filteredOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalPaid = filteredOrders.reduce((sum, o) => sum + (o.amount_paid || 0), 0);
  const sisaTagihan = totalOmzet - totalPaid;

  const statusColor = (s: string | null) => {
    if (s === "completed") return "default" as const;
    if (s === "processing") return "secondary" as const;
    return "outline" as const;
  };

  const formatMonthLabel = (m: string) => {
    const [y, mo] = m.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return `${months[parseInt(mo) - 1]} ${y}`;
  };

  const getPOName = (poId: string | null) => {
    if (!poId) return "-";
    const po = allPOPeriods.find(p => p.id === poId);
    return po?.name ?? "-";
  };

  const detailItems = detailOrder ? allOrderItems.filter((i) => i.order_id === detailOrder.id) : [];

  const openInvoiceOptions = (o: Order) => {
    setInvoiceTargetOrder(o);
    setInvoiceOpts({ withStamp: true, withSignature: true });
    setInvoiceOptionsOpen(true);
  };

  const handleDownloadInvoice = () => {
    if (!invoiceTargetOrder) return;
    const o = invoiceTargetOrder;
    const orderItems = allOrderItems.filter((i) => i.order_id === o.id);
    const customer = customers.find((c) => c.id === o.customer_id) || null;
    generateInvoicePDF({ order: o, items: orderItems, customer, options: invoiceOpts });
    toast({ title: "Berhasil", description: `Invoice #${o.order_number} berhasil diunduh.` });
    setInvoiceOptionsOpen(false);
  };

  const handleDownloadNota = (o: Order) => {
    const orderItems = allOrderItems.filter((i) => i.order_id === o.id);
    const customer = customers.find((c) => c.id === o.customer_id) || null;
    generateNotaPDF({ order: o, items: orderItems, customer });
    toast({ title: "Berhasil", description: `Nota #${o.order_number} berhasil diunduh.` });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard/orders">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Arsip Order</h1>
          <p className="text-sm text-muted-foreground">Riwayat order per bulan dan tahun</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setPage(1); setSelectedPO("all"); }} className="mb-4">
        <TabsList>
          <TabsTrigger value="month">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />Per Bulan
          </TabsTrigger>
          <TabsTrigger value="year">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />Per Tahun
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {viewMode === "month" ? (
          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setPage(1); setSelectedPO("all"); }}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
              ))}
              {availableMonths.length === 0 && <SelectItem value={selectedMonth} disabled>{formatMonthLabel(selectedMonth)}</SelectItem>}
            </SelectContent>
          </Select>
        ) : (
          <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setPage(1); setSelectedPO("all"); }}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
              {availableYears.length === 0 && <SelectItem value={selectedYear} disabled>{selectedYear}</SelectItem>}
            </SelectContent>
          </Select>
        )}

        {/* PO filter */}
        {relevantPOPeriods.length > 0 && (
          <Select value={selectedPO} onValueChange={(v) => { setSelectedPO(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua PO</SelectItem>
              {relevantPOPeriods.map(po => (
                <SelectItem key={po.id} value={po.id}>{po.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          placeholder="Cari no. order, customer..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full sm:w-64"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Order</p>
            <p className="text-xl font-bold text-foreground">{filteredOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Pcs</p>
            <p className="text-xl font-bold text-foreground">{totalPcs.toLocaleString("id-ID")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Omzet</p>
            <p className="text-lg font-bold text-foreground" title={`Rp ${totalOmzet.toLocaleString("id-ID")}`}>
              Rp {totalOmzet >= 1_000_000_000 ? `${(totalOmzet / 1_000_000_000).toFixed(1)} M` : totalOmzet >= 1_000_000 ? `${(totalOmzet / 1_000_000).toFixed(1)} Jt` : totalOmzet.toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sisa Tagihan</p>
            <p className="text-lg font-bold text-destructive" title={`Rp ${sisaTagihan.toLocaleString("id-ID")}`}>
              Rp {sisaTagihan >= 1_000_000_000 ? `${(sisaTagihan / 1_000_000_000).toFixed(1)} M` : sisaTagihan >= 1_000_000 ? `${(sisaTagihan / 1_000_000).toFixed(1)} Jt` : sisaTagihan.toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Menampilkan {paginatedOrders.length} dari {filteredOrders.length} order.
          </p>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  {role !== "sales" && <TableHead>Sales</TableHead>}
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Pcs</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Bayar</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead className="w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.order_number}</TableCell>
                    {role !== "sales" && <TableCell>{salesName(o.sales_id)}</TableCell>}
                    <TableCell>{customerName(o.customer_id)}</TableCell>
                    <TableCell className="text-center font-medium">{pcsPerOrder[o.id] || 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{getPOName(o.po_period_id)}</TableCell>
                    <TableCell><Badge variant={statusColor(o.status)}>{o.status}</Badge></TableCell>
                    <TableCell>Rp {(o.total_price || 0).toLocaleString("id-ID")}</TableCell>
                    <TableCell>Rp {(o.amount_paid || 0).toLocaleString("id-ID")}</TableCell>
                    <TableCell><Badge variant={o.payment_status === "paid" ? "default" : "outline"}>{o.payment_status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailOrder(o)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openInvoiceOptions(o)} title="Invoice"><FileDown className="h-4 w-4" /></Button>
                        {o.payment_status === "paid" && (
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadNota(o)} title="Nota"><Receipt className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Tidak ada order untuk periode ini.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {paginatedOrders.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Tidak ada order untuk periode ini.</p>
            )}
            {paginatedOrders.map((o) => (
              <div key={o.id} className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">#{o.order_number}</p>
                    <p className="text-sm text-muted-foreground">{customerName(o.customer_id)}</p>
                    {role !== "sales" && <p className="text-xs text-muted-foreground">{salesName(o.sales_id)}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={statusColor(o.status)}>{o.status}</Badge>
                    <Badge variant={o.payment_status === "paid" ? "default" : "outline"} className="text-xs">{o.payment_status}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm border-t pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Pcs</p>
                    <p className="font-medium">{pcsPerOrder[o.id] || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-medium">Rp {(o.total_price || 0).toLocaleString("id-ID")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Dibayar</p>
                    <p className="font-medium">Rp {(o.amount_paid || 0).toLocaleString("id-ID")}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{getPOName(o.po_period_id)}</Badge>
                <div className="flex gap-1 border-t pt-2">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDetailOrder(o)}>
                    <Eye className="h-3.5 w-3.5 mr-1" />Detail
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openInvoiceOptions(o)}>
                    <FileDown className="h-3.5 w-3.5 mr-1" />Invoice
                  </Button>
                  {o.payment_status === "paid" && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleDownloadNota(o)}>
                      <Receipt className="h-3.5 w-3.5 mr-1" />Nota
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pageCount > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }} />
                  </PaginationItem>
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <PaginationItem key={i + 1}>
                      <PaginationLink href="#" isActive={i + 1 === currentPage} onClick={(e) => { e.preventDefault(); setPage(i + 1); }}>
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(p => Math.min(pageCount, p + 1)); }} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Order #{detailOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> {customerName(detailOrder.customer_id)}</div>
                <div><span className="text-muted-foreground">Sales:</span> {salesName(detailOrder.sales_id)}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColor(detailOrder.status)}>{detailOrder.status}</Badge></div>
                <div><span className="text-muted-foreground">Total:</span> Rp {(detailOrder.total_price || 0).toLocaleString("id-ID")}</div>
                <div><span className="text-muted-foreground">Bayar:</span> Rp {(detailOrder.amount_paid || 0).toLocaleString("id-ID")}</div>
                <div><span className="text-muted-foreground">PO:</span> {getPOName(detailOrder.po_period_id)}</div>
              </div>
              <Separator />
              <div>
                <Label className="text-sm font-semibold">Item Produk</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.price_per_unit.toLocaleString("id-ID")}</TableCell>
                        <TableCell>{(item.quantity * item.price_per_unit).toLocaleString("id-ID")}</TableCell>
                      </TableRow>
                    ))}
                    {detailItems.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Tidak ada item.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Options Dialog */}
      <Dialog open={invoiceOptionsOpen} onOpenChange={setInvoiceOptionsOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Opsi Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Stempel</Label>
              <Switch checked={invoiceOpts.withStamp} onCheckedChange={(v) => setInvoiceOpts(p => ({ ...p, withStamp: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Tanda Tangan</Label>
              <Switch checked={invoiceOpts.withSignature} onCheckedChange={(v) => setInvoiceOpts(p => ({ ...p, withSignature: v }))} />
            </div>
            <Button className="w-full" onClick={handleDownloadInvoice}>
              <FileDown className="h-4 w-4 mr-2" />Download Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderArchive;
