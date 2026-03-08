import { useState, useRef } from "react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/api/useProducts";
import { useCategories } from "@/hooks/api/useCategories";
import { useProductImages, useCreateProductImage, useDeleteProductImage, useUploadProductFile } from "@/hooks/api/useProductImages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Package, Search, Upload, ImageIcon, X, Loader2 } from "lucide-react";
import { Product } from "@/services/products";

const Products = () => {
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const uploadFile = useUploadProductFile();
  const createImage = useCreateProductImage();
  const deleteImage = useDeleteProductImage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({ name: "", slug: "", price: "", category_id: "", description: "", image_url: "" });
  const mainImageRef = useRef<HTMLInputElement>(null);
  const sizeChartRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingChart, setUploadingChart] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const { data: galleryImages = [] } = useProductImages(selectedProductId);

  const resetForm = () => setForm({ name: "", slug: "", price: "", category_id: "", description: "", image_url: "", size_chart_url: "" });

  const openCreate = () => { resetForm(); setEditingProduct(null); setDialogOpen(true); };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      slug: product.slug,
      price: product.price?.toString() || "",
      category_id: product.category_id || "",
      description: product.description || "",
      image_url: product.image_url || "",
      size_chart_url: product.size_chart_url || "",
    });
    setDialogOpen(true);
  };

  const openGallery = (productId: string) => {
    setSelectedProductId(productId);
    setGalleryOpen(true);
  };

  const handleFileUpload = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    return uploadFile.mutateAsync({ file, path });
  };

  const handleMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    try {
      const url = await handleFileUpload(file, "main");
      setForm((f) => ({ ...f, image_url: url }));
    } finally { setUploadingMain(false); }
  };

  const handleSizeChart = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingChart(true);
    try {
      const url = await handleFileUpload(file, "size-charts");
      setForm((f) => ({ ...f, size_chart_url: url }));
    } finally { setUploadingChart(false); }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedProductId) return;
    setUploadingGallery(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const url = await handleFileUpload(files[i], `gallery/${selectedProductId}`);
        await createImage.mutateAsync({ product_id: selectedProductId, image_url: url, sort_order: galleryImages.length + i });
      }
    } finally { setUploadingGallery(false); }
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const handleSubmit = async () => {
    const payload = {
      name: form.name,
      slug: form.slug,
      price: form.price ? parseFloat(form.price) : null,
      category_id: form.category_id || null,
      description: form.description || null,
      image_url: form.image_url || null,
      size_chart_url: form.size_chart_url || null,
    };
    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, product: payload });
    } else {
      await createProduct.mutateAsync(payload);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus produk ini?")) await deleteProduct.mutateAsync(id);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryName = (product: any) => product.categories?.name || "-";
  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg"><Package className="h-5 w-5" /> Produk</CardTitle>
            <Button onClick={openCreate} size="sm" className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Tambah Produk</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gambar</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.slug}</p></div>
                    </TableCell>
                    <TableCell>{getCategoryName(product)}</TableCell>
                    <TableCell>{formatPrice(product.price)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openGallery(product.id)} title="Gallery"><ImageIcon className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Tidak ada produk</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((product) => (
              <Card key={product.id} className="p-3">
                <div className="flex gap-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-16 w-16 rounded object-cover shrink-0" />
                  ) : (
                    <div className="h-16 w-16 rounded bg-muted flex items-center justify-center shrink-0"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{getCategoryName(product)}</p>
                    <p className="text-sm font-medium text-primary mt-1">{formatPrice(product.price)}</p>
                  </div>
                </div>
                <div className="flex gap-1 mt-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => openGallery(product.id)}><ImageIcon className="h-3 w-3 mr-1" />Gallery</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Tidak ada produk</p>}
          </div>
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Produk *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="kemeja-tactical" />
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Harga</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>

            {/* Main Image Upload */}
            <div className="space-y-2">
              <Label>Gambar Utama</Label>
              {form.image_url && (
                <div className="relative w-32">
                  <img src={form.image_url} alt="Main" className="h-32 w-32 rounded object-cover" />
                  <button type="button" onClick={() => setForm({ ...form, image_url: "" })} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"><X className="h-3 w-3" /></button>
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => mainImageRef.current?.click()} disabled={uploadingMain}>
                {uploadingMain ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Upload Gambar
              </Button>
              <input ref={mainImageRef} type="file" accept="image/*" className="hidden" onChange={handleMainImage} />
            </div>

            {/* Size Chart Info */}
            {form.category_id && (() => {
              const cat = categories.find(c => c.id === form.category_id);
              const chartUrl = (cat as any)?.size_chart_url;
              return chartUrl ? (
                <div className="space-y-1">
                  <Label>Size Chart (dari kategori)</Label>
                  <a href={chartUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" /> Lihat Size Chart
                  </a>
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
            <Button onClick={handleSubmit} disabled={!form.name || !form.slug}>{editingProduct ? "Simpan" : "Tambah"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gallery Dialog */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Gallery Produk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => galleryRef.current?.click()} disabled={uploadingGallery}>
                {uploadingGallery ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Tambah Gambar
              </Button>
              <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
            </div>
            {galleryImages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Belum ada gambar gallery</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img src={img.image_url} alt="" className="w-full aspect-square rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => deleteImage.mutate({ id: img.id, productId: img.product_id })}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
