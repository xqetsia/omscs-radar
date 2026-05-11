"""SQLAlchemy ORM models — describe the database schema in Python.

These mirror but are NOT the same as the Pydantic models in `models.py`:
- Pydantic models = data shape for application logic, JSON in/out
- SQLAlchemy models = data shape for persistence in Postgres

We deliberately keep them separate. Pydantic doesn't know about indexes,
foreign keys, or default values at the DB level; SQLAlchemy doesn't know
about JSON serialization. Each tool does what it's good at.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, Integer, Numeric, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all ORM models. Alembic discovers tables via this."""


class CourseSnapshot(Base):
    """One source's data for one course at one moment in time.

    Each scrape inserts a new row per course rather than updating an
    existing one, so we preserve the full history of how a course's
    aggregate ratings have evolved over time.
    """

    __tablename__ = "course_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Where the data came from and which course it describes.
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    course_code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(256), nullable=False)

    # Aggregate stats. All nullable because brand-new courses have no reviews.
    rating: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    difficulty: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    workload_hours_per_week: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    review_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Bonus metadata; not all sources provide all of these.
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    credit_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_foundational: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    is_deprecated: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    official_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # When this row was scraped. Default applied at the DB level (NOW()) so
    # that even raw INSERTs without an explicit value get a sane timestamp.
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # The hot query: "give me the latest snapshot per (source, course_code)".
    # Indexing these together makes that lookup fast even with millions of rows.
    __table_args__ = (
        Index("ix_snapshots_source_code_fetched", "source", "course_code", "fetched_at"),
    )

    def __repr__(self) -> str:
        return (
            f"CourseSnapshot(id={self.id}, source={self.source!r}, "
            f"code={self.course_code!r}, fetched_at={self.fetched_at})"
        )