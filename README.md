# Support Ticket System

A full-stack support ticket management system with AI-powered classification, built with **Django REST Framework**, **React**, **PostgreSQL**, and **Docker**.

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Django 4.2 + DRF | REST API, business logic, ORM |
| **Frontend** | React 18 | SPA with functional components & hooks |
| **Database** | PostgreSQL 15 | Persistent storage with enforced constraints |
| **LLM** | Google Gemini 1.5 Flash | Automatic ticket classification |
| **Proxy** | Nginx | Serves React build, proxies `/api/` to Django |
| **Orchestration** | Docker Compose | Single-command deployment |

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### Run

```bash
# Clone or navigate to the project directory
cd support-ticket-system

# (Optional) Set your Gemini API key for AI classification
export GEMINI_API_KEY=your-key-here            # Linux/Mac
set GEMINI_API_KEY=your-key-here               # Windows CMD
$env:GEMINI_API_KEY="your-key-here"            # PowerShell

# Build and start all services
docker-compose up --build
```

Then open **http://localhost:3000** in your browser.

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

> **No manual steps required.** Migrations run automatically on startup. The app is fully functional after `docker-compose up` — the LLM feature simply requires a valid Gemini API key.

## LLM Integration — Why Gemini 1.5 Flash?

I chose **Google Gemini 1.5 Flash** for the classification service:

- **Free tier available** — easy to test without billing setup
- **Fast response times** (~200–500ms) — suitable for real-time classification as users type
- **Good at structured output** — reliably returns JSON with category/priority
- **Sufficient accuracy** — handles billing, technical, account, and general categories well

### How it works

1. User types a ticket description in the form
2. After a debounced delay (800ms) or on blur, the frontend calls `POST /api/tickets/classify/` with the description
3. The backend sends the description to Gemini with a carefully crafted prompt (see `backend/tickets/services.py`)
4. Gemini returns a JSON `{"category": "...", "priority": "..."}` response
5. The frontend pre-fills the Category and Priority dropdowns with the AI suggestions (shown with an "AI suggested" label)
6. The user can accept or override the suggestions before submitting

### Error handling

- If `GEMINI_API_KEY` is not set → returns `{"suggested_category": "general", "suggested_priority": "low"}` as fallback
- If the Gemini API is unreachable → catches exception, returns fallback
- If the LLM returns unparseable JSON → catches `JSONDecodeError`, returns fallback
- If the LLM returns invalid category/priority values → validates and falls back per field
- Frontend: classify failure does not block the form — users simply pick manually

### Prompt design

The prompt (in `services.py`) explicitly:
- Lists all valid categories and priorities
- Provides classification rules for each value (e.g., "billing: payment issues, invoices...")
- Requests JSON-only output with no markdown or explanation
- This avoids ambiguous output and simplifies parsing

## API Key Configuration

The Gemini API key is configured via environment variable (never hardcoded):

### Option 1: Environment variable (recommended)
```bash
export GEMINI_API_KEY=your-key-here
docker-compose up --build
```

### Option 2: `.env` file
Create a `.env` file in the project root:
```
GEMINI_API_KEY=your-key-here
```

### Option 3: Direct in `docker-compose.yml`
```yaml
environment:
  GEMINI_API_KEY: your-key-here
```

> **If no key is provided**, the system still works — classification falls back to `category: general`, `priority: low`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tickets/` | Create a new ticket (returns `201`) |
| `GET` | `/api/tickets/` | List tickets (filterable, searchable, paginated — newest first) |
| `PATCH` | `/api/tickets/<id>/` | Update ticket status/category/priority |
| `GET` | `/api/tickets/stats/` | Aggregated dashboard statistics |
| `POST` | `/api/tickets/classify/` | AI-powered ticket classification |

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
│   │   ├── settings.py        # Django settings (DB, CORS, DRF, Gemini)
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── tickets/
│       ├── models.py           # Ticket model with TextChoices + DB constraints
│       ├── serializers.py      # DRF serializers with validation
│       ├── views.py            # ViewSet with stats & classify actions
│       ├── filters.py          # django-filter FilterSet
│       ├── services.py         # Gemini LLM classification logic + prompt
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
