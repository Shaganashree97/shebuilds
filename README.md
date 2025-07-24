# Connect & Conquer: Career Preparation Platform

## Overview

Connect & Conquer is a full-stack AI-powered platform for career preparation, offering personalized study plans, mock interviews with voice and video, resume optimization, company/job information, and curated learning resources. It leverages modern web technologies, advanced AI (Google Gemini), and robust authentication to deliver an interactive, real-world preparation experience.

---

## Table of Contents

- [Features](#features)
- [Technical Stack](#technical-stack)
- [Backend Architecture](#backend-architecture)
  - [Database Models](#database-models)
  - [API Endpoints](#api-endpoints)
  - [Authentication & API Keys](#authentication--api-keys)
- [Frontend Architecture](#frontend-architecture)
  - [Key Components](#key-components)
  - [Frontend Technical Details](#frontend-technical-details)
  - [Voice & Video Interview Flow](#voice--video-interview-flow)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)

---

## Features

- **Personalized Preparation Plans**: AI-generated study plans tailored to user goals, roles, or job descriptions. Tracks progress and adapts to user needs.
- **Mock Interviews (Voice & Video)**: Realistic, turn-based interviews with AI-generated questions, voice recording, speech-to-text, webcam integration, and detailed AI feedback.
- **Resume Optimization**: ATS compatibility analysis, keyword matching, and actionable improvement suggestions using AI.
- **Company & Job Information**: Company drive listings, job search integration, and industry-specific guidance.
- **Learning Resources**: Curated, skill-based educational content with progress tracking.
- **AI Chatbot**: Context-aware assistant for platform guidance and career advice.

---

## Technical Stack

- **Frontend**: React (Vite), modern CSS, Web Audio/Video APIs, Web Speech API
- **Backend**: Django 5, Django REST Framework, Channels (WebSockets), SimpleJWT, CORS
- **AI/ML**: Google Gemini API (Generative AI), ElevenLabs TTS (for voice questions)
- **Database**: SQLite (dev), Django ORM
- **Deployment**: Daphne (ASGI), Redis (for Channels in production)

---

## Backend Architecture

### Database Models

**User**: Django's built-in user model (extended via related models)

**CompanyDrive**

- `company_name`, `role`, `domain`, `salary_range`, `hiring_timeline`, `drive_date`, `location`, `interview_process_description`

**Skill**

- `name`, `description`

**LearningTopic**

- `name`, `description`, `related_skills` (M2M)

**LearningResource**

- `title`, `url`, `type`, `associated_topics` (M2M)

**MockInterviewQuestion**

- `question_text`, `difficulty`, `related_skill`, `company`

**UserPreparationPlan**

- `user`, `plan_name`, `academic_details`, `input_type`, `preferred_role`, `job_description`, `plan_data` (JSON), `total_topics`, `completed_topics`, `progress_percentage`, timestamps

**PlanProgress**

- `plan`, `section_name`, `topic_name`, `topic_description`, `is_completed`, `completion_date`, `estimated_hours`, `actual_hours_spent`, `user_notes`, `difficulty_rating`, timestamps

---

### API Endpoints (Key)

- `POST /api/auth/register/` — User registration
- `POST /api/auth/login/` — User login (returns JWT tokens)
- `POST /api/auth/logout/` — User logout (blacklists refresh token)
- `GET/PUT /api/auth/profile/` — User profile
- `POST /api/generate_prep_plan/` — Generate personalized study plan (AI-powered)
- `POST /api/generate_mock_interview/` — Generate mock interview questions (AI-powered, with TTS audio)
- `POST /api/evaluate_interview_answers/` — Evaluate answers (AI-powered, expects:
  ```json
  {
    "company_name": "...",
    "job_description": "...",
    "question_answers": [
      {"question_text": "...", "difficulty_level": "...", "user_answer": "..."},
      ...
    ]
  }
  ```
- `POST /api/resume_checker/` — Resume analysis (AI-powered)
- `GET /api/companies/` — Company drives
- `GET /api/user_plans/` — User's saved plans
- `GET /api/plan/<id>/` — Plan details & progress

---

### Authentication & API Keys

- **JWT Auth**: Uses SimpleJWT for secure, stateless authentication. Tokens are stored in localStorage and sent via `Authorization: Bearer <token>` header.
- **Token Refresh**: Automatic refresh on expiry; blacklisting on logout.
- **API Keys**:
  - `GEMINI_API_KEY` (Google Gemini, for all AI features)
  - `ELEVENLABS_API_KEY` (for TTS audio in mock interviews)
  - Keys are loaded via `.env` and never exposed to the frontend.
- **CORS**: Configured for local dev and production.

---

## Frontend Architecture

### Key Components

- **PreparationPlan.jsx**: Handles plan generation, progress tracking, and plan management.
- **MockInterviews.jsx**: Voice/video interview UI, speech recognition, webcam, turn-based flow, AI feedback.
- **ResumeBuilder.jsx**: Resume upload, AI analysis, and feedback display.
- **AIChatbot.jsx**: Floating AI assistant, context-aware, available on all pages.
- **AuthWrapper.jsx, Login.jsx, Signup.jsx**: Authentication flows.
- **Profile.jsx**: User profile management.
- **CompanyList.jsx**: Company/job search and display.

### Frontend Technical Details

#### **1. Project Structure & Build**

- **Vite** is used for fast development, HMR, and modern build tooling.
- **Component-based**: All UI is built from modular React components, organized by feature.
- **CSS Modules/Scoped CSS**: Each component has its own CSS file for maintainable, isolated styles.

#### **2. State Management**

- **React Hooks**: All state is managed with `useState`, `useEffect`, and custom hooks for side effects and data fetching.
- **Component-local state**: Most state is kept local to each feature (e.g., interview progress, plan data).
- **Global Auth State**: Authentication state is managed at the App level and passed via props/context.

#### **3. API Integration & Services**

- **authService.js**: Centralized service for all API calls, handles JWT token storage, refresh, and error handling.
- **makeAuthenticatedRequest**: Ensures all protected endpoints include the JWT token and handles token refresh on 401.
- **Error Handling**: All API calls have robust error handling, with user-friendly messages and retry logic.

#### **4. Voice & Video Integration**

- **Web Speech API**: Used for real-time speech-to-text in mock interviews, with fallback to text input if unavailable.
- **Web Audio API**: Plays AI-generated question audio (from ElevenLabs TTS or Gemini).
- **Webcam Integration**: Uses `getUserMedia` for live video feed during interviews, with permission/error handling.
- **Turn-based Flow**: Only allows user to answer after AI finishes speaking, with clear UI cues.
- **Live Transcript**: Shows interim/final speech recognition results in real time.
- **Fallbacks**: If voice fails (network, permissions, etc.), user can type answers instead.

#### **5. UI/UX Patterns**

- **Responsive Design**: All components are mobile-friendly, with flexbox/grid layouts and media queries.
- **Modern Animations**: Uses CSS transitions, keyframes, and animated avatars for engaging experience.
- **Status Indicators**: Visual cues for recording, speaking, errors, and progress.
- **Accessibility**: Keyboard navigation, ARIA labels, and color contrast considered.
- **Error Boundaries**: User-facing error messages for all major flows.

#### **6. Security & Best Practices**

- **No API keys in frontend**: All secrets are handled server-side.
- **JWT tokens**: Stored in localStorage, never in code.
- **CORS**: Only allowed origins can access the backend.
- **Input Validation**: All forms have client-side and server-side validation.

#### **7. Extensibility**

- **Component Reuse**: UI elements (buttons, forms, chat bubbles) are designed for reuse.
- **Service Layer**: All API logic is abstracted for easy updates.
- **Easy Theming**: CSS structure allows for quick color/font changes.

### Voice & Video Interview Flow

1. **Setup**: User enters company name & job description, grants camera/mic permissions.
2. **AI Question**: AI generates and speaks question (TTS audio).
3. **User Turn**: User records answer (voice, with live transcript) or types answer if voice fails.
4. **Chat Log**: All Q&A shown in real-time chat interface.
5. **Evaluation**: On completion, answers are sent to backend for AI-powered feedback.
6. **Results**: Detailed strengths, improvements, suggestions, and overall score.

---

## Setup & Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- (Recommended) Redis for production WebSocket support

### Backend Setup

```bash
cd backend
python -m venv env
source env/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your API keys
python manage.py migrate
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Create a `.env` file in `backend/` with:

```
DJANGO_SECRET_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```
