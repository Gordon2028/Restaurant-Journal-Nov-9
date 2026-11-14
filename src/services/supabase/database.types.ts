// Generated from the Supabase project schema (generate_typescript_types). Regenerate after schema changes.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' }
  public: {
    Tables: {
      events: {
        Row: { at: string; id: string; name: string; props: Json; user_id: string | null }
        Insert: { at?: string; id?: string; name: string; props?: Json; user_id?: string | null }
        Update: { at?: string; id?: string; name?: string; props?: Json; user_id?: string | null }
        Relationships: []
      }
      list_items: {
        Row: { list_id: string; position: number; visit_id: string }
        Insert: { list_id: string; position?: number; visit_id: string }
        Update: { list_id?: string; position?: number; visit_id?: string }
        Relationships: [
          { foreignKeyName: 'list_items_list_id_fkey'; columns: ['list_id']; isOneToOne: false; referencedRelation: 'lists'; referencedColumns: ['id'] },
          { foreignKeyName: 'list_items_visit_id_fkey'; columns: ['visit_id']; isOneToOne: false; referencedRelation: 'visits'; referencedColumns: ['id'] },
        ]
      }
      lists: {
        Row: {
          created_at: string; description: string; id: string; is_public: boolean; share_dishes: boolean
          share_photos: boolean; share_tags: boolean; show_owner_name: boolean; slug: string; title: string
          updated_at: string; user_id: string
        }
        Insert: {
          created_at?: string; description?: string; id: string; is_public?: boolean; share_dishes?: boolean
          share_photos?: boolean; share_tags?: boolean; show_owner_name?: boolean; slug: string; title?: string
          updated_at?: string; user_id?: string
        }
        Update: {
          created_at?: string; description?: string; id?: string; is_public?: boolean; share_dishes?: boolean
          share_photos?: boolean; share_tags?: boolean; show_owner_name?: boolean; slug?: string; title?: string
          updated_at?: string; user_id?: string
        }
        Relationships: []
      }
      places: {
        Row: {
          address: string; created_at: string; created_by: string | null; cuisine: string; external_id: string
          id: string; lat: number; lng: number; name: string; neighborhood: string
        }
        Insert: {
          address?: string; created_at?: string; created_by?: string | null; cuisine?: string; external_id: string
          id: string; lat: number; lng: number; name: string; neighborhood?: string
        }
        Update: {
          address?: string; created_at?: string; created_by?: string | null; cuisine?: string; external_id?: string
          id?: string; lat?: number; lng?: number; name?: string; neighborhood?: string
        }
        Relationships: []
      }
      profiles: {
        Row: { created_at: string; display_name: string; id: string }
        Insert: { created_at?: string; display_name?: string; id: string }
        Update: { created_at?: string; display_name?: string; id?: string }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string; dish_name: string; id: string; note: string; photo_path: string; place_id: string
          rating: string; tags: string[]; updated_at: string; user_id: string; visited_at: string
        }
        Insert: {
          created_at?: string; dish_name?: string; id: string; note?: string; photo_path?: string; place_id: string
          rating: string; tags?: string[]; updated_at?: string; user_id?: string; visited_at?: string
        }
        Update: {
          created_at?: string; dish_name?: string; id?: string; note?: string; photo_path?: string; place_id?: string
          rating?: string; tags?: string[]; updated_at?: string; user_id?: string; visited_at?: string
        }
        Relationships: [
          { foreignKeyName: 'visits_place_id_fkey'; columns: ['place_id']; isOneToOne: false; referencedRelation: 'places'; referencedColumns: ['id'] },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      admin_events: {
        Args: never
        Returns: { at: string; id: string; name: string; props: Json; user_id: string | null }[]
      }
      is_admin: { Args: never; Returns: boolean }
      save_list_items: { Args: { p_list_id: string; p_visit_ids: string[] }; Returns: undefined }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
