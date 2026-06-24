import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function newId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function nowIso() {
  return new Date().toISOString()
}

const STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  validating: 'Validating',
  rag_searching: 'RAG Search',
  needs_research: 'Needs Research',
  codex_researching: 'Researching',
  content_generating: 'Generating',
  content_ready: 'Content Ready',
  image_prompt_generating: 'Image Prompt',
  image_prompt_ready: 'Prompt Ready',
  video_prompt_generating: 'Video Brief',
  video_prompt_ready: 'Video Ready',
  output_ready: 'Output Ready',
  review_pending: 'Review Pending',
  revision_requested: 'Revision',
  approved: 'Approved',
  scheduled: 'Scheduled',
  exported: 'Exported',
  failed: 'Failed',
  pending: 'Pending',
  running: 'Running',
  done: 'Done',
}

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status
}

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-gray-100 text-gray-700',
  validating: 'bg-blue-100 text-blue-700',
  rag_searching: 'bg-blue-100 text-blue-700',
  needs_research: 'bg-yellow-100 text-yellow-800',
  content_generating: 'bg-blue-100 text-blue-700',
  content_ready: 'bg-green-100 text-green-700',
  image_prompt_ready: 'bg-green-100 text-green-700',
  output_ready: 'bg-emerald-100 text-emerald-700',
  review_pending: 'bg-orange-100 text-orange-700',
  revision_requested: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  scheduled: 'bg-purple-100 text-purple-700',
  exported: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
}

export function statusColor(status: string) {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'
}
