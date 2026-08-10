"""Persistence layer: convert Pydantic SourceCourseRating to SQLAlchemy CourseSnapshot
and write them to Postgres.

Insert-only by design — we never UPDATE rows, we INSERT new snapshots. The
'latest' view is computed at query time by sorting on fetched_at. This
preserves history for free.
"""

from __future__ import annotations

import time
from collections.abc import Iterable

import structlog
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from .db import SessionLocal
from .db_models import CourseSnapshot
from .models import SourceCourseRating

log = structlog.get_logger()

# Retry only transient connection failures (e.g. the DB proxy dropping an
# idle/new connection). Other errors (bad data, constraint violations) are
# not retried — they'll fail the same way every time.
_MAX_ATTEMPTS = 3
_BACKOFF_SECONDS = 2.0


def _to_orm(rating: SourceCourseRating) -> CourseSnapshot:
    """Convert one Pydantic rating into a SQLAlchemy ORM object."""
    return CourseSnapshot(
        source=rating.source.value,
        course_code=rating.course_code,
        name=rating.name,
        rating=rating.rating,
        difficulty=rating.difficulty,
        workload_hours_per_week=rating.workload_hours_per_week,
        review_count=rating.review_count,
        description=rating.description,
        credit_hours=rating.credit_hours,
        is_foundational=rating.is_foundational,
        is_deprecated=rating.is_deprecated,
        official_url=rating.official_url,
        fetched_at=rating.fetched_at,
    )


def write_snapshots(ratings: Iterable[SourceCourseRating]) -> int:
    """Persist a batch of ratings as CourseSnapshot rows in a single transaction.

    Returns the count of rows inserted. Raises on any DB error. Transient
    connection failures (OperationalError — e.g. the DB proxy closing the
    connection unexpectedly) are retried a few times with backoff; other
    errors are raised immediately since retrying won't help.
    """
    snapshots = [_to_orm(r) for r in ratings]
    if not snapshots:
        log.warning("persistence.empty_batch")
        return 0

    log.info("persistence.write.start", count=len(snapshots))

    for attempt in range(1, _MAX_ATTEMPTS + 1):
        session: Session = SessionLocal()
        try:
            session.add_all(snapshots)
            session.commit()
        except OperationalError:
            session.rollback()
            if attempt == _MAX_ATTEMPTS:
                log.exception("persistence.write.failed", attempt=attempt)
                raise
            wait = _BACKOFF_SECONDS * attempt
            log.warning(
                "persistence.write.retry",
                attempt=attempt,
                max_attempts=_MAX_ATTEMPTS,
                wait_seconds=wait,
            )
            time.sleep(wait)
            continue
        except Exception:
            session.rollback()
            log.exception("persistence.write.failed")
            raise
        finally:
            session.close()

        log.info("persistence.write.complete", count=len(snapshots))
        return len(snapshots)

    # Unreachable: loop either returns or raises on final attempt.
    raise AssertionError("unreachable")