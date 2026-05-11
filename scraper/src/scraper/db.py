"""Database connection and session management.

Centralizes how we connect to Postgres. Other modules import `engine` and
`SessionLocal` from here rather than constructing their own — this keeps
all DB setup in one place and ensures everyone uses the same connection
pool.

Connection URL comes from the DATABASE_URL env var. For local dev, set it
in your shell or in scraper/.env (which is gitignored). For production
deployment (Phase 3), the host environment provides it.
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Default points at the docker-compose Postgres on localhost. Override
# DATABASE_URL to connect somewhere else (a staging DB, prod, etc).
DEFAULT_DATABASE_URL = "postgresql+psycopg://omscs:omscs_dev@localhost:5432/omscs_radar"

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

# echo=False because we don't want every SQL statement logged in production.
# Flip to True (or set SQLALCHEMY_ECHO=1 below) when debugging.
engine = create_engine(
    DATABASE_URL,
    echo=os.getenv("SQLALCHEMY_ECHO") == "1",
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)