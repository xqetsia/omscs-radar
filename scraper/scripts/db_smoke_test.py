"""Smoke test: prove that SQLAlchemy + Postgres works end-to-end.

Creates the schema (bypassing Alembic for now), inserts one row, reads it
back. NOT part of the production pipeline — this is a one-off validation
script. Run with:  python3 scripts/db_smoke_test.py
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow imports from src/scraper without installing
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from sqlalchemy import select  # noqa: E402

from scraper.db import SessionLocal, engine  # noqa: E402
from scraper.db_models import Base, CourseSnapshot  # noqa: E402


def main() -> None:
    print("Creating tables (if not exist)...")
    Base.metadata.create_all(bind=engine)

    print("Inserting one snapshot...")
    with SessionLocal() as session:
        snapshot = CourseSnapshot(
            source="omscentral",
            course_code="CS-7641",
            name="Machine Learning",
            rating=3.11,
            difficulty=4.13,
            workload_hours_per_week=22.39,
            review_count=511,
            description="Smoke test row — delete me",
            credit_hours=3,
            is_foundational=True,
            is_deprecated=False,
            official_url="https://omscs.gatech.edu/cs-7641-machine-learning",
            fetched_at=datetime.now(timezone.utc),
        )
        session.add(snapshot)
        session.commit()
        print(f"  Inserted: {snapshot}")

    print("\nReading back all snapshots...")
    with SessionLocal() as session:
        stmt = select(CourseSnapshot)
        rows = session.scalars(stmt).all()
        print(f"  Found {len(rows)} row(s):")
        for r in rows:
            print(f"    {r}")


if __name__ == "__main__":
    main()