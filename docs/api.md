# Rahnuma AI — API Reference

Base URL: `http://localhost:8000/api`

---

## Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service health check |

**Response:**
```json
{ "status": "ok", "service": "Rahnuma AI" }
```

---

## LMS Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/lms/connect` | Connect to an LMS provider |
| POST | `/api/lms/sync` | Sync all data from the connected LMS |
| POST | `/api/lms/disconnect` | Disconnect and clean up LMS data |

### POST `/api/lms/connect`

**Query Parameters:**
- `provider` (string, default: `"demo"`) — LMS provider to connect

**Response:**
```json
{ "status": "connected", "provider": "demo", "user_id": 1 }
```

### POST `/api/lms/sync`

Syncs courses, assignments, materials, announcements, and quizzes from the connected LMS into the local database. Auto-connects to Demo LMS if no connector is active.

**Response:**
```json
{
  "status": "synced",
  "duration_ms": 120,
  "courses_created": 6,
  "assignments_created": 22,
  "materials_created": 50
}
```

---

## Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Aggregated dashboard data |

**Response:**
```json
{
  "user": { "id": 1, "name": "Demo Student", "email": "demo@rahnuma.ai" },
  "lms_status": "connected",
  "last_sync": "2024-01-15T10:30:00Z",
  "course_count": 6,
  "tasks_due_this_week": 3,
  "upcoming_deadlines": [
    {
      "id": 1, "title": "Essay Draft", "course_code": "ENG201",
      "due_at": "2024-01-20T23:59:00Z", "estimated_minutes": 120, "weight": 15.0
    }
  ],
  "upcoming_quiz": { "title": "Midterm Quiz", "course_code": "CS301", "quiz_date": "2024-01-22T10:00:00Z" },
  "recent_activity": [
    { "id": 1, "agent": "Fahmly", "action": "LMS Sync", "status": "success", "duration_ms": 120, "timestamp": "...", "summary": "Synced 6 courses" }
  ]
}
```

---

## Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | List all courses |
| GET | `/api/courses/{course_id}` | Course detail with assignments, materials, announcements, quizzes |

---

## Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assignments` | List all assignments |
| GET | `/api/assignments/{assignment_id}` | Assignment detail with rubric and requirements |
| PUT | `/api/assignments/{assignment_id}/confirm` | Confirm extracted assignment data |

---

## Materials

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/materials` | List all materials with indexing status |

---

## Agent Traces

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/traces` | List recent agent trace records (limit 50) |

---

## Concept Coach

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/coach/chat` | Ask a course-related question |

**Request Body:**
```json
{ "query": "Explain gradient descent", "course_id": 1 }
```

**Response:** Structured response with `concept`, `simple_explanation`, `course_connection`, `similar_example`, `common_mistakes`, `practice_question`, and `sources`.

If the query triggers the academic integrity guard, `is_academic_integrity_flag` will be `true` and the response will offer coaching alternatives instead.

---

## Intake Agent

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/intake/extract` | Extract assignment requirements |
| POST | `/api/intake/confirm` | Confirm extracted requirements |

### POST `/api/intake/extract`

**Request Body:**
```json
{ "assignment_id": 1, "raw_text": "Optional additional text..." }
```

**Response:** Structured extraction with `title`, `due_at`, `requirements`, `constraints`, `citation_requirements`, `rubric`, `estimated_minutes`.

### POST `/api/intake/confirm`

**Request Body:**
```json
{
  "assignment_id": 1,
  "title": "Essay Draft",
  "estimated_minutes": 120,
  "requirements": ["2000 words", "APA format"],
  "rubric": [{ "criterion": "Thesis", "points": 20, "description": "Clear thesis statement" }]
}
```

---

## Planner Agent

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/planner/generate` | Generate a study plan |
| GET | `/api/planner/plan` | Get the current study plan |
| POST | `/api/planner/tasks/{task_id}/toggle` | Toggle task completion |
| GET | `/api/planner/export-ics` | Export plan as .ics calendar file |

### POST `/api/planner/generate`

**Request Body:**
```json
{ "daily_availability_hours": 3 }
```

**Response:** Day-by-day plan with `days`, `conflicts`, `warnings`, `reasoning_summary`.

---

## Draft Reviewer

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reviewer/analyze` | Analyze a student draft against rubric |

**Request Body:**
```json
{
  "assignment_id": 1,
  "draft_text": "My essay draft content...",
  "confirmed_ownership": true
}
```

**Response:** Rubric-level feedback with `criterion`, `status`, `evidence`, `feedback`, `suggested_improvement`, plus `estimated_range` and `coaching_note`.

---

## Exam Prep

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/exam-prep/generate` | Generate quiz questions and flashcards |
| POST | `/api/exam-prep/submit` | Submit quiz answers for scoring |

### POST `/api/exam-prep/generate`

**Request Body:**
```json
{
  "course_id": 1,
  "topic": "Machine Learning Basics",
  "difficulty": "Medium",
  "question_count": 5
}
```

### POST `/api/exam-prep/submit`

**Request Body:**
```json
{ "quiz_id": 1, "answers": { "q1": "A", "q2": "True" } }
```

---

## Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update user settings |
| POST | `/api/settings/reset-demo` | Reset all demo data |

### PUT `/api/settings`

**Request Body:**
```json
{ "user_name": "Updated Name", "timezone": "Asia/Karachi" }
```

---

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get recent notifications |

**Response:**
```json
[
  {
    "id": 1,
    "type": "deadline",
    "title": "Assignment due soon",
    "message": "Essay Draft is due in 2 days",
    "created_at": "2024-01-18T10:00:00Z",
    "read": false
  }
]
```

---

## Error Responses

All errors return a JSON body:
```json
{ "detail": "Error description here" }
```

Common status codes:
- `400` — Bad request / invalid input
- `404` — Resource not found
- `500` — Internal server error
