"""Database connection and session management.

Centralizes how we connect to Postgres. Other modules import `engine` and
`SessionLocal` from here rather than constructing their own — this keeps
all DB setup in one place and ensures everyone uses the same connection
pool.

Connection URL comes from the DATABASE_URL env var. For local dev, set it
in your shell or in scraper/.env (which is gitignored). For production
deployment, the host environment provides it (e.g. Railway injects it
automatically when this service references a Postgres service).
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Default points at the docker-compose Postgres on localhost. Override
# DATABASE_URL to connect somewhere else (a staging DB, prod, etc).
DEFAULT_DATABASE_URL = "postgresql+psycopg://omscs:omscs_dev@localhost:5432/omscs_radar"

def _normalize_url(raw_url: str) -> str:
    """Ensure the SQLAlchemy URL uses the psycopg driver explicitly.

    Hosting platforms (Railway, Heroku, Render) typically inject DATABASE_URL
    in the bare `postgresql://...` form. SQLAlchemy then defaults to psycopg2
    if it's installed, otherwise errors out. We want psycopg (v3), so we
    rewrite the scheme.
    """
    if raw_url.startswith("postgresql+"):
        return raw_url  # already specifies a driver, leave it alone
    if raw_url.startswith("postgresql://"):
        return "postgresql+psycopg://" + raw_url[len("postgresql://") :]
    if raw_url.startswith("postgres://"):
        # Legacy Heroku-style short form. NB: must come *after* the postgresql
        # check above because "postgresql://".startswith("postgres://") is True.
        return "postgresql+psycopg://" + raw_url[len("postgres://") :]
    return raw_url

DATABASE_URL = _normalize_url(os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))

# echo=False because we don't want every SQL statement logged in production.
# Flip to True (or set SQLALCHEMY_ECHO=1 below) when debugging.
#
# connect_timeout: fail fast (10s) instead of hanging if the server/proxy
# never responds, rather than relying on the OS's much longer TCP timeout.
# pool_pre_ping: check a pooled connection is still alive (cheap SELECT 1)
# before handing it out, so a connection dropped by the server/proxy while
# idle doesn't surface as an OperationalError mid-query.
engine = create_engine(
    DATABASE_URL,
    echo=os.getenv("SQLALCHEMY_ECHO") == "1",
    future=True,
    connect_args={"connect_timeout": 10},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)