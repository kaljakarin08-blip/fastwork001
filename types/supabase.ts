export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

type R = { foreignKeyName: string; columns: string[]; isOneToOne?: boolean; referencedRelation: string; referencedColumns: string[] }

type T<Row extends Record<string, unknown>, Insert extends Record<string, unknown> = Row, Update extends Partial<Row> = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: R[]
}

export interface Database {
  public: {
    Tables: {
      facebook_accounts: T<{
        id: string; account_name: string; page_name: string; page_id: string | null; brand_voice: string | null; default_timezone: string | null; default_posting_slots: string | null; page_access_token: string | null; token_expires_at: string | null; status: string | null; notes: string | null; created_at: string; updated_at: string
      }>
      creative_profiles: T<{
        id: string; name: string; color_scheme: string | null; photography_style: string | null; logo_usage: string | null; visual_mood: string | null; do_not_use: string | null; notes: string | null; reference_image_urls: string | null; created_at: string; updated_at: string
      }>
      requirements: T<{
        id: string; title: string; topic: string; brief: string | null; target_audience: string | null; objective: string | null; tone: string | null; platform: string | null; facebook_account_id: string | null; content_type: string | null; image_direction: string | null; layout_requirement: string | null; video_create: number | null; video_style: string | null; video_duration: number | null; preferred_post_date: string | null; preferred_post_time: string | null; priority: string | null; status: string | null; notes: string | null; creative_profile_id: string | null; created_at: string; updated_at: string
      }>
      jobs: T<{
        id: string; requirement_id: string; job_type: string | null; status: string | null; attempt_count: number | null; error_message: string | null; started_at: string | null; completed_at: string | null; updated_at: string | null; created_at: string
      }>
      rag_sources: T<{
        id: string; requirement_id: string; note_path: string; note_title: string; chunk_id: string; relevance_score: number | null; used_in_output: number | null; created_at: string
      }>
      content_outputs: T<{
        id: string; requirement_id: string; title: string | null; hook: string | null; caption: string | null; body: string | null; cta: string | null; hashtags: string | null; compliance_note: string | null; status: string | null; created_at: string; updated_at: string
      }>
      image_prompts: T<{
        id: string; requirement_id: string; main_prompt: string | null; text_overlay: string | null; negative_prompt: string | null; layout_spec: string | null; canvas_size: string | null; safe_margin: string | null; brand_style: string | null; dalle_prompt: string | null; generated_image_url: string | null; status: string | null; created_at: string; updated_at: string
      }>
      video_prompts: T<{
        id: string; requirement_id: string; video_title: string | null; duration: number | null; hook: string | null; scene_breakdown: string | null; voiceover_script: string | null; visual_prompts: string | null; subtitle_text: string | null; cta: string | null; music_mood: string | null; text_animations: string | null; tools_suggestion: string | null; api_provider: string | null; api_status: string | null; video_url: string | null; status: string | null; created_at: string; updated_at: string
      }>
      calendar_items: T<{
        id: string; requirement_id: string; facebook_account_id: string | null; post_date: string | null; post_time: string | null; status: string | null; image_url: string | null; caption_override: string | null; scheduled_status: string | null; fb_post_id: string | null; fb_permalink: string | null; published_at: string | null; notes: string | null; created_at: string; updated_at: string
      }>
      command_logs: T<{
        id: string; source: string; command_text: string; parsed_action: string | null; requirement_id: string | null; status: string | null; response_text: string | null; created_at: string
      }>
      brand_profile: T<{
        id: string; firm_name: string | null; tagline: string | null; logo_url: string | null; primary_color: string | null; secondary_color: string | null; default_tone: string | null; default_target_audience: string | null; website_url: string | null; email: string | null; phone: string | null; line_id: string | null; address: string | null; facebook_bio: string | null; created_at: string; updated_at: string
      }>
      app_settings: T<{
        key: string; value: string | null; updated_at: string
      }>
      knowledge_sources: T<{
        id: string; type: string; name: string; source_url: string | null; status: string; chunk_count: number; error_message: string | null; last_indexed_at: string | null; notes: string | null; created_at: string; updated_at: string
      }>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
