import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProductImages,
  createProductImage,
  deleteProductImage,
  uploadProductFile,
  ProductImageInsert,
} from "@/services/product-images";
import { useToast } from "@/hooks/use-toast";

export const useProductImages = (productId: string | undefined) => {
  return useQuery({
    queryKey: ["product_images", productId],
    queryFn: () => fetchProductImages(productId!),
    enabled: !!productId,
  });
};

export const useCreateProductImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (image: ProductImageInsert) => createProductImage(image),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["product_images", vars.product_id] });
      toast({ title: "Gambar berhasil ditambahkan" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal menambahkan gambar", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteProductImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, productId }: { id: string; productId: string }) => deleteProductImage(id),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["product_images", vars.productId] });
      toast({ title: "Gambar berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal menghapus gambar", description: error.message, variant: "destructive" });
    },
  });
};

export const useUploadProductFile = () => {
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ file, path }: { file: File; path: string }) => uploadProductFile(file, path),
    onError: (error: Error) => {
      toast({ title: "Gagal upload file", description: error.message, variant: "destructive" });
    },
  });
};
