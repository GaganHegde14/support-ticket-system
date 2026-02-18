# Support Ticket System

A production-ready support ticket management system with AI-powered classification, built with Django REST Framework, React, PostgreSQL, and Docker.

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

> **No manual steps required.** Migrations run automatically on startup.

## Adding the Gemini API Key

The AI classification feature requires a Google Gemini API key. Three ways to provide it:

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
Edit the `backend` service environment section:
```yaml
environment:
  GEMINI_API_KEY: your-key-here
```

> **If no key is provided**, the system still works — classification falls back to `category: general`, `priority: low`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tickets/` | Create a new ticket |
| `GET` | `/api/tickets/` | List tickets (filterable, searchable, paginated) |
| `PATCH` | `/api/tickets/<id>/` | Update ticket status/category/priority |
| `GET` | `/api/tickets/stats/` | Aggregated dashboard statistics |
| `POST` | `/api/tickets/classify/` | AI-powered ticket classification |

### Filtering & Search

```
GET /api/tickets/?category=billing&priority=high&status=open&search=payment
```

All filters are combinable. Search queries both `title` and `description` fields.

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

## Design Decisions

### Why Django + DRF?
- Mature ORM with native PostgreSQL support
- Built-in model validation and DB-level constraints (`CheckConstraint`)
- DRF provides serializers, viewsets, filtering, and pagination out of the box
- `django-filter` and `SearchFilter` integrate seamlessly for combinable filtering

### Why PostgreSQL?
- `CheckConstraint` enforcement at DB level ensures data integrity regardless of entry point
- Robust aggregation support (`TruncDate`, conditional `Count`, `Avg`) — all stats computed with zero Python loops
- Reliable, production-proven

### Why Gemini 1.5 Flash?
- Cost-effective for classification tasks (generous free tier)
- Fast response times (~200-500ms)
- Structured JSON output support
- Sufficient accuracy for category/priority classification
- Graceful fallback: LLM failure never blocks ticket creation

### Why Nginx for Frontend?
- Production-grade static file serving (gzip, caching headers)
- Reverse proxy to Django eliminates CORS issues entirely in production
- Single port (3000) serves both frontend and API

### Database Indexing Strategy
- Individual indexes on `category`, `priority`, `status`, `created_at` for filtered queries
- Composite index on `(category, priority)` for combined filter queries
- Composite index on `(status, created_at)` for dashboard queries
- `title` indexed for search performance

### Error Handling Philosophy
- LLM failures return safe fallback values, never block user actions
- Django model constraints prevent invalid data at every level (serializer → model → DB)
- Frontend validates inputs before submission with clear error messages
- All API endpoints return meaningful HTTP status codes

## Project Structure

```
support-ticket-system/
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh          # Runs migrations, starts Gunicorn
│   ├── requirements.txt
│   ├── manage.py
│   ├── config/
│   │   ├── settings.py        # Django settings (DB, CORS, DRF, Gemini)
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── tickets/
│       ├── models.py           # Ticket model with DB constraints
│       ├── serializers.py      # DRF serializers with validation
│       ├── views.py            # ViewSet with stats & classify actions
│       ├── filters.py          # django-filter FilterSet
│       ├── services.py         # OpenAI classification logic
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
│       ├── index.css           # Complete CSS (no framework needed)
│       ├── App.js
│       ├── api.js              # Axios API client
│       └── components/
│           ├── TicketForm.js    # Create ticket + AI auto-classify
│           ├── TicketList.js    # Filterable list + status update modal
│           └── StatsDashboard.js # Real-time aggregated stats
├── docker-compose.yml
└── README.md
```

## Development

To stop services:
```bash
docker-compose down
```

To stop and remove volumes (database data):
```bash
docker-compose down -v
```

To rebuild after code changes:
```bash
docker-compose up --build
```
