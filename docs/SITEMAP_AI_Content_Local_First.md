# Sitemap: Law AI Content OS — Local-First Content Dashboard

## 1. Existing Assumption

Dashboard already exists at:

```text
/dashboard
```

The new modules should be added to the existing dashboard without rebuilding the entire app.

---

## 2. Main Navigation

```text
/dashboard
├── Overview
├── Requirements
├── Queue
├── Outputs
├── Calendar
├── Facebook Accounts
├── RAG / Knowledge
├── Video Jobs
├── Commands
├── Settings
└── Logs
```

---

## 3. Page Details

## /dashboard

Purpose:

- Main overview
- Show total requirements
- Show ready outputs
- Show pending reviews
- Show scheduled posts
- Show failed jobs

Widgets:

```text
- Requirements Today
- Queue Status
- Ready for Review
- Scheduled This Week
- Facebook Account Filter
- Video Jobs Status
- Latest Hermes Activity
```

---

## /dashboard/requirements

Purpose:

- List all requirements
- Filter by account/status/date

Components:

```text
- Create Requirement button
- Requirement table
- Status badge
- Facebook account/page column
- Video create flag
- Search/filter
```

Table columns:

```text
ID | Topic | Facebook Account | Type | Video | Status | Preferred Date | Updated
```

---

## /dashboard/requirements/new

Purpose:

- Create one content requirement

Form sections:

### A. Basic Info

```text
- Requirement title
- Topic
- Content brief
- Target audience
- Objective
- Tone
```

### B. Destination

```text
- Platform: Facebook
- Facebook Account/Page selector
- Content type: post / carousel / reel script / short video
```

### C. Creative Direction

```text
- Image prompt direction
- Layout requirement
- Text overlay instruction
- Brand style
```

### D. Video Optional

```text
- Checkbox: Create Video
- Video style
- Video duration
- Scene count
```

### E. Schedule Preference

```text
- Preferred post date
- Preferred post time
- Priority
```

Actions:

```text
- Save Draft
- Submit Requirement
```

---

## /dashboard/requirements/[id]

Purpose:

- Requirement detail
- Track processing status

Sections:

```text
- Requirement Summary
- Facebook Account/Page Target
- Workflow Status Timeline
- RAG Sources Used
- Generated Content
- Image Prompt
- Layout Spec
- Video Brief / Status
- Calendar Item
- Activity Log
```

Actions:

```text
- Re-run Hermes
- Request Revision
- Approve
- Schedule
- Export
```

---

## /dashboard/queue

Purpose:

- Show Hermes job queue

Components:

```text
- Job status board
- Processing list
- Failed jobs
- Retry button
- Stop/Pause worker notice
```

Columns:

```text
Job ID | Requirement | Job Type | Status | Attempts | Error | Updated
```

---

## /dashboard/outputs

Purpose:

- View all generated outputs

Filters:

```text
- Facebook account/page
- Status
- Content type
- Date
- Video required
```

Output cards:

```text
- Content Text
- Image Prompt
- Layout Spec
- Video Brief
- Source Notes
```

Actions:

```text
- Edit content
- Edit prompt
- Send to calendar
- Approve
- Reject
```

---

## /dashboard/calendar

Purpose:

- Prepare publishing calendar manually

Views:

```text
- Month view
- Week view
- List view
- By Facebook account/page
```

Features:

```text
- Select post date/time
- Move item between dates
- Filter by account/page
- Mark as scheduled/prepared
- Export CSV/Markdown
```

Important:

MVP does not auto publish.

---

## /dashboard/facebook-accounts

Purpose:

- Manage 4-5 Facebook accounts/pages

Components:

```text
- Account list
- Add account/page
- Edit brand voice
- Default posting slots
- Active/inactive status
```

Fields:

```text
- Account name
- Page name
- Page ID
- Brand voice
- Default timezone
- Default posting slots
- Notes
```

---

## /dashboard/rag

Purpose:

- Show local RAG/Obsidian status

Sections:

```text
- Obsidian vault path
- Indexed notes count
- Last index time
- RAG-ready notes
- Missing knowledge tasks
- Source notes used by requirement
```

Actions:

```text
- Re-index vault
- Open note path
- Mark note as RAG-ready
- Request Codex research
```

---

## /dashboard/video-jobs

Purpose:

- Manage optional video creation flow

Statuses:

```text
not_requested
prompt_ready
submitted_to_video_api
rendering
completed
failed
```

Fields:

```text
- Requirement ID
- Video API Provider
- Video prompt
- Status
- Video URL
- Error
```

---

## /dashboard/commands

Purpose:

- Track Telegram/LINE commands

Sections:

```text
- Latest commands
- Parsed action
- Response sent
- Failed commands
```

Example commands:

```text
/newreq
/status
/schedule
/approve
/reject
```

---

## /dashboard/settings

Purpose:

- Local system settings

Sections:

```text
- Local DB path
- Obsidian vault path
- RAG provider
- Hermes config
- Codex runtime config
- Telegram bot token
- Video API key
- Export settings
```

---

## /dashboard/logs

Purpose:

- Debug and audit trail

Logs:

```text
- Hermes logs
- Codex task logs
- RAG indexing logs
- Video API logs
- Command logs
- Error logs
```

---

## 4. Required UI Components

```text
- RequirementForm
- FacebookAccountSelector
- StatusTimeline
- QueueTable
- OutputReviewPanel
- ImagePromptEditor
- LayoutSpecEditor
- VideoBriefPanel
- CalendarScheduler
- RAGSourcesPanel
- HermesActivityLog
- CommandLogTable
```

---

## 5. MVP Route Priority

Build in this order:

```text
1. /dashboard/facebook-accounts
2. /dashboard/requirements/new
3. /dashboard/requirements
4. /dashboard/requirements/[id]
5. /dashboard/queue
6. /dashboard/outputs
7. /dashboard/calendar
8. /dashboard/rag
9. /dashboard/video-jobs
10. /dashboard/commands
11. /dashboard/settings
12. /dashboard/logs
```
