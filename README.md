# omscs-radar

A Chrome extension that overlays community ratings, difficulty, and workload directly on the [Georgia Tech OMSCS course catalog](https://omscs.gatech.edu/current-courses) — pulling data from [OMSHub](https://www.omshub.org) and [OMSCentral](https://www.omscentral.com).

> **Status:** Work in progress. Built by an incoming OMSCS student to learn the program's courses better — and to give back something useful to the community.

## Why this exists

The official OMSCS catalog page lists ~60 courses but tells you nothing about what they're actually like. The community has built excellent review sites — but to use them you have to leave the catalog, search each course, and context-switch constantly. omscs-radar surfaces aggregate ratings right next to each course on the official catalog, so you can scan the list and decide what to dig into.

## Architecture

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
```

- **Scrapers** run weekly via GitHub Actions, collecting aggregate ratings.
- **Normalizer** merges both sources on course code (`CS-XXXX`) and writes a new snapshot to Postgres — historical data is preserved so we can later show trends.
- **FastAPI backend** serves the latest snapshot via `/api/courses`, deployed on Railway.
- **Chrome extension** (Manifest V3, TypeScript) injects rating badges next to each course on the official catalog. The user can pick a preferred source in settings.

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

- [x] **Phase 1.1** — Project scaffold, modern Python tooling
- [x] **Phase 1.2** — OMSCentral scraper (extracts data from Next.js RSC payload)
- [x] **Phase 1.3** — Pydantic models with type-safe normalization
- [x] **Phase 1.4** — Real CLI (`scrape-omscentral`) with structured logging
- [ ] **Phase 1.5** — OMSHub scraper *(blocked by Vercel bot detection — see below)*
- [ ] **Phase 1.6** — Merger combining both sources on course code
- [ ] **Phase 2** — Postgres schema, SQLAlchemy models, Alembic migrations
- [ ] **Phase 3** — FastAPI backend, deploy to Railway
- [ ] **Phase 4** — Chrome extension (Manifest V3, TypeScript)
- [ ] **Phase 5** — GitHub Actions weekly cron, Chrome Web Store submission

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

MIT © _Your Name_

---

If you maintain OMSHub or OMSCentral and would prefer a different arrangement, please open an issue.
