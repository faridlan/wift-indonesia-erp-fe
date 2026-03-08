import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCategories, createCategory, updateCategory, deleteCategory, CategoryInsert, CategoryUpdate } from "@/services/categories";
import { useToast } from "@/hooks/use-toast";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (category: CategoryInsert) => createCategory(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Kategori berhasil ditambahkan" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal menambahkan kategori", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: CategoryUpdate }) => updateCategory(id, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Kategori berhasil diperbarui" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal memperbarui kategori", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Kategori berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal menghapus kategori", description: error.message, variant: "destructive" });
    },
  });
};
