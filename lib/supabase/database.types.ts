export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          created_at: string;
          id: string;
          messages: Json;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          messages?: Json;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          messages?: Json;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      mcp_live_sessions: {
        Row: {
          id: string;
          live_session_id: string;
          server_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          live_session_id: string;
          server_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          live_session_id?: string;
          server_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mcp_live_sessions_server_id_fkey";
            columns: ["server_id"];
            isOneToOne: false;
            referencedRelation: "mcp_servers";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_servers: {
        Row: {
          args: Json;
          command: string | null;
          created_at: string;
          env: Json;
          headers: Json;
          id: string;
          name: string;
          transport: string;
          updated_at: string;
          url: string | null;
          user_id: string;
        };
        Insert: {
          args?: Json;
          command?: string | null;
          created_at?: string;
          env?: Json;
          headers?: Json;
          id?: string;
          name: string;
          transport: string;
          updated_at?: string;
          url?: string | null;
          user_id: string;
        };
        Update: {
          args?: Json;
          command?: string | null;
          created_at?: string;
          env?: Json;
          headers?: Json;
          id?: string;
          name?: string;
          transport?: string;
          updated_at?: string;
          url?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          created_at: string;
          local_storage_migrated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          local_storage_migrated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          local_storage_migrated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
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
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
