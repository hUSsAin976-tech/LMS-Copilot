# Rahnuma AI — Setup Guide

## Prerequisites

- **Python 3.10+** (for the backend)
- **Node.js 18+** and **npm** (for the frontend)
- **Git** (for version control)

---

## Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd rahnuma-ai
```

### 2. Backend Setup

```bash
cd backend

# Create a virtual environment
python -m venv .venv

# Activate it
# Windows:
.\.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY if you want AI features

# Start the backend
uvicorn app.main:app --reload --port 8000
```

The backend will:
- Create the SQLite database automatically
- Seed Demo LMS data on first startup
- Be available at `http://localhost:8000`
- API docs at `http://localhost:8000/api/docs`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Environment Variables

### Required for core functionality

The application runs in **Demo Mode** without any external API keys. All features work with deterministic demo data.

### Optional — for AI-powered features

```env
GEMINI_API_KEY=your-gemini-api-key
PRIMARY_GEMINI_MODEL=gemini-2.0-flash
FAST_GEMINI_MODEL=gemini-2.0-flash
```

### Optional — for Google Classroom integration

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

### Optional — for Moodle integration

```env
MOODLE_BASE_URL=https://your-moodle-instance.edu
MOODLE_TOKEN=your-moodle-token
```

---

## Project Structure

```
rahnuma-ai/
├── frontend/           # React + Vite + Tailwind
│   ├── src/
│   │   ├── api/        # Typed API client
│   │   ├── components/ # Sidebar, TopNav, etc.
│   │   ├── layouts/    # MainLayout wrapper
│   │   ├── pages/      # All page components
│   │   └── ...
│   └── package.json
│
├── backend/            # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── agents/     # Agent logic modules
│   │   ├── api/routes/ # API endpoint handlers
│   │   ├── core/       # Config
│   │   ├── db/         # Database setup
│   │   ├── integrations/lms/  # LMS connectors
│   │   ├── models/     # SQLAlchemy models
│   │   ├── rag/        # RAG service (ChromaDB)
│   │   ├── schemas/    # Pydantic schemas
│   │   └── tests/      # API tests
│   ├── requirements.txt
│   └── .env.example
│
├── docs/               # Documentation
├── docker-compose.yml  # Docker setup
└── README.md
```

---

## Docker (Optional)

```bash
docker-compose up --build
```

This starts both the backend and frontend in containers.

---

## Running Tests

```bash
cd backend
.\.venv\Scripts\activate  # or source .venv/bin/activate
python -m pytest app/tests/ -v
```

---

## Demo Mode

The application starts in Demo Mode by default. On first startup:

1. A demo user (`demo@rahnuma.ai`) is created
2. 6 courses with realistic academic data are seeded
3. 20+ assignments with rubrics and deadlines
4. 50+ course materials
5. Announcements and quiz schedules

All agent features work with deterministic demo logic even without a Gemini API key. This allows full development and testing without external dependencies.

---

## Troubleshooting

### Backend won't start
- Ensure you've activated the virtual environment
- Run `pip install -r requirements.txt` to install all dependencies
- Check that port 8000 is not in use

### Frontend can't reach backend
- Ensure the backend is running on `http://localhost:8000`
- Check CORS settings in `app/main.py`
- The frontend API base URL is hardcoded to `http://localhost:8000/api`

### Database issues
- Delete `rahnuma.db` and restart the backend to reset all data
- Or use the Settings page → "Reset Demo Data" button
