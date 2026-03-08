import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type ProductImage = Tables<"product_images">;
export type ProductImageInsert = TablesInsert<"product_images">;

export const fetchProductImages = async (productId: string): Promise<ProductImage[]> => {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
};

export const createProductImage = async (image: ProductImageInsert): Promise<ProductImage> => {
  const { data, error } = await supabase
    .from("product_images")
    .insert(image)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteProductImage = async (id: string): Promise<void> => {
  const { error } = await supabase.from("product_images").delete().eq("id", id);
  if (error) throw error;
};

export const uploadProductFile = async (
  file: File,
  path: string
): Promise<string> => {
  const { error } = await supabase.storage
    .from("products")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("products").getPublicUrl(path);
  return data.publicUrl;
};
