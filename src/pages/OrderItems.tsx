import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type OrderItem = Tables<"order_items">;
type Order = Tables<"orders">;

const OrderItems = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OrderItem | null>(null);
  const [form, setForm] = useState({ order_id: "", product_name: "", quantity: "1", price_per_unit: "" });

  const fetchData = async () => {
    const [itemsRes, ordersRes] = await Promise.all([
      supabase.from("order_items").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*"),
    ]);
    if (itemsRes.data) setItems(itemsRes.data);
    if (ordersRes.data) setOrders(ordersRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ order_id: "", product_name: "", quantity: "1", price_per_unit: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: OrderItem) => {
    setEditing(item);
    setForm({
      order_id: item.order_id || "",
      product_name: item.product_name,
      quantity: String(item.quantity),
      price_per_unit: String(item.price_per_unit),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      order_id: form.order_id || null,
      product_name: form.product_name,
      quantity: parseInt(form.quantity),
      price_per_unit: parseInt(form.price_per_unit),
    };
    if (editing) {
      const { error } = await supabase.from("order_items").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Berhasil", description: "Item diperbarui." });
    } else {
      const { error } = await supabase.from("order_items").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Berhasil", description: "Item ditambahkan." });
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item ini?")) return;
    const { error } = await supabase.from("order_items").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Order Items</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Item" : "Tambah Item"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Order</Label>
                <Select value={form.order_id} onValueChange={(v) => setForm({ ...form, order_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih order" /></SelectTrigger>
                  <SelectContent>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>#{o.order_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nama Produk</Label>
                <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Jumlah</Label>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Harga per Unit</Label>
                <Input type="number" min="0" value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full">{editing ? "Simpan" : "Tambah"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Harga/Unit</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead className="w-24">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>#{orders.find((o) => o.id === item.order_id)?.order_number || "-"}</TableCell>
                <TableCell className="font-medium">{item.product_name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.price_per_unit.toLocaleString("id-ID")}</TableCell>
                <TableCell>{(item.quantity * item.price_per_unit).toLocaleString("id-ID")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Belum ada item.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default OrderItems;
