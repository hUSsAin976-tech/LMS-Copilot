# Rahnuma AI

Rahnuma AI is a supervised multi-agent student guide with Fahmly LMS agent.

## Implementation Target

Antigravity IDE

## Structure

- `frontend/` - React application built with Vite and Tailwind CSS.
- `backend/` - FastAPI backend application handling LMS integrations and Agent coordination.

## Running the application

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```
