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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      casino_sessions: {
        Row: {
          bet_amount: number
          client_seed: string | null
          created_at: string
          game: string
          id: string
          multiplier: number | null
          nonce: number | null
          pnl: number
          result: string
          server_seed_hash: string | null
          user_id: string
        }
        Insert: {
          bet_amount?: number
          client_seed?: string | null
          created_at?: string
          game: string
          id?: string
          multiplier?: number | null
          nonce?: number | null
          pnl?: number
          result?: string
          server_seed_hash?: string | null
          user_id: string
        }
        Update: {
          bet_amount?: number
          client_seed?: string | null
          created_at?: string
          game?: string
          id?: string
          multiplier?: number | null
          nonce?: number | null
          pnl?: number
          result?: string
          server_seed_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crash_bets: {
        Row: {
          bet_amount: number
          cashout_multiplier: number | null
          created_at: string
          id: string
          pnl: number | null
          round_id: string
          user_id: string
        }
        Insert: {
          bet_amount: number
          cashout_multiplier?: number | null
          created_at?: string
          id?: string
          pnl?: number | null
          round_id: string
          user_id: string
        }
        Update: {
          bet_amount?: number
          cashout_multiplier?: number | null
          created_at?: string
          id?: string
          pnl?: number | null
          round_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crash_bets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "crash_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      crash_rounds: {
        Row: {
          betting_ends_at: string | null
          crash_point: number
          crashed_at: string | null
          created_at: string
          curve_started_at: string | null
          id: string
          phase: string
        }
        Insert: {
          betting_ends_at?: string | null
          crash_point: number
          crashed_at?: string | null
          created_at?: string
          curve_started_at?: string | null
          id?: string
          phase?: string
        }
        Update: {
          betting_ends_at?: string | null
          crash_point?: number
          crashed_at?: string | null
          created_at?: string
          curve_started_at?: string | null
          id?: string
          phase?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          casino_balance: number
          created_at: string
          email: string | null
          encrypted_private_key: string | null
          id: string
          last_bet_at: string | null
          level: number
          sol_address: string | null
          total_losses: number | null
          total_wagered: number | null
          total_wins: number | null
          updated_at: string
          username: string
          xp: number
        }
        Insert: {
          casino_balance?: number
          created_at?: string
          email?: string | null
          encrypted_private_key?: string | null
          id: string
          last_bet_at?: string | null
          level?: number
          sol_address?: string | null
          total_losses?: number | null
          total_wagered?: number | null
          total_wins?: number | null
          updated_at?: string
          username: string
          xp?: number
        }
        Update: {
          casino_balance?: number
          created_at?: string
          email?: string | null
          encrypted_private_key?: string | null
          id?: string
          last_bet_at?: string | null
          level?: number
          sol_address?: string | null
          total_losses?: number | null
          total_wagered?: number | null
          total_wins?: number | null
          updated_at?: string
          username?: string
          xp?: number
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_sol: number
          created_at: string | null
          from_address: string | null
          id: string
          note: string | null
          solana_tx_signature: string | null
          status: string
          to_address: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount_sol: number
          created_at?: string | null
          from_address?: string | null
          id?: string
          note?: string | null
          solana_tx_signature?: string | null
          status?: string
          to_address?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount_sol?: number
          created_at?: string | null
          from_address?: string | null
          id?: string
          note?: string | null
          solana_tx_signature?: string | null
          status?: string
          to_address?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_public: {
        Row: {
          casino_balance: number | null
          created_at: string | null
          email: string | null
          id: string | null
          last_bet_at: string | null
          level: number | null
          sol_address: string | null
          total_losses: number | null
          total_wagered: number | null
          total_wins: number | null
          updated_at: string | null
          username: string | null
          xp: number | null
        }
        Insert: {
          casino_balance?: number | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_bet_at?: string | null
          level?: number | null
          sol_address?: string | null
          total_losses?: number | null
          total_wagered?: number | null
          total_wins?: number | null
          updated_at?: string | null
          username?: string | null
          xp?: number | null
        }
        Update: {
          casino_balance?: number | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_bet_at?: string | null
          level?: number | null
          sol_address?: string | null
          total_losses?: number | null
          total_wagered?: number | null
          total_wins?: number | null
          updated_at?: string | null
          username?: string | null
          xp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          biggest_win: number
          games: number
          total_pnl: number
          username: string
        }[]
      }
      get_platform_stats: {
        Args: never
        Returns: {
          total_games: number
          total_players: number
          total_volume: number
        }[]
      }
      get_recent_activity: {
        Args: { p_limit?: number }
        Returns: {
          bet_amount: number
          created_at: string
          game: string
          id: string
          pnl: number
          result: string
        }[]
      }
      get_top_wins: {
        Args: { p_limit?: number }
        Returns: {
          game: string
          pnl: number
          username: string
        }[]
      }
      get_waitlist_count: { Args: never; Returns: number }
      process_casino_bet: {
        Args: {
          p_bet_amount: number
          p_client_seed?: string
          p_details?: Json
          p_game: string
          p_multiplier: number
          p_nonce?: number
          p_pnl: number
          p_result: string
          p_server_seed_hash?: string
          p_user_id: string
        }
        Returns: {
          error_msg: string
          new_balance: number
          session_id: string
          success: boolean
        }[]
      }
      process_withdrawal: {
        Args: {
          p_amount: number
          p_destination: string
          p_tx_signature: string
          p_user_id: string
        }
        Returns: {
          error_msg: string
          new_balance: number
          success: boolean
        }[]
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
    Enums: {},
  },
} as const
