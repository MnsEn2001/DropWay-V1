// src/types/supabase.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
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
          note: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          full_name: string;
          phone: string;
          address: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          full_name?: string;
          phone?: string;
          address?: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string | null;
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
          note: string | null;
          order_index: number;
          created_at: string;
          updated_at: string | null;
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
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          full_name?: string;
          phone?: string;
          address?: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string | null;
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
          note: string | null;
          order_index: number;
          created_at: string;
          updated_at: string | null;
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
          created_at?: string;
          updated_at?: string | null;
          original_date: string;
        };
        Update: {
          user_id?: string;
          full_name?: string;
          phone?: string;
          address?: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string | null;
          original_date?: string;
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
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          lat: number;
          lng: number;
          name?: string | null;
        };
        Update: {
          lat?: number;
          lng?: number;
          name?: string | null;
        };
      };
    };
  };
}
