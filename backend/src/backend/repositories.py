"""Database queries for the omscs-radar API.

Separated from the endpoint logic (`app.py`) so:
- Endpoints stay focused on HTTP concerns (validation, status codes, shaping).
- Queries can be tested in isolation against a database without spinning
  up the FastAPI app.
- The query shapes here describe how we use Postgres efficiently
  (DISTINCT ON, index hits, etc.).
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from scraper.db_models import CourseSnapshot


def get_latest_snapshots(session: Session) -> list[CourseSnapshot]:
    """Return the latest CourseSnapshot for each (source, course_code) pair.

    Uses Postgres-specific DISTINCT ON, which is the cleanest way to express
    "the latest row per group". The composite index
    `ix_snapshots_source_code_fetched` on (source, course_code, fetched_at)
    makes this an index-only operation even with millions of rows.
    """
    stmt = (
        select(CourseSnapshot)
        .distinct(CourseSnapshot.source, CourseSnapshot.course_code)
        .order_by(
            CourseSnapshot.source,
            CourseSnapshot.course_code,
            CourseSnapshot.fetched_at.desc(),
        )
    )
    return list(session.scalars(stmt))