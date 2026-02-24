import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  useCreateOrder,
  useDeleteOrder,
  useOrderCustomers,
  useOrders,
  useUpdateOrder,
} from "@/hooks/api/useOrders";
import type { Order, Customer } from "@/services/orders";

const Orders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    data: orders = [],
    isLoading,
    isError,
    error,
  } = useOrders();
  const {
    data: customers = [],
    isLoading: customersLoading,
    isError: customersError,
    error: customersErrorObj,
  } = useOrderCustomers();
  const createOrderMutation = useCreateOrder();
  const updateOrderMutation = useUpdateOrder();
  const deleteOrderMutation = useDeleteOrder();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState({ customer_id: "", status: "pending" });
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [statusFilter, paymentStatusFilter, search]);

  const getErrorMessage = (err: unknown) => {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    const lower = message.toLowerCase();
    if (lower.includes("permission") || lower.includes("rls")) {
      return "Anda tidak memiliki akses untuk data ini.";
    }
    return message;
  };

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name || "-";

  const openCreate = () => {
    setEditing(null);
    setForm({ customer_id: "", status: "pending" });
    setDialogOpen(true);
  };

  const openEdit = (o: Order) => {
    setEditing(o);
    setForm({ customer_id: o.customer_id || "", status: o.status || "pending" });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateOrderMutation.mutateAsync({
          id: editing.id,
          customerId: form.customer_id || undefined,
          status: form.status,
        });
        toast({ title: "Berhasil", description: "Order diperbarui." });
      } else {
        await createOrderMutation.mutateAsync({
          customerId: form.customer_id || undefined,
          status: form.status,
          salesId: user!.id,
        });
        toast({ title: "Berhasil", description: "Order ditambahkan." });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (paymentStatusFilter !== "all" && o.payment_status !== paymentStatusFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const customerNameValue = customerName(o.customer_id).toLowerCase();
    return (
      (o.order_number ?? "").toLowerCase().includes(term) ||
      customerNameValue.includes(term) ||
      (o.status ?? "").toLowerCase().includes(term)
    );
  });

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    (currentPage - 1) * pageSize + pageSize,
  );

  const statusColor = (s: string | null) => {
    if (s === "completed") return "default";
    if (s === "processing") return "secondary";
    return "outline";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Orders</h1>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Cari no. order, customer, atau status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={paymentStatusFilter}
            onValueChange={(v) => setPaymentStatusFilter(v as typeof paymentStatusFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter pembayaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua pembayaran</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Order" : "Tambah Order"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Button type="submit" className="w-full">{editing ? "Simpan" : "Tambah"}</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {(isLoading || customersLoading) && <p className="text-muted-foreground">Loading...</p>}
      {(isError || customersError) && (
        <p className="text-sm text-destructive mb-4">
          {getErrorMessage(error || customersErrorObj)}
        </p>
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
                <TableCell>{customerName(o.customer_id)}</TableCell>
                <TableCell><Badge variant={statusColor(o.status)}>{o.status}</Badge></TableCell>
                <TableCell>{(o.total_price || 0).toLocaleString("id-ID")}</TableCell>
                <TableCell>{(o.amount_paid || 0).toLocaleString("id-ID")}</TableCell>
                <TableCell><Badge variant={o.payment_status === "paid" ? "default" : "outline"}>{o.payment_status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus order?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Data order akan dihapus secara permanen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await deleteOrderMutation.mutateAsync(o.id);
                                toast({ title: "Berhasil", description: "Order dihapus." });
                              } catch (err) {
                                toast({
                                  title: "Error",
                                  description: getErrorMessage(err),
                                  variant: "destructive",
                                });
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
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Belum ada order.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
          {pageCount > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((prev) => Math.max(1, prev - 1));
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: pageCount }).map((_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          isActive={pageNumber === currentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(pageNumber);
                          }}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((prev) => Math.min(pageCount, prev + 1));
                      }}
                    />
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
