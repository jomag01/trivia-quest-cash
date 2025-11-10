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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      affiliate_current_rank: {
        Row: {
          created_at: string
          current_step: number
          is_fixed: boolean | null
          last_qualified_at: string | null
          qualification_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          is_fixed?: boolean | null
          last_qualified_at?: string | null
          qualification_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_step?: number
          is_fixed?: boolean | null
          last_qualified_at?: string | null
          qualification_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_monthly_sales: {
        Row: {
          created_at: string
          id: string
          personal_sales: number
          sales_month: string
          team_sales: number
          total_sales: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          personal_sales?: number
          sales_month: string
          team_sales?: number
          total_sales?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          personal_sales?: number
          sales_month?: string
          team_sales?: number
          total_sales?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_rank_history: {
        Row: {
          created_at: string
          id: string
          is_fixed: boolean | null
          qualification_count: number
          qualified_month: string
          reverted_at: string | null
          sales_volume: number
          step_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_fixed?: boolean | null
          qualification_count?: number
          qualified_month: string
          reverted_at?: string | null
          sales_volume?: number
          step_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_fixed?: boolean | null
          qualification_count?: number
          qualified_month?: string
          reverted_at?: string | null
          sales_volume?: number
          step_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cart: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          commission_type: string
          created_at: string
          from_user_id: string
          id: string
          level: number
          notes: string | null
          purchase_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          commission_type: string
          created_at?: string
          from_user_id: string
          id?: string
          level: number
          notes?: string | null
          purchase_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          commission_type?: string
          created_at?: string
          from_user_id?: string
          id?: string
          level?: number
          notes?: string | null
          purchase_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "credit_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_purchases: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          credits: number
          id: string
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          proof_image_url: string | null
          receiver_account: string | null
          receiver_name: string | null
          reference_number: string | null
          referral_code: string | null
          sender_name: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          credits: number
          id?: string
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          proof_image_url?: string | null
          receiver_account?: string | null
          receiver_name?: string | null
          reference_number?: string | null
          referral_code?: string | null
          sender_name?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          credits?: number
          id?: string
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          proof_image_url?: string | null
          receiver_account?: string | null
          receiver_name?: string | null
          reference_number?: string | null
          referral_code?: string | null
          sender_name?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      game_categories: {
        Row: {
          color_from: string
          color_to: string
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          min_level_required: number | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          color_from: string
          color_to: string
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          min_level_required?: number | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          color_from?: string
          color_to?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          min_level_required?: number | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
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
      order_status_history: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          order_number: string
          shipping_address: string
          shipping_fee: number | null
          status: string
          total_amount: number
          tracking_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_number: string
          shipping_address: string
          shipping_fee?: number | null
          status?: string
          total_amount: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          shipping_address?: string
          shipping_fee?: number | null
          status?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payout_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string
          bank_code: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_type: string
          bank_code?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string
          bank_code?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          account_name: string
          account_number: string
          admin_notes: string | null
          amount: number
          bank_name: string | null
          created_at: string | null
          id: string
          payout_method: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_notes?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          payout_method: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_notes?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          payout_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prize_config: {
        Row: {
          created_at: string | null
          credits: number
          description: string | null
          id: string
          is_active: boolean | null
          level: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          level: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
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
          price_adjustment: number | null
          product_id: string
          sku: string | null
          stock_quantity: number | null
          updated_at: string | null
          variant_type: Database["public"]["Enums"]["product_variant_type"]
          variant_value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          price_adjustment?: number | null
          product_id: string
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
          variant_type: Database["public"]["Enums"]["product_variant_type"]
          variant_value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          price_adjustment?: number | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
          variant_type?: Database["public"]["Enums"]["product_variant_type"]
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
          base_price: number
          category_id: string | null
          commission_percentage: number
          created_at: string | null
          description: string
          discount_percentage: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          promo_active: boolean | null
          promo_price: number | null
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          base_price: number
          category_id?: string | null
          commission_percentage?: number
          created_at?: string | null
          description: string
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          promo_active?: boolean | null
          promo_price?: number | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          commission_percentage?: number
          created_at?: string | null
          description?: string
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          promo_active?: boolean | null
          promo_price?: number | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          credits: number
          currency: string
          currency_symbol: string
          email: string | null
          full_name: string | null
          id: string
          referral_code: string
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          credits?: number
          currency?: string
          currency_symbol?: string
          email?: string | null
          full_name?: string | null
          id: string
          referral_code: string
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          credits?: number
          currency?: string
          currency_symbol?: string
          email?: string | null
          full_name?: string | null
          id?: string
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          category_id: string | null
          correct_answer: number
          created_at: string | null
          difficulty: number | null
          id: string
          is_active: boolean | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          correct_answer: number
          created_at?: string | null
          difficulty?: number | null
          id?: string
          is_active?: boolean | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          correct_answer?: number
          created_at?: string | null
          difficulty?: number | null
          id?: string
          is_active?: boolean | null
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "game_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      stair_step_config: {
        Row: {
          active: boolean | null
          breakaway_percentage: number | null
          commission_percentage: number
          created_at: string
          id: string
          months_to_qualify: number
          sales_quota: number
          step_name: string
          step_number: number
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          breakaway_percentage?: number | null
          commission_percentage: number
          created_at?: string
          id?: string
          months_to_qualify?: number
          sales_quota: number
          step_name: string
          step_number: number
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          breakaway_percentage?: number | null
          commission_percentage?: number
          created_at?: string
          id?: string
          months_to_qualify?: number
          sales_quota?: number
          step_name?: string
          step_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_answered_questions: {
        Row: {
          answered_at: string | null
          id: string
          question_id: string
          user_id: string
          was_correct: boolean
        }
        Insert: {
          answered_at?: string | null
          id?: string
          question_id: string
          user_id: string
          was_correct: boolean
        }
        Update: {
          answered_at?: string | null
          id?: string
          question_id?: string
          user_id?: string
          was_correct?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_answered_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_completed_categories: {
        Row: {
          category_id: string
          completed_at: string
          id: string
          total_levels_completed: number
          user_id: string
        }
        Insert: {
          category_id: string
          completed_at?: string
          id?: string
          total_levels_completed?: number
          user_id: string
        }
        Update: {
          category_id?: string
          completed_at?: string
          id?: string
          total_levels_completed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_completed_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "game_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prize_claims: {
        Row: {
          claimed_at: string | null
          credits_awarded: number
          id: string
          level: number
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          credits_awarded: number
          id?: string
          level: number
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          credits_awarded?: number
          id?: string
          level?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string | null
          credits: number
          id: string
          pending_commissions: number | null
          total_commissions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          credits?: number
          id?: string
          pending_commissions?: number | null
          total_commissions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          credits?: number
          id?: string
          pending_commissions?: number | null
          total_commissions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_update_affiliate_rank: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_level5_bonus: { Args: { player_id: string }; Returns: undefined }
      claim_level_prize: {
        Args: { _level: number; _user_id: string }
        Returns: Json
      }
      distribute_purchase_commissions: {
        Args: {
          amount_param: number
          buyer_id: string
          purchase_id_param: string
        }
        Returns: undefined
      }
      distribute_stair_step_commissions: {
        Args: {
          amount_param: number
          buyer_id: string
          is_credit_purchase?: boolean
          purchase_id_param: string
        }
        Returns: undefined
      }
      generate_order_number: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      increment_credits: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
      process_monthly_rank_reversion: { Args: never; Returns: undefined }
      update_affiliate_monthly_sales: {
        Args: { p_amount: number; p_is_personal?: boolean; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status:
        | "pending"
        | "processing"
        | "in_transit"
        | "delivered"
        | "cancelled"
      product_variant_type: "size" | "color" | "weight"
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
    Enums: {
      app_role: ["admin", "user"],
      order_status: [
        "pending",
        "processing",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      product_variant_type: ["size", "color", "weight"],
    },
  },
} as const
