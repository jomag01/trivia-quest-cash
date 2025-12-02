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
      ad_impressions: {
        Row: {
          ad_id: string
          clicked: boolean | null
          converted: boolean | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          ad_id: string
          clicked?: boolean | null
          converted?: boolean | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          clicked?: boolean | null
          converted?: boolean | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "user_ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
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
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
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
      diamond_marketplace: {
        Row: {
          created_at: string
          diamond_amount: number
          id: string
          price_per_diamond: number
          seller_id: string
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          diamond_amount: number
          id?: string
          price_per_diamond: number
          seller_id: string
          status?: string
          total_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          diamond_amount?: number
          id?: string
          price_per_diamond?: number
          seller_id?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      diamond_transactions: {
        Row: {
          buyer_id: string
          created_at: string
          diamond_amount: number
          id: string
          listing_id: string
          seller_id: string
          status: string
          total_price: number
          transaction_type: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          diamond_amount: number
          id?: string
          listing_id: string
          seller_id: string
          status?: string
          total_price: number
          transaction_type?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          diamond_amount?: number
          id?: string
          listing_id?: string
          seller_id?: string
          status?: string
          total_price?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "diamond_transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "diamond_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      game_categories: {
        Row: {
          color_from: string
          color_to: string
          created_at: string | null
          description: string | null
          entry_cost_diamonds: number | null
          game_type: string
          icon: string
          id: string
          is_active: boolean | null
          min_level_required: number | null
          name: string
          slug: string
          updated_at: string | null
          wrong_answer_penalty: number | null
        }
        Insert: {
          color_from: string
          color_to: string
          created_at?: string | null
          description?: string | null
          entry_cost_diamonds?: number | null
          game_type?: string
          icon: string
          id?: string
          is_active?: boolean | null
          min_level_required?: number | null
          name: string
          slug: string
          updated_at?: string | null
          wrong_answer_penalty?: number | null
        }
        Update: {
          color_from?: string
          color_to?: string
          created_at?: string | null
          description?: string | null
          entry_cost_diamonds?: number | null
          game_type?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          min_level_required?: number | null
          name?: string
          slug?: string
          updated_at?: string | null
          wrong_answer_penalty?: number | null
        }
        Relationships: []
      }
      game_level_completions: {
        Row: {
          category_id: string
          completed_at: string
          diamonds_earned: number
          id: string
          level_number: number
          user_id: string
        }
        Insert: {
          category_id: string
          completed_at?: string
          diamonds_earned?: number
          id?: string
          level_number: number
          user_id: string
        }
        Update: {
          category_id?: string
          completed_at?: string
          diamonds_earned?: number
          id?: string
          level_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_level_completions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "game_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          is_admin: boolean | null
          joined_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          group_id: string
          id: string
          parent_message_id: string | null
          pinned: boolean | null
          pinned_at: string | null
          pinned_by: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          group_id: string
          id?: string
          parent_message_id?: string | null
          pinned?: boolean | null
          pinned_at?: string | null
          pinned_by?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          group_id?: string
          id?: string
          parent_message_id?: string | null
          pinned?: boolean | null
          pinned_at?: string | null
          pinned_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_private: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      leadership_commissions: {
        Row: {
          amount: number
          commission_type: string
          created_at: string | null
          downline_id: string
          id: string
          level: number
          notes: string | null
          order_id: string | null
          purchase_id: string | null
          sales_amount: number
          upline_id: string
        }
        Insert: {
          amount: number
          commission_type?: string
          created_at?: string | null
          downline_id: string
          id?: string
          level: number
          notes?: string | null
          order_id?: string | null
          purchase_id?: string | null
          sales_amount: number
          upline_id: string
        }
        Update: {
          amount?: number
          commission_type?: string
          created_at?: string | null
          downline_id?: string
          id?: string
          level?: number
          notes?: string | null
          order_id?: string | null
          purchase_id?: string | null
          sales_amount?: number
          upline_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leadership_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leadership_commissions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "credit_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: []
      }
      message_edit_history: {
        Row: {
          edited_at: string
          edited_by: string
          id: string
          message_id: string
          previous_content: string
        }
        Insert: {
          edited_at?: string
          edited_by: string
          id?: string
          message_id: string
          previous_content: string
        }
        Update: {
          edited_at?: string
          edited_by?: string
          id?: string
          message_id?: string
          previous_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_edit_history_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      muted_group_users: {
        Row: {
          created_at: string
          group_id: string
          id: string
          muted_by: string
          muted_until: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          muted_by: string
          muted_until?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          muted_by?: string
          muted_until?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "muted_group_users_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          order_id: string | null
          read: boolean | null
          reference_id: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          order_id?: string | null
          read?: boolean | null
          reference_id?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          order_id?: string | null
          read?: boolean | null
          reference_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
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
          payment_method: string | null
          product_referrer_id: string | null
          shipping_address: string
          shipping_fee: number | null
          status: string
          total_amount: number
          total_diamond_credits: number | null
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
          payment_method?: string | null
          product_referrer_id?: string | null
          shipping_address: string
          shipping_fee?: number | null
          status?: string
          total_amount: number
          total_diamond_credits?: number | null
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
          payment_method?: string | null
          product_referrer_id?: string | null
          shipping_address?: string
          shipping_fee?: number | null
          status?: string
          total_amount?: number
          total_diamond_credits?: number | null
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
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          id: string
          post_id: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string | null
          created_at: string
          id: string
          likes_count: number | null
          media_type: string
          media_url: string | null
          shares_count: number | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          comments_count?: number | null
          content?: string | null
          created_at?: string
          id?: string
          likes_count?: number | null
          media_type: string
          media_url?: string | null
          shares_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          comments_count?: number | null
          content?: string | null
          created_at?: string
          id?: string
          likes_count?: number | null
          media_type?: string
          media_url?: string | null
          shares_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      private_conversations: {
        Row: {
          created_at: string | null
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          parent_message_id: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          parent_message_id?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          parent_message_id?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "private_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "private_messages"
            referencedColumns: ["id"]
          },
        ]
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
          image_type: string | null
          image_url: string
          is_primary: boolean | null
          product_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_type?: string | null
          image_url: string
          is_primary?: boolean | null
          product_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_type?: string | null
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
      product_referrals: {
        Row: {
          commission_diamonds: number
          commission_paid: boolean | null
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string
          purchased_at: string | null
          referred_user_id: string | null
          referrer_id: string
        }
        Insert: {
          commission_diamonds?: number
          commission_paid?: boolean | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id: string
          purchased_at?: string | null
          referred_user_id?: string | null
          referrer_id: string
        }
        Update: {
          commission_diamonds?: number
          commission_paid?: boolean | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
          purchased_at?: string | null
          referred_user_id?: string | null
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_referrals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_referrals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string
          product_rating: number
          review_text: string | null
          seller_id: string | null
          seller_rating: number | null
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id: string
          product_rating: number
          review_text?: string | null
          seller_id?: string | null
          seller_rating?: number | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
          product_rating?: number
          review_text?: string | null
          seller_id?: string | null
          seller_rating?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          admin_markup_percentage: number | null
          approval_status: string | null
          base_price: number
          category_id: string | null
          commission_percentage: number
          created_at: string | null
          description: string
          diamond_reward: number | null
          dimensions_cm: string | null
          discount_percentage: number | null
          final_price: number | null
          free_shipping: boolean | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          promo_active: boolean | null
          promo_price: number | null
          referral_commission_diamonds: number | null
          seller_id: string | null
          shipping_fee: number | null
          stock_quantity: number | null
          updated_at: string | null
          weight_kg: number | null
          wholesale_price: number | null
        }
        Insert: {
          admin_markup_percentage?: number | null
          approval_status?: string | null
          base_price: number
          category_id?: string | null
          commission_percentage?: number
          created_at?: string | null
          description: string
          diamond_reward?: number | null
          dimensions_cm?: string | null
          discount_percentage?: number | null
          final_price?: number | null
          free_shipping?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          promo_active?: boolean | null
          promo_price?: number | null
          referral_commission_diamonds?: number | null
          seller_id?: string | null
          shipping_fee?: number | null
          stock_quantity?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          wholesale_price?: number | null
        }
        Update: {
          admin_markup_percentage?: number | null
          approval_status?: string | null
          base_price?: number
          category_id?: string | null
          commission_percentage?: number
          created_at?: string | null
          description?: string
          diamond_reward?: number | null
          dimensions_cm?: string | null
          discount_percentage?: number | null
          final_price?: number | null
          free_shipping?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          promo_active?: boolean | null
          promo_price?: number | null
          referral_commission_diamonds?: number | null
          seller_id?: string | null
          shipping_fee?: number | null
          stock_quantity?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          credits: number
          currency: string
          currency_symbol: string
          email: string | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          id: string
          is_verified: boolean | null
          is_verified_seller: boolean | null
          referral_code: string
          referred_by: string | null
          seller_rating: number | null
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          credits?: number
          currency?: string
          currency_symbol?: string
          email?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          is_verified_seller?: boolean | null
          referral_code: string
          referred_by?: string | null
          seller_rating?: number | null
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          credits?: number
          currency?: string
          currency_symbol?: string
          email?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          is_verified_seller?: boolean | null
          referral_code?: string
          referred_by?: string | null
          seller_rating?: number | null
          total_reviews?: number | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
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
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      seller_verification_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_verification_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          base_rate: number
          created_at: string | null
          free_shipping_threshold: number | null
          id: string
          is_active: boolean | null
          name: string
          per_kg_rate: number
          regions: string[]
          updated_at: string | null
        }
        Insert: {
          base_rate?: number
          created_at?: string | null
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          per_kg_rate?: number
          regions: string[]
          updated_at?: string | null
        }
        Update: {
          base_rate?: number
          created_at?: string | null
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          per_kg_rate?: number
          regions?: string[]
          updated_at?: string | null
        }
        Relationships: []
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
      treasure_admin_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      treasure_hunt_completions: {
        Row: {
          completed_at: string
          credits_earned: number
          id: string
          level_number: number
          symbols_found: number
          time_taken_seconds: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          credits_earned?: number
          id?: string
          level_number: number
          symbols_found: number
          time_taken_seconds?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string
          credits_earned?: number
          id?: string
          level_number?: number
          symbols_found?: number
          time_taken_seconds?: number | null
          user_id?: string
        }
        Relationships: []
      }
      treasure_hunt_levels: {
        Row: {
          created_at: string
          credit_reward: number
          description: string | null
          difficulty_multiplier: number
          id: string
          is_active: boolean
          level_number: number
          map_image_url: string | null
          name: string
          required_symbols: number
          symbols: string[] | null
          time_limit_seconds: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_reward?: number
          description?: string | null
          difficulty_multiplier?: number
          id?: string
          is_active?: boolean
          level_number: number
          map_image_url?: string | null
          name: string
          required_symbols?: number
          symbols?: string[] | null
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_reward?: number
          description?: string | null
          difficulty_multiplier?: number
          id?: string
          is_active?: boolean
          level_number?: number
          map_image_url?: string | null
          name?: string
          required_symbols?: number
          symbols?: string[] | null
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      treasure_hunt_progress: {
        Row: {
          created_at: string
          current_level: number
          id: string
          last_played_at: string
          symbols_found: number
          total_credits_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          id?: string
          last_played_at?: string
          symbols_found?: number
          total_credits_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number
          id?: string
          last_played_at?: string
          symbols_found?: number
          total_credits_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      treasure_wallet: {
        Row: {
          created_at: string
          diamonds: number
          gems: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diamonds?: number
          gems?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          diamonds?: number
          gems?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upline_transfer_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          current_upline_id: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_upline_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          current_upline_id?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_upline_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          current_upline_id?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_upline_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upline_transfer_requests_current_upline_id_fkey"
            columns: ["current_upline_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upline_transfer_requests_requested_upline_id_fkey"
            columns: ["requested_upline_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ad_preferences: {
        Row: {
          id: string
          interest_tags: Json | null
          last_updated: string | null
          purchase_history: Json | null
          user_id: string | null
          viewed_categories: string[] | null
        }
        Insert: {
          id?: string
          interest_tags?: Json | null
          last_updated?: string | null
          purchase_history?: Json | null
          user_id?: string | null
          viewed_categories?: string[] | null
        }
        Update: {
          id?: string
          interest_tags?: Json | null
          last_updated?: string | null
          purchase_history?: Json | null
          user_id?: string | null
          viewed_categories?: string[] | null
        }
        Relationships: []
      }
      user_ads: {
        Row: {
          admin_notes: string | null
          budget_diamonds: number
          clicks_count: number
          conversions_count: number
          cost_per_view: number
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          spent_diamonds: number
          start_date: string | null
          status: string
          target_behavior: string[] | null
          target_category: string | null
          title: string
          updated_at: string | null
          user_id: string
          video_url: string | null
          views_count: number
        }
        Insert: {
          admin_notes?: string | null
          budget_diamonds?: number
          clicks_count?: number
          conversions_count?: number
          cost_per_view?: number
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          spent_diamonds?: number
          start_date?: string | null
          status?: string
          target_behavior?: string[] | null
          target_category?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          admin_notes?: string | null
          budget_diamonds?: number
          clicks_count?: number
          conversions_count?: number
          cost_per_view?: number
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          spent_diamonds?: number
          start_date?: string | null
          status?: string
          target_behavior?: string[] | null
          target_category?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
          views_count?: number
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
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          target_id: string
          target_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          target_id: string
          target_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          target_id?: string
          target_type?: string
          user_id?: string | null
        }
        Relationships: []
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
      user_unlocked_categories: {
        Row: {
          category_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unlocked_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "game_categories"
            referencedColumns: ["id"]
          },
        ]
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
      video_call_sessions: {
        Row: {
          conversation_id: string | null
          ended_at: string | null
          group_id: string | null
          id: string
          room_id: string
          started_at: string | null
          started_by: string
        }
        Insert: {
          conversation_id?: string | null
          ended_at?: string | null
          group_id?: string | null
          id?: string
          room_id: string
          started_at?: string | null
          started_by: string
        }
        Update: {
          conversation_id?: string | null
          ended_at?: string | null
          group_id?: string | null
          id?: string
          room_id?: string
          started_at?: string | null
          started_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_call_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "private_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
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
      can_access_category_level: {
        Args: { p_category_id: string; p_level: number; p_user_id: string }
        Returns: boolean
      }
      can_access_level: {
        Args: { p_level: number; p_user_id: string }
        Returns: boolean
      }
      can_become_seller: { Args: { p_user_id: string }; Returns: boolean }
      can_create_ads: { Args: { user_id_param: string }; Returns: boolean }
      check_and_update_affiliate_rank: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_level5_bonus: { Args: { player_id: string }; Returns: undefined }
      claim_level_prize: {
        Args: { _level: number; _user_id: string }
        Returns: Json
      }
      convert_gems_to_diamonds: {
        Args: { p_gem_amount: number; p_user_id: string }
        Returns: Json
      }
      deduct_wrong_answer_penalty: {
        Args: { p_category_id: string; p_user_id: string }
        Returns: undefined
      }
      distribute_leadership_breakaway: {
        Args: {
          p_order_id?: string
          p_purchase_id?: string
          p_sales_amount: number
          p_seller_id: string
        }
        Returns: undefined
      }
      distribute_multivendor_commissions: {
        Args: {
          p_buyer_id: string
          p_final_price: number
          p_order_id: string
          p_product_id: string
        }
        Returns: undefined
      }
      distribute_network_diamonds: {
        Args: { p_amount: number; p_buyer_id: string; p_purchase_id: string }
        Returns: undefined
      }
      distribute_purchase_commissions: {
        Args: {
          amount_param: number
          buyer_id: string
          purchase_id_param: string
        }
        Returns: undefined
      }
      distribute_stair_step_commissions:
        | {
            Args: {
              p_amount: number
              p_buyer_id: string
              p_is_credit_purchase?: boolean
              p_purchase_id: string
            }
            Returns: undefined
          }
        | {
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
      get_referral_count: { Args: { p_user_id: string }; Returns: number }
      get_unlocked_categories_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      increment_credits: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_public_group: { Args: { _group_id: string }; Returns: boolean }
      process_monthly_rank_reversion: { Args: never; Returns: undefined }
      process_upline_transfer: {
        Args: {
          p_admin_id: string
          p_admin_notes?: string
          p_approve: boolean
          p_request_id: string
        }
        Returns: Json
      }
      unlock_category: {
        Args: { p_category_id: string; p_user_id: string }
        Returns: Json
      }
      update_affiliate_monthly_sales: {
        Args: { p_amount: number; p_is_personal?: boolean; p_user_id: string }
        Returns: undefined
      }
      update_credits: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
      update_treasure_wallet: {
        Args: { p_diamonds?: number; p_gems?: number; p_user_id: string }
        Returns: undefined
      }
      user_meets_earning_requirements: {
        Args: { p_user_id: string }
        Returns: boolean
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
