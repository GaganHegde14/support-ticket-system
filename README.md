# Support Ticket System

A full-stack support ticket management system with AI-powered classification, built with **Django REST Framework**, **React**, **PostgreSQL**, and **Docker**.

## Architecture

| Layer             | Technology           | Purpose                                       |
| ----------------- | -------------------- | --------------------------------------------- |
| **Backend**       | Django 4.2 + DRF     | REST API, business logic, ORM                 |
| **Frontend**      | React 18             | SPA with functional components & hooks        |
| **Database**      | PostgreSQL 15        | Persistent storage with enforced constraints  |
| **LLM**           | Groq (Llama 3.3 70B) | Automatic ticket classification               |
| **Proxy**         | Nginx                | Serves React build, proxies `/api/` to Django |
| **Orchestration** | Docker Compose       | Single-command deployment                     |

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### Run

```bash
# Clone or navigate to the project directory
cd support-ticket-system

# (Optional) Set your Groq API key for AI classification
export GROQ_API_KEY=your-key-here              # Linux/Mac
set GROQ_API_KEY=your-key-here                 # Windows CMD
$env:GROQ_API_KEY="your-key-here"              # PowerShell

# Build and start all services
docker-compose up --build
```

Then open **http://localhost:3000** in your browser.

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

> **No manual steps required.** Migrations run automatically on startup. The app is fully functional after `docker-compose up` — the LLM feature simply requires a valid Groq API key.

## LLM Integration — Why Groq + Llama 3.3 70B?

I evaluated several LLM providers before selecting **Groq** with **Llama 3.3 70B Versatile**:

### Why not Google Gemini?

I initially implemented the classification service using **Google Gemini 1.5 Flash**. However, I ran into two critical issues:

1. **Model deprecation** — `gemini-1.5-flash` was removed from the API (`404 not found`), requiring a switch to `gemini-2.0-flash`
2. **Aggressive rate limiting** — Google's free tier quota (`limit: 0`) was exhausted almost immediately, even across new API keys and projects, making the feature effectively unusable during development and testing

These issues made Gemini unreliable for a project that needs to be demonstrated and evaluated.

### Why Groq?

| Criteria          | Groq (Llama 3.3 70B)                         | Google Gemini                           | OpenAI GPT      |
| ----------------- | -------------------------------------------- | --------------------------------------- | --------------- |
| **Free tier**     | 30 req/min, 14,400/day                       | Exhausts quickly, `limit: 0` frequently | No free tier    |
| **Speed**         | ~100–300ms (fastest inference)               | ~200–500ms                              | ~500–2000ms     |
| **Model quality** | Llama 3.3 70B — excellent for classification | Good but access issues                  | Best but costly |
| **Rate limits**   | Generous, never hit during testing           | Severely restrictive                    | Pay-per-token   |
| **Reliability**   | Consistent uptime                            | Model deprecation risk                  | Stable          |
| **Cost**          | Free for development                         | Free but unusable                       | $0.002+/request |

**Key reasons for choosing Groq:**

- **Extremely fast inference** — Groq's custom LPU hardware delivers ~100–300ms response times, making real-time classification feel instant as users type
- **Generous free tier** — 30 requests/minute and 14,400 requests/day is more than enough for development, testing, and demo purposes
- **No billing required** — sign up at https://console.groq.com, get an API key, and start using it immediately
- **High-quality model** — Llama 3.3 70B Versatile is a state-of-the-art open model that handles structured JSON output reliably
- **Simple SDK** — the `groq` Python package provides a clean, OpenAI-compatible API

### How it works

1. User types a ticket description in the form
2. After a debounced delay (800ms) or on blur, the frontend calls `POST /api/tickets/classify/` with the description
3. The backend sends the description to Groq's Llama 3.3 70B model with a carefully crafted prompt (see `backend/tickets/services.py`)
4. The model returns a JSON `{"category": "...", "priority": "..."}` response
5. The frontend pre-fills the Category and Priority dropdowns with the AI suggestions (shown with an "AI suggested" badge)
6. The user can accept or override the suggestions before submitting

### Error handling

- If `GROQ_API_KEY` is not set → returns `{"suggested_category": "general", "suggested_priority": "low"}` as fallback
- If the Groq API is unreachable → catches exception, returns fallback
- If the LLM returns unparseable JSON → catches `JSONDecodeError`, returns fallback
- If the LLM returns invalid category/priority values → validates and falls back per field
- Frontend: classify failure does not block the form — users simply pick manually

### Prompt design

The prompt (in `services.py`) explicitly:

- Lists all valid categories and priorities
- Provides classification rules for each value (e.g., "billing: payment issues, invoices...")
- Requests JSON-only output with no markdown or explanation
- Uses `temperature=0.1` for deterministic, consistent classification
- This avoids ambiguous output and simplifies parsing

## API Key Configuration

The Groq API key is configured via environment variable (never hardcoded):

### Option 1: Environment variable (recommended)

