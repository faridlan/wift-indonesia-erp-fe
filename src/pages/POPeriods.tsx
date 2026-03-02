import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Lock, Unlock } from "lucide-react";
import {
  usePOPeriods, useCreatePOPeriod, useUpdatePOPeriod, useDeletePOPeriod,
} from "@/hooks/api/usePOPeriods";
import type { POPeriod } from "@/services/po-periods";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const POPeriods = () => {
  const { toast } = useToast();
  const { data: periods = [], isLoading } = usePOPeriods();
  const createMutation = useCreatePOPeriod();
  const updateMutation = useUpdatePOPeriod();
  const deleteMutation = useDeletePOPeriod();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<POPeriod | null>(null);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", start_date: "", end_date: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: POPeriod) => {
    setEditing(p);
    setForm({ name: p.name, start_date: p.start_date, end_date: p.end_date });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      toast({ title: "Error", description: "Semua field wajib diisi.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          name: form.name,
          start_date: form.start_date,
          end_date: form.end_date,
        });
        toast({ title: "Berhasil", description: "PO period diperbarui." });
      } else {
        // Check if there's already an open PO
        const hasOpen = periods.some((p) => p.status === "open");
        if (hasOpen) {
          toast({ title: "Error", description: "Sudah ada PO period yang aktif. Tutup dulu sebelum membuat yang baru.", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        await createMutation.mutateAsync({
          name: form.name,
          start_date: form.start_date,
          end_date: form.end_date,
        });
        toast({ title: "Berhasil", description: "PO period baru dibuat." });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (p: POPeriod) => {
    const newStatus = p.status === "open" ? "closed" : "open";
    if (newStatus === "open") {
      const hasOpen = periods.some((x) => x.status === "open" && x.id !== p.id);
      if (hasOpen) {
        toast({ title: "Error", description: "Sudah ada PO period aktif. Tutup dulu yang lain.", variant: "destructive" });
        return;
      }
    }
    try {
      await updateMutation.mutateAsync({ id: p.id, status: newStatus });
      toast({ title: "Berhasil", description: `PO period ${newStatus === "open" ? "dibuka" : "ditutup"}.` });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal.", variant: "destructive" });
    }
  };

  const formatDate = (d: string) => {
    try {
      return format(new Date(d), "dd MMM yyyy", { locale: localeId });
    } catch {
      return d;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Pre Order Periods</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Buat PO Period</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit PO Period" : "Buat PO Period Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama PO</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: PO Minggu 1 Maret" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Selesai</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Buat PO Period"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      {!isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Tanggal Mulai</TableHead>
              <TableHead>Tanggal Selesai</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{formatDate(p.start_date)}</TableCell>
                <TableCell>{formatDate(p.end_date)}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "open" ? "default" : "secondary"}>
                    {p.status === "open" ? "Open" : "Closed"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleStatus(p)} title={p.status === "open" ? "Close PO" : "Open PO"}>
                      {p.status === "open" ? <Lock className="h-4 w-4 text-orange-500" /> : <Unlock className="h-4 w-4 text-green-500" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus PO Period?</AlertDialogTitle>
                          <AlertDialogDescription>PO period "{p.name}" akan dihapus. Order yang terkait tidak akan terpengaruh.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutateAsync(p.id).then(() => toast({ title: "Berhasil", description: "PO period dihapus." }))}>
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {periods.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada PO period.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default POPeriods;
