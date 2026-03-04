import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { generateKwitansiPDF } from "@/lib/generate-kwitansi";
import type { Tables } from "@/integrations/supabase/types";
import { formatRupiah } from "@/lib/utils";

type Payment = Tables<"payments">;
type Order = Tables<"orders">;
type Customer = Tables<"customers">;

const Payments = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState({ order_id: "", amount: "", payment_method: "", notes: "" });

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Order</Label>
                <Select value={form.order_id} onValueChange={(v) => setForm({ ...form, order_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih order" /></SelectTrigger>
                  <SelectContent>
                    {orders.map((o) => {
                      const cust = customers.find(c => c.id === o.customer_id);
                      return (
                        <SelectItem key={o.id} value={o.id}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">#{o.order_number} - {cust?.name || "No Name"}</span>
                            <span className="text-xs text-muted-foreground">Total: Rp {o.total_price?.toLocaleString("id-ID")}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrder && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1 animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-medium">{selectedCustomer?.name || "-"}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1 font-bold text-primary">
                    <span>Total Tagihan:</span>
                    <span>Rp {selectedOrder.total_price?.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Jumlah Bayar</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">Rp</span>
                  <Input
                    type="text"
                    className="pl-9"
                    value={formatRupiah(String(form.amount || ""))}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, "");
                      setForm({ ...form, amount: rawValue });
                    }}
                    placeholder="0"
                    required
                  />
                </div>
                {form.amount && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Terinput: {Number(form.amount).toLocaleString("id-ID")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Metode Bayar</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Catatan</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <Button type="submit" className="w-full">
                {editing ? "Simpan Perubahan" : "Konfirmasi Pembayaran"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="w-32">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const order = orders.find((o) => o.id === p.order_id);
                  const customer = customers.find((c) => c.id === order?.customer_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>#{order?.order_number || "-"}</TableCell>
                      <TableCell className="font-medium">{customer?.name || "-"}</TableCell>
                      <TableCell>Rp {p.amount.toLocaleString("id-ID")}</TableCell>
                      <TableCell>{p.payment_method || "-"}</TableCell>
                      <TableCell>{p.notes || "-"}</TableCell>
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
                {payments.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Belum ada pembayaran.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {payments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Belum ada pembayaran.</p>
            )}
            {payments.map((p) => {
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
        </>
      )}
    </div>
  );
};

export default Payments;
