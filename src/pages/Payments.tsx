import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { generateKwitansiPDF } from "@/lib/generate-kwitansi";
import type { Tables } from "@/integrations/supabase/types";
import { formatRupiah } from "@/lib/utils";
import { useSalesProfiles } from "@/hooks/api/useProfile";
import { useAuth } from "@/contexts/AuthContext";

type Payment = Tables<"payments">;
type Order = Tables<"orders">;
type Customer = Tables<"customers">;

const ITEMS_PER_PAGE = 10;

const Payments = () => {
  const { user, role } = useAuth();
  const { data: salesProfiles = [] } = useSalesProfiles(role);
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState({ order_id: "", amount: "", payment_method: "", notes: "" });

  // Search, filter, pagination state
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const salesName = (id: string | null) => salesProfiles.find((s) => String(s.id) === String(id))?.full_name || "-";

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.order_id) newErrors.order_id = "Pilih order terlebih dahulu";
    if (!form.amount || parseInt(form.amount) <= 0) newErrors.amount = "Masukkan jumlah bayar yang valid";
    if (!form.payment_method) newErrors.payment_method = "Pilih metode pembayaran";

    if (selectedOrder && parseInt(form.amount) > selectedOrder.total_price) {
      newErrors.amount = "Jumlah bayar melebihi total tagihan";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchData = async () => {
    const [paymentsRes, ordersRes, customersRes] = await Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*"),
      supabase.from("customers").select("*"),
    ]);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (ordersRes.data) setOrders(ordersRes.data);
    if (customersRes.data) setCustomers(customersRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Filtered & searched payments
  const filteredPayments = useMemo(() => {
    let result = payments;

    // Filter by payment method
    if (filterMethod !== "all") {
      result = result.filter((p) => p.payment_method === filterMethod);
    }

    // Search by order number, customer name, or notes
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const order = orders.find((o) => o.id === p.order_id);
        const customer = customers.find((c) => c.id === order?.customer_id);
        const orderNum = order?.order_number?.toString() || "";
        const custName = customer?.name?.toLowerCase() || "";
        const notes = p.notes?.toLowerCase() || "";
        const amount = p.amount?.toString() || "";
        return orderNum.includes(q) || custName.includes(q) || notes.includes(q) || amount.includes(q);
      });
    }

    return result;
  }, [payments, orders, customers, search, filterMethod]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / ITEMS_PER_PAGE));
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterMethod]);

  const openCreate = () => {
    setEditing(null);
    setForm({ order_id: "", amount: "", payment_method: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: Payment) => {
    setEditing(p);
    setForm({
      order_id: p.order_id,
      amount: String(p.amount),
      payment_method: p.payment_method || "",
      notes: p.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      order_id: form.order_id,
      amount: parseInt(form.amount),
      payment_method: form.payment_method || null,
      notes: form.notes || null,
    };
    if (editing) {
      const { error } = await supabase.from("payments").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Berhasil", description: "Pembayaran diperbarui." });
    } else {
      const { error } = await supabase.from("payments").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Berhasil", description: "Pembayaran ditambahkan." });
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleFullPayment = () => {
    if (selectedOrder) {
      setForm({ ...form, amount: String(selectedOrder.total_price) });
      if (errors.amount) setErrors({ ...errors, amount: "" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pembayaran ini?")) return;
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchData();
  };

  const handleDownloadKwitansi = (p: Payment) => {
    const order = orders.find((o) => o.id === p.order_id);
    if (!order) {
      toast({ title: "Error", description: "Order tidak ditemukan.", variant: "destructive" });
      return;
    }
    const customer = customers.find((c) => c.id === order.customer_id) || null;
    generateKwitansiPDF({ payment: p, order, customer });
    toast({ title: "Berhasil", description: "Kwitansi berhasil diunduh." });
  };

  const selectedOrder = orders.find((o) => o.id === form.order_id);
  const selectedCustomer = customers.find((c) => c.id === selectedOrder?.customer_id);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payments</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pembayaran
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Pembayaran" : "Tambah Pembayaran"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={(e) => { e.preventDefault(); if (validate()) handleSubmit(e); }} className="space-y-4" noValidate>
              {/* Field Order */}
              <div className="space-y-2">
                <Label className={errors.order_id ? "text-destructive" : ""}>Order</Label>
                <Select
                  value={form.order_id}
                  onValueChange={(v) => {
                    setForm({ ...form, order_id: v });
                    if (errors.order_id) setErrors({ ...errors, order_id: "" });
                  }}
                >
                  <SelectTrigger className={errors.order_id ? "border-destructive" : ""}>
                    <SelectValue placeholder="Pilih order" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((o) => {
                      const cust = customers.find(c => c.id === o.customer_id);
                      return (
                        <SelectItem key={o.id} value={o.id}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">#{o.order_number} - {cust?.name}</span>
                            <span className="text-xs text-muted-foreground">Tagihan: Rp {o.total_price?.toLocaleString("id-ID")}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.order_id && <p className="text-[11px] text-destructive font-medium">{errors.order_id}</p>}
              </div>

              {/* Detail Order & Tombol Bayar Lunas */}
              {selectedOrder && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm space-y-2 animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs italic">Detail Tagihan:</span>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] bg-background" onClick={handleFullPayment}>
                      Bayar Lunas
                    </Button>
                  </div>
                  <div className="flex justify-between border-t border-primary/10 pt-2 font-bold text-primary">
                    <span>Total Tagihan:</span>
                    <span>Rp {selectedOrder.total_price?.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              )}

              {/* Jumlah Bayar */}
              <div className="space-y-2">
                <Label className={errors.amount ? "text-destructive" : ""}>Jumlah Bayar</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-medium">Rp</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    className={`pl-9 ${errors.amount ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    value={formatRupiah(String(form.amount || ""))}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, "");
                      setForm({ ...form, amount: rawValue });
                      if (errors.amount) setErrors({ ...errors, amount: "" });
                    }}
                    placeholder="0"
                  />
                </div>
                {errors.amount && <p className="text-[11px] text-destructive font-medium">{errors.amount}</p>}
              </div>

              {/* Metode Bayar */}
              <div className="space-y-2">
                <Label className={errors.payment_method ? "text-destructive" : ""}>Metode Bayar</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(v) => {
                    setForm({ ...form, payment_method: v });
                    if (errors.payment_method) setErrors({ ...errors, payment_method: "" });
                  }}
                >
                  <SelectTrigger className={errors.payment_method ? "border-destructive" : ""}>
                    <SelectValue placeholder="Pilih metode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash (Tunai)</SelectItem>
                    <SelectItem value="transfer">Transfer Bank</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
                {errors.payment_method && <p className="text-[11px] text-destructive font-medium">{errors.payment_method}</p>}
              </div>

              <div className="space-y-2">
                <Label>Catatan (Opsional)</Label>
                <Input
                  placeholder="Contoh: Transfer via BCA / Titipan DP"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full h-11 text-base shadow-md mt-4">
                {editing ? "Simpan Perubahan" : "Konfirmasi Pembayaran"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari order, customer, catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterMethod} onValueChange={setFilterMethod}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Metode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Metode</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="other">Lainnya</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  {role !== "sales" && <TableHead>Sales</TableHead>}
                  <TableHead>Customer</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="w-32">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.map((p) => {
                  const order = orders.find((o) => o.id === p.order_id);
                  const customer = customers.find((c) => c.id === order?.customer_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>#{order?.order_number || "-"}</TableCell>
                      {role !== "sales" && (
                        <TableCell>{salesName(order?.sales_id || null)}</TableCell>
                      )}
                      <TableCell className="font-medium">{customer?.name || "-"}</TableCell>
                      <TableCell>Rp {p.amount.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="capitalize">{p.payment_method || "-"}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{p.notes || "-"}</TableCell>
                      <TableCell>{p.created_at ? new Date(p.created_at).toLocaleDateString("id-ID") : "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadKwitansi(p)} title="Download Kwitansi"><FileText className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginatedPayments.length === 0 && (
                  <TableRow><TableCell colSpan={role !== "sales" ? 8 : 7} className="text-center text-muted-foreground">Tidak ada pembayaran ditemukan.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {paginatedPayments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Tidak ada pembayaran ditemukan.</p>
            )}
            {paginatedPayments.map((p) => {
              const order = orders.find((o) => o.id === p.order_id);
              const customer = customers.find((c) => c.id === order?.customer_id);
              return (
                <div key={p.id} className="rounded-lg border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">#{order?.order_number || "-"}</p>
                      <p className="text-sm text-muted-foreground">{customer?.name || "-"}</p>
                    </div>
                    <p className="font-semibold text-foreground">Rp {p.amount.toLocaleString("id-ID")}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Metode</p>
                      <p className="font-medium capitalize">{p.payment_method || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tanggal</p>
                      <p className="font-medium">{p.created_at ? new Date(p.created_at).toLocaleDateString("id-ID") : "-"}</p>
                    </div>
                  </div>

                  {p.notes && (
                    <p className="text-xs text-muted-foreground border-t pt-2">{p.notes}</p>
                  )}

                  <div className="flex gap-1 border-t pt-2">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleDownloadKwitansi(p)}>
                      <FileText className="h-3.5 w-3.5 mr-1" />Kwitansi
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Hapus
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {filteredPayments.length} data · Hal {currentPage}/{totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    typeof p === "string" ? (
                      <span key={`e-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                    ) : (
                      <Button
                        key={p}
                        variant={currentPage === p ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Payments;
