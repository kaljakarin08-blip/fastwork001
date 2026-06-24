'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { FacebookAccount, CreativeProfile } from '@/types'

/* ─── Law Category data ──────────────────────────────────── */

const LAW_CATEGORIES = [
  {
    id: 'corporate',
    label: 'กฎหมายบริษัท',
    sub: 'Corporate',
    color: '#3B82F6',
    icon: (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="7" width="14" height="11" rx="1.5" />
        <path d="M7 7V5a3 3 0 016 0v2" />
        <line x1="10" y1="11" x2="10" y2="14" />
        <circle cx="10" cy="14" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'tax',
    label: 'ภาษีและบัญชี',
    sub: 'Tax & Accounting',
    color: '#10B981',
    icon: (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="2" width="12" height="16" rx="1.5" />
        <line x1="7" y1="7" x2="13" y2="7" />
        <line x1="7" y1="10" x2="13" y2="10" />
        <line x1="7" y1="13" x2="10" y2="13" />
      </svg>
    ),
  },
  {
    id: 'property',
    label: 'อสังหาริมทรัพย์',
    sub: 'Property',
    color: '#F59E0B',
    icon: (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 9.5L10 3l7 6.5" strokeLinejoin="round" />
        <path d="M5 9v8h10V9" />
        <rect x="8" y="12" width="4" height="5" />
      </svg>
    ),
  },
  {
    id: 'labor',
    label: 'แรงงาน',
    sub: 'Labor Law',
    color: '#8B5CF6',
    icon: (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="10" cy="6" r="3" />
        <path d="M4 18c0-3.314 2.686-6 6-6s6 2.686 6 6" />
      </svg>
    ),
  },
  {
    id: 'contract',
    label: 'สัญญา',
    sub: 'Contract',
    color: '#64748B',
    icon: (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 3h10a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
        <line x1="7" y1="7" x2="13" y2="7" />
        <line x1="7" y1="10" x2="13" y2="10" />
        <path d="M7 13l2 2 4-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'criminal',
    label: 'อาญา',
    sub: 'Criminal',
    color: '#EF4444',
    icon: (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 2L3 6v5c0 4 3.1 7.3 7 8 3.9-.7 7-4 7-8V6L10 2z" />
        <path d="M7 10l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'family',
    label: 'ครอบครัว/มรดก',
    sub: 'Family & Inheritance',
    color: '#F97316',
    icon: (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="5" r="2" />
        <circle cx="13" cy="5" r="2" />
        <path d="M3 15c0-2.21 1.79-4 4-4s4 1.79 4 4" />
        <path d="M9 15c0-2.21 1.79-4 4-4s4 1.79 4 4" />
      </svg>
    ),
  },
  {
    id: 'ip',
    label: 'ทรัพย์สินทางปัญญา',
    sub: 'IP & Copyright',
    color: '#EC4899',
    icon: (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="10" cy="10" r="7" />
        <text x="10" y="14" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none" fontWeight="600">©</text>
      </svg>
    ),
  },
  {
    id: 'litigation',
    label: 'คดีความ/ฟ้องร้อง',
    sub: 'Litigation',
    color: '#6366F1',
    icon: (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 10h10M10 5l-4 5 4 5" strokeLinejoin="round" />
        <line x1="3" y1="17" x2="17" y2="17" />
      </svg>
    ),
  },
  {
    id: 'finance',
    label: 'การเงิน/หลักทรัพย์',
    sub: 'Finance & Securities',
    color: '#059669',
    icon: (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="3,14 7,9 11,11 17,5" strokeLinejoin="round" />
        <line x1="3" y1="17" x2="17" y2="17" />
      </svg>
    ),
  },
  {
    id: 'immigration',
    label: 'วีซ่า/คนเข้าเมือง',
    sub: 'Immigration',
    color: '#14B8A6',
    icon: (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="5" width="14" height="10" rx="1.5" />
        <circle cx="10" cy="10" r="2.5" />
        <line x1="3" y1="9" x2="6" y2="9" />
        <line x1="14" y1="9" x2="17" y2="9" />
      </svg>
    ),
  },
  {
    id: 'environment',
    label: 'สิ่งแวดล้อม/ผังเมือง',
    sub: 'Environmental',
    color: '#84CC16',
    icon: (
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 17V9M10 9c0-4 6-6 6-6s0 6-6 6zM10 9c0-4-6-6-6-6s0 6 6 6z" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const

type LawCategoryId = (typeof LAW_CATEGORIES)[number]['id']

/* ─── Content Goals ─────────────────────────────────────── */

const CONTENT_GOALS = [
  { id: 'authority', label: 'สร้างความน่าเชื่อถือ', desc: 'Build Authority' },
  { id: 'educate', label: 'ให้ความรู้', desc: 'Educate' },
  { id: 'lead_gen', label: 'ดึง Lead', desc: 'Lead Generation' },
  { id: 'trust', label: 'สร้าง Trust', desc: 'Build Trust' },
  { id: 'news', label: 'แชร์ข่าวกฎหมาย', desc: 'Legal News' },
  { id: 'faq', label: 'ตอบข้อสงสัย', desc: 'FAQ / Myth-bust' },
  { id: 'case_study', label: 'Case Study', desc: 'Client Story' },
  { id: 'awareness', label: 'Brand Awareness', desc: 'Visibility' },
] as const

type ContentGoalId = (typeof CONTENT_GOALS)[number]['id']

/* ─── Tone options ───────────────────────────────────────── */

const TONES = [
  { id: 'professional', label: 'Professional', th: 'เป็นทางการ' },
  { id: 'friendly', label: 'Friendly', th: 'เป็นกันเอง' },
  { id: 'educational', label: 'Educational', th: 'ให้ความรู้' },
  { id: 'authoritative', label: 'Authoritative', th: 'มีอำนาจ' },
  { id: 'conversational', label: 'Conversational', th: 'สนทนา' },
  { id: 'urgent', label: 'Urgent', th: 'เร่งด่วน' },
  { id: 'storytelling', label: 'Storytelling', th: 'เล่าเรื่อง' },
  { id: 'inspirational', label: 'Inspirational', th: 'สร้างแรงบันดาล' },
  { id: 'empowering', label: 'Empowering', th: 'เสริมพลัง' },
  { id: 'alert', label: 'Alert', th: 'เตือนภัย' },
] as const

type ToneId = (typeof TONES)[number]['id']

/* ─── Content Types ─────────────────────────────────────── */

type ContentTypeId = 'post' | 'carousel' | 'reel_script' | 'short_video'

const CONTENT_TYPES: { id: ContentTypeId; label: string; desc: string; size: string }[] = [
  { id: 'post', label: 'Single Post', desc: 'ภาพ 1 ใบ + caption', size: '1080×1080' },
  { id: 'carousel', label: 'Carousel', desc: 'หลายสไลด์ swipe ได้', size: '1080×1080 / slide' },
  { id: 'reel_script', label: 'Reels', desc: 'บท + scene breakdown', size: '1080×1920' },
  { id: 'short_video', label: 'Short Video', desc: 'วิดีโอสั้น ≤60 วิ', size: '1200×675' },
]

/* ─── Facebook post mockup SVGs ─────────────────────────── */

function MockupSinglePost({ active }: { active: boolean }) {
  const c = active ? '#D97706' : '#CBD5E1'
  const imgFill = active ? '#FEF3C7' : '#F1F5F9'
  return (
    <svg viewBox="0 0 88 96" className="w-full" fill="none">
      {/* card */}
      <rect x="2" y="2" width="84" height="92" rx="4" fill="white" stroke={c} strokeWidth="1.5" />
      {/* header: avatar + name */}
      <circle cx="12" cy="12" r="5" fill={imgFill} stroke={c} strokeWidth="1" />
      <rect x="20" y="8" width="28" height="3" rx="1.5" fill={c} opacity=".6" />
      <rect x="20" y="13" width="18" height="2.5" rx="1.2" fill={c} opacity=".3" />
      {/* image square */}
      <rect x="2" y="22" width="84" height="46" fill={imgFill} />
      {/* mountain + sun in image */}
      <path d="M2 58 l18-16 12 12 14-14 38 18H2z" fill={c} opacity=".18" />
      <circle cx="66" cy="34" r="5" fill={c} opacity=".25" />
      {/* caption lines */}
      <rect x="8" y="73" width="52" height="2.5" rx="1.2" fill={c} opacity=".5" />
      <rect x="8" y="78" width="40" height="2.5" rx="1.2" fill={c} opacity=".3" />
      {/* reaction bar */}
      <rect x="8" y="86" width="16" height="2" rx="1" fill={c} opacity=".25" />
      <rect x="30" y="86" width="16" height="2" rx="1" fill={c} opacity=".25" />
      <rect x="52" y="86" width="16" height="2" rx="1" fill={c} opacity=".25" />
    </svg>
  )
}

function MockupCarousel({ active }: { active: boolean }) {
  const c = active ? '#D97706' : '#CBD5E1'
  const imgFill = active ? '#FEF3C7' : '#F1F5F9'
  return (
    <svg viewBox="0 0 88 96" className="w-full" fill="none">
      <rect x="2" y="2" width="84" height="92" rx="4" fill="white" stroke={c} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" fill={imgFill} stroke={c} strokeWidth="1" />
      <rect x="20" y="8" width="28" height="3" rx="1.5" fill={c} opacity=".6" />
      <rect x="20" y="13" width="18" height="2.5" rx="1.2" fill={c} opacity=".3" />
      {/* 3 image cards side by side */}
      <rect x="2" y="22" width="52" height="46" fill={imgFill} />
      <path d="M2 54 l14-12 10 10 12-10 14 12H2z" fill={c} opacity=".18" />
      <rect x="56" y="22" width="16" height="46" fill={imgFill} opacity=".5" />
      <rect x="74" y="22" width="12" height="46" fill={imgFill} opacity=".25" />
      {/* right arrow */}
      <circle cx="76" cy="45" r="6" fill="white" stroke={c} strokeWidth="1" opacity=".8" />
      <path d="M74 42l4 3-4 3" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* dots */}
      <circle cx="38" cy="74" r="2.5" fill={c} />
      <circle cx="46" cy="74" r="1.5" fill={c} opacity=".35" />
      <circle cx="52" cy="74" r="1.5" fill={c} opacity=".35" />
      <rect x="8" y="80" width="45" height="2.5" rx="1.2" fill={c} opacity=".4" />
      <rect x="8" y="86" width="55" height="2" rx="1" fill={c} opacity=".2" />
    </svg>
  )
}

function MockupReel({ active }: { active: boolean }) {
  const c = active ? '#D97706' : '#CBD5E1'
  const imgFill = active ? '#FEF3C7' : '#F1F5F9'
  return (
    <svg viewBox="0 0 88 96" className="w-full" fill="none">
      {/* phone frame portrait 9:16 */}
      <rect x="18" y="2" width="52" height="92" rx="6" fill={imgFill} stroke={c} strokeWidth="1.5" />
      {/* full bleed image */}
      <rect x="20" y="8" width="48" height="72" fill={active ? '#FDE68A' : '#E2E8F0'} rx="2" />
      <path d="M20 64 l12-14 10 10 12-12 14 16H20z" fill={c} opacity=".2" />
      {/* play button overlay */}
      <circle cx="44" cy="40" r="10" fill="white" opacity=".7" />
      <path d="M41 36l8 4-8 4V36z" fill={c} opacity=".8" />
      {/* bottom caption bar */}
      <rect x="20" y="70" width="48" height="10" fill="black" opacity=".35" rx="0" />
      <rect x="23" y="72" width="28" height="2" rx="1" fill="white" opacity=".8" />
      <rect x="23" y="76" width="18" height="1.5" rx=".75" fill="white" opacity=".5" />
      {/* right side icons */}
      <circle cx="64" cy="55" r="3" fill="white" opacity=".6" />
      <circle cx="64" cy="63" r="3" fill="white" opacity=".6" />
      {/* camera notch */}
      <rect x="38" y="4" width="12" height="3" rx="1.5" fill={c} opacity=".3" />
    </svg>
  )
}

function MockupShortVideo({ active }: { active: boolean }) {
  const c = active ? '#D97706' : '#CBD5E1'
  const imgFill = active ? '#FEF3C7' : '#F1F5F9'
  return (
    <svg viewBox="0 0 88 96" className="w-full" fill="none">
      <rect x="2" y="2" width="84" height="92" rx="4" fill="white" stroke={c} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" fill={imgFill} stroke={c} strokeWidth="1" />
      <rect x="20" y="8" width="28" height="3" rx="1.5" fill={c} opacity=".6" />
      <rect x="20" y="13" width="18" height="2.5" rx="1.2" fill={c} opacity=".3" />
      {/* landscape video 16:9 */}
      <rect x="2" y="22" width="84" height="47" fill={active ? '#FDE68A' : '#E2E8F0'} />
      <path d="M2 55 l20-18 16 14 18-16 28 18H2z" fill={c} opacity=".15" />
      {/* play button */}
      <circle cx="44" cy="45" r="11" fill="white" opacity=".75" />
      <path d="M41 40.5l9 4.5-9 4.5V40.5z" fill={c} opacity=".85" />
      {/* progress bar */}
      <rect x="2" y="69" width="84" height="3" fill={c} opacity=".12" />
      <rect x="2" y="69" width="28" height="3" fill={c} opacity=".5" />
      <circle cx="30" cy="70.5" r="3" fill={c} opacity=".8" />
      {/* duration */}
      <rect x="66" y="73" width="16" height="2.5" rx="1.2" fill={c} opacity=".3" />
      <rect x="8" y="78" width="50" height="2.5" rx="1.2" fill={c} opacity=".4" />
      <rect x="8" y="83" width="36" height="2" rx="1" fill={c} opacity=".25" />
      <rect x="8" y="88" width="22" height="2" rx="1" fill={c} opacity=".2" />
    </svg>
  )
}

/* ─── FB Layouts ─────────────────────────────────────────── */

const FB_LAYOUTS = [
  { id: 'square_1x1', label: 'Square', ratio: '1:1', pixels: '1080×1080', w: 1, h: 1 },
  { id: 'portrait_4x5', label: 'Portrait', ratio: '4:5', pixels: '1080×1350', w: 4, h: 5 },
  { id: 'landscape_16x9', label: 'Landscape', ratio: '16:9', pixels: '1200×675', w: 16, h: 9 },
  { id: 'story_9x16', label: 'Story', ratio: '9:16', pixels: '1080×1920', w: 9, h: 16 },
  { id: 'vertical_4x3', label: 'Vertical', ratio: '4:3', pixels: '1080×810', w: 4, h: 3 },
  { id: 'text_only', label: 'Text Only', ratio: 'Text', pixels: '—', w: 1, h: 1, textOnly: true },
] as const

type LayoutId = (typeof FB_LAYOUTS)[number]['id']

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'text-slate-400' },
  { id: 'normal', label: 'Normal', color: 'text-blue-600' },
  { id: 'high', label: 'High', color: 'text-orange-500' },
  { id: 'urgent', label: 'Urgent', color: 'text-red-600' },
] as const

/* ─── helpers ───────────────────────────────────────────── */

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-colors'

function Field({
  label,
  required,
  hint,
  children,
  className = '',
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase block">
        {label}
        {required && <span className="text-red-500 ml-0.5 normal-case">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>}
    </div>
  )
}

function SectionHeader({
  step,
  title,
  subtitle,
  accent,
}: {
  step: string
  title: string
  subtitle?: string
  accent?: string
}) {
  return (
    <div
      className="px-6 py-4 border-b border-slate-100 flex items-center gap-3"
      style={{ borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: accent || '#D97706' }}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{step}</span>
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function Section({
  step,
  title,
  subtitle,
  accent,
  children,
}: {
  step: string
  title: string
  subtitle?: string
  accent?: string
  children: React.ReactNode
}) {
  return (
    <div className="card overflow-hidden">
      <SectionHeader step={step} title={title} subtitle={subtitle} accent={accent} />
      <div className="p-6 space-y-5">{children}</div>
    </div>
  )
}

/* ─── Layout preview SVG ────────────────────────────────── */

function LayoutPreview({ w, h, textOnly }: { w: number; h: number; textOnly?: boolean }) {
  const maxW = 36
  const maxH = 44
  const scale = Math.min(maxW / w, maxH / h)
  const rw = Math.round(w * scale)
  const rh = Math.round(h * scale)
  const svgW = maxW + 8
  const svgH = maxH + 8
  const x = (svgW - rw) / 2
  const y = (svgH - rh) / 2

  if (textOnly) {
    return (
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        <rect x={x} y={y} width={rw} height={rh} rx="2.5" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
        {[0.32, 0.48, 0.64].map((p, i) => (
          <line key={i} x1={x + 5} y1={y + rh * p} x2={x + rw - (i === 1 ? 9 : 5)} y2={y + rh * p} stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
        ))}
      </svg>
    )
  }

  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
      <defs>
        <linearGradient id={`g${w}${h}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={rw} height={rh} rx="2.5" fill={`url(#g${w}${h})`} stroke="#CBD5E1" strokeWidth="1" />
      <path
        d={`M${x + 3} ${y + rh - 7} l${rw * 0.28}-${rh * 0.28} ${rw * 0.2} ${rh * 0.16} ${rw * 0.18}-${rh * 0.18} ${rw * 0.3} ${rh * 0.3}`}
        fill="none"
        stroke="#94A3B8"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx={x + rw * 0.73} cy={y + rh * 0.28} r={Math.min(rw, rh) * 0.09} fill="#94A3B8" />
    </svg>
  )
}

/* ─── main page ─────────────────────────────────────────── */

export default function NewRequirementPage() {
  const router = useRouter()
  const [fbAccounts, setFbAccounts] = useState<FacebookAccount[]>([])
  const [creativeProfiles, setCreativeProfiles] = useState<CreativeProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [postCount, setPostCount] = useState(1)

  const [lawCategories, setLawCategories] = useState<LawCategoryId[]>([])
  const [tones, setTones] = useState<ToneId[]>(['professional'])
  const [contentGoals, setContentGoals] = useState<ContentGoalId[]>([])
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([])
  const [topicLoading, setTopicLoading] = useState(false)
  const [topicError, setTopicError] = useState('')
  const [wordCount, setWordCount] = useState(1000)
  const topicRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '',
    topic: '',
    brief: '',
    key_message: '',
    call_to_action: '',
    keywords: '',
    do_not_mention: '',
    target_audience: '',
    objective: '',
    platform: 'facebook',
    facebook_account_id: '',
    creative_profile_id: '',
    content_type: 'post' as ContentTypeId,
    layout_requirement: 'square_1x1' as LayoutId,
    image_direction: '',
    video_create: false,
    video_style: '',
    video_duration: 60,
    preferred_post_date: '',
    preferred_post_time: '',
    priority: 'normal',
    notes: '',
    references: '',
    blueprint: '',
  })

  useEffect(() => {
    fetch('/api/local/facebook-accounts')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setFbAccounts(data) })
      .catch(() => {})
    fetch('/api/local/creative-profiles')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCreativeProfiles(data) })
      .catch(() => {})
  }, [])

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }))

  function toggleLaw(id: LawCategoryId) {
    setLawCategories((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function toggleTone(id: ToneId) {
    setTones((prev) =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter((x) => x !== id) : prev
        : [...prev, id]
    )
  }

  function toggleGoal(id: ContentGoalId) {
    setContentGoals((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function generateTopics(count: number) {
    setTopicLoading(true)
    setTopicSuggestions([])
    setTopicError('')
    try {
      const res = await fetch('/api/ai/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          law_categories: lawCategories.map((id) => LAW_CATEGORIES.find((c) => c.id === id)?.label ?? id),
          hint: form.brief,
          count,
        }),
      })
      const data = await res.json() as { topics?: string[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      if (Array.isArray(data.topics)) setTopicSuggestions(data.topics)
    } catch (err) {
      setTopicError(String(err))
    }
    setTopicLoading(false)
  }

  function openWebSearch() {
    const q = form.topic.trim() || form.brief.trim()
    if (!q) return
    const cats = lawCategories.map((id) => LAW_CATEGORIES.find((c) => c.id === id)?.label ?? '').join(' ')
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q + ' ' + cats + ' กฎหมายไทย')}`, '_blank')
  }

  const isVideoType = form.content_type === 'reel_script' || form.content_type === 'short_video'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.topic.trim() && lawCategories.length === 0) {
      setError('กรุณาเลือกหมวดหมู่กฎหมาย (Section A) หรือใส่ Topic หลักก่อน Submit')
      return
    }
    setLoading(true)
    setError('')

    const enrichedParts: string[] = []
    if (form.brief) enrichedParts.push(form.brief)
    if (lawCategories.length) {
      const names = lawCategories.map((id) => LAW_CATEGORIES.find((c) => c.id === id)?.label || id)
      enrichedParts.push(`หมวดหมู่กฎหมาย: ${names.join(', ')}`)
    }
    if (contentGoals.length) {
      const names = contentGoals.map((id) => CONTENT_GOALS.find((g) => g.id === id)?.label || id)
      enrichedParts.push(`เป้าหมาย: ${names.join(', ')}`)
    }
    if (form.key_message) enrichedParts.push(`Key message: ${form.key_message}`)
    if (form.call_to_action) enrichedParts.push(`CTA: ${form.call_to_action}`)
    if (form.keywords) enrichedParts.push(`Keywords: ${form.keywords}`)
    if (form.do_not_mention) enrichedParts.push(`Do NOT mention: ${form.do_not_mention}`)
    if (form.references) enrichedParts.push(`References:\n${form.references}`)
    if (form.blueprint) enrichedParts.push(`Content Blueprint:\n${form.blueprint}`)
    enrichedParts.push(`ความยาวเนื้อหา: ${wordCount} คำ`)

    const enrichedBrief = enrichedParts.join('\n\n') || null
    const toneValue = tones.join(', ')

    try {
      const requests = Array.from({ length: postCount }, (_, i) => {
        const suffix = postCount > 1 ? ` (${i + 1}/${postCount})` : ''
        return fetch('/api/local/requirements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: (form.title || form.topic) + suffix,
            topic: form.topic,
            brief: enrichedBrief,
            target_audience: form.target_audience || null,
            objective: form.objective || null,
            tone: toneValue,
            platform: form.platform,
            facebook_account_id: form.facebook_account_id,
            content_type: form.content_type,
            creative_profile_id: form.creative_profile_id || null,
            image_direction: form.image_direction || null,
            layout_requirement: isVideoType ? null : form.layout_requirement,
            video_create: form.video_create ? 1 : 0,
            video_style: form.video_style || null,
            video_duration: form.video_duration,
            preferred_post_date: form.preferred_post_date || null,
            preferred_post_time: form.preferred_post_time || null,
            priority: form.priority,
            notes: form.notes || null,
          }),
        })
      })

      const responses = await Promise.all(requests)
      const failed = responses.filter((r) => !r.ok)
      if (failed.length) throw new Error(await failed[0].text())
      router.push('/dashboard/requirements')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto pb-20 space-y-1">
      {/* ── Header ── */}
      <div className="mb-7">
        <a href="/dashboard/requirements" className="text-xs text-slate-400 hover:text-orange-600 transition-colors font-medium">
          ← Requirements
        </a>
        <h1
          className="text-3xl font-bold mt-2 mb-1"
          style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: '#0F172A' }}
        >
          New Content Brief
        </h1>
        <p className="text-sm text-slate-400">กรอก brief นี้เพื่อให้ Hermes AI สร้างคอนเทนต์กฎหมายที่ถูกต้อง</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── A. Law & Topic ── */}
        <Section
          step="A"
          title="หมวดหมู่และหัวข้อ"
          subtitle="ระบุสาขากฎหมายและหัวข้อ — AI ใช้ค้น RAG vault"
          accent="#3B82F6"
        >
          <Field label="หมวดหมู่กฎหมาย / บัญชี" hint="เลือกได้หลายหมวด — AI จะเน้น knowledge base ที่เกี่ยวข้อง">
            <div className="grid grid-cols-3 gap-2">
              {LAW_CATEGORIES.map((cat) => {
                const active = lawCategories.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleLaw(cat.id)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-all"
                    style={{
                      borderColor: active ? cat.color : '#E2E8F0',
                      backgroundColor: active ? `${cat.color}12` : 'white',
                      borderLeftWidth: 3,
                      borderLeftColor: cat.color,
                    }}
                  >
                    <span style={{ color: active ? cat.color : '#94A3B8' }}>{cat.icon}</span>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 leading-tight">{cat.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{cat.sub}</div>
                    </div>
                    {active && (
                      <span className="ml-auto shrink-0" style={{ color: cat.color }}>
                        <svg viewBox="0 0 12 12" className="size-3.5" fill="currentColor">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* AI Topic Generator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                AI คิดหัวข้อให้
              </span>
              <div className="flex gap-1.5">
                {[5, 10, 15].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => generateTopics(n)}
                    disabled={topicLoading}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:border-orange-400 hover:text-orange-600 transition-all disabled:opacity-40"
                  >
                    {topicLoading ? '...' : `${n} หัวข้อ`}
                  </button>
                ))}
              </div>
            </div>
            {topicError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{topicError}</p>
            )}
            {topicSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
                {topicSuggestions.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      set('topic', t)
                      setForm(f => ({ ...f, topic: t, title: f.title || t }))
                      setTimeout(() => {
                        topicRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        topicRef.current?.focus()
                      }, 50)
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all text-left ${
                      form.topic === t
                        ? 'bg-orange-600 border-orange-600 text-white'
                        : 'bg-white border-amber-300 text-slate-700 hover:border-orange-400 hover:bg-orange-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Field label="Topic หลัก" hint="ถ้าว่าง และเลือกหมวดหมู่ไว้ — Hermes จะ auto-pick topic จาก RAG vault ให้เอง">
            <div className="relative">
              <input
                ref={topicRef}
                className={`${inputCls} pr-24`}
                value={form.topic}
                onChange={(e) => set('topic', e.target.value)}
                placeholder="เช่น ขั้นตอนการจดทะเบียนบริษัท ค่าใช้จ่าย 2567"
              />
              <button
                type="button"
                onClick={openWebSearch}
                title="ค้นหาใน Google"
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-all border border-transparent hover:border-orange-200"
              >
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="M10.5 10.5l3 3" strokeLinecap="round" />
                </svg>
                ค้นหา
              </button>
            </div>
          </Field>

          <Field label="Requirement Title" hint="ชื่อที่จำง่าย — ถ้าไม่กรอกจะใช้ Topic">
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="เช่น Post จดทะเบียนบริษัท — FB สิงหาคม"
            />
          </Field>

          <Field label="Content Brief" hint="อธิบาย angle, ข้อมูลสำคัญ, หรือ context พิเศษ">
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              value={form.brief}
              onChange={(e) => set('brief', e.target.value)}
              placeholder="อธิบายมุมมองที่ต้องการ, ข้อมูลที่ต้องเน้น, หรือ angle เฉพาะของโพสนี้..."
            />
          </Field>
        </Section>

        {/* ── B. Strategy ── */}
        <Section
          step="B"
          title="กลยุทธ์คอนเทนต์"
          subtitle="Message, audience, และข้อจำกัด"
          accent="#8B5CF6"
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Key Message" hint="สิ่งที่คนต้องจำหลังอ่านจบ">
              <input
                className={inputCls}
                value={form.key_message}
                onChange={(e) => set('key_message', e.target.value)}
                placeholder="เช่น จดบริษัทง่าย ไม่ต้องกลัว"
              />
            </Field>
            <Field label="Call to Action">
              <input
                className={inputCls}
                value={form.call_to_action}
                onChange={(e) => set('call_to_action', e.target.value)}
                placeholder="เช่น ปรึกษาฟรี DM มาเลย"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Target Audience">
              <input
                className={inputCls}
                value={form.target_audience}
                onChange={(e) => set('target_audience', e.target.value)}
                placeholder="เช่น เจ้าของธุรกิจ SME"
              />
            </Field>
            <Field label="Objective">
              <input
                className={inputCls}
                value={form.objective}
                onChange={(e) => set('objective', e.target.value)}
                placeholder="เช่น Brand awareness, กระตุ้นปรึกษา"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Keywords / Hashtag hints">
              <input
                className={inputCls}
                value={form.keywords}
                onChange={(e) => set('keywords', e.target.value)}
                placeholder="จดทะเบียนบริษัท, ธุรกิจ, กฎหมาย"
              />
            </Field>
            <Field label="Do NOT Mention" hint="AI จะหลีกเลี่ยงเรื่องเหล่านี้">
              <input
                className={inputCls}
                value={form.do_not_mention}
                onChange={(e) => set('do_not_mention', e.target.value)}
                placeholder="เช่น ราคา, คู่แข่ง, ชื่อลูกค้า"
              />
            </Field>
          </div>

          {/* Word Count Slider */}
          <Field label="ความยาวเนื้อหา" hint="กำหนดจำนวนคำของ body content ที่ AI จะสร้าง">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {[500, 1000, 1500, 2000, 3000].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setWordCount(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      wordCount === n
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-purple-400'
                    }`}
                  >
                    {n.toLocaleString()}
                  </button>
                ))}
                <span className="ml-auto text-sm font-bold text-purple-700 min-w-[60px] text-right">
                  {wordCount.toLocaleString()} คำ
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min={300}
                  max={3000}
                  step={100}
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #9333EA ${((wordCount - 300) / 2700) * 100}%, #E2E8F0 ${((wordCount - 300) / 2700) * 100}%)`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>300 (สั้น)</span>
                <span>1000 (มาตรฐาน)</span>
                <span>2000 (ละเอียด)</span>
                <span>3000 (เชิงลึก)</span>
              </div>
            </div>
          </Field>
        </Section>

        {/* ── C. Tone & Goals ── */}
        <Section
          step="C"
          title="Tone of Voice & เป้าหมาย"
          subtitle="เลือกได้หลายตัวเลือก — AI จะผสมสไตล์ตามสัดส่วน"
          accent="#10B981"
        >
          <Field label="Tone of Voice" hint="เลือกได้หลายสไตล์ — ต้องเลือกอย่างน้อย 1">
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => {
                const active = tones.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTone(t.id)}
                    className={`group flex flex-col items-center px-3.5 py-2 rounded-xl border-2 text-center transition-all ${
                      active
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-semibold leading-tight">{t.label}</span>
                    <span className="text-[10px] leading-tight opacity-70">{t.th}</span>
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Content Goals" hint="เป้าหมายเชิงยุทธศาสตร์ — เลือกได้หลายเป้าหมาย">
            <div className="grid grid-cols-4 gap-2">
              {CONTENT_GOALS.map((g) => {
                const active = contentGoals.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGoal(g.id)}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-center transition-all ${
                      active
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-semibold leading-tight">{g.label}</span>
                    <span className="text-[10px] leading-tight opacity-60">{g.desc}</span>
                  </button>
                )
              })}
            </div>
          </Field>
        </Section>

        {/* ── D. Post Format ── */}
        <Section
          step="D"
          title="รูปแบบโพสต์"
          subtitle="Content type และ Facebook image layout"
          accent="#F59E0B"
        >
          <Field label="Content Type" required hint="ดูตัวอย่างหน้าตาโพสต์บน Facebook">
            <div className="grid grid-cols-4 gap-3">
              {CONTENT_TYPES.map((ct) => {
                const active = form.content_type === ct.id
                const mockups: Record<ContentTypeId, React.ReactNode> = {
                  post: <MockupSinglePost active={active} />,
                  carousel: <MockupCarousel active={active} />,
                  reel_script: <MockupReel active={active} />,
                  short_video: <MockupShortVideo active={active} />,
                }
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => set('content_type', ct.id)}
                    className={`flex flex-col rounded-xl border-2 transition-all overflow-hidden ${
                      active
                        ? 'border-amber-500 shadow-md shadow-amber-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 ${active ? 'bg-amber-50' : 'bg-slate-50'}`}>
                      {mockups[ct.id]}
                    </div>
                    <div className={`px-2 py-2 text-center border-t ${active ? 'border-amber-200 bg-white' : 'border-slate-100 bg-white'}`}>
                      <div className={`text-xs font-bold leading-tight ${active ? 'text-amber-700' : 'text-slate-700'}`}>
                        {ct.label}
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{ct.desc}</div>
                      <div className={`text-[9px] mt-0.5 font-mono ${active ? 'text-amber-500' : 'text-slate-300'}`}>{ct.size}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </Field>

          {!isVideoType && (
            <Field label="Facebook Image Layout" hint="กำหนด canvas size ให้ AI สร้างภาพ">
              <div className="grid grid-cols-6 gap-2">
                {FB_LAYOUTS.map((lay) => {
                  const active = form.layout_requirement === lay.id
                  return (
                    <button
                      key={lay.id}
                      type="button"
                      onClick={() => set('layout_requirement', lay.id)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
                        active
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <LayoutPreview w={lay.w} h={lay.h} textOnly={'textOnly' in lay ? lay.textOnly : false} />
                      <div className="text-center">
                        <div className={`text-[10px] font-semibold leading-tight ${active ? 'text-amber-700' : 'text-slate-700'}`}>
                          {lay.label}
                        </div>
                        <div className="text-[9px] text-slate-400 leading-tight">{lay.ratio}</div>
                        <div className="text-[9px] text-slate-400 leading-tight">{lay.pixels}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </Field>
          )}
        </Section>

        {/* ── E. References & Blueprint ── */}
        <Section
          step="E"
          title="ข้อมูลอ้างอิงและโครงร่าง"
          subtitle="Links, กฎหมาย, คดี — และโครงสร้าง content ที่ต้องการ"
          accent="#6366F1"
        >
          <Field label="Source References" hint="URL หรืออ้างอิง เช่น มาตรากฎหมาย, คำพิพากษา, ลิงก์บทความ (1 บรรทัด/แหล่ง)">
            <textarea
              className={`${inputCls} min-h-[80px] resize-y font-mono text-xs`}
              value={form.references}
              onChange={(e) => set('references', e.target.value)}
              placeholder={"มาตรา 1015 ป.พ.พ. — การจัดตั้งบริษัท\nhttps://www.dbd.go.th/...\nคำพิพากษาฎีกา 1234/2565"}
            />
          </Field>

          <Field label="Content Blueprint / โครงร่าง" hint="กำหนดโครงสร้างที่ต้องการ เช่น hook → อธิบาย 3 ข้อ → CTA">
            <textarea
              className={`${inputCls} min-h-[100px] resize-y`}
              value={form.blueprint}
              onChange={(e) => set('blueprint', e.target.value)}
              placeholder={"Hook: คำถามที่ทำให้คนหยุดอ่าน\nข้อ 1: ขั้นตอนหลัก\nข้อ 2: ค่าใช้จ่าย\nข้อ 3: ระยะเวลา\nCTA: ให้ติดต่อสำนักงาน"}
            />
          </Field>
        </Section>

        {/* ── F. Creative Direction ── */}
        <Section
          step="F"
          title="Creative Direction"
          subtitle="ทิศทางภาพและ visual style"
          accent="#EC4899"
        >
          {/* Profile picker */}
          {creativeProfiles.length > 0 && (
            <Field label="Creative Profile" hint="เลือก profile เพื่อให้ Hermes ใช้ visual style อัตโนมัติ">
              <div className="grid grid-cols-2 gap-2">
                {creativeProfiles.map((p) => {
                  const active = form.creative_profile_id === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => set('creative_profile_id', active ? '' : p.id)}
                      className={`text-left rounded-xl border px-4 py-3 transition-all ${
                        active
                          ? 'border-pink-400 bg-pink-50 ring-2 ring-pink-300/40'
                          : 'border-slate-200 bg-white hover:border-pink-300 hover:bg-pink-50/40'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${active ? 'text-pink-700' : 'text-slate-700'}`}>{p.name}</p>
                      {p.visual_mood && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{p.visual_mood}</p>
                      )}
                      {p.color_scheme && (
                        <p className="text-[11px] text-slate-400 truncate">🎨 {p.color_scheme}</p>
                      )}
                    </button>
                  )
                })}
              </div>
              {!form.creative_profile_id && (
                <p className="text-xs text-slate-400 mt-2">
                  ไม่เลือก profile — Hermes จะใช้ข้อมูลจาก Image Direction ด้านล่างแทน ·{' '}
                  <a href="/dashboard/settings/creative-profiles" target="_blank" className="text-pink-500 hover:underline">
                    จัดการ Profiles
                  </a>
                </p>
              )}
            </Field>
          )}
          {creativeProfiles.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
              ยังไม่มี Creative Profile ·{' '}
              <a href="/dashboard/settings/creative-profiles" target="_blank" className="text-pink-500 hover:underline">
                สร้าง Profile แรก
              </a>
            </div>
          )}

          <Field label="Image Direction" hint="override หรือเพิ่มเติมจาก Creative Profile">
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              value={form.image_direction}
              onChange={(e) => set('image_direction', e.target.value)}
              placeholder="เช่น ภาพนักธุรกิจไทย, โทนน้ำเงิน-ขาว, มีตัวอักษรไทยชัดเจน, สไตล์ clean professional..."
            />
          </Field>

          {isVideoType ? (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Video Style">
                <select className={inputCls} value={form.video_style} onChange={(e) => set('video_style', e.target.value)}>
                  <option value="">— เลือก style —</option>
                  <option value="talking_head">Talking Head</option>
                  <option value="slideshow">Slideshow</option>
                  <option value="animated">Animated</option>
                  <option value="documentary">Documentary</option>
                </select>
              </Field>
              <Field label="Duration (วินาที)">
                <input
                  type="number"
                  className={inputCls}
                  value={form.video_duration}
                  onChange={(e) => set('video_duration', Number(e.target.value))}
                  min={15}
                  max={300}
                />
              </Field>
            </div>
          ) : (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-auto size-4 rounded border-slate-300 accent-orange-600"
                  checked={form.video_create}
                  onChange={(e) => set('video_create', e.target.checked)}
                />
                <span className="text-sm text-slate-700">
                  สร้าง Video Brief ด้วย <span className="text-xs text-slate-400">(optional)</span>
                </span>
              </label>
              {form.video_create && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Video Style">
                    <select className={inputCls} value={form.video_style} onChange={(e) => set('video_style', e.target.value)}>
                      <option value="">— เลือก style —</option>
                      <option value="talking_head">Talking Head</option>
                      <option value="slideshow">Slideshow</option>
                      <option value="animated">Animated</option>
                      <option value="documentary">Documentary</option>
                    </select>
                  </Field>
                  <Field label="Duration (วินาที)">
                    <input
                      type="number"
                      className={inputCls}
                      value={form.video_duration}
                      onChange={(e) => set('video_duration', Number(e.target.value))}
                      min={15}
                      max={300}
                    />
                  </Field>
                </div>
              )}
            </>
          )}
        </Section>

        {/* ── G. Destination ── */}
        <Section
          step="G"
          title="Facebook Destination"
          subtitle="เลือก Page ที่จะโพส"
          accent="#1877F2"
        >
          <Field label="Facebook Page" hint="เลือกตอนนี้หรือเลือกทีหลังตอน Approve ก็ได้">
            <select
              className={inputCls}
              value={form.facebook_account_id}
              onChange={(e) => set('facebook_account_id', e.target.value)}
            >
              <option value="">— เลือก Facebook Page —</option>
              {fbAccounts.map((fa) => (
                <option key={fa.id} value={fa.id}>
                  {fa.account_name} — {fa.page_name}
                </option>
              ))}
            </select>
            {fbAccounts.length === 0 && (
              <p className="text-xs text-amber-600 mt-1.5">
                ยังไม่มี Facebook account —{' '}
                <a href="/dashboard/facebook-accounts" className="underline font-medium">
                  เพิ่มก่อน
                </a>
              </p>
            )}
          </Field>
        </Section>

        {/* ── H. Batch & Schedule ── */}
        <Section
          step="H"
          title="Batch & Schedule"
          subtitle="จำนวนและวันเวลาที่ต้องการโพส"
          accent="#D97706"
        >
          <Field label="จำนวนคอนเทนต์ที่สร้าง" hint="Hermes จะสร้าง requirement แยกสำหรับแต่ละโพส">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                {[1, 2, 3, 5, 7, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPostCount(n)}
                    className={`px-3.5 py-2 text-sm font-semibold transition-colors min-w-[40px] ${
                      postCount === n
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500">
                {postCount === 1
                  ? '1 requirement → 1 โพส'
                  : `${postCount} requirements → ${postCount} โพสแยกกัน`}
              </span>
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="วันที่ต้องการโพส">
              <input
                type="date"
                className={inputCls}
                value={form.preferred_post_date}
                onChange={(e) => set('preferred_post_date', e.target.value)}
              />
            </Field>
            <Field label="เวลา">
              <input
                type="time"
                className={inputCls}
                value={form.preferred_post_time}
                onChange={(e) => set('preferred_post_time', e.target.value)}
              />
            </Field>
            <Field label="Priority">
              <div className="flex flex-col gap-2 pt-0.5">
                {PRIORITIES.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={p.id}
                      checked={form.priority === p.id}
                      onChange={() => set('priority', p.id)}
                      className="accent-orange-600"
                    />
                    <span className={`text-xs font-semibold ${p.color}`}>{p.label}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              className={`${inputCls} min-h-[56px] resize-y`}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </Field>
        </Section>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Summary bar */}
        <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-white/90 backdrop-blur border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            {lawCategories.length > 0 && (
              <span className="bg-blue-50 text-blue-700 rounded-full px-2.5 py-1 font-medium">
                {lawCategories.length} หมวดหมู่
              </span>
            )}
            {tones.length > 0 && (
              <span className="bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1 font-medium">
                Tone: {tones.slice(0, 2).join(', ')}{tones.length > 2 ? ` +${tones.length - 2}` : ''}
              </span>
            )}
            {contentGoals.length > 0 && (
              <span className="bg-orange-50 text-orange-700 rounded-full px-2.5 py-1 font-medium">
                {contentGoals.length} เป้าหมาย
              </span>
            )}
            <span className="bg-purple-50 text-purple-700 rounded-full px-2.5 py-1 font-medium">
              {wordCount.toLocaleString()} คำ
            </span>
            {postCount > 1 && (
              <span className="bg-slate-100 text-slate-700 rounded-full px-2.5 py-1 font-medium">
                {postCount} โพส
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a href="/dashboard/requirements" className="btn-ghost text-sm">
              Cancel
            </a>
            <button type="submit" disabled={loading} className="btn-gold disabled:opacity-50 text-sm">
              {loading
                ? 'Submitting...'
                : postCount > 1
                ? `Submit ${postCount} Requirements →`
                : 'Submit to Hermes →'}
            </button>
          </div>
        </div>

      </form>
    </div>
  )
}
