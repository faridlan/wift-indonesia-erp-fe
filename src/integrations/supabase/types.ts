export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          size_chart_url: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          size_chart_url?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          size_chart_url?: string | null
          slug?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          sales_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          sales_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          sales_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          device_info: string | null
          fbc: string | null
          fbp: string | null
          id: string
          metadata: Json | null
          product_id: string | null
          sales_id: string
          time_spent_seconds: number | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string | null
          sales_id: string
          time_spent_seconds?: number | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string | null
          sales_id?: string
          time_spent_seconds?: number | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          price_per_unit: number
          product_name: string
          quantity: number
          work_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          price_per_unit: number
          product_name: string
          quantity?: number
          work_type?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          price_per_unit?: number
          product_name?: string
          quantity?: number
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          customer_id: string | null
          expedition_name: string | null
          id: string
          include_ppn: boolean
          order_number: number
          payment_status: string | null
          po_period_id: string | null
          ppn_amount: number
          ppn_percentage: number
          sales_id: string
          shipping_cost: number
          shipping_type: string
          status: string | null
          total_price: number | null
          weight_kg: number | null
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          customer_id?: string | null
          expedition_name?: string | null
          id?: string
          include_ppn?: boolean
          order_number?: number
          payment_status?: string | null
          po_period_id?: string | null
          ppn_amount?: number
          ppn_percentage?: number
          sales_id: string
          shipping_cost?: number
          shipping_type?: string
          status?: string | null
          total_price?: number | null
          weight_kg?: number | null
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          customer_id?: string | null
          expedition_name?: string | null
          id?: string
          include_ppn?: boolean
          order_number?: number
          payment_status?: string | null
          po_period_id?: string | null
          ppn_amount?: number
          ppn_percentage?: number
          sales_id?: string
          shipping_cost?: number
          shipping_type?: string
          status?: string | null
          total_price?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_po_period_id_fkey"
            columns: ["po_period_id"]
            isOneToOne: false
            referencedRelation: "po_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          evidence_url: string | null
          id: string
          notes: string | null
          order_id: string
          payment_method: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          notes?: string | null
          order_id: string
          payment_method?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      po_periods: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number | null
          size_chart_url: string | null
          slug: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number | null
          size_chart_url?: string | null
          slug: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number | null
          size_chart_url?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          image_url: string | null
          meta_pixel_id: string | null
          password_changed: boolean
          phone_number: string | null
          position: string | null
          role: string | null
          slug: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          image_url?: string | null
          meta_pixel_id?: string | null
          password_changed?: boolean
          phone_number?: string | null
          position?: string | null
          role?: string | null
          slug?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          image_url?: string | null
          meta_pixel_id?: string | null
          password_changed?: boolean
          phone_number?: string | null
          position?: string | null
          role?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
