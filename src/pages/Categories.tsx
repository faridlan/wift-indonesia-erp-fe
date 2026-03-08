import { useState, useRef } from "react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/api/useCategories";
import { useUploadProductFile } from "@/hooks/api/useProductImages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tags, Search, Upload, Loader2, X, ImageIcon } from "lucide-react";
import { Category } from "@/services/categories";

const Categories = () => {
  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const uploadFile = useUploadProductFile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState("");
  const [uploadingChart, setUploadingChart] = useState(false);
  const sizeChartRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: "", slug: "", description: "", size_chart_url: "" });

  const resetForm = () => setForm({ name: "", slug: "", description: "", size_chart_url: "" });

  const openCreate = () => { resetForm(); setEditingCategory(null); setDialogOpen(true); };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      size_chart_url: (category as any).size_chart_url || "",
    });
    setDialogOpen(true);
  };

  const handleSizeChart = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingChart(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `size-charts/${Date.now()}.${ext}`;
      const url = await uploadFile.mutateAsync({ file, path });
      setForm((f) => ({ ...f, size_chart_url: url }));
    } finally { setUploadingChart(false); }
  };

  const handleSubmit = async () => {
    const payload: any = {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      size_chart_url: form.size_chart_url || null,
    };
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, category: payload });
    } else {
      await createCategory.mutateAsync(payload);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus kategori ini?")) await deleteCategory.mutateAsync(id);
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg"><Tags className="h-5 w-5" /> Kategori</CardTitle>
            <Button onClick={openCreate} size="sm" className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Tambah Kategori</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari kategori..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Size Chart</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                    <TableCell>
                      {(category as any).size_chart_url ? (
                        <a href={(category as any).size_chart_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                          <ImageIcon className="h-4 w-4" /> Lihat
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{category.description || "-"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(category)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Tidak ada kategori ditemukan</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((category) => (
              <Card key={category.id} className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{category.name}</p>
                    <p className="text-xs text-muted-foreground">{category.slug}</p>
                    {category.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{category.description}</p>}
                    {(category as any).size_chart_url && (
                      <a href={(category as any).size_chart_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1 mt-1">
                        <ImageIcon className="h-3 w-3" /> Size Chart
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(category)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(category.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Tidak ada kategori ditemukan</p>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Kategori *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="contoh: tactical" />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Size Chart</Label>
              {form.size_chart_url && (
                <div className="relative w-32">
                  <img src={form.size_chart_url} alt="Size Chart" className="h-32 w-32 rounded object-cover" />
                  <button type="button" onClick={() => setForm({ ...form, size_chart_url: "" })} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"><X className="h-3 w-3" /></button>
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => sizeChartRef.current?.click()} disabled={uploadingChart}>
                {uploadingChart ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Upload Size Chart
              </Button>
              <input ref={sizeChartRef} type="file" accept="image/*" className="hidden" onChange={handleSizeChart} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
            <Button onClick={handleSubmit} disabled={!form.name || !form.slug}>{editingCategory ? "Simpan" : "Tambah"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
