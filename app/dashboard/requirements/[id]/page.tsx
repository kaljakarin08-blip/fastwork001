import Link from 'next/link'
import { notFound } from 'next/navigation'
import { statusLabel, statusColor } from '@/lib/utils'
import ApproveSchedule from './ApproveSchedule'
import SelectFbAccount from './SelectFbAccount'
import ProcessNowButton from './ProcessNowButton'
import RejectDeleteActions from './RejectDeleteActions'
import PublishedPostPreview from './PublishedPostPreview'
import { CopyButton } from './CopyButton'

async function getRequirement(id: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/local/requirements/${id}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function RequirementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getRequirement(id)
  if (!data) notFound()

  const { output, image_prompt, video_prompt, rag_sources, jobs, calendar, ...req } = data

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/requirements"
          className="text-xs text-slate-400 hover:text-orange-600 transition-colors font-medium"
        >
          ← Requirements
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{req.title || req.topic}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`badge ${statusColor(req.status)}`}>{statusLabel(req.status)}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                {req.content_type}
              </span>
              {req.video_create ? (
                <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                  Video
                </span>
              ) : null}
              {req.priority === 'urgent' && (
                <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">Urgent</span>
              )}
            </div>
          </div>
          <RejectDeleteActions requirementId={req.id} status={req.status} />
        </div>
      </div>

      {/* Requirement Summary */}
      <div className="card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Requirement Summary</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Info label="Topic">{req.topic}</Info>
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1.5">FB Account</p>
            {!req.fb_page_name && (
              <p className="text-xs text-amber-600 mb-1.5">ยังไม่เลือก — เลือกก่อน Schedule</p>
            )}
            <SelectFbAccount
              requirementId={req.id}
              fbAccounts={data.fb_accounts ?? []}
              currentAccountId={req.facebook_account_id}
            />
          </div>
          {req.brief && <Info label="Brief" className="col-span-2">{req.brief}</Info>}
          {req.target_audience && <Info label="Target Audience">{req.target_audience}</Info>}
          {req.tone && <Info label="Tone" className="capitalize">{req.tone}</Info>}
          {req.objective && <Info label="Objective" className="col-span-2">{req.objective}</Info>}
          {req.preferred_post_date && (
            <Info label="Scheduled">
              {req.preferred_post_date} {req.preferred_post_time}
            </Info>
          )}
        </div>
      </div>

      {/* Job Status */}
      {jobs?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Status</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {jobs.map(
              (job: {
                id: string
                status: string
                attempt_count: number
                error_message?: string
                started_at?: string
                completed_at?: string
              }) => (
                <div key={job.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <code className="text-xs font-mono text-slate-400">{job.id.slice(-12)}</code>
                    <span className="text-xs text-slate-400">attempt {job.attempt_count}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.error_message && (
                      <span className="text-xs text-red-500 max-w-xs truncate">{job.error_message}</span>
                    )}
                    <span className={`badge ${statusColor(job.status)}`}>{statusLabel(job.status)}</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* RAG Sources */}
      {rag_sources?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              RAG Sources Used ({rag_sources.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {rag_sources.map(
              (src: { id: string; note_title: string; note_path: string; relevance_score: number }) => (
                <div key={src.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{src.note_title}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{src.note_path}</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    {(src.relevance_score * 100).toFixed(0)}%
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Generated Content */}
      {output && (
        <div className="card border-emerald-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-emerald-100 bg-emerald-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Generated Content</h2>
            <span className="text-xs text-emerald-600 font-medium">Ready to review</span>
          </div>
          <div className="p-6 space-y-4">
            {output.hook && (
              <OutputBlock label="Hook">{output.hook}</OutputBlock>
            )}
            {output.caption && (
              <OutputBlock label="Caption" pre>{output.caption}</OutputBlock>
            )}
            {output.body && (
              <OutputBlock label="Body" pre>{output.body}</OutputBlock>
            )}
            {output.cta && (
              <OutputBlock label="CTA">{output.cta}</OutputBlock>
            )}
            {output.hashtags && (
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Hashtags</p>
                <p className="text-sm text-blue-600 font-mono bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {output.hashtags}
                </p>
              </div>
            )}
            {output.compliance_note && (
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
                <span className="font-semibold">⚠️ Compliance Note:</span> {output.compliance_note}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Prompt */}
      {image_prompt && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Image Prompt</h2>
            <CopyButton
              label="Copy All"
              text={[
                image_prompt.main_prompt && `[Main Prompt]\n${image_prompt.main_prompt}`,
                image_prompt.text_overlay && `[Text Overlay]\n${image_prompt.text_overlay}`,
                image_prompt.layout_spec && `[Layout Spec]\n${image_prompt.layout_spec}`,
                image_prompt.canvas_size && `[Canvas] ${image_prompt.canvas_size}`,
                image_prompt.brand_style && `[Style] ${image_prompt.brand_style}`,
              ].filter(Boolean).join('\n\n')}
            />
          </div>
          <div className="p-6 space-y-4">
            {image_prompt.main_prompt && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Main Prompt</p>
                  <CopyButton text={image_prompt.main_prompt} label="Main Prompt" />
                </div>
                <div className="text-xs text-slate-800 bg-slate-50 border border-slate-100 rounded-xl p-4 font-mono whitespace-pre-wrap">
                  {image_prompt.main_prompt}
                </div>
              </div>
            )}
            {image_prompt.text_overlay && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Text Overlay</p>
                  <CopyButton text={image_prompt.text_overlay} label="Text Overlay" />
                </div>
                <div className="text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded-xl p-4">
                  {image_prompt.text_overlay}
                </div>
              </div>
            )}
            {image_prompt.layout_spec && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Layout Spec</p>
                  <CopyButton text={image_prompt.layout_spec} label="Layout Spec" />
                </div>
                <div className="text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded-xl p-4">
                  {image_prompt.layout_spec}
                </div>
              </div>
            )}
            <div className="flex gap-4 text-xs text-slate-400 pt-1">
              {image_prompt.canvas_size && <span>Canvas: <strong className="text-slate-600">{image_prompt.canvas_size}</strong></span>}
              {image_prompt.brand_style && <span>Style: <strong className="text-slate-600">{image_prompt.brand_style}</strong></span>}
            </div>
          </div>
        </div>
      )}

      {/* Video Brief */}
      {video_prompt && (
        <div className="card border-purple-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-purple-100 bg-purple-50">
            <h2 className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Video Brief</h2>
          </div>
          <div className="p-6 space-y-4">
            {video_prompt.hook && <OutputBlock label="Hook">{video_prompt.hook}</OutputBlock>}
            {video_prompt.scene_breakdown && (
              <OutputBlock label="Scene Breakdown" pre>{video_prompt.scene_breakdown}</OutputBlock>
            )}
            {video_prompt.voiceover_script && (
              <OutputBlock label="Voiceover Script" pre>{video_prompt.voiceover_script}</OutputBlock>
            )}
          </div>
        </div>
      )}

      {/* Approve + Schedule */}
      {(req.status === 'output_ready' || req.status === 'approved') && (
        <ApproveSchedule
          requirementId={req.id}
          status={req.status}
          fbAccounts={data.fb_accounts ?? []}
          fbAccountId={req.facebook_account_id}
        />
      )}

      {/* Published Post Preview / Publish Now */}
      {calendar && (req.status === 'scheduled' || req.status === 'published' || req.status === 'publish_failed') && (
        <PublishedPostPreview
          calendar={calendar}
          requirementId={req.id}
        />
      )}

      {/* Empty state */}
      {!output && !image_prompt && <ProcessNowButton />}
    </div>
  )
}

function Info({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800">{children}</p>
    </div>
  )
}

function OutputBlock({
  label,
  children,
  pre,
  mono,
}: {
  label: string
  children: React.ReactNode
  pre?: boolean
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{label}</p>
      <div
        className={`text-sm text-slate-800 bg-slate-50 border border-slate-100 rounded-xl p-4 ${
          pre ? 'whitespace-pre-wrap' : ''
        } ${mono ? 'font-mono text-xs' : ''}`}
      >
        {children}
      </div>
    </div>
  )
}
