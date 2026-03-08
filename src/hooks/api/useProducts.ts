import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProducts, createProduct, updateProduct, deleteProduct, ProductInsert, ProductUpdate } from "@/services/products";
import { useToast } from "@/hooks/use-toast";

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (product: ProductInsert) => createProduct(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produk berhasil ditambahkan" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal menambahkan produk", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, product }: { id: string; product: ProductUpdate }) => updateProduct(id, product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produk berhasil diperbarui" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal memperbarui produk", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produk berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal menghapus produk", description: error.message, variant: "destructive" });
    },
  });
};
