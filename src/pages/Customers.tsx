import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useCreateCustomer, useCustomers, useDeleteCustomer, useUpdateCustomer } from "@/hooks/api/useCustomers";
import { useSalesProfiles } from "@/hooks/api/useProfile";
import type { Customer } from "@/services/customers";

const Customers = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const {
    data: customers = [],
    isLoading,
    isError,
    error,
  } = useCustomers();
  const { data: salesProfiles = [] } = useSalesProfiles(role);
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", salesId: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.name.trim()) newErrors.name = "Nama customer tidak boleh kosong";
    // Validasi salesId hanya jika bukan sedang edit (karena saat edit di-freeze)
    if (!editing && isAdminOrSuperadmin && !form.salesId) {
      newErrors.salesId = "Pilih sales yang bertanggung jawab";
    }
    // Jika telepon diisi, baru divalidasi formatnya
    if (form.phone && form.phone.length < 8) {
      newErrors.phone = "Nomor telepon terlalu pendek";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const salesName = (id: string | null) => salesProfiles.find((s) => String(s.id) === String(id))?.full_name || "-";

  const isAdminOrSuperadmin = role === "admin" || role === "superadmin";

  useEffect(() => {
    setPage(1);
  }, [search]);

  const getErrorMessage = (err: unknown) => {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    const lower = message.toLowerCase();
    if (lower.includes("permission") || lower.includes("rls")) {
      return "Anda tidak memiliki akses untuk data ini.";
    }
    return message;
  };

  const filteredCustomers = customers.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.phone ?? "").toLowerCase().includes(term) ||
      (c.address ?? "").toLowerCase().includes(term)
    );
  });

  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    (currentPage - 1) * pageSize + pageSize,
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", phone: "", address: "", salesId: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || "", address: c.address || "", salesId: "" });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Jalankan fungsi validasi yang sudah kita buat sebelumnya
    if (!validate()) return;

    const salesId = isAdminOrSuperadmin ? form.salesId : user!.id;

    // Karena kita sudah punya validasi visual, toast di bawah ini 
    // sebenarnya sudah ter-cover oleh border merah, tapi tetap aman untuk dijaga.
    if (isAdminOrSuperadmin && !salesId) {
      setErrors(prev => ({ ...prev, salesId: "Sales wajib dipilih." }));
      return;
    }

    try {
      if (editing) {
        await updateCustomerMutation.mutateAsync({
          id: editing.id,
          name: form.name,
          phone: form.phone,
          address: form.address,
          // salesId biasanya tidak diupdate saat edit customer 
          // untuk menjaga integritas data histori
        });
        toast({ title: "Berhasil", description: "Customer diperbarui." });
      } else {
        await createCustomerMutation.mutateAsync({
          name: form.name,
          phone: form.phone,
          address: form.address,
          salesId,
        });
        toast({ title: "Berhasil", description: "Customer ditambahkan." });
      }

      // Reset state setelah berhasil
      setErrors({});
      setDialogOpen(false);
    } catch (err) {
      // Jika ada error dari server (misal: nomor hp duplikat)
      const errorMsg = getErrorMessage(err);
      toast({ title: "Gagal menyimpan", description: errorMsg, variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Customers</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <Input
            placeholder="Cari..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Tambah</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Customer" : "Tambah Customer"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Sales Profile - Tetap muncul saat edit tapi disabled (freeze) */}
                {isAdminOrSuperadmin && (
                  <div className="space-y-2">
                    <Label className={errors.salesId ? "text-destructive" : ""}>Sales</Label>
                    <Select
                      value={form.salesId}
                      onValueChange={(v) => {
                        setForm({ ...form, salesId: v });
                        if (errors.salesId) setErrors({ ...errors, salesId: "" });
                      }}
                      disabled={!!editing} // Freeze saat mode edit
                    >
                      <SelectTrigger className={errors.salesId ? "border-destructive focus:ring-destructive" : ""}>
                        <SelectValue placeholder="Pilih sales" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesProfiles.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name || s.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.salesId && <p className="text-[11px] text-destructive font-medium">{errors.salesId}</p>}
                  </div>
                )}

                {/* Nama Customer */}
                <div className="space-y-2">
                  <Label className={errors.name ? "text-destructive" : ""}>Nama Customer</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: "" });
                    }}
                    className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                    placeholder="Contoh: PT. Maju Jaya"
                  />
                  {errors.name && <p className="text-[11px] text-destructive font-medium">{errors.name}</p>}
                </div>

                {/* Telepon - Numeric Keyboard */}
                <div className="space-y-2">
                  <Label className={errors.phone ? "text-destructive" : ""}>Telepon</Label>
                  <Input
                    inputMode="numeric" // Keyboard angka di HP
                    value={form.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, ""); // Hanya terima angka
                      setForm({ ...form, phone: val });
                      if (errors.phone) setErrors({ ...errors, phone: "" });
                    }}
                    className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                    placeholder="0812xxxx"
                  />
                  {errors.phone && <p className="text-[11px] text-destructive font-medium">{errors.phone}</p>}
                </div>

                {/* Alamat */}
                <div className="space-y-2">
                  <Label>Alamat</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Alamat lengkap..."
                  />
                </div>

                <Button type="submit" className="w-full mt-2">
                  {editing ? "Simpan Perubahan" : "Tambah Customer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {isError && (
        <p className="text-sm text-destructive mb-4">
          {getErrorMessage(error)}
        </p>
      )}

      {!isLoading && !isError && (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Menampilkan {paginatedCustomers.length} dari {filteredCustomers.length} customer.
          </p>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* HANYA MUNCUL JIKA BUKAN SALES */}
                  {role !== "sales" && <TableHead>Sales</TableHead>}

                  <TableHead>Nama</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((c) => (
                  <TableRow key={c.id}>
                    {role !== "sales" && (
                      <TableCell className="font-medium text-primary/80">
                        {salesName(c.sales_id)}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone || "-"}</TableCell>
                    <TableCell>{c.address || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus customer?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tindakan ini tidak dapat dibatalkan. Data customer akan dihapus secara permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  try {
                                    await deleteCustomerMutation.mutateAsync(c.id);
                                    toast({ title: "Berhasil", description: "Customer dihapus." });
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
                {filteredCustomers.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada customer.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {paginatedCustomers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Belum ada customer.</p>
            )}
            {paginatedCustomers.map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    {role !== "sales" && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Sales: {salesName(c.sales_id)}
                      </span>
                    )}
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.phone || "Tidak ada telepon"}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus customer?</AlertDialogTitle>
                          <AlertDialogDescription>Data customer akan dihapus secara permanen.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await deleteCustomerMutation.mutateAsync(c.id);
                                toast({ title: "Berhasil", description: "Customer dihapus." });
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
                </div>
                {c.address && (
                  <p className="text-xs text-muted-foreground border-t pt-2">{c.address}</p>
                )}
              </div>
            ))}
          </div>

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

export default Customers;