```bash
export GROQ_API_KEY=your-key-here
docker-compose up --build
```

### Option 2: `.env` file

Create a `.env` file in the project root:

```
GROQ_API_KEY=your-key-here
```

### Option 3: Direct in `docker-compose.yml`

```yaml
environment:
  GROQ_API_KEY: your-key-here
```

> **If no key is provided**, the system still works — classification falls back to `category: general`, `priority: low`.

## API Endpoints

| Method  | Endpoint                 | Description                                                     |
| ------- | ------------------------ | --------------------------------------------------------------- |
| `POST`  | `/api/tickets/`          | Create a new ticket (returns `201`)                             |
| `GET`   | `/api/tickets/`          | List tickets (filterable, searchable, paginated — newest first) |
| `PATCH` | `/api/tickets/<id>/`     | Update ticket status/category/priority                          |
| `GET`   | `/api/tickets/stats/`    | Aggregated dashboard statistics                                 |
| `POST`  | `/api/tickets/classify/` | AI-powered ticket classification                                |

### Filtering & Search

```
GET /api/tickets/?category=billing&priority=high&status=open&search=payment
```

All filters (`?category=`, `?priority=`, `?status=`, `?search=`) are combinable. Search queries both `title` and `description` fields.

### Stats Response Format

```json
{
  "total_tickets": 42,
  "open_tickets": 15,
  "avg_tickets_per_day": 3.5,
  "priority_breakdown": {
    "low": 10,
    "medium": 15,
    "high": 12,
    "critical": 5
  },
  "category_breakdown": {
    "billing": 8,
    "technical": 20,
    "account": 6,
    "general": 8
  }
}
```

The stats endpoint uses **database-level aggregation only** (`Count`, `Avg`, `Q`, `TruncDate`) — no Python-level loops.

## Design Decisions

### Data Model

- All field choices use Django `TextChoices` enums for type safety
- `CheckConstraint` on `category`, `priority`, and `status` fields enforces valid values at the database level
- Individual indexes on filterable fields + composite indexes for common query patterns
- `title` is `CharField(max_length=200)`, `description` is `TextField` — both required (no `blank=True`, no `null=True`)
- `status` defaults to `open` at both model and DB level

### API Design

- DRF `ModelViewSet` provides standard CRUD with proper HTTP status codes
- `TicketUpdateSerializer` restricts PATCH to only `status`, `category`, `priority` (title/description are read-only after creation)
- `ClassifyRequestSerializer` validates description length (10–5000 chars)
- Pagination at 50 items per page
- `django-filter` `FilterSet` for exact-match filtering on category/priority/status
- DRF `SearchFilter` for full-text search on title + description

### Frontend

- Three main components: `TicketForm`, `TicketList`, `StatsDashboard`
- `refreshKey` pattern ensures Stats and List auto-refresh when a new ticket is created (without full page reload)
- Debounced search input prevents excessive API calls
- Debounced LLM classification triggers as the user types (800ms delay)
- Modal for status updates — click any ticket to change status
- All state management via React hooks (no external state library needed)
- Custom CSS with variables — no framework dependency

### Docker

- **PostgreSQL**: `postgres:15-alpine` with healthcheck for startup ordering
- **Backend**: `python:3.12-slim`, Gunicorn WSGI server, entrypoint runs `makemigrations` + `migrate` on every startup
- **Frontend**: Multi-stage build (Node 18 build → Nginx 1.25 production), reverse proxy to backend
- `depends_on` with `condition: service_healthy` ensures DB is ready before Django starts

## Project Structure

```
support-ticket-system/
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh          # DB wait, migrations, starts Gunicorn
│   ├── requirements.txt
│   ├── manage.py
│   ├── config/
│   │   ├── settings.py        # Django settings (DB, CORS, DRF, Groq)
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── tickets/
│       ├── models.py           # Ticket model with TextChoices + DB constraints
│       ├── serializers.py      # DRF serializers with validation
│       ├── views.py            # ViewSet with stats & classify actions
│       ├── filters.py          # django-filter FilterSet
│       ├── services.py         # Groq LLM classification logic + prompt
│       ├── tests.py            # Model and API endpoint tests
│       ├── urls.py             # DRF router
│       ├── admin.py
│       └── apps.py
├── frontend/
│   ├── Dockerfile              # Multi-stage: Node build → Nginx
│   ├── nginx.conf              # Reverse proxy config
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── index.css           # Complete CSS with variables
│       ├── App.js              # Root component with refresh logic
│       ├── api.js              # Axios API client (named exports)
│       └── components/
│           ├── TicketForm.js    # Create ticket + AI auto-classify
│           ├── TicketList.js    # Filterable list + status update modal
│           └── StatsDashboard.js # Real-time aggregated stats
├── docker-compose.yml
└── README.md
```

## Development

```bash
# Stop services
docker-compose down

# Stop and remove volumes (database data)
docker-compose down -v

# Rebuild after code changes
docker-compose up --build
```
