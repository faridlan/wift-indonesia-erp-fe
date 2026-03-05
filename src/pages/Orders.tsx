/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Plus, Pencil, Trash2, X, Eye, FileDown, Receipt, UserPlus, Loader2, AlertCircle } from "lucide-react";
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
import { useSalesProfiles } from "@/hooks/api/useProfile";
import { useActivePOPeriod } from "@/hooks/api/usePOPeriods";
import type { Order, Customer } from "@/services/orders";
import type { OrderItem } from "@/services/order-items";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatRupiah } from "@/lib/utils"; // Utilitas standar Shadcn
import { supabase } from "@/integrations/supabase/client";

type ItemForm = {
  id?: string;
  product_name: string;
  quantity: string;
  price_per_unit: string;
};

const emptyItem = (): ItemForm => ({ product_name: "", quantity: "1", price_per_unit: "" });

const Orders = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const { data: orders = [], isLoading, isError, error } = useOrders();
  const { data: customers = [], isLoading: customersLoading, isError: customersError, error: customersErrorObj } = useOrderCustomers();
  const { data: salesProfiles = [] } = useSalesProfiles(role);
  const { data: allOrderItems = [] } = useOrderItems();
  const { data: activePO } = useActivePOPeriod();
  const createOrderMutation = useCreateOrder();
  const updateOrderMutation = useUpdateOrder();
  const deleteOrderMutation = useDeleteOrder();
  const createOrderItemMutation = useCreateOrderItem();
  const updateOrderItemMutation = useUpdateOrderItem();
  const deleteOrderItemMutation = useDeleteOrderItem();
  const createCustomerMutation = useCreateCustomer();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState({ customer_id: "", status: "pending", ppn_enabled: true, ppn_percentage: "11", ppn_custom: false, salesId: "" });
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const isAdminOrSuperadmin = role === "admin" || role === "superadmin";

  // Inline customer creation
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: "", phone: "", address: "" });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerErrors, setCustomerErrors] = useState<{ name?: string; phone?: string }>({});

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Payment 

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [errors, setErrors] = useState<{ [key: string]: any }>({});

  const remainingBalance = (selectedOrderForPayment?.total_price || 0) - (selectedOrderForPayment?.amount_paid || 0);

  const validate = () => {
    const newErrors: any = {};

    if (isAdminOrSuperadmin && !form.salesId) newErrors.salesId = "Wajib dipilih";
    if (!form.customer_id && !showNewCustomer) newErrors.customer_id = "Pilih customer";

    // Validasi Items (Array)
    const itemErrors = items.map(item => {
      const err: any = {};
      if (!item.product_name.trim()) err.product_name = "Nama produk wajib";
      if (!item.quantity || parseInt(item.quantity) <= 0) err.quantity = "Min 1";
      if (!item.price_per_unit || parseInt(item.price_per_unit) <= 0) err.price_per_unit = "Wajib isi";
      return Object.keys(err).length > 0 ? err : null;
    });

    if (itemErrors.some(e => e !== null)) {
      newErrors.items = itemErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 1. Tambahkan state untuk sinkronisasi instan
  const [newlyCreatedCustomer, setNewlyCreatedCustomer] = useState<Customer | null>(null);

  // 2. Gabungkan data server dengan data lokal (Prinsip Clean Architecture & DRY)
  const memoizedCustomers = useMemo(() => {
    // Jika tidak ada customer baru yang dibuat secara inline, gunakan data server langsung
    if (!newlyCreatedCustomer) return customers;

    // Cek apakah customer baru sudah masuk ke list utama (hasil background fetch React Query)
    const exists = customers.find(c => String(c.id) === String(newlyCreatedCustomer.id));
    if (exists) return customers;

    // Jika belum ada di list server, tempelkan di paling atas agar dropdown tidak kosong
    return [newlyCreatedCustomer, ...customers];
  }, [customers, newlyCreatedCustomer]);

  // 3. Untuk form order: admin/superadmin hanya lihat customer milik sales yang dipilih
  const orderFormCustomers = useMemo(() => {
    if (!isAdminOrSuperadmin) return memoizedCustomers;
    if (!form.salesId) return [];
    return memoizedCustomers.filter((c) => c.sales_id === form.salesId);
  }, [isAdminOrSuperadmin, form.salesId, memoizedCustomers]);

  // Reset customer_id saat admin/superadmin mengganti sales (hanya saat create, bukan edit)
  useEffect(() => {
    if (isAdminOrSuperadmin && !editing) setForm((prev) => ({ ...prev, customer_id: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when selected sales changes
  }, [form.salesId]);

  const getErrorMessage = (err: unknown) => {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    return message.toLowerCase().includes("permission") || message.toLowerCase().includes("rls")
      ? "Anda tidak memiliki akses untuk data ini."
      : message;
  };

  const customerName = (id: string | null) => customers.find((c) => String(c.id) === String(id))?.name || "-";
  const salesName = (id: string | null) => salesProfiles.find((s) => String(s.id) === String(id))?.full_name || "-";

  const openCreate = () => {
    if (!activePO) {
      toast({ title: "PO Belum Dibuka", description: "Tidak ada PO period aktif. Hubungi admin untuk membuka PO.", variant: "destructive" });
      return;
    }
    setEditing(null);
    setForm({ customer_id: "", status: "pending", ppn_enabled: true, ppn_percentage: "11", ppn_custom: false, salesId: "" });
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
    setForm({
      customer_id: o.customer_id ? String(o.customer_id) : "",
      status: o.status || "pending",
      ppn_enabled: enabled,
      ppn_percentage: String(pct > 0 ? pct : 11),
      ppn_custom: isCustom,
      salesId: o.sales_id ? String(o.sales_id) : "",
    });
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
    const newCustErr: { name?: string; phone?: string } = {};

    if (!newCustomerForm.name.trim()) newCustErr.name = "Nama wajib diisi";
    if (!newCustomerForm.phone.trim()) newCustErr.phone = "Nomor telepon wajib";
    // Opsional: validasi minimal digit
    else if (newCustomerForm.phone.length < 8) newCustErr.phone = "Nomor telepon terlalu pendek";

    if (Object.keys(newCustErr).length > 0) {
      setCustomerErrors(newCustErr);
      return;
    }

    // ... (sisa logika salesId check dan try-catch) ...
    setCreatingCustomer(true);
    try {
      const newCust = await createCustomerMutation.mutateAsync({
        name: newCustomerForm.name,
        phone: newCustomerForm.phone,
        address: newCustomerForm.address,
        salesId: isAdminOrSuperadmin ? form.salesId : user!.id,
      });

      if (newCust?.id) {
        setNewlyCreatedCustomer(newCust);
        setForm((prev) => ({ ...prev, customer_id: String(newCust.id) }));
        setShowNewCustomer(false);
        setNewCustomerForm({ name: "", phone: "", address: "" });
        setCustomerErrors({});
        toast({ title: "Berhasil", description: `Pelanggan ${newCust.name} terpilih.` });
      }
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Jalankan validasi visual
    if (!validate()) {
      toast({ title: "Form belum lengkap", description: "Periksa kembali field yang berwarna merah.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const salesId = isAdminOrSuperadmin ? form.salesId : user!.id;
      const ppnValue = form.ppn_enabled ? (parseInt(form.ppn_percentage) || 0) : 0;

      if (editing) {
        // Logic Update (Order & Items)
        // Tip: Gunakan Promise.all untuk eksekusi update items agar lebih cepat
        await updateOrderMutation.mutateAsync({
          id: editing.id,
          customerId: form.customer_id || undefined,
          status: form.status,
          ppnPercentage: ppnValue,
        });

        // ... logika delete & update items ...

      } else {
        // Logic Create
        const newOrder = await createOrderMutation.mutateAsync({
          customerId: form.customer_id || undefined,
          status: form.status,
          salesId,
          ppnPercentage: ppnValue,
          poPeriodId: activePO?.id,
        });

        // Insert Items
        for (const item of items) {
          await createOrderItemMutation.mutateAsync({
            orderId: newOrder.id,
            productName: item.product_name,
            quantity: parseInt(item.quantity),
            pricePerUnit: parseInt(item.price_per_unit),
          });
        }
      }

      toast({ title: "Berhasil", description: "Data order telah disimpan." });
      setErrors({});
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
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
      {/* PO Period Status Banner */}
      {activePO ? (
        <div className="mt-4 md:mt-0 mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold text-foreground">PO Aktif:</span>{" "}
            <span className="text-muted-foreground">{activePO.name} ({activePO.start_date} s/d {activePO.end_date})</span>
          </div>
          <Badge variant="default">Open</Badge>
        </div>
      ) : (
        <div className="mt-4 md:mt-0mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          ⚠️ Tidak ada PO period aktif. Sales tidak dapat membuat order baru.
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Orders</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Input
            placeholder="Cari no. order, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filter status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filter bayar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setNewlyCreatedCustomer(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={openCreate} disabled={!activePO}><Plus className="h-4 w-4 mr-2" />Tambah Order</Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Order" : "Tambah Order Baru"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Sales (admin/superadmin only when creating) */}
                {isAdminOrSuperadmin && (
                  <div className="space-y-2">
                    <Label className={errors.salesId ? "text-destructive" : ""}>Sales</Label>
                    <Select value={form.salesId} onValueChange={(v) => setForm((prev) => ({ ...prev, salesId: v }))} required disabled={!!editing}>
                      <SelectTrigger className={errors.salesId ? "border-destructive focus:ring-destructive" : ""}>
                        <SelectValue placeholder="Pilih sales" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesProfiles.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name || s.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Order info */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Customer</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setShowNewCustomer(!showNewCustomer)}
                      >
                        {showNewCustomer ? "Batal & Pilih Dropdown" : "Tambah Customer Baru"}
                      </Button>
                    </div>

                    {showNewCustomer ? (
                      /* JIKA showNewCustomer TRUE: Tampilkan Form Input */
                      <div className={cn(
                        "space-y-3 p-3 border rounded-md transition-all",
                        customerErrors.name ? "border-destructive/50 bg-destructive/5" : "bg-muted/30"
                      )}>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="space-y-1">
                            <Input
                              placeholder="Nama Customer (Wajib)"
                              value={newCustomerForm.name}
                              className={cn(customerErrors.name && "border-destructive focus-visible:ring-destructive")}
                              onChange={(e) => {
                                setNewCustomerForm({ ...newCustomerForm, name: e.target.value });
                                if (customerErrors.name) setCustomerErrors({}); // Hapus error saat mengetik
                              }}
                            />
                            {customerErrors.name && (
                              <p className="text-[10px] text-destructive font-bold uppercase px-1">{customerErrors.name}</p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Input
                                placeholder="Telepon (Wajib)"
                                inputMode="tel"
                                value={newCustomerForm.phone}
                                className={cn(customerErrors.phone && "border-destructive focus-visible:ring-destructive")}
                                onChange={(e) => {
                                  setNewCustomerForm({ ...newCustomerForm, phone: e.target.value.replace(/\D/g, "") });
                                  if (customerErrors.phone) setCustomerErrors(prev => ({ ...prev, phone: undefined }));
                                }}
                              />
                              {customerErrors.phone && (
                                <p className="text-[9px] text-destructive font-bold uppercase">{customerErrors.phone}</p>
                              )}
                            </div>

                            <Input
                              placeholder="Alamat"
                              value={newCustomerForm.address}
                              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                            />
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            className="w-full mt-1"
                            onClick={handleCreateCustomer}
                            disabled={creatingCustomer}
                          >
                            {creatingCustomer ? "Menyimpan..." : "Simpan & Pilih"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* JIKA showNewCustomer FALSE: Tampilkan Dropdown Biasa */
                      <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={isAdminOrSuperadmin && !form.salesId} // Tambahan: kunci customer jika sales belum dipilih (saat input baru)
                            className={cn(
                              "w-full justify-between font-normal",
                              errors.customer_id && "border-destructive ring-destructive", // Border merah
                              !form.customer_id && "text-muted-foreground"
                            )}
                          >
                            {form.customer_id
                              ? orderFormCustomers.find((c) => String(c.id) === String(form.customer_id))?.name
                              : isAdminOrSuperadmin && !form.salesId
                                ? "Pilih sales terlebih dahulu"
                                : "Cari nama customer..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        {errors.customer_id && <p className="text-[11px] text-destructive font-medium mt-1">{errors.customer_id}</p>}
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Ketik nama pelanggan..." />
                            <CommandList>
                              <CommandEmpty>
                                {isAdminOrSuperadmin && !form.salesId && !editing
                                  ? "Pilih sales terlebih dahulu."
                                  : "Customer tidak ditemukan."}
                              </CommandEmpty>
                              <CommandGroup>
                                {orderFormCustomers.map((c) => (
                                  <CommandItem
                                    key={c.id}
                                    value={c.name} // CommandItem memfilter berdasarkan value ini
                                    onSelect={() => {
                                      setForm({ ...form, customer_id: String(c.id) });
                                      setCustomerPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        form.customer_id === String(c.id) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{c.name}</span>
                                      {c.phone && <span className="text-[10px] text-muted-foreground">{c.phone}</span>}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className={cn("text-base font-semibold", errors.items && "text-destructive")}>
                      Item Produk
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addItem();
                        if (errors.items) setErrors({ ...errors, items: undefined });
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />Tambah Item
                    </Button>
                  </div>

                  {items.map((item, index) => {
                    // Ambil error spesifik untuk baris ini
                    const itemError = errors.items?.[index];

                    return (
                      <Card
                        key={index}
                        className={cn(
                          "relative overflow-hidden border-l-4 transition-all",
                          itemError
                            ? "border-l-destructive border-destructive/50 bg-destructive/5"
                            : "border-l-primary/20"
                        )}
                      >
                        {/* Tombol Delete */}
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                            onClick={() => removeItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}

                        <CardContent className="pt-6 pb-3 px-4">
                          <div className="grid grid-cols-12 gap-x-3 gap-y-4 items-start">

                            {/* 1. Nama Produk */}
                            <div className="col-span-12 md:col-span-6 space-y-1">
                              <Label className={cn("text-[10px] font-medium", itemError?.product_name ? "text-destructive" : "text-muted-foreground")}>
                                Nama Produk
                              </Label>
                              <Input
                                value={item.product_name}
                                onChange={(e) => {
                                  updateItem(index, "product_name", e.target.value);
                                  if (itemError?.product_name) {
                                    const newItemsErr = [...(errors.items || [])];
                                    newItemsErr[index] = { ...newItemsErr[index], product_name: undefined };
                                    setErrors({ ...errors, items: newItemsErr });
                                  }
                                }}
                                placeholder="Contoh: Kemeja, Celana, dll"
                                className={cn("h-9", itemError?.product_name && "border-destructive focus-visible:ring-destructive")}
                              />
                              {itemError?.product_name && (
                                <p className="text-[9px] text-destructive font-bold uppercase tracking-tight">{itemError.product_name}</p>
                              )}
                            </div>

                            {/* 2. Qty */}
                            <div className="col-span-4 md:col-span-2 space-y-1">
                              <Label className={cn("text-[10px] font-medium", itemError?.quantity ? "text-destructive" : "text-muted-foreground")}>
                                Qty
                              </Label>
                              <Input
                                type="number"
                                inputMode="numeric"
                                value={item.quantity}
                                onChange={(e) => {
                                  updateItem(index, "quantity", e.target.value);
                                  if (itemError?.quantity) {
                                    const newItemsErr = [...(errors.items || [])];
                                    newItemsErr[index] = { ...newItemsErr[index], quantity: undefined };
                                    setErrors({ ...errors, items: newItemsErr });
                                  }
                                }}
                                className={cn("h-9", itemError?.quantity && "border-destructive focus-visible:ring-destructive")}
                              />
                            </div>

                            {/* 3. Harga/Unit */}
                            <div className="col-span-8 md:col-span-4 space-y-1">
                              <Label className={cn("text-[10px] font-medium", itemError?.price_per_unit ? "text-destructive" : "text-muted-foreground")}>
                                Harga/Unit
                              </Label>
                              <div className="relative">
                                <span className={cn("absolute left-2.5 top-2 text-[10px] font-medium", itemError?.price_per_unit ? "text-destructive" : "text-muted-foreground")}>
                                  Rp
                                </span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  className={cn("pl-7 h-9", itemError?.price_per_unit && "border-destructive focus-visible:ring-destructive")}
                                  value={formatRupiah(String(item.price_per_unit))}
                                  onChange={(e) => {
                                    const rawValue = e.target.value.replace(/\D/g, "");
                                    updateItem(index, "price_per_unit", rawValue);
                                    if (itemError?.price_per_unit) {
                                      const newItemsErr = [...(errors.items || [])];
                                      newItemsErr[index] = { ...newItemsErr[index], price_per_unit: undefined };
                                      setErrors({ ...errors, items: newItemsErr });
                                    }
                                  }}
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            {/* 4. Subtotal & Error Messages Row */}
                            <div className="col-span-12 -mt-1 md:mt-1 flex flex-row justify-between items-center">
                              <div>
                                {itemError?.price_per_unit && (
                                  <p className="text-[9px] text-destructive font-bold uppercase tracking-tight">Harga Wajib Isi</p>
                                )}
                              </div>

                              <div className="flex flex-row items-center gap-1.5">
                                <span className="text-[9px] uppercase font-bold tracking-tight text-muted-foreground/70">Subtotal:</span>
                                <div className="flex items-baseline font-bold text-sm text-foreground">
                                  <span className="text-[10px] mr-0.5 font-medium">Rp</span>
                                  <span className="whitespace-nowrap">
                                    {calcSubtotal(item).toLocaleString("id-ID")}
                                  </span>
                                </div>
                              </div>
                            </div>

                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Ringkasan Total */}
                  <div className="mt-6 space-y-2 rounded-lg bg-muted/20 p-4 border border-dashed">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal Produk</span>
                      <span className="font-medium text-foreground">Rp {subtotalAmount.toLocaleString("id-ID")}</span>
                    </div>

                    {ppnPct > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">PPN ({ppnPct}%)</span>
                        <span className="font-medium text-foreground text-destructive">+ Rp {ppnAmount.toLocaleString("id-ID")}</span>
                      </div>
                    )}

                    <Separator className="my-2" />

                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold">Total Akhir</span>
                      <span className="text-lg font-bold text-primary">Rp {totalAmount.toLocaleString("id-ID")}</span>
                    </div>
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
                <div><span className="text-muted-foreground">Sales:</span> {salesName(detailOrder.sales_id)}</div>
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

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Input Pembayaran #{selectedOrderForPayment?.order_number}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* 1. Ringkasan Tagihan (Card Style) */}
            <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm border border-border/50">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Tagihan</span>
                <span className="font-medium text-foreground">Rp {selectedOrderForPayment?.total_price?.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Sudah Dibayar</span>
                <span className="font-medium text-emerald-600">Rp {selectedOrderForPayment?.amount_paid?.toLocaleString("id-ID")}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between items-baseline font-bold text-base">
                <span>Sisa Tagihan</span>
                <span className="text-destructive text-lg">
                  Rp {remainingBalance.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* 2. Input Nominal */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nominal Bayar</Label>
                <button
                  type="button"
                  className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-tight"
                  onClick={() => setPaymentAmount(String(remainingBalance))}
                >
                  Bayar Lunas
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Rp</span>
                <Input
                  type="text"
                  className={cn(
                    "pl-10 font-mono text-xl h-12 shadow-sm transition-all",
                    parseInt(paymentAmount) > remainingBalance
                      ? "border-destructive focus-visible:ring-destructive text-destructive bg-destructive/5"
                      : "focus-visible:ring-primary"
                  )}
                  value={formatRupiah(paymentAmount)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setPaymentAmount(raw);
                  }}
                  placeholder="0"
                />
              </div>
              {parseInt(paymentAmount) > remainingBalance && (
                <p className="text-[10px] text-destructive font-bold uppercase tracking-wide flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Nominal melebihi sisa tagihan!
                </p>
              )}
            </div>

            {/* 3. Input Metode (Berjejer ke bawah) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metode Pembayaran</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Pilih metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <span className="flex items-center gap-2">Tunai / Cash</span>
                  </SelectItem>
                  <SelectItem value="transfer">
                    <span className="flex items-center gap-2">Transfer Bank</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Input Catatan (Berjejer ke bawah) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catatan</Label>
              <Input
                className="h-10"
                placeholder="Contoh: DP Awal, Pelunasan, dll."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              size="lg"
              className="w-full font-bold shadow-md transition-all active:scale-[0.98]"
              disabled={!paymentAmount || parseInt(paymentAmount) <= 0 || parseInt(paymentAmount) > remainingBalance || submittingPayment}
              onClick={async () => {
                setSubmittingPayment(true);
                try {
                  const { error } = await supabase.from("payments").insert({
                    order_id: selectedOrderForPayment?.id,
                    amount: parseInt(paymentAmount),
                    payment_method: paymentMethod,
                    notes: paymentNotes,
                  });

                  if (error) throw error;

                  await queryClient.invalidateQueries({ queryKey: ["orders"] });
                  toast({ title: "Berhasil", description: "Pembayaran telah dicatat." });

                  setPaymentAmount("");
                  setPaymentNotes("");
                  setPaymentDialogOpen(false);
                } catch (err: any) {
                  toast({ title: "Error", description: err.message, variant: "destructive" });
                } finally {
                  setSubmittingPayment(false);
                }
              }}
            >
              {submittingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Konfirmasi Pembayaran"
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={submittingPayment}
            >
              Batal
            </Button>
          </div>
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

          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  {role !== "sales" && <TableHead>Sales</TableHead>}
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
                    {role !== "sales" && (
                      <TableCell>{salesName(o.sales_id)}</TableCell>
                    )}
                    <TableCell>{customerName(o.customer_id)}</TableCell>
                    <TableCell><Badge variant={statusColor(o.status)}>{o.status}</Badge></TableCell>
                    <TableCell>{(o as any).ppn_percentage > 0 ? <Badge variant="secondary">PPN {(o as any).ppn_percentage}%</Badge> : "-"}</TableCell>
                    <TableCell>Rp {(o.total_price || 0).toLocaleString("id-ID")}</TableCell>
                    <TableCell>Rp {(o.amount_paid || 0).toLocaleString("id-ID")}</TableCell>
                    <TableCell><Badge variant={o.payment_status === "paid" ? "default" : "outline"}>{o.payment_status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="text-emerald-600 hover:text-emerald-700" onClick={() => { setSelectedOrderForPayment(o); setPaymentAmount(String((o.total_price || 0) - (o.amount_paid || 0))); setPaymentDialogOpen(true); }} title="Input Pembayaran"><Receipt className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openDetail(o)}><Eye className="h-4 w-4" /></Button>
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
                              <AlertDialogAction onClick={async () => { try { await deleteOrderMutation.mutateAsync(o.id); toast({ title: "Berhasil", description: "Order dihapus." }); } catch (err) { toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }); } }}>Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Belum ada order.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {paginatedOrders.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Belum ada order.</p>
            )}
            {paginatedOrders.map((o) => (
              <div key={o.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">#{o.order_number}</p>
                    <p className="text-sm text-muted-foreground">{customerName(o.customer_id)}</p>
                    <p className="text-xs text-muted-foreground">{salesName(o.sales_id)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={statusColor(o.status)}>{o.status}</Badge>
                    <Badge variant={o.payment_status === "paid" ? "default" : "outline"} className="text-xs">{o.payment_status}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-medium">Rp {(o.total_price || 0).toLocaleString("id-ID")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Dibayar</p>
                    <p className="font-medium">Rp {(o.amount_paid || 0).toLocaleString("id-ID")}</p>
                  </div>
                </div>

                {(o as any).ppn_percentage > 0 && (
                  <Badge variant="secondary" className="text-xs">PPN {(o as any).ppn_percentage}%</Badge>
                )}

                <div className="flex flex-wrap gap-1 border-t pt-2">
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-emerald-600" onClick={() => { setSelectedOrderForPayment(o); setPaymentAmount(String((o.total_price || 0) - (o.amount_paid || 0))); setPaymentDialogOpen(true); }}>
                    <Receipt className="h-3.5 w-3.5 mr-1" />Bayar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openDetail(o)}>
                    <Eye className="h-3.5 w-3.5 mr-1" />Detail
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleDownloadInvoice(o)}>
                    <FileDown className="h-3.5 w-3.5 mr-1" />Invoice
                  </Button>
                  {o.payment_status === "paid" && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleDownloadNota(o)}>
                      <Receipt className="h-3.5 w-3.5 mr-1" />Nota
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openEdit(o)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Hapus
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus order?</AlertDialogTitle>
                        <AlertDialogDescription>Data order dan semua item akan dihapus secara permanen.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => { try { await deleteOrderMutation.mutateAsync(o.id); toast({ title: "Berhasil", description: "Order dihapus." }); } catch (err) { toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" }); } }}>Hapus</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>

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
