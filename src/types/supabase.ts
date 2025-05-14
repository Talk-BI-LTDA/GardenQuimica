// src/types/supabase.ts
export type Database = {
    public: {
      Tables: {
        [key: string]: {
          Row: Record<string, unknown>;
          Insert: Record<string, unknown>;
          Update: Record<string, unknown>;
        };
      };
      Views: Record<string, unknown>;
      Functions: Record<string, unknown>;
      Enums: Record<string, unknown>;
    };
  };