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
      ai_credit_purchases: {
        Row: {
          admin_earnings: number | null
          amount: number
          created_at: string
          credits_received: number
          id: string
          leadership_commission: number | null
          payment_method: string
          referrer_id: string | null
          stairstep_commission: number | null
          status: string | null
          unilevel_commission: number | null
          user_id: string
        }
        Insert: {
          admin_earnings?: number | null
          amount: number
          created_at?: string
          credits_received: number
          id?: string
          leadership_commission?: number | null
          payment_method?: string
          referrer_id?: string | null
          stairstep_commission?: number | null
          status?: string | null
          unilevel_commission?: number | null
          user_id: string
        }
        Update: {
          admin_earnings?: number | null
          amount?: number
          created_at?: string
          credits_received?: number
          id?: string
          leadership_commission?: number | null
          payment_method?: string
          referrer_id?: string | null
          stairstep_commission?: number | null
          status?: string | null
          unilevel_commission?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_generations: {
        Row: {
          created_at: string
          credits_used: number | null
          generation_type: string
          id: string
          prompt: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          credits_used?: number | null
          generation_type: string
          id?: string
          prompt?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          credits_used?: number | null
          generation_type?: string
          id?: string
          prompt?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_provider_pricing: {
        Row: {
          audio_cost_per_minute: number | null
          created_at: string | null
          id: string
          image_cost: number | null
          input_cost_per_1k: number | null
          model_name: string
          notes: string | null
          output_cost_per_1k: number | null
          provider_name: string
          updated_at: string | null
          video_cost_per_second: number | null
        }
        Insert: {
          audio_cost_per_minute?: number | null
          created_at?: string | null
          id?: string
          image_cost?: number | null
          input_cost_per_1k?: number | null
          model_name: string
          notes?: string | null
          output_cost_per_1k?: number | null
          provider_name: string
          updated_at?: string | null
          video_cost_per_second?: number | null
        }
        Update: {
          audio_cost_per_minute?: number | null
          created_at?: string | null
          id?: string
          image_cost?: number | null
          input_cost_per_1k?: number | null
          model_name?: string
          notes?: string | null
          output_cost_per_1k?: number | null
          provider_name?: string
          updated_at?: string | null
          video_cost_per_second?: number | null
        }
        Relationships: []
      }
      ai_request_queue: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          priority: number | null
          processed_at: string | null
          prompt_hash: string
          request_type: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          priority?: number | null
          processed_at?: string | null
          prompt_hash: string
          request_type: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          priority?: number | null
          processed_at?: string | null
          prompt_hash?: string
          request_type?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_response_cache: {
        Row: {
          created_at: string
          expires_at: string
          hit_count: number | null
          id: string
          prompt: string
          prompt_hash: string
          response_text: string | null
          response_type: string
          response_url: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          prompt: string
          prompt_hash: string
          response_text?: string | null
          response_type: string
          response_url?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          prompt?: string
          prompt_hash?: string
          response_text?: string | null
          response_type?: string
          response_url?: string | null
        }
        Relationships: []
      }
      ai_video_pricing: {
        Row: {
          created_at: string | null
          credit_cost: number
          duration_label: string
          duration_seconds: number
          id: string
          is_active: boolean | null
        }
        Insert: {
          created_at?: string | null
          credit_cost: number
          duration_label: string
          duration_seconds: number
          id?: string
          is_active?: boolean | null
        }
        Update: {
          created_at?: string | null
          credit_cost?: number
          duration_label?: string
          duration_seconds?: number
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      binary_ai_purchases: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          audio_minutes_allocated: number | null
          created_at: string | null
          credits_received: number
          id: string
          images_allocated: number | null
          is_first_purchase: boolean | null
          package_id: string | null
          sponsor_id: string | null
          status: string | null
          user_id: string
          video_minutes_allocated: number | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          audio_minutes_allocated?: number | null
          created_at?: string | null
          credits_received: number
          id?: string
          images_allocated?: number | null
          is_first_purchase?: boolean | null
          package_id?: string | null
          sponsor_id?: string | null
          status?: string | null
          user_id: string
          video_minutes_allocated?: number | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          audio_minutes_allocated?: number | null
          created_at?: string | null
          credits_received?: number
          id?: string
          images_allocated?: number | null
          is_first_purchase?: boolean | null
          package_id?: string | null
          sponsor_id?: string | null
          status?: string | null
          user_id?: string
          video_minutes_allocated?: number | null
        }
        Relationships: []
      }
      binary_auto_replenish: {
        Row: {
          amount_deducted: number
          created_at: string | null
          credits_replenished: number
          id: string
          source_commission_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          amount_deducted: number
          created_at?: string | null
          credits_replenished: number
          id?: string
          source_commission_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          amount_deducted?: number
          created_at?: string | null
          credits_replenished?: number
          id?: string
          source_commission_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      binary_commissions: {
        Row: {
          amount: number
          created_at: string | null
          cycles_matched: number | null
          id: string
          left_volume_used: number
          right_volume_used: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          cycles_matched?: number | null
          id?: string
          left_volume_used: number
          right_volume_used: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          cycles_matched?: number | null
          id?: string
          left_volume_used?: number
          right_volume_used?: number
          user_id?: string
        }
        Relationships: []
      }
      binary_daily_earnings: {
        Row: {
          created_at: string | null
          cycles_completed: number | null
          earning_date: string
          id: string
          total_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cycles_completed?: number | null
          earning_date?: string
          id?: string
          total_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cycles_completed?: number | null
          earning_date?: string
          id?: string
          total_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      binary_network: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          left_child_id: string | null
          left_volume: number | null
          parent_id: string | null
          placement_leg: Database["public"]["Enums"]["binary_leg"] | null
          right_child_id: string | null
          right_volume: number | null
          sponsor_id: string | null
          total_cycles: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          left_child_id?: string | null
          left_volume?: number | null
          parent_id?: string | null
          placement_leg?: Database["public"]["Enums"]["binary_leg"] | null
          right_child_id?: string | null
          right_volume?: number | null
          sponsor_id?: string | null
          total_cycles?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          left_child_id?: string | null
          left_volume?: number | null
          parent_id?: string | null
          placement_leg?: Database["public"]["Enums"]["binary_leg"] | null
          right_child_id?: string | null
          right_volume?: number | null
          sponsor_id?: string | null
          total_cycles?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "binary_network_left_child_id_fkey"
            columns: ["left_child_id"]
            isOneToOne: false
            referencedRelation: "binary_network"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "binary_network_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "binary_network"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "binary_network_right_child_id_fkey"
            columns: ["right_child_id"]
            isOneToOne: false
            referencedRelation: "binary_network"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "binary_network_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "binary_network"
            referencedColumns: ["id"]
          },
        ]
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
      chess_rooms: {
        Row: {
          created_at: string
          game_state: Json | null
          guest_id: string | null
          host_id: string
          id: string
          name: string
          status: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          game_state?: Json | null
          guest_id?: string | null
          host_id: string
          id?: string
          name: string
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          game_state?: Json | null
          guest_id?: string | null
          host_id?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
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
      content_creator_projects: {
        Row: {
          audio_url: string | null
          created_at: string | null
          credits_used: number | null
          id: string
          images: Json | null
          music_url: string | null
          research: string | null
          script: string | null
          status: string | null
          target_duration_seconds: number | null
          title: string
          topic: string | null
          updated_at: string | null
          user_id: string
          video_url: string | null
          voice_id: string | null
          voice_language: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          credits_used?: number | null
          id?: string
          images?: Json | null
          music_url?: string | null
          research?: string | null
          script?: string | null
          status?: string | null
          target_duration_seconds?: number | null
          title: string
          topic?: string | null
          updated_at?: string | null
          user_id: string
          video_url?: string | null
          voice_id?: string | null
          voice_language?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          credits_used?: number | null
          id?: string
          images?: Json | null
          music_url?: string | null
          research?: string | null
          script?: string | null
          status?: string | null
          target_duration_seconds?: number | null
          title?: string
          topic?: string | null
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
          voice_id?: string | null
          voice_language?: string | null
        }
        Relationships: []
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
      delivery_assignments: {
        Row: {
          created_at: string | null
          customer_address: string | null
          customer_latitude: number | null
          customer_longitude: number | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          delivery_fee: number | null
          distance_km: number | null
          estimated_time_minutes: number | null
          id: string
          notes: string | null
          order_id: string
          picked_up_at: string | null
          pickup_address: string | null
          pickup_latitude: number | null
          pickup_longitude: number | null
          rider_credits_deducted: number | null
          rider_id: string
          status: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          customer_address?: string | null
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_fee?: number | null
          distance_km?: number | null
          estimated_time_minutes?: number | null
          id?: string
          notes?: string | null
          order_id: string
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          rider_credits_deducted?: number | null
          rider_id: string
          status?: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          customer_address?: string | null
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_fee?: number | null
          distance_km?: number | null
          estimated_time_minutes?: number | null
          id?: string
          notes?: string | null
          order_id?: string
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          rider_credits_deducted?: number | null
          rider_id?: string
          status?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "delivery_riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "food_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_personnel: {
        Row: {
          assigned_vehicle_id: string | null
          created_at: string
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          license_number: string | null
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_vehicle_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_vehicle_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_personnel_assigned_vehicle_id_fkey"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "delivery_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_riders: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          is_available: boolean | null
          license_number: string | null
          rating: number | null
          selfie_url: string | null
          status: string
          total_deliveries: number | null
          updated_at: string | null
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          is_available?: boolean | null
          license_number?: string | null
          rating?: number | null
          selfie_url?: string | null
          status?: string
          total_deliveries?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          is_available?: boolean | null
          license_number?: string | null
          rating?: number | null
          selfie_url?: string | null
          status?: string
          total_deliveries?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      delivery_vehicles: {
        Row: {
          capacity_kg: number | null
          capacity_volume_cbm: number | null
          created_at: string
          current_driver_id: string | null
          id: string
          notes: string | null
          plate_number: string | null
          status: string
          updated_at: string
          vehicle_name: string
          vehicle_type: string
        }
        Insert: {
          capacity_kg?: number | null
          capacity_volume_cbm?: number | null
          created_at?: string
          current_driver_id?: string | null
          id?: string
          notes?: string | null
          plate_number?: string | null
          status?: string
          updated_at?: string
          vehicle_name: string
          vehicle_type: string
        }
        Update: {
          capacity_kg?: number | null
          capacity_volume_cbm?: number | null
          created_at?: string
          current_driver_id?: string | null
          id?: string
          notes?: string | null
          plate_number?: string | null
          status?: string
          updated_at?: string
          vehicle_name?: string
          vehicle_type?: string
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
      file_uploads: {
        Row: {
          base64_data: string | null
          bucket: string
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          path: string
          size_bytes: number | null
          storage_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          base64_data?: string | null
          bucket: string
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          path: string
          size_bytes?: number | null
          storage_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          base64_data?: string | null
          bucket?: string
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          path?: string
          size_bytes?: number | null
          storage_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      food_categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      food_item_addons: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          item_id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          item_id: string
          name: string
          price?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          item_id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_item_addons_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      food_item_variations: {
        Row: {
          created_at: string | null
          id: string
          is_required: boolean | null
          item_id: string
          name: string
          options: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          item_id: string
          name: string
          options?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          item_id?: string
          name?: string
          options?: Json
        }
        Relationships: [
          {
            foreignKeyName: "food_item_variations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          bulk_enabled: boolean | null
          bulk_min_quantity: number | null
          bulk_price: number | null
          category: string | null
          created_at: string | null
          description: string | null
          diamond_reward: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_featured: boolean | null
          menu_id: string | null
          name: string
          preparation_time: string | null
          price: number
          referral_commission_diamonds: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          bulk_enabled?: boolean | null
          bulk_min_quantity?: number | null
          bulk_price?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          diamond_reward?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          menu_id?: string | null
          name: string
          preparation_time?: string | null
          price: number
          referral_commission_diamonds?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          bulk_enabled?: boolean | null
          bulk_min_quantity?: number | null
          bulk_price?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          diamond_reward?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          menu_id?: string | null
          name?: string
          preparation_time?: string | null
          price?: number
          referral_commission_diamonds?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "food_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "food_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      food_menus: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_menus_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "food_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      food_order_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          order_id: string
          quantity: number
          special_instructions: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          order_id: string
          quantity?: number
          special_instructions?: string | null
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          order_id?: string
          quantity?: number
          special_instructions?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      food_orders: {
        Row: {
          created_at: string | null
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          diamond_reward: number | null
          id: string
          notes: string | null
          order_number: string
          paid_with_credits: boolean | null
          payment_method: string | null
          referrer_id: string | null
          rider_id: string | null
          status: string | null
          subtotal: number
          total_amount: number
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          diamond_reward?: number | null
          id?: string
          notes?: string | null
          order_number: string
          paid_with_credits?: boolean | null
          payment_method?: string | null
          referrer_id?: string | null
          rider_id?: string | null
          status?: string | null
          subtotal: number
          total_amount: number
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          diamond_reward?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          paid_with_credits?: boolean | null
          payment_method?: string | null
          referrer_id?: string | null
          rider_id?: string | null
          status?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "food_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      food_vendors: {
        Row: {
          address: string | null
          admin_notes: string | null
          approval_status: string | null
          category_id: string | null
          cover_image_url: string | null
          created_at: string | null
          cuisine_type: string | null
          delivery_fee: number | null
          estimated_delivery_time: string | null
          id: string
          is_active: boolean | null
          is_open: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          minimum_order: number | null
          name: string
          owner_id: string
          phone: string | null
          rating: number | null
          total_orders: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          approval_status?: string | null
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          cuisine_type?: string | null
          delivery_fee?: number | null
          estimated_delivery_time?: string | null
          id?: string
          is_active?: boolean | null
          is_open?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          minimum_order?: number | null
          name: string
          owner_id: string
          phone?: string | null
          rating?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          approval_status?: string | null
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          cuisine_type?: string | null
          delivery_fee?: number | null
          estimated_delivery_time?: string | null
          id?: string
          is_active?: boolean | null
          is_open?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          minimum_order?: number | null
          name?: string
          owner_id?: string
          phone?: string | null
          rating?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_vendors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "food_categories"
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
      inventory: {
        Row: {
          barcode: string | null
          created_at: string
          food_item_id: string | null
          id: string
          last_restocked_at: string | null
          location: string | null
          max_stock_level: number | null
          min_stock_level: number
          notes: string | null
          product_id: string | null
          reorder_point: number | null
          sku: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          food_item_id?: string | null
          id?: string
          last_restocked_at?: string | null
          location?: string | null
          max_stock_level?: number | null
          min_stock_level?: number
          notes?: string | null
          product_id?: string | null
          reorder_point?: number | null
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          created_at?: string
          food_item_id?: string | null
          id?: string
          last_restocked_at?: string | null
          location?: string | null
          max_stock_level?: number | null
          min_stock_level?: number
          notes?: string | null
          product_id?: string | null
          reorder_point?: number | null
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      link_tracking: {
        Row: {
          conversion_type: string | null
          converted: boolean | null
          converted_at: string | null
          created_at: string
          expires_at: string
          id: string
          ip_hash: string | null
          link_type: string
          referrer_id: string | null
          source_url: string | null
          target_id: string | null
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          conversion_type?: string | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          ip_hash?: string | null
          link_type: string
          referrer_id?: string | null
          source_url?: string | null
          target_id?: string | null
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          conversion_type?: string | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_hash?: string | null
          link_type?: string
          referrer_id?: string | null
          source_url?: string | null
          target_id?: string | null
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_tracking_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          stream_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          stream_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_comments_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_followers: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          streamer_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          streamer_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          streamer_id?: string
        }
        Relationships: []
      }
      live_stream_gifts: {
        Row: {
          created_at: string
          diamond_amount: number
          gift_type: string
          id: string
          sender_id: string
          stream_id: string
        }
        Insert: {
          created_at?: string
          diamond_amount?: number
          gift_type: string
          id?: string
          sender_id: string
          stream_id: string
        }
        Update: {
          created_at?: string
          diamond_amount?: number
          gift_type?: string
          id?: string
          sender_id?: string
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_gifts_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_products: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_featured: boolean | null
          product_id: string
          stream_id: string
          streamer_id: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          product_id: string
          stream_id: string
          streamer_id?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          product_id?: string
          stream_id?: string
          streamer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_products_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          started_at: string | null
          status: string
          stream_key: string
          thumbnail_url: string | null
          title: string
          total_views: number | null
          updated_at: string
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          stream_key?: string
          thumbnail_url?: string | null
          title: string
          total_views?: number | null
          updated_at?: string
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          stream_key?: string
          thumbnail_url?: string | null
          title?: string
          total_views?: number | null
          updated_at?: string
          user_id?: string
          viewer_count?: number | null
        }
        Relationships: []
      }
      marketplace_categories: {
        Row: {
          color: string
          created_at: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          icon?: string
          id: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_favorites: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_inquiries: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          inquirer_id: string
          listing_id: string
          message: string
          preferred_date: string | null
          responded_at: string | null
          seller_response: string | null
          status: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          inquirer_id: string
          listing_id: string
          message: string
          preferred_date?: string | null
          responded_at?: string | null
          seller_response?: string | null
          status?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          inquirer_id?: string
          listing_id?: string
          message?: string
          preferred_date?: string | null
          responded_at?: string | null
          seller_response?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          amenities: string[] | null
          area_sqm: number | null
          available_from: string | null
          available_until: string | null
          bathrooms: number | null
          bedrooms: number | null
          brand: string | null
          category: Database["public"]["Enums"]["marketplace_category"]
          city: string | null
          condition: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          expires_at: string | null
          featured_until: string | null
          fuel_type: string | null
          id: string
          images: string[] | null
          inquiries_count: number | null
          is_featured: boolean | null
          location: string | null
          max_guests: number | null
          mileage: number | null
          min_stay_nights: number | null
          model: string | null
          price: number
          price_type: string | null
          province: string | null
          seller_id: string
          specifications: Json | null
          status:
            | Database["public"]["Enums"]["marketplace_listing_status"]
            | null
          thumbnail_url: string | null
          title: string
          transmission: string | null
          updated_at: string | null
          views_count: number | null
          year: number | null
          year_built: number | null
        }
        Insert: {
          amenities?: string[] | null
          area_sqm?: number | null
          available_from?: string | null
          available_until?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          brand?: string | null
          category: Database["public"]["Enums"]["marketplace_category"]
          city?: string | null
          condition?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expires_at?: string | null
          featured_until?: string | null
          fuel_type?: string | null
          id?: string
          images?: string[] | null
          inquiries_count?: number | null
          is_featured?: boolean | null
          location?: string | null
          max_guests?: number | null
          mileage?: number | null
          min_stay_nights?: number | null
          model?: string | null
          price: number
          price_type?: string | null
          province?: string | null
          seller_id: string
          specifications?: Json | null
          status?:
            | Database["public"]["Enums"]["marketplace_listing_status"]
            | null
          thumbnail_url?: string | null
          title: string
          transmission?: string | null
          updated_at?: string | null
          views_count?: number | null
          year?: number | null
          year_built?: number | null
        }
        Update: {
          amenities?: string[] | null
          area_sqm?: number | null
          available_from?: string | null
          available_until?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          brand?: string | null
          category?: Database["public"]["Enums"]["marketplace_category"]
          city?: string | null
          condition?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expires_at?: string | null
          featured_until?: string | null
          fuel_type?: string | null
          id?: string
          images?: string[] | null
          inquiries_count?: number | null
          is_featured?: boolean | null
          location?: string | null
          max_guests?: number | null
          mileage?: number | null
          min_stay_nights?: number | null
          model?: string | null
          price?: number
          price_type?: string | null
          province?: string | null
          seller_id?: string
          specifications?: Json | null
          status?:
            | Database["public"]["Enums"]["marketplace_listing_status"]
            | null
          thumbnail_url?: string | null
          title?: string
          transmission?: string | null
          updated_at?: string | null
          views_count?: number | null
          year?: number | null
          year_built?: number | null
        }
        Relationships: []
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
      moba_heroes: {
        Row: {
          base_attack: number
          base_defense: number
          base_hp: number
          base_speed: number
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_starter: boolean | null
          name: string
          role: string
          skill_1: Json | null
          skill_2: Json | null
          slug: string
          sprite_url: string | null
          ultimate: Json | null
          unlock_cost_diamonds: number | null
          updated_at: string | null
        }
        Insert: {
          base_attack?: number
          base_defense?: number
          base_hp?: number
          base_speed?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_starter?: boolean | null
          name: string
          role?: string
          skill_1?: Json | null
          skill_2?: Json | null
          slug: string
          sprite_url?: string | null
          ultimate?: Json | null
          unlock_cost_diamonds?: number | null
          updated_at?: string | null
        }
        Update: {
          base_attack?: number
          base_defense?: number
          base_hp?: number
          base_speed?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_starter?: boolean | null
          name?: string
          role?: string
          skill_1?: Json | null
          skill_2?: Json | null
          slug?: string
          sprite_url?: string | null
          ultimate?: Json | null
          unlock_cost_diamonds?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      moba_level_completions: {
        Row: {
          completed_at: string | null
          diamonds_earned: number | null
          hero_used: string | null
          id: string
          level_id: string
          score: number | null
          stars_earned: number | null
          time_seconds: number | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          completed_at?: string | null
          diamonds_earned?: number | null
          hero_used?: string | null
          id?: string
          level_id: string
          score?: number | null
          stars_earned?: number | null
          time_seconds?: number | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          completed_at?: string | null
          diamonds_earned?: number | null
          hero_used?: string | null
          id?: string
          level_id?: string
          score?: number | null
          stars_earned?: number | null
          time_seconds?: number | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "moba_level_completions_hero_used_fkey"
            columns: ["hero_used"]
            isOneToOne: false
            referencedRelation: "moba_heroes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moba_level_completions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "moba_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      moba_levels: {
        Row: {
          boss_config: Json | null
          created_at: string | null
          description: string | null
          difficulty: string
          difficulty_multiplier: number | null
          enemy_config: Json | null
          entry_cost_diamonds: number | null
          id: string
          is_active: boolean | null
          level_number: number
          map_config: Json | null
          min_player_level: number | null
          name: string
          reward_diamonds: number | null
          reward_xp: number | null
          story_chapter: string | null
          story_cutscene: Json | null
          time_limit_seconds: number | null
          unlock_ability: string | null
          unlock_hero_id: string | null
          updated_at: string | null
        }
        Insert: {
          boss_config?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string
          difficulty_multiplier?: number | null
          enemy_config?: Json | null
          entry_cost_diamonds?: number | null
          id?: string
          is_active?: boolean | null
          level_number: number
          map_config?: Json | null
          min_player_level?: number | null
          name: string
          reward_diamonds?: number | null
          reward_xp?: number | null
          story_chapter?: string | null
          story_cutscene?: Json | null
          time_limit_seconds?: number | null
          unlock_ability?: string | null
          unlock_hero_id?: string | null
          updated_at?: string | null
        }
        Update: {
          boss_config?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string
          difficulty_multiplier?: number | null
          enemy_config?: Json | null
          entry_cost_diamonds?: number | null
          id?: string
          is_active?: boolean | null
          level_number?: number
          map_config?: Json | null
          min_player_level?: number | null
          name?: string
          reward_diamonds?: number | null
          reward_xp?: number | null
          story_chapter?: string | null
          story_cutscene?: Json | null
          time_limit_seconds?: number | null
          unlock_ability?: string | null
          unlock_hero_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moba_levels_unlock_hero_id_fkey"
            columns: ["unlock_hero_id"]
            isOneToOne: false
            referencedRelation: "moba_heroes"
            referencedColumns: ["id"]
          },
        ]
      }
      moba_player_heroes: {
        Row: {
          hero_id: string
          hero_level: number | null
          hero_xp: number | null
          id: string
          is_favorite: boolean | null
          skin_equipped: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          hero_id: string
          hero_level?: number | null
          hero_xp?: number | null
          id?: string
          is_favorite?: boolean | null
          skin_equipped?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          hero_id?: string
          hero_level?: number | null
          hero_xp?: number | null
          id?: string
          is_favorite?: boolean | null
          skin_equipped?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moba_player_heroes_hero_id_fkey"
            columns: ["hero_id"]
            isOneToOne: false
            referencedRelation: "moba_heroes"
            referencedColumns: ["id"]
          },
        ]
      }
      moba_player_progress: {
        Row: {
          created_at: string | null
          current_level: number | null
          highest_level_completed: number | null
          id: string
          play_time_minutes: number | null
          player_level: number | null
          total_games_played: number | null
          total_kills: number | null
          total_wins: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_level?: number | null
          highest_level_completed?: number | null
          id?: string
          play_time_minutes?: number | null
          player_level?: number | null
          total_games_played?: number | null
          total_kills?: number | null
          total_wins?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_level?: number | null
          highest_level_completed?: number | null
          id?: string
          play_time_minutes?: number | null
          player_level?: number | null
          total_games_played?: number | null
          total_kills?: number | null
          total_wins?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      moba_purchases: {
        Row: {
          affiliate_commission_paid: boolean | null
          diamonds_spent: number
          id: string
          item_id: string | null
          item_type: string
          purchased_at: string | null
          referrer_id: string | null
          user_id: string
        }
        Insert: {
          affiliate_commission_paid?: boolean | null
          diamonds_spent: number
          id?: string
          item_id?: string | null
          item_type: string
          purchased_at?: string | null
          referrer_id?: string | null
          user_id: string
        }
        Update: {
          affiliate_commission_paid?: boolean | null
          diamonds_spent?: number
          id?: string
          item_id?: string | null
          item_type?: string
          purchased_at?: string | null
          referrer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moba_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "moba_store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      moba_store_items: {
        Row: {
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          effect_config: Json | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          item_type: string
          name: string
          price_diamonds: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          effect_config?: Json | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          item_type: string
          name: string
          price_diamonds?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          effect_config?: Json | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          item_type?: string
          name?: string
          price_diamonds?: number
        }
        Relationships: []
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
          live_stream_id: string | null
          live_streamer_id: string | null
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
          live_stream_id?: string | null
          live_streamer_id?: string | null
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
          live_stream_id?: string | null
          live_streamer_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "orders_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_labels: {
        Row: {
          barcode: string
          created_at: string
          id: string
          label_type: string
          order_id: string
          printed_at: string | null
          printed_by: string | null
          qr_code_data: string | null
          status: string
        }
        Insert: {
          barcode: string
          created_at?: string
          id?: string
          label_type?: string
          order_id: string
          printed_at?: string | null
          printed_by?: string | null
          qr_code_data?: string | null
          status?: string
        }
        Update: {
          barcode?: string
          created_at?: string
          id?: string
          label_type?: string
          order_id?: string
          printed_at?: string | null
          printed_by?: string | null
          qr_code_data?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_labels_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
          hex_color: string | null
          id: string
          image_url: string | null
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
          hex_color?: string | null
          id?: string
          image_url?: string | null
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
          hex_color?: string | null
          id?: string
          image_url?: string | null
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
          bulk_enabled: boolean | null
          bulk_min_quantity: number | null
          bulk_price: number | null
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
          bulk_enabled?: boolean | null
          bulk_min_quantity?: number | null
          bulk_price?: number | null
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
          bulk_enabled?: boolean | null
          bulk_min_quantity?: number | null
          bulk_price?: number | null
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
          bio: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          credits: number
          currency: string
          currency_symbol: string
          diamonds: number | null
          email: string | null
          engagement_rate: number | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          id: string
          is_creator: boolean | null
          is_paid_affiliate: boolean | null
          is_verified: boolean | null
          is_verified_rider: boolean | null
          is_verified_seller: boolean | null
          location: string | null
          referral_code: string
          referred_by: string | null
          seller_rating: number | null
          total_reviews: number | null
          total_views: number | null
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          credits?: number
          currency?: string
          currency_symbol?: string
          diamonds?: number | null
          email?: string | null
          engagement_rate?: number | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id: string
          is_creator?: boolean | null
          is_paid_affiliate?: boolean | null
          is_verified?: boolean | null
          is_verified_rider?: boolean | null
          is_verified_seller?: boolean | null
          location?: string | null
          referral_code: string
          referred_by?: string | null
          seller_rating?: number | null
          total_reviews?: number | null
          total_views?: number | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          credits?: number
          currency?: string
          currency_symbol?: string
          diamonds?: number | null
          email?: string | null
          engagement_rate?: number | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          is_creator?: boolean | null
          is_paid_affiliate?: boolean | null
          is_verified?: boolean | null
          is_verified_rider?: boolean | null
          is_verified_seller?: boolean | null
          location?: string | null
          referral_code?: string
          referred_by?: string | null
          seller_rating?: number | null
          total_reviews?: number | null
          total_views?: number | null
          updated_at?: string
          username?: string | null
          website?: string | null
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
      service_blockout_dates: {
        Row: {
          blockout_date: string
          created_at: string
          id: string
          provider_id: string
          reason: string | null
          service_id: string | null
        }
        Insert: {
          blockout_date: string
          created_at?: string
          id?: string
          provider_id: string
          reason?: string | null
          service_id?: string | null
        }
        Update: {
          blockout_date?: string
          created_at?: string
          id?: string
          provider_id?: string
          reason?: string | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_blockout_dates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_blockout_dates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          booking_date: string
          created_at: string
          customer_id: string
          end_time: string | null
          id: string
          notes: string | null
          provider_id: string
          referrer_id: string | null
          service_id: string
          start_time: string
          status: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          customer_id: string
          end_time?: string | null
          id?: string
          notes?: string | null
          provider_id: string
          referrer_id?: string | null
          service_id: string
          start_time: string
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          customer_id?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          provider_id?: string
          referrer_id?: string | null
          service_id?: string
          start_time?: string
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          category_type: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          category_type?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          category_type?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      service_category_fields: {
        Row: {
          category_id: string | null
          created_at: string
          display_order: number | null
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          help_text: string | null
          id: string
          is_required: boolean | null
          placeholder: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          display_order?: number | null
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type?: string
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          placeholder?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          display_order?: number | null
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          placeholder?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_category_fields_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          accommodations: Json | null
          activities: Json | null
          admin_diamond_override: number | null
          admin_notes: string | null
          admin_price_override: number | null
          admin_referral_diamond_override: number | null
          approval_status: string | null
          category: string | null
          created_at: string
          custom_data: Json | null
          description: string | null
          destinations: Json | null
          diamond_reward: number | null
          duration_minutes: number | null
          exclusions: Json | null
          gallery_images: Json | null
          id: string
          image_url: string | null
          inclusions: Json | null
          is_active: boolean | null
          max_guests: number | null
          meeting_point: string | null
          min_guests: number | null
          price: number
          provider_id: string
          referral_commission_diamonds: number | null
          title: string
          updated_at: string
          vendor_price: number | null
        }
        Insert: {
          accommodations?: Json | null
          activities?: Json | null
          admin_diamond_override?: number | null
          admin_notes?: string | null
          admin_price_override?: number | null
          admin_referral_diamond_override?: number | null
          approval_status?: string | null
          category?: string | null
          created_at?: string
          custom_data?: Json | null
          description?: string | null
          destinations?: Json | null
          diamond_reward?: number | null
          duration_minutes?: number | null
          exclusions?: Json | null
          gallery_images?: Json | null
          id?: string
          image_url?: string | null
          inclusions?: Json | null
          is_active?: boolean | null
          max_guests?: number | null
          meeting_point?: string | null
          min_guests?: number | null
          price?: number
          provider_id: string
          referral_commission_diamonds?: number | null
          title: string
          updated_at?: string
          vendor_price?: number | null
        }
        Update: {
          accommodations?: Json | null
          activities?: Json | null
          admin_diamond_override?: number | null
          admin_notes?: string | null
          admin_price_override?: number | null
          admin_referral_diamond_override?: number | null
          approval_status?: string | null
          category?: string | null
          created_at?: string
          custom_data?: Json | null
          description?: string | null
          destinations?: Json | null
          diamond_reward?: number | null
          duration_minutes?: number | null
          exclusions?: Json | null
          gallery_images?: Json | null
          id?: string
          image_url?: string | null
          inclusions?: Json | null
          is_active?: boolean | null
          max_guests?: number | null
          meeting_point?: string | null
          min_guests?: number | null
          price?: number
          provider_id?: string
          referral_commission_diamonds?: number | null
          title?: string
          updated_at?: string
          vendor_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
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
      smm_ad_campaigns: {
        Row: {
          ad_content: Json | null
          ad_type: string
          budget: number | null
          budget_type: string | null
          campaign_name: string
          client_account_id: string
          created_at: string | null
          end_date: string | null
          id: string
          performance_metrics: Json | null
          platform: string
          start_date: string | null
          status: string | null
          target_audience: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ad_content?: Json | null
          ad_type?: string
          budget?: number | null
          budget_type?: string | null
          campaign_name: string
          client_account_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          performance_metrics?: Json | null
          platform: string
          start_date?: string | null
          status?: string | null
          target_audience?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ad_content?: Json | null
          ad_type?: string
          budget?: number | null
          budget_type?: string | null
          campaign_name?: string
          client_account_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          performance_metrics?: Json | null
          platform?: string
          start_date?: string | null
          status?: string | null
          target_audience?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smm_ad_campaigns_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "smm_client_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_analytics: {
        Row: {
          client_account_id: string | null
          id: string
          metric_type: string
          metric_value: number | null
          post_id: string | null
          recorded_at: string
          user_id: string
        }
        Insert: {
          client_account_id?: string | null
          id?: string
          metric_type: string
          metric_value?: number | null
          post_id?: string | null
          recorded_at?: string
          user_id: string
        }
        Update: {
          client_account_id?: string | null
          id?: string
          metric_type?: string
          metric_value?: number | null
          post_id?: string | null
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smm_analytics_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "smm_client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smm_analytics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "smm_scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_client_accounts: {
        Row: {
          access_token_encrypted: string | null
          account_id: string | null
          account_name: string
          client_email: string | null
          client_name: string
          created_at: string
          deletion_protected: boolean | null
          id: string
          is_locked: boolean | null
          last_activity_at: string | null
          lock_reason: string | null
          metadata: Json | null
          monthly_fee: number | null
          original_owner_id: string | null
          platform: string
          refresh_token_encrypted: string | null
          security_level: string | null
          status: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          account_id?: string | null
          account_name: string
          client_email?: string | null
          client_name: string
          created_at?: string
          deletion_protected?: boolean | null
          id?: string
          is_locked?: boolean | null
          last_activity_at?: string | null
          lock_reason?: string | null
          metadata?: Json | null
          monthly_fee?: number | null
          original_owner_id?: string | null
          platform: string
          refresh_token_encrypted?: string | null
          security_level?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          account_id?: string | null
          account_name?: string
          client_email?: string | null
          client_name?: string
          created_at?: string
          deletion_protected?: boolean | null
          id?: string
          is_locked?: boolean | null
          last_activity_at?: string | null
          lock_reason?: string | null
          metadata?: Json | null
          monthly_fee?: number | null
          original_owner_id?: string | null
          platform?: string
          refresh_token_encrypted?: string | null
          security_level?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      smm_content_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          name: string
          platform: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          name: string
          platform?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          name?: string
          platform?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      smm_scheduled_posts: {
        Row: {
          client_account_id: string
          content: string
          created_at: string
          error_message: string | null
          id: string
          media_type: string | null
          media_urls: Json | null
          platform: string
          post_result: Json | null
          retry_count: number | null
          scheduled_for: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_account_id: string
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          media_type?: string | null
          media_urls?: Json | null
          platform: string
          post_result?: Json | null
          retry_count?: number | null
          scheduled_for: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_account_id?: string
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          media_type?: string | null
          media_urls?: Json | null
          platform?: string
          post_result?: Json | null
          retry_count?: number | null
          scheduled_for?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smm_scheduled_posts_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "smm_client_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_security_audit: {
        Row: {
          action_details: Json | null
          action_type: string
          blocked: boolean | null
          client_account_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          risk_level: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          blocked?: boolean | null
          client_account_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          risk_level?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          blocked?: boolean | null
          client_account_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          risk_level?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smm_security_audit_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "smm_client_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_service_pricing: {
        Row: {
          base_price: number
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          price_per_ad: number | null
          price_per_month: number | null
          price_per_post: number | null
          service_name: string
          service_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_price?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          price_per_ad?: number | null
          price_per_month?: number | null
          price_per_post?: number | null
          service_name: string
          service_type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_price?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          price_per_ad?: number | null
          price_per_month?: number | null
          price_per_post?: number | null
          service_name?: string
          service_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      smm_service_transactions: {
        Row: {
          admin_commission: number | null
          amount: number
          client_account_id: string | null
          created_at: string | null
          description: string | null
          id: string
          net_amount: number | null
          pricing_id: string | null
          status: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          admin_commission?: number | null
          amount?: number
          client_account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          net_amount?: number | null
          pricing_id?: string | null
          status?: string | null
          transaction_type?: string
          user_id: string
        }
        Update: {
          admin_commission?: number | null
          amount?: number
          client_account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          net_amount?: number | null
          pricing_id?: string | null
          status?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smm_service_transactions_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "smm_client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smm_service_transactions_pricing_id_fkey"
            columns: ["pricing_id"]
            isOneToOne: false
            referencedRelation: "smm_service_pricing"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_connections: {
        Row: {
          access_token: string | null
          account_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          platform: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      social_media_uploads: {
        Row: {
          created_at: string | null
          description: string | null
          error_message: string | null
          id: string
          platform: string
          post_id: string | null
          project_id: string | null
          status: string | null
          title: string | null
          uploaded_at: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          platform: string
          post_id?: string | null
          project_id?: string | null
          status?: string | null
          title?: string | null
          uploaded_at?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          platform?: string
          post_id?: string | null
          project_id?: string | null
          status?: string | null
          title?: string | null
          uploaded_at?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "content_creator_projects"
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
          qualification_type: string
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
          qualification_type?: string
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
          qualification_type?: string
          sales_quota?: number
          step_name?: string
          step_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          movement_type: string
          new_quantity: number
          notes: string | null
          performed_by: string | null
          previous_quantity: number
          quantity: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          movement_type: string
          new_quantity: number
          notes?: string | null
          performed_by?: string | null
          previous_quantity: number
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          movement_type?: string
          new_quantity?: number
          notes?: string | null
          performed_by?: string | null
          previous_quantity?: number
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_replenishment: {
        Row: {
          approved_by: string | null
          approved_quantity: number | null
          created_at: string
          expected_date: string | null
          id: string
          inventory_id: string
          notes: string | null
          received_date: string | null
          requested_by: string | null
          requested_quantity: number
          status: string
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          approved_quantity?: number | null
          created_at?: string
          expected_date?: string | null
          id?: string
          inventory_id: string
          notes?: string | null
          received_date?: string | null
          requested_by?: string | null
          requested_quantity: number
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          approved_quantity?: number | null
          created_at?: string
          expected_date?: string | null
          id?: string
          inventory_id?: string
          notes?: string | null
          received_date?: string | null
          requested_by?: string | null
          requested_quantity?: number
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_replenishment_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          comments_count: number | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          metadata: Json | null
          reactions_count: number | null
          shares_count: number | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          comments_count?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          metadata?: Json | null
          reactions_count?: number | null
          shares_count?: number | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          comments_count?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          metadata?: Json | null
          reactions_count?: number | null
          shares_count?: number | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      story_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_shares: {
        Row: {
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_shares_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_commissions: {
        Row: {
          amount: number
          commission_type: string
          created_at: string
          from_user_id: string
          id: string
          level: number | null
          status: string | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          amount: number
          commission_type: string
          created_at?: string
          from_user_id: string
          id?: string
          level?: number | null
          status?: string | null
          subscription_id: string
          user_id: string
        }
        Update: {
          amount?: number
          commission_type?: string
          created_at?: string
          from_user_id?: string
          id?: string
          level?: number | null
          status?: string | null
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "website_builder_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          admin_markup_fixed: number | null
          admin_markup_percent: number | null
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          barcode: string | null
          category_id: string | null
          created_at: string
          description: string | null
          final_price: number | null
          id: string
          images: Json | null
          is_active: boolean | null
          min_order_quantity: number | null
          name: string
          sku: string | null
          specifications: Json | null
          status: string
          stock_quantity: number | null
          supplier_id: string
          supplier_price: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          admin_markup_fixed?: number | null
          admin_markup_percent?: number | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          final_price?: number | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          min_order_quantity?: number | null
          name: string
          sku?: string | null
          specifications?: Json | null
          status?: string
          stock_quantity?: number | null
          supplier_id: string
          supplier_price: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          admin_markup_fixed?: number | null
          admin_markup_percent?: number | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          final_price?: number | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          min_order_quantity?: number | null
          name?: string
          sku?: string | null
          specifications?: Json | null
          status?: string
          stock_quantity?: number | null
          supplier_id?: string
          supplier_price?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          commission_rate: number | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
          objective: string | null
          placement: string | null
          spent_diamonds: number
          start_date: string | null
          status: string
          target_age_max: number | null
          target_age_min: number | null
          target_barangay: string | null
          target_behavior: string[] | null
          target_category: string | null
          target_city: string | null
          target_country: string | null
          target_device: string[] | null
          target_gender: string | null
          target_interests: string[] | null
          target_language: string | null
          target_province: string | null
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
          objective?: string | null
          placement?: string | null
          spent_diamonds?: number
          start_date?: string | null
          status?: string
          target_age_max?: number | null
          target_age_min?: number | null
          target_barangay?: string | null
          target_behavior?: string[] | null
          target_category?: string | null
          target_city?: string | null
          target_country?: string | null
          target_device?: string[] | null
          target_gender?: string | null
          target_interests?: string[] | null
          target_language?: string | null
          target_province?: string | null
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
          objective?: string | null
          placement?: string | null
          spent_diamonds?: number
          start_date?: string | null
          status?: string
          target_age_max?: number | null
          target_age_min?: number | null
          target_barangay?: string | null
          target_behavior?: string[] | null
          target_category?: string | null
          target_city?: string | null
          target_country?: string | null
          target_device?: string[] | null
          target_gender?: string | null
          target_interests?: string[] | null
          target_language?: string | null
          target_province?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: []
      }
      user_ai_credits: {
        Row: {
          audio_minutes_available: number
          audio_minutes_used: number
          created_at: string
          id: string
          images_available: number
          images_used: number
          total_credits: number
          updated_at: string
          user_id: string
          video_minutes_available: number
          video_minutes_used: number
        }
        Insert: {
          audio_minutes_available?: number
          audio_minutes_used?: number
          created_at?: string
          id?: string
          images_available?: number
          images_used?: number
          total_credits?: number
          updated_at?: string
          user_id: string
          video_minutes_available?: number
          video_minutes_used?: number
        }
        Update: {
          audio_minutes_available?: number
          audio_minutes_used?: number
          created_at?: string
          id?: string
          images_available?: number
          images_used?: number
          total_credits?: number
          updated_at?: string
          user_id?: string
          video_minutes_available?: number
          video_minutes_used?: number
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
      website_builder_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          leadership_commission_percent: number | null
          monthly_price: number
          name: string
          stairstep_commission_percent: number | null
          unilevel_commission_percent: number | null
          updated_at: string
          yearly_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          leadership_commission_percent?: number | null
          monthly_price?: number
          name: string
          stairstep_commission_percent?: number | null
          unilevel_commission_percent?: number | null
          updated_at?: string
          yearly_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          leadership_commission_percent?: number | null
          monthly_price?: number
          name?: string
          stairstep_commission_percent?: number | null
          unilevel_commission_percent?: number | null
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      website_builder_subscriptions: {
        Row: {
          amount_paid: number | null
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          payment_method: string | null
          plan_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          billing_cycle: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          payment_method?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          payment_method?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_builder_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "website_builder_plans"
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
      calculate_player_level: { Args: { total_xp: number }; Returns: number }
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
      can_view_binary_network: {
        Args: { _node_id: string; _requester: string }
        Returns: boolean
      }
      check_affiliate_eligibility: {
        Args: { user_id_param: string }
        Returns: Json
      }
      check_and_update_affiliate_rank: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_level5_bonus: { Args: { player_id: string }; Returns: undefined }
      check_marketplace_eligibility: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      claim_level_prize: {
        Args: { _level: number; _user_id: string }
        Returns: Json
      }
      clean_ai_cache: { Args: never; Returns: undefined }
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
      get_supplier_id: { Args: { _user_id: string }; Returns: string }
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
      is_supplier: { Args: { _user_id: string }; Returns: boolean }
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
      app_role: "admin" | "user" | "supplier"
      binary_leg: "left" | "right"
      marketplace_category:
        | "property_sale"
        | "vehicle_sale"
        | "secondhand_items"
        | "property_rent"
        | "room_rent"
        | "hotel_staycation"
      marketplace_listing_status:
        | "active"
        | "pending"
        | "sold"
        | "rented"
        | "expired"
        | "deleted"
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
      app_role: ["admin", "user", "supplier"],
      binary_leg: ["left", "right"],
      marketplace_category: [
        "property_sale",
        "vehicle_sale",
        "secondhand_items",
        "property_rent",
        "room_rent",
        "hotel_staycation",
      ],
      marketplace_listing_status: [
        "active",
        "pending",
        "sold",
        "rented",
        "expired",
        "deleted",
      ],
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
