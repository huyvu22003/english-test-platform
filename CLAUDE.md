# CLAUDE.md — English Test Platform (IELTS Ms. Tra My)

## Overview

SPA for IELTS exam management: teachers create topics/tests/sessions, students take exams (reading, listening, writing, use_of_english, placement), teachers grade writing with IELTS band scoring.

## Tech stack

- **Frontend**: React 18 + TypeScript 5 + Vite 5 (no Tailwind — pure CSS in `src/index.css`)
- **Backend**: Supabase (PostgreSQL + RLS + RPC SECURITY DEFINER + Edge Functions)
- **Deploy**: Cloudflare Pages auto-deploy from `main`
- **CI**: GitHub Actions — lint, format:check, test, build (Node 20)

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # tsc --noEmit && vite build
npm run lint         # eslint src/
npm run format       # prettier --write src/
npm run format:check # prettier --check src/
npm test             # NODE_ENV=test vitest run (51 tests)
npm run test:watch   # NODE_ENV=test vitest watch mode
```

## Project structure

```
src/
  App.tsx                    # Router + lazy loading + ErrorBoundary
  main.tsx                   # Entry point
  index.css                  # All styles (no CSS modules/Tailwind)
  components/                # Shared UI: AdminPageHeader, ExamLayout, ErrorBoundary, common, Logo, ScrollToTop
  lib/                       # Shared logic
    api.ts                   # Supabase RPC/query wrappers
    auth.tsx                 # AuthProvider + useAuth hook
    supabase.ts              # Supabase client (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
    types.ts                 # All TypeScript types/interfaces
    utils.ts                 # Shared utilities: fmtTime, isAnswered, formatError, skillLabel, skillLabelEn
    useAsync.ts              # Generic data fetching hook
    useCountdownTimer.ts     # Exam countdown hook (duration + server-synced deadline)
    antiCheat.ts             # Fullscreen lock + violation tracking
    gradeReport.ts           # ExcelJS-based grade report export
    csv.ts, storage.ts, studentSession.ts
  pages/
    admin/                   # Teacher/admin pages
      OperationsPage.tsx     # Dashboard overview
      SessionsPage.tsx       # Exam session CRUD
      SubmissionsPage.tsx    # Grading queue (IELTS 4 criteria)
      gradingUtils.ts        # Grading storage/validation/Excel export helpers
      TopicsPage.tsx         # Topic & test bank
      TestEditorPage.tsx     # Question/passage editor
      RosterPage.tsx         # Student roster & classes
      StaffPage.tsx          # Staff accounts & permissions
      ImportPage.tsx         # CSV import
      DiagnosticsPage.tsx    # System diagnostics
      AdminLayout.tsx        # Sidebar layout wrapper
    student/                 # Student-facing pages
      StudentHome.tsx        # Landing page (placement topic chooser)
      ExamPage.tsx           # Reading/listening exam (exports QuestionView)
      WritingExamPage.tsx    # Writing exam (intensive flow)
      SessionExamPage.tsx    # Session-based exam (server-synced timer)
      PlacementExamPage.tsx  # Placement test
      SessionEntryPage.tsx   # Exam room entry (access code)
      ProgressPage.tsx       # Student progress dashboard + PDF print
      ResultPage.tsx         # Post-submission result
    NotFoundPage.tsx
  test/
    setup.ts                 # @testing-library/jest-dom/vitest
supabase/
  schema.sql                 # Database schema
  functions/                 # Edge Functions
  *.sql                      # Migrations & RPC definitions
```

## Architecture decisions

- **Route-level code splitting**: All pages use `React.lazy()` + `<Suspense>` in `App.tsx`
- **Vite manual chunks**: `react`, `supabase`, `exceljs` split into separate vendor bundles for caching
- **No state management library**: React state + context (`useAuth`) + `useAsync` hook
- **Shared components**: `AdminPageHeader` (admin page headers with stat cards), `ExamBar`/`ExamSubmitPanel` (exam UI chrome)
- **Anti-cheat**: Fullscreen lock, tab-change detection, copy/paste blocking, violation counter with auto-submit threshold
- **Server time sync**: `SessionExamPage` uses `serverOffsetMs` to sync countdown with server clock
- **Supabase null fallback**: If env vars missing, `supabase = null` and app runs in demo mode
- **Cascade delete**: `deleteTopic()` and `deleteTest()` in `api.ts` cascade-delete child records (sessions, submissions, questions, passages) before removing the parent
- **Placement topic grouping**: `StudentHome` groups placement tests by topic so students choose which test to take within each placement topic

## Conventions

- **Language**: UI text is Vietnamese; code identifiers and comments may mix Vietnamese and English
- **Styling**: Plain CSS classes in `src/index.css` — no utility frameworks, no CSS-in-JS
- **Error handling**: `formatError(e)` from `src/lib/utils.ts` for consistent error display
- **Skill labels**: Use `skillLabel()` (Vietnamese) or `skillLabelEn()` (English) from `src/lib/utils.ts`
- **Timer logic**: Use `useCountdownTimer` hook — don't duplicate timer logic in exam pages
- **Admin headers**: Use `<AdminPageHeader>` component — don't duplicate header/stat-grid markup
- **Exam chrome**: Use `<ExamBar>` and `<ExamSubmitPanel>` — don't duplicate exam UI structure
- **Testing**: Vitest + @testing-library/react; test files are `*.test.ts(x)` colocated with source
- **No `any`**: `@typescript-eslint/no-explicit-any` is enabled as a warning

## Environment variables

```
VITE_SUPABASE_URL=        # Supabase project URL
VITE_SUPABASE_ANON_KEY=   # Supabase anonymous key
```

## Roles & permissions

`AdminRole`: `owner` > `admin` > `teacher` / `grader` / `content_editor`

- **owner/admin**: Full access
- **teacher**: Manages assigned classes, grades submissions
- **grader**: Grades assigned submissions only
- **content_editor**: Manages topics/tests, no grading

## Key types

Defined in `src/lib/types.ts`:
- `Skill`: `"writing" | "reading" | "listening" | "use_of_english"`
- `QType`: `"single" | "multi" | "tfng" | "fill"`
- `AdminRole`: `"owner" | "admin" | "teacher" | "grader" | "content_editor"`
- `Submission`: Core grading entity with IELTS band scores (TR, CC, LR, GRA)
- `WritingScores`: `{ tr, cc, lr, gra }` — IELTS writing criteria
