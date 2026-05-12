"""Reusable FastAPI dependencies, primarily database session management.

`get_db` is the canonical way for endpoints to obtain a SQLAlchemy session.
Using FastAPI's Depends() means each request gets its own session, the
session is guaranteed to close even if the endpoint raises, and the same
helper can be mocked in tests.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy.orm import Session

from scraper.db import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """Yield a SQLAlchemy session, closing it after the request finishes."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()