export type RequirementStatus =
  | 'requested'
  | 'validating'
  | 'rag_searching'
  | 'needs_research'
  | 'codex_researching'
  | 'content_generating'
  | 'content_ready'
  | 'image_prompt_generating'
  | 'image_prompt_ready'
  | 'video_prompt_generating'
  | 'video_prompt_ready'
  | 'video_submitted'
  | 'video_rendering'
  | 'video_ready'
  | 'output_ready'
  | 'review_pending'
  | 'revision_requested'
  | 'approved'
  | 'scheduled'
  | 'exported'
  | 'failed'

export type JobStatus = 'pending' | 'running' | 'done' | 'failed'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type ContentType = 'post' | 'carousel' | 'short_video' | 'reel_script'
export type Platform = 'facebook' | 'instagram' | 'line'

export interface Requirement {
  id: string
  title: string
  topic: string
  brief: string | null
  target_audience: string | null
  objective: string | null
  tone: string | null
  platform: Platform
  facebook_account_id: string | null
  content_type: ContentType
  image_direction: string | null
  layout_requirement: string | null
  video_create: 0 | 1
  video_style: string | null
  video_duration: number | null
  preferred_post_date: string | null
  preferred_post_time: string | null
  priority: Priority
  status: RequirementStatus
  notes: string | null
  source_url: string | null
  created_at: string
  updated_at: string
  creative_profile_id: string | null
}

export interface LayoutSpec {
  key: string
  size: string
  ratio: string
  safe_zone: string
  dalle_size: string
}

export interface FacebookAccount {
  id: string
  account_name: string
  page_name: string
  page_id: string
  page_access_token: string | null
  token_expires_at: string | null
  brand_voice: string | null
  default_timezone: string
  default_posting_slots: string | null
  status: 'active' | 'inactive'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  requirement_id: string
  job_type: string
  status: JobStatus
  attempt_count: number
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string | null
}

export interface ContentOutput {
  id: string
  requirement_id: string
  title: string | null
  hook: string | null
  caption: string | null
  body: string | null
  cta: string | null
  hashtags: string | null
  compliance_note: string | null
  suggested_layout: string | null
  layout_spec: LayoutSpec | null
  status: string
  created_at: string
  updated_at: string
}

export interface ImagePrompt {
  id: string
  requirement_id: string
  main_prompt: string | null
  dalle_prompt: string | null
  text_overlay: string | null
  negative_prompt: string | null
  layout_spec: string | null
  canvas_size: string | null
  safe_margin: string | null
  brand_style: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface VideoPrompt {
  id: string
  requirement_id: string
  video_title: string | null
  duration: number | null
  hook: string | null
  scene_breakdown: string | null
  voiceover_script: string | null
  visual_prompts: string | null
  subtitle_text: string | null
  music_mood: string | null
  text_animations: string | null
  tools_suggestion: string | null
  cta: string | null
  api_provider: string | null
  api_status: string | null
  video_url: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface CreativeProfile {
  id: string
  name: string
  color_scheme: string | null
  photography_style: string | null
  logo_usage: string | null
  visual_mood: string | null
  do_not_use: string | null
  notes: string | null
  reference_image_urls: string | null
  created_at: string
  updated_at: string
}

export interface CalendarItem {
  id: string
  requirement_id: string
  facebook_account_id: string | null
  post_date: string | null
  post_time: string | null
  status: string
  scheduled_status: string | null
  image_url: string | null
  caption_override: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RagSource {
  id: string
  requirement_id: string
  note_path: string
  note_title: string
  chunk_id: string
  relevance_score: number
  used_in_output: 0 | 1
  created_at: string
}

export interface CommandLog {
  id: string
  source: string
  command_text: string
  parsed_action: string | null
  requirement_id: string | null
  status: string
  response_text: string | null
  created_at: string
}

export interface HermesOutput {
  content: ContentOutput
  image_prompt: ImagePrompt
  video_prompt?: VideoPrompt
  rag_sources: RagSource[]
}

export interface BrandProfile {
  id: string
  firm_name: string | null
  tagline: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  default_tone: string | null
  default_target_audience: string | null
  website_url: string | null
  email: string | null
  phone: string | null
  line_id: string | null
  address: string | null
  facebook_bio: string | null
  created_at: string
  updated_at: string
}

export interface AppSetting {
  key: string
  value: string | null
  updated_at: string
}
