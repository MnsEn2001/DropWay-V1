// src/types/supabase.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      houses: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          address: string;
          lat: number | null;
          lng: number | null;
          note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone: string;
          address: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string;
          address?: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      today_houses: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          phone: string;
          address: string;
          lat: number | null;
          lng: number | null;
          note: string; // เพิ่ม note
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          phone: string;
          address: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null; // เพิ่ม note
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          // เหมือน Insert แต่ทุก field ไม่บังคับ
          id?: string;
          user_id?: string;
          full_name?: string;
          phone?: string;
          address?: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null; // เพิ่ม note
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      pending_houses: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          phone: string;
          address: string;
          lat: number | null;
          lng: number | null;
          note: string; // เพิ่ม note
          order_index: number;
          created_at: string;
          updated_at: string;
          original_date: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          phone: string;
          address: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
          original_date: string;
        };
        Update: {
          note?: string | null;
          // อื่น ๆ เหมือน Insert
        };
      };

      start_positions: {
        Row: {
          id: string;
          user_id: string;
          lat: number;
          lng: number;
          name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lat: number;
          lng: number;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          lat?: number;
          lng?: number;
          name?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
