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
          full_name: string;
          phone: string;
          address: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
        };
        Update: {
          full_name?: string;
          phone?: string;
          address?: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
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
          note: string; // สำคัญมาก!
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          full_name: string;
          phone: string;
          address: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null; // สำคัญมาก!
          order_index?: number;
        };
        Update: {
          full_name?: string;
          phone?: string;
          address?: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null; // สำคัญมาก!
          order_index?: number;
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
          note: string;
          order_index: number;
          created_at: string;
          updated_at: string;
          original_date: string;
        };
        Insert: {
          user_id: string;
          full_name: string;
          phone: string;
          address: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          order_index?: number;
          original_date: string;
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
          user_id: string;
          lat: number;
          lng: number;
          name?: string | null;
        };
      };
    };
    Views: { [key: string]: never };
    Functions: { [key: string]: never };
    Enums: { [key: string]: never };
  };
}
