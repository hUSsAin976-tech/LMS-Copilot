# Rahnuma AI — Architecture

## Overview

Rahnuma AI is a supervised multi-agent student guide that integrates with Learning Management Systems (LMS) to help students manage their academic workload effectively. The system follows a "coach, not ghostwriter" philosophy — it helps students understand, plan, and improve their work without doing it for them.

## System Architecture

```text
                    ┌────────────────────┐
                    │   React Frontend   │
                    │  (Vite + Tailwind) │
                    └─────────┬──────────┘
                              │ REST API
                              ▼
                    ┌────────────────────┐
                    │    FastAPI API     │
                    │   (Python 3.10+)  │
                    └─────────┬──────────┘
                              │
           ┌──────────────────┼──────────────────────┐
           ▼                  ▼                      ▼
       Agent Layer       Data Layer            RAG Layer
    ┌──────────────┐  ┌──────────────┐   ┌──────────────┐
    │ Concept Coach │  │  SQLAlchemy  │   │   ChromaDB   │
    │ Intake Agent  │  │   (SQLite)   │   │  (Vectors)   │
    │ Planner Agent │  └──────────────┘   └──────────────┘
    │ Draft Reviewer│
    │ Exam Prep     │
    │ Fahmly (LMS)  │
    └──────────────┘
```

## Frontend

- **Framework**: React 19 with TypeScript
- **Build tool**: Vite 8
- **Styling**: Tailwind CSS 4
- **Routing**: React Router 7
- **Icons**: Lucide React
- **Charts**: Recharts
- **API client**: Custom typed fetch wrapper (`api/client.ts`)

### Page Structure

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing | Hero, feature overview, demo CTA |
| `/dashboard` | Dashboard | Deadlines, study plan, quiz, activity |
| `/courses` | Courses | Course list with search |
| `/courses/:id` | CourseDetail | Assignments, materials, announcements, quizzes |
| `/assignments` | Assignments | All assignments with intake extraction |
| `/assignments/:id` | AssignmentDetail | Requirements, rubric, related materials |
| `/planner` | Planner | Day-by-day study plan with conflicts |
| `/coach` | Coach | Concept Q&A with RAG sources |
| `/reviewer` | Reviewer | Draft upload + rubric feedback |
| `/exam-prep` | ExamPrep | Quiz generator, flashcards, results |
| `/materials` | Materials | Knowledge base (indexed materials) |
| `/activity` | Activity | Agent trace / action log |
| `/settings` | Settings | Profile, LMS connections, preferences |

## Backend

- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Validation**: Pydantic
- **Config**: pydantic-settings with `.env` support

### Route Modules

| Module | Prefix | Purpose |
|--------|--------|---------|
| `lms.py` | `/api/lms` | Connect, sync, disconnect LMS |
| `data.py` | `/api` | Dashboard, courses, assignments, materials, traces |
| `agents.py` | `/api` | Coach, intake, planner, reviewer, exam-prep, settings |

## Agent System

Each agent operates on real database state and logs transparent `AgentTrace` records.

| Agent | Input | Output |
|-------|-------|--------|
| **Fahmly** | LMS connector | Normalized courses, assignments, materials |
| **Intake** | Assignment description/rubric | Structured requirements (Pydantic) |
| **Planner** | Confirmed tasks + availability | Day-by-day plan with conflicts |
| **Concept Coach** | Student question + course context | Grounded explanation + sources |
| **Draft Reviewer** | Student draft + rubric | Criterion-level feedback |
| **Exam Prep** | Course + topic + difficulty | Quiz questions + flashcards |

### Academic Integrity Guard

A centralized guard classifies requests as **allowed** or **restricted**:
- **Allowed**: "Explain gradient descent", "Review my draft", "Help me plan"
- **Restricted**: "Write my assignment", "Solve my quiz", "Give me the final answer"

Restricted requests return a coaching response instead of a direct answer.

## LMS Integration Layer

```text
BaseLMSConnector (abstract)
├── DemoLMSConnector    ← Built-in seed data (6 courses, 20+ assignments)
├── GoogleClassroomConnector ← OAuth 2.0 read-only
└── MoodleConnector     ← Token-based REST API
```

All connectors produce the same normalized data structures. The frontend never knows which LMS is active.

## RAG (Retrieval-Augmented Generation)

```text
Material → Extract text → Chunk → Embed → Store in ChromaDB
                                              ↓
                                    Query → Filter by user+course → Context
```

- Chunking: 1000-char chunks with 200-char overlap
- Filtering: Always by `user_id` and optionally `course_id`
- Sources: Every grounded answer shows source title and course

## Database Schema

See `backend/app/models/all.py` for the complete SQLAlchemy model definitions:

- `User`, `LMSConnection`, `Course`, `Assignment`, `Material`
- `Announcement`, `Deadline`, `StudyPlan`, `Draft`, `Review`
- `Quiz`, `AgentTrace`

## Security

- All API keys and OAuth credentials stay on the backend only
- LMS passwords are never stored; prefer OAuth/read-only tokens
- User data is isolated by `user_id` on all queries
- One-click data deletion is supported
- Logging never captures passwords, API keys, or raw student documents
