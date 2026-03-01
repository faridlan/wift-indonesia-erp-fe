import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Eye, FileDown, Receipt, UserPlus } from "lucide-react";
import { generateInvoicePDF } from "@/lib/generate-invoice";
import { generateNotaPDF } from "@/lib/generate-nota";
import {
  useCreateOrder,
  useDeleteOrder,
  useOrderCustomers,
  useOrders,
  useUpdateOrder,
} from "@/hooks/api/useOrders";
import { useOrderItems, useCreateOrderItem, useDeleteOrderItem, useUpdateOrderItem } from "@/hooks/api/useOrderItems";
import { useCreateCustomer } from "@/hooks/api/useCustomers";
import type { Order, Customer } from "@/services/orders";
import type { OrderItem } from "@/services/order-items";

type ItemForm = {
  id?: string;
  product_name: string;
  quantity: string;
  price_per_unit: string;
};

const emptyItem = (): ItemForm => ({ product_name: "", quantity: "1", price_per_unit: "" });

const Orders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: orders = [], isLoading, isError, error } = useOrders();
  const { data: customers = [], isLoading: customersLoading, isError: customersError, error: customersErrorObj } = useOrderCustomers();
  const { data: allOrderItems = [] } = useOrderItems();
  const createOrderMutation = useCreateOrder();
  const updateOrderMutation = useUpdateOrder();
  const deleteOrderMutation = useDeleteOrder();
  const createOrderItemMutation = useCreateOrderItem();
  const updateOrderItemMutation = useUpdateOrderItem();
  const deleteOrderItemMutation = useDeleteOrderItem();
  const createCustomerMutation = useCreateCustomer();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState({ customer_id: "", status: "pending", ppn_enabled: true, ppn_percentage: "11", ppn_custom: false });
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  // Inline customer creation
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: "", phone: "", address: "" });
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => { setPage(1); }, [statusFilter, paymentStatusFilter, search]);

  const getErrorMessage = (err: unknown) => {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    return message.toLowerCase().includes("permission") || message.toLowerCase().includes("rls")
      ? "Anda tidak memiliki akses untuk data ini."
      : message;
  };

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name || "-";

  const openCreate = () => {
    setEditing(null);
    setForm({ customer_id: "", status: "pending", ppn_enabled: true, ppn_percentage: "11", ppn_custom: false });
    setItems([emptyItem()]);
    setShowNewCustomer(false);
    setNewCustomerForm({ name: "", phone: "", address: "" });
    setDialogOpen(true);
  };

  const openEdit = (o: Order) => {
    setEditing(o);
    const pct = (o as any).ppn_percentage ?? (o.include_ppn ? 11 : 0);
    const enabled = pct > 0;
    const isCustom = enabled && pct !== 11;
    setForm({ customer_id: o.customer_id || "", status: o.status || "pending", ppn_enabled: enabled, ppn_percentage: String(pct > 0 ? pct : 11), ppn_custom: isCustom });
    const existingItems = allOrderItems
      .filter((i) => i.order_id === o.id)
      .map((i) => ({
        id: i.id,
        product_name: i.product_name,
        quantity: String(i.quantity),
        price_per_unit: String(i.price_per_unit),
      }));
    setItems(existingItems.length > 0 ? existingItems : [emptyItem()]);
    setShowNewCustomer(false);
    setDialogOpen(true);
  };

  const openDetail = (o: Order) => {
    setDetailOrder(o);
    setDetailDialogOpen(true);
  };

  const handleDownloadInvoice = (o: Order) => {
    const orderItems = allOrderItems.filter((i) => i.order_id === o.id);
    const customer = customers.find((c) => c.id === o.customer_id) || null;
    generateInvoicePDF({ order: o, items: orderItems, customer });
    toast({ title: "Berhasil", description: `Invoice #${o.order_number} berhasil diunduh.` });
  };

  const handleDownloadNota = (o: Order) => {
    const orderItems = allOrderItems.filter((i) => i.order_id === o.id);
    const customer = customers.find((c) => c.id === o.customer_id) || null;
    generateNotaPDF({ order: o, items: orderItems, customer });
    toast({ title: "Berhasil", description: `Nota #${o.order_number} berhasil diunduh.` });
  };

  const addItem = () => setItems([...items, emptyItem()]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemForm, value: string) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerForm.name.trim()) {
      toast({ title: "Error", description: "Nama customer wajib diisi.", variant: "destructive" });
      return;
    }
    setCreatingCustomer(true);
    try {
      await createCustomerMutation.mutateAsync({
        name: newCustomerForm.name,
        phone: newCustomerForm.phone,
        address: newCustomerForm.address,
        salesId: user!.id,
      });
      toast({ title: "Berhasil", description: "Customer baru ditambahkan." });
      setShowNewCustomer(false);
      setNewCustomerForm({ name: "", phone: "", address: "" });
      // The customer list will auto-refresh via query invalidation
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.product_name.trim() && i.price_per_unit);
    if (validItems.length === 0) {
      toast({ title: "Error", description: "Tambahkan minimal 1 item produk.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        await updateOrderMutation.mutateAsync({
          id: editing.id,
          customerId: form.customer_id || undefined,
          status: form.status,
          ppnPercentage: form.ppn_enabled ? (parseInt(form.ppn_percentage) || 0) : 0,
        });

        const existingIds = items.filter((i) => i.id).map((i) => i.id!);
        const toDelete = allOrderItems.filter((i) => i.order_id === editing.id && !existingIds.includes(i.id));
        for (const d of toDelete) {
          await deleteOrderItemMutation.mutateAsync(d.id);
        }

        for (const item of validItems) {
          if (item.id) {
            await updateOrderItemMutation.mutateAsync({
              id: item.id,
              orderId: editing.id,
              productName: item.product_name,
              quantity: parseInt(item.quantity),
              pricePerUnit: parseInt(item.price_per_unit),
            });
          } else {
            await createOrderItemMutation.mutateAsync({
              orderId: editing.id,
              productName: item.product_name,
              quantity: parseInt(item.quantity),
              pricePerUnit: parseInt(item.price_per_unit),
            });
          }
        }

        toast({ title: "Berhasil", description: "Order dan item diperbarui." });
      } else {
        const newOrder = await createOrderMutation.mutateAsync({
          customerId: form.customer_id || undefined,
          status: form.status,
          salesId: user!.id,
          ppnPercentage: form.ppn_enabled ? (parseInt(form.ppn_percentage) || 0) : 0,
        });

        for (const item of validItems) {
          await createOrderItemMutation.mutateAsync({
            orderId: newOrder.id,
            productName: item.product_name,
            quantity: parseInt(item.quantity),
            pricePerUnit: parseInt(item.price_per_unit),
          });
        }

        toast({ title: "Berhasil", description: "Order dan item ditambahkan." });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const calcSubtotal = (item: ItemForm) => {
    const qty = parseInt(item.quantity) || 0;
    const price = parseInt(item.price_per_unit) || 0;
    return qty * price;
  };

  const subtotalAmount = items.reduce((sum, item) => sum + calcSubtotal(item), 0);
  const ppnPct = form.ppn_enabled ? (parseInt(form.ppn_percentage) || 0) : 0;
  const ppnAmount = ppnPct > 0 ? Math.round(subtotalAmount * ppnPct / 100) : 0;
  const totalAmount = subtotalAmount + ppnAmount;

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (paymentStatusFilter !== "all" && o.payment_status !== paymentStatusFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const custName = customerName(o.customer_id).toLowerCase();
    return (
      String(o.order_number).includes(term) ||
      custName.includes(term) ||
      (o.status ?? "").toLowerCase().includes(term)
    );
  });

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statusColor = (s: string | null) => {
    if (s === "completed") return "default" as const;
    if (s === "processing") return "secondary" as const;
    return "outline" as const;
  };

  const detailItems = detailOrder ? allOrderItems.filter((i) => i.order_id === detailOrder.id) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Orders</h1>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Cari no. order, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filter status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filter pembayaran" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua pembayaran</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Tambah Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Order" : "Tambah Order Baru"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Order info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <div className="flex gap-2">
                      <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih customer" /></SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon" onClick={() => setShowNewCustomer(!showNewCustomer)} title="Tambah customer baru">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Inline new customer form */}
                {showNewCustomer && (
                  <Card>
                    <CardContent className="pt-4 pb-3 px-4 space-y-3">
                      <Label className="text-sm font-semibold">Customer Baru</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nama *</Label>
                          <Input
                            value={newCustomerForm.name}
                            onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                            placeholder="Nama customer"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Telepon</Label>
                          <Input
                            value={newCustomerForm.phone}
                            onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                            placeholder="08xxx"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Alamat</Label>
                          <Input
                            value={newCustomerForm.address}
                            onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                            placeholder="Alamat"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={handleCreateCustomer} disabled={creatingCustomer}>
                          {creatingCustomer ? "Menyimpan..." : "Simpan Customer"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewCustomer(false)}>
                          Batal
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* PPN Section */}
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">PPN (Pajak)</Label>
                      <p className="text-xs text-muted-foreground">Aktifkan untuk menambahkan pajak PPN</p>
                    </div>
                    <Switch
                      checked={form.ppn_enabled}
                      onCheckedChange={(checked) => setForm({ ...form, ppn_enabled: checked, ppn_custom: false, ppn_percentage: "11" })}
                    />
                  </div>
                  {form.ppn_enabled && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-3">
                        <Badge variant={!form.ppn_custom ? "default" : "outline"} className="cursor-pointer" onClick={() => setForm({ ...form, ppn_custom: false, ppn_percentage: "11" })}>
                          11% (Default)
                        </Badge>
                        <Badge variant={form.ppn_custom ? "default" : "outline"} className="cursor-pointer" onClick={() => setForm({ ...form, ppn_custom: true, ppn_percentage: "" })}>
                          Custom
                        </Badge>
                      </div>
                      {form.ppn_custom && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={form.ppn_percentage}
                            onChange={(e) => setForm({ ...form, ppn_percentage: e.target.value })}
                            className="w-24 text-right"
                            placeholder="0"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      )}
                      {ppnPct > 0 && (
                        <p className="text-xs text-muted-foreground">
                          PPN {ppnPct}% = Rp {ppnAmount.toLocaleString("id-ID")}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Order Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Item Produk</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-3 w-3 mr-1" />Tambah Item
                    </Button>
                  </div>

                  {items.map((item, index) => (
                    <Card key={index} className="relative">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-5 space-y-1">
                            <Label className="text-xs">Nama Produk</Label>
                            <Input
                              value={item.product_name}
                              onChange={(e) => updateItem(index, "product_name", e.target.value)}
                              placeholder="Nama produk"
                              required
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">Harga/Unit</Label>
                            <Input
                              type="number"
                              min="0"
                              value={item.price_per_unit}
                              onChange={(e) => updateItem(index, "price_per_unit", e.target.value)}
                              placeholder="0"
                              required
                            />
                          </div>
                          <div className="col-span-1 text-right text-sm font-medium text-muted-foreground pb-2">
                            {calcSubtotal(item).toLocaleString("id-ID")}
                          </div>
                          <div className="col-span-1 pb-1">
                            {items.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(index)}>
                                <X className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="space-y-1 text-sm text-right">
                    <div className="text-muted-foreground">Subtotal: Rp {subtotalAmount.toLocaleString("id-ID")}</div>
                    {ppnPct > 0 && (
                      <div className="text-muted-foreground">PPN {ppnPct}%: Rp {ppnAmount.toLocaleString("id-ID")}</div>
                    )}
                    <div className="font-semibold text-foreground">Total: Rp {totalAmount.toLocaleString("id-ID")}</div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Buat Order"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Order #{detailOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> {customerName(detailOrder.customer_id)}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColor(detailOrder.status)}>{detailOrder.status}</Badge></div>
                <div><span className="text-muted-foreground">Total:</span> Rp {(detailOrder.total_price || 0).toLocaleString("id-ID")}</div>
                <div><span className="text-muted-foreground">Bayar:</span> Rp {(detailOrder.amount_paid || 0).toLocaleString("id-ID")}</div>
                <div><span className="text-muted-foreground">PPN:</span> {(detailOrder as any).ppn_percentage > 0 ? `Ya (${(detailOrder as any).ppn_percentage}%) — Rp ${((detailOrder as any).ppn_amount || 0).toLocaleString("id-ID")}` : "Tidak"}</div>
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
              <Button className="w-full mt-2" variant="outline" onClick={() => handleDownloadInvoice(detailOrder)}>
                <FileDown className="h-4 w-4 mr-2" />Download Invoice PDF
              </Button>
              {detailOrder.payment_status === "paid" && (
                <Button className="w-full mt-2" variant="outline" onClick={() => handleDownloadNota(detailOrder)}>
                  <Receipt className="h-4 w-4 mr-2" />Download Nota Penjualan
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {(isLoading || customersLoading) && <p className="text-muted-foreground">Loading...</p>}
      {(isError || customersError) && (
        <p className="text-sm text-destructive mb-4">{getErrorMessage(error || customersErrorObj)}</p>
      )}

      {!isLoading && !customersLoading && !isError && !customersError && (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Menampilkan {paginatedOrders.length} dari {filteredOrders.length} order.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PPN</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Bayar</TableHead>
                <TableHead>Pembayaran</TableHead>
                <TableHead className="w-32">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.order_number}</TableCell>
                  <TableCell>{customerName(o.customer_id)}</TableCell>
                  <TableCell><Badge variant={statusColor(o.status)}>{o.status}</Badge></TableCell>
                  <TableCell>{(o as any).ppn_percentage > 0 ? <Badge variant="secondary">PPN {(o as any).ppn_percentage}%</Badge> : "-"}</TableCell>
                  <TableCell>{(o.total_price || 0).toLocaleString("id-ID")}</TableCell>
                  <TableCell>{(o.amount_paid || 0).toLocaleString("id-ID")}</TableCell>
                  <TableCell><Badge variant={o.payment_status === "paid" ? "default" : "outline"}>{o.payment_status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openDetail(o)} title="Detail"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadInvoice(o)} title="Download Invoice"><FileDown className="h-4 w-4" /></Button>
                      {o.payment_status === "paid" && (
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadNota(o)} title="Download Nota"><Receipt className="h-4 w-4 text-green-600" /></Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus order?</AlertDialogTitle>
                            <AlertDialogDescription>Data order dan semua item akan dihapus secara permanen.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  await deleteOrderMutation.mutateAsync(o.id);
                                  toast({ title: "Berhasil", description: "Order dihapus." });
                                } catch (err) {
                                  toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
                                }
                              }}
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Belum ada order.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {pageCount > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} />
                  </PaginationItem>
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <PaginationItem key={i + 1}>
                      <PaginationLink href="#" isActive={i + 1 === currentPage} onClick={(e) => { e.preventDefault(); setPage(i + 1); }}>
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(pageCount, p + 1)); }} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Orders;
