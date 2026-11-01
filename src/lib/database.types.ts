export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      suppliers: {
        Row: {
          id: string
          user_id: string
          name: string
          contact_person: string
          phone: string
          email: string | null
          address: string | null
          payment_terms: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          contact_person: string
          phone: string
          email?: string | null
          address?: string | null
          payment_terms?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          contact_person?: string
          phone?: string
          email?: string | null
          address?: string | null
          payment_terms?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          sku: string
          category: string
          price: number
          cost: number
          quantity: number
          min_stock: number
          description: string | null
          supplier_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          sku: string
          category: string
          price?: number
          cost?: number
          quantity?: number
          min_stock?: number
          description?: string | null
          supplier_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          sku?: string
          category?: string
          price?: number
          cost?: number
          quantity?: number
          min_stock?: number
          description?: string | null
          supplier_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          user_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
          total_amount: number
          customer_name: string | null
          payment_method: string | null
          date: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
          total_amount: number
          customer_name?: string | null
          payment_method?: string | null
          date?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
          total_amount?: number
          customer_name?: string | null
          payment_method?: string | null
          date?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          user_id: string
          product_id: string | null
          product_name: string
          type: string
          quantity: number
          reason: string
          reference: string | null
          supplier_id: string | null
          supplier_name: string | null
          unit_cost: number | null
          total_cost: number | null
          date: string
          created_by: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id?: string | null
          product_name: string
          type: string
          quantity: number
          reason: string
          reference?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          date?: string
          created_by: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string | null
          product_name?: string
          type?: string
          quantity?: number
          reason?: string
          reference?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          date?: string
          created_by?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          product_id: string | null
          is_read: boolean
          priority: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          product_id?: string | null
          is_read?: boolean
          priority?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          product_id?: string | null
          is_read?: boolean
          priority?: string
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          business_name: string
          owner_name: string
          phone: string
          email: string | null
          address: string | null
          currency: string
          tax_rate: number
          low_stock_threshold: number
          auto_backup: boolean
          notifications_low_stock: boolean
          notifications_daily_summary: boolean
          notifications_weekly_report: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          business_name?: string
          owner_name?: string
          phone?: string
          email?: string | null
          address?: string | null
          currency?: string
          tax_rate?: number
          low_stock_threshold?: number
          auto_backup?: boolean
          notifications_low_stock?: boolean
          notifications_daily_summary?: boolean
          notifications_weekly_report?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          business_name?: string
          owner_name?: string
          phone?: string
          email?: string | null
          address?: string | null
          currency?: string
          tax_rate?: number
          low_stock_threshold?: number
          auto_backup?: boolean
          notifications_low_stock?: boolean
          notifications_daily_summary?: boolean
          notifications_weekly_report?: boolean
          updated_at?: string
          user_id?: string
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          price: number
          currency: string
          interval: string
          features: Json
          trial_days: number | null
          active: boolean | null
          popular: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          name: string
          price?: number
          currency?: string
          interval: string
          features?: Json
          trial_days?: number | null
          active?: boolean | null
          popular?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          price?: number
          currency?: string
          interval?: string
          features?: Json
          trial_days?: number | null
          active?: boolean | null
          popular?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: string
          trial_start: string | null
          trial_end: string | null
          current_period_start: string
          current_period_end: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          status?: string
          trial_start?: string | null
          trial_end?: string | null
          current_period_start?: string
          current_period_end: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          status?: string
          trial_start?: string | null
          trial_end?: string | null
          current_period_start?: string
          current_period_end?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      payment_requests: {
        Row: {
          id: string
          user_id: string | null
          plan_id: string
          transaction_id: string
          amount: number
          currency: string
          payment_method: string
          status: string
          submitted_at: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          user_email: string
          user_business_name: string
          plan_name: string
          created_at: string
          updated_at: string
          signup_data: Json | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          plan_id: string
          transaction_id: string
          amount: number
          currency?: string
          payment_method?: string
          status?: string
          submitted_at?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          user_email: string
          user_business_name: string
          plan_name: string
          created_at?: string
          updated_at?: string
          signup_data?: Json | null
        }
        Update: {
          id?: string
          user_id?: string | null
          plan_id?: string
          transaction_id?: string
          amount?: number
          currency?: string
          payment_method?: string
          status?: string
          submitted_at?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          user_email?: string
          user_business_name?: string
          plan_name?: string
          created_at?: string
          updated_at?: string
          signup_data?: Json | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_user_profile: {
        Args: {
          p_user_id: string
          p_business_name: string
          p_owner_name: string
        }
        Returns: Json
      }
      create_paid_user_profile: {
        Args: {
          p_user_id: string
          p_business_name: string
          p_owner_name: string
        }
        Returns: Json
      }
      record_user_login: {
        Args: {
          p_user_id: string
          p_last_login_at?: string
        }
        Returns: undefined
      }
      get_admin_user_last_logins: {
        Args: Record<string, never>
        Returns: {
          user_id: string
          last_login_at: string | null
        }[]
      }
      cancel_my_subscription: {
        Args: Record<string, never>
        Returns: Json
      }
      check_current_user_access: {
        Args: Record<string, never>
        Returns: Json
      }
      ensure_welcome_notification: {
        Args: {
          p_user_id: string
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
}