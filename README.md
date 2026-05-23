# omscs-radar

A Chrome extension that overlays community ratings, difficulty, and workload directly on the [Georgia Tech OMSCS course catalog](https://omscs.gatech.edu/current-courses) — pulling data from [OMSHub](https://www.omshub.org) and [OMSCentral](https://www.omscentral.com).

> **Status:** Work in progress. Built by an incoming OMSCS student to plan their courses better and to give back something useful to the community.

## Why this exists

The official OMSCS catalog page lists ~60 courses but tells you nothing about what they're actually like. The community has built excellent review sites. A painpoint emerges because in order to use the review sites you have to leave the catalog, search each course, and context-switch constantly. omscs-radar surfaces aggregate ratings right next to each course on the official catalog, so you can scan the list and decide what to dig into.

## Live URLs

- **API docs (interactive):** https://backend-production-3c97.up.railway.app/docs
- **Health check:** https://backend-production-3c97.up.railway.app/healthz
- **Course data:** https://backend-production-3c97.up.railway.app/api/courses

## Architecture

<!-- ### Components 
```
  ┌────────────────────┐      ┌────────────────────┐
  │  OMSHub Scraper    │      │ OMSCentral Scraper │
  │  (Python)          │      │ (Python + httpx)   │
  └──────────┬─────────┘      └──────────┬─────────┘
             └─────────────┬──────────────┘
                           ▼
                 ┌───────────────────┐
                 │  Normalizer /     │
                 │  Merger           │
                 │  (join: CS-XXXX)  │
                 └─────────┬─────────┘
                           ▼
                 ┌───────────────────┐
                 │   PostgreSQL      │ ← snapshots preserved per run
                 └─────────┬─────────┘
                           ▼
                 ┌───────────────────┐
                 │   FastAPI backend │
                 │   /api/courses    │
                 └─────────┬─────────┘
                           ▼
                 ┌───────────────────┐
                 │ Chrome Extension  │
                 │ (TypeScript, MV3) │
                 └───────────────────┘

``` -->

### Data Flow
```mermaid
flowchart TD
    A["OMSCentral<br/>community data source"] -->|HTTP fetch| B["Scraper<br/>Python · weekly cron"]
    B -->|INSERT| C["PostgreSQL<br/>snapshot store · Railway"]
    C -->|"SELECT latest snapshot"| D["FastAPI<br/>/api/courses"]
    D -->|HTTPS| E["Chrome Extension<br/>TypeScript · MV3"]
    E -->|DOM injection| F["GT Catalog Page<br/>what the user sees"]
```
## Repository layout

```
omscs-radar/
├── scraper/              Python 3.11+ scrapers (httpx, BeautifulSoup, Pydantic, structlog)
│   ├── src/scraper/
│   ├── scripts/          one-off and exploratory scripts
│   └── pyproject.toml
├── backend/              (planned) FastAPI + SQLAlchemy 2.0 + Alembic
├── extension/            (planned) Chrome MV3 extension (TypeScript)
└── .github/workflows/    (planned) CI + weekly scraping cron
```

## Roadmap

- [x] **Phase 1** — Python scraper (OMSCentral via Next.js RSC payload, typed Pydantic models, CLI with structured logging)
- [x] **Phase 2** — Postgres schema, SQLAlchemy 2.0 models, Alembic migrations, scraper persists snapshots
- [x] **Phase 3** — FastAPI backend serving `/api/courses`, deployed to Railway
- [x] **Phase 4** — Chrome extension (Manifest V3, TypeScript)
- [ ] **Phase 5** — GitHub Actions weekly cron, OMSHub scraper, Chrome Web Store submission

## Data sources

This project depends on two volunteer-run community sites. We aim to be good citizens of that community:

- We honor `robots.txt`
- We identify ourselves via a descriptive `User-Agent` with a contact link to this repo
- We rate-limit aggressively and run scrapes at most once per week
- We attribute both sources prominently in the extension UI
- We plan to reach out to the maintainers of both projects to coordinate on data access — direct access (if offered) is preferred over scraping

### A note on OMSHub

OMSHub is hosted on Vercel and protected by Vercel's bot-detection layer, which serves a JavaScript challenge to non-browser HTTP clients. Simple `httpx` requests get a `429` response. To scrape OMSHub responsibly we will either (a) use a headless browser like Playwright that solves the challenge naturally, or (b) coordinate directly with the OMSHub maintainers. Until then, the project ships with OMSCentral data only.

### A note on OMSCentral

OMSCentral is a Next.js application. Rather than parsing the rendered DOM, the scraper extracts data directly from the React Server Components (RSC) streaming payload embedded in the page. This is more robust than HTML scraping (we get the data the same way the React frontend does) and gives access to fields the visible table doesn't show — descriptions, foundational/deprecated flags, credit hours, and more.

## Running the scraper locally

Requires Python 3.11+.

```bash
cd scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# pretty output
scrape-omscentral

# JSON output (good for CI / log shipping)
LOG_FORMAT=json scrape-omscentral

# alternate output path
scrape-omscentral --output /tmp/courses.json
```

The output is a JSON file with one record per course — see `scraper/src/scraper/models.py` for the schema.

## Development

Lint:

```bash
cd scraper && ruff check .
```

## License

MIT © Qetsia Nkulu

---

If you maintain OMSHub or OMSCentral and would prefer a different arrangement, please open an issue.
