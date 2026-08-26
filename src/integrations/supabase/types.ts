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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      order_contacts: {
        Row: {
          created_at: string | null
          customer_phone: string
          id: string
          order_id: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          customer_phone: string
          id?: string
          order_id: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          customer_phone?: string
          id?: string
          order_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_contacts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_contacts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_price: number
          quantity: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_price: number
          quantity: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_address: string
          customer_name: string
          customer_phone: string
          customer_phone_hash: string
          discount_amount: number | null
          id: string
          promo_code: string | null
          public_order_id: string
          reference_code: string | null
          status: string
          store_id: string
          subtotal: number | null
          tax_amount: number | null
          total_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_address: string
          customer_name: string
          customer_phone: string
          customer_phone_hash: string
          discount_amount?: number | null
          id?: string
          promo_code?: string | null
          public_order_id: string
          reference_code?: string | null
          status?: string
          store_id: string
          subtotal?: number | null
          tax_amount?: number | null
          total_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          customer_phone_hash?: string
          discount_amount?: number | null
          id?: string
          promo_code?: string | null
          public_order_id?: string
          reference_code?: string | null
          status?: string
          store_id?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          phone_hash: string
          requester_ip: string | null
          resolved_at: string | null
          status: string | null
          store_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          phone_hash: string
          requester_ip?: string | null
          resolved_at?: string | null
          status?: string | null
          store_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          phone_hash?: string
          requester_ip?: string | null
          resolved_at?: string | null
          status?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_main: boolean | null
          position: number | null
          product_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_main?: boolean | null
          position?: number | null
          product_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_main?: boolean | null
          position?: number | null
          product_id?: string
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
      product_variants: {
        Row: {
          created_at: string | null
          id: string
          position: number | null
          price_adjustment: number | null
          product_id: string
          variant_type: string
          variant_value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          position?: number | null
          price_adjustment?: number | null
          product_id: string
          variant_type: string
          variant_value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          position?: number | null
          price_adjustment?: number | null
          product_id?: string
          variant_type?: string
          variant_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode_gtin: string | null
          category: string | null
          country_of_origin: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          low_stock_threshold: number
          name: string
          ntin: string | null
          price: number
          status: string | null
          stock: number
          store_id: string
          updated_at: string | null
        }
        Insert: {
          barcode_gtin?: string | null
          category?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number
          name: string
          ntin?: string | null
          price?: number
          status?: string | null
          stock?: number
          store_id: string
          updated_at?: string | null
        }
        Update: {
          barcode_gtin?: string | null
          category?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number
          name?: string
          ntin?: string | null
          price?: number
          status?: string | null
          stock?: number
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          plan_type: string
          role: string
          subscription_active: boolean
          subscription_expiry: string | null
          subscription_screenshot_url: string | null
          subscription_status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          plan_type?: string
          role?: string
          subscription_active?: boolean
          subscription_expiry?: string | null
          subscription_screenshot_url?: string | null
          subscription_status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          plan_type?: string
          role?: string
          subscription_active?: boolean
          subscription_expiry?: string | null
          subscription_screenshot_url?: string | null
          subscription_status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          buyer_phone: string
          created_at: string | null
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          store_id: string
        }
        Insert: {
          buyer_phone: string
          created_at?: string | null
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          store_id: string
        }
        Update: {
          buyer_phone?: string
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          order_id: string
          reason: string
          resolved_at: string | null
          status: string
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          order_id: string
          reason: string
          resolved_at?: string | null
          status?: string
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          order_id?: string
          reason?: string
          resolved_at?: string | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_phone_hash: string
          id: string
          order_id: string
          product_id: string
          rating: number
          store_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_phone_hash: string
          id?: string
          order_id: string
          product_id: string
          rating: number
          store_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_phone_hash?: string
          id?: string
          order_id?: string
          product_id?: string
          rating?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string
          id: string
          role: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_promo_codes: {
        Row: {
          code: string
          created_at: string | null
          discount_type: string | null
          discount_value: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_cart_amount: number | null
          min_quantity: number | null
          start_date: string | null
          store_id: string
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_cart_amount?: number | null
          min_quantity?: number | null
          start_date?: string | null
          store_id: string
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_cart_amount?: number | null
          min_quantity?: number | null
          start_date?: string | null
          store_id?: string
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_promo_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          average_rating: number | null
          created_at: string
          default_language: string
          description: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          instagram: string | null
          is_paused: boolean | null
          is_verified: boolean
          name: string
          payment_qr_image: string | null
          plan_type: string
          report_count: number | null
          review_count: number | null
          show_banner: boolean | null
          show_instagram: boolean | null
          show_telegram: boolean | null
          show_tiktok: boolean | null
          slug: string
          social_platform: string
          subscription_active: boolean
          subscription_expiry: string | null
          subscription_screenshot_url: string | null
          subscription_status: string
          tax_enabled: boolean | null
          tax_percent: number | null
          telegram_chat_id: string | null
          theme_preset: string | null
          tiktok_handle: string | null
          total_earned: number | null
          total_sales_count: number | null
          total_views: number | null
          updated_at: string
          user_id: string
          whatsapp_phone: string | null
        }
        Insert: {
          average_rating?: number | null
          created_at?: string
          default_language?: string
          description?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram?: string | null
          is_paused?: boolean | null
          is_verified?: boolean
          name: string
          payment_qr_image?: string | null
          plan_type?: string
          report_count?: number | null
          review_count?: number | null
          show_banner?: boolean | null
          show_instagram?: boolean | null
          show_telegram?: boolean | null
          show_tiktok?: boolean | null
          slug: string
          social_platform?: string
          subscription_active?: boolean
          subscription_expiry?: string | null
          subscription_screenshot_url?: string | null
          subscription_status?: string
          tax_enabled?: boolean | null
          tax_percent?: number | null
          telegram_chat_id?: string | null
          theme_preset?: string | null
          tiktok_handle?: string | null
          total_earned?: number | null
          total_sales_count?: number | null
          total_views?: number | null
          updated_at?: string
          user_id: string
          whatsapp_phone?: string | null
        }
        Update: {
          average_rating?: number | null
          created_at?: string
          default_language?: string
          description?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram?: string | null
          is_paused?: boolean | null
          is_verified?: boolean
          name?: string
          payment_qr_image?: string | null
          plan_type?: string
          report_count?: number | null
          review_count?: number | null
          show_banner?: boolean | null
          show_instagram?: boolean | null
          show_telegram?: boolean | null
          show_tiktok?: boolean | null
          slug?: string
          social_platform?: string
          subscription_active?: boolean
          subscription_expiry?: string | null
          subscription_screenshot_url?: string | null
          subscription_status?: string
          tax_enabled?: boolean | null
          tax_percent?: number | null
          telegram_chat_id?: string | null
          theme_preset?: string | null
          tiktok_handle?: string | null
          total_earned?: number | null
          total_sales_count?: number | null
          total_views?: number | null
          updated_at?: string
          user_id?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number | null
          updated_at: string | null
        }
        Insert: {
          id: number
          update_offset?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          update_offset?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      verification_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          new_status: string | null
          previous_status: string | null
          store_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: string | null
          previous_status?: string | null
          store_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: string | null
          previous_status?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_audit_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analytics_aggregation: {
        Args: {
          p_end_date?: string
          p_granularity?: string
          p_start_date?: string
          p_store_id?: string
        }
        Returns: Json
      }
      increment_store_views: { Args: { _store_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_store_member: { Args: { _store_id: string }; Returns: boolean }
      recompute_store_verification: {
        Args: { _store_id: string }
        Returns: undefined
      }
    }
    Enums: {
      report_reason: "scam" | "inappropriate" | "counterfeit"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      report_reason: ["scam", "inappropriate", "counterfeit"],
    },
  },
} as const
