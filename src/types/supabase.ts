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
          user_id: string;
          full_name: string;
          phone: string;
          address: string;
          lat: number | null;
          lng: number | null;
          delivered: boolean;
          delivered_at: string | null;
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
          delivered?: boolean;
          delivered_at?: string | null;
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
          delivered?: boolean;
          delivered_at?: string | null;
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
          order_index: number;
          delivered: boolean;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          full_name: string;
          phone: string;
          address: string;
          lat?: number | null;
          lng?: number | null;
          order_index?: number;
          delivered?: boolean;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          full_name?: string;
          phone?: string;
          address?: string;
          lat?: number | null;
          lng?: number | null;
          order_index?: number;
          delivered?: boolean;
          delivered_at?: string | null;
          created_at?: string;
        };
      };
      start_point: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          lat: number;
          lng: number;
        };
        Insert: {
          user_id: string;
          name: string;
          lat: number;
          lng: number;
        };
        Update: {
          user_id?: string;
          name?: string;
          lat?: number;
          lng?: number;
        };
      };
    };
  };
}
