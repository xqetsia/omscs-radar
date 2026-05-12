"""FastAPI application entrypoint for the omscs-radar backend.

Run locally with:
    uvicorn backend.app:app --reload
"""

from __future__ import annotations

from collections import defaultdict

import structlog
from fastapi import Depends, FastAPI, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .dependencies import get_db
from .repositories import get_latest_snapshots
from .schemas import CourseResponse, CourseSourceData

log = structlog.get_logger()

app = FastAPI(
    title="omscs-radar API",
    description="Serves community-sourced course ratings to the omscs-radar Chrome extension.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    # Allow the OMSCS catalog page and any Chrome extension to call this API.
    # The Chrome extension's origin is chrome-extension://<id>, but we don't
    # know the ID ahead of time; allowing all origins is acceptable for a
    # public, read-only API.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    """Friendly landing page so the root URL doesn't 404 in a browser."""
    return {"name": "omscs-radar API", "docs": "/docs"}


@app.get("/healthz")
def healthz(session: Session = Depends(get_db)) -> JSONResponse:
    """Liveness/readiness check that also verifies the database is reachable."""
    try:
        session.execute(text("SELECT 1"))
    except Exception as exc:
        log.exception("healthz.db_unreachable")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "degraded", "database": f"unreachable: {exc.__class__.__name__}"},
        )
    return JSONResponse(content={"status": "ok", "database": "ok"})


@app.get("/api/courses", response_model=list[CourseResponse])
def list_courses(session: Session = Depends(get_db)) -> list[CourseResponse]:
    """Return the latest snapshot per (source, course_code), grouped by course."""
    snapshots = get_latest_snapshots(session)

    # Group by course_code: each course aggregates one entry per source.
    by_code: dict[str, dict[str, CourseSourceData]] = defaultdict(dict)
    for snap in snapshots:
        by_code[snap.course_code][snap.source] = CourseSourceData.model_validate(snap)

    return [
        CourseResponse(course_code=code, sources=sources)
        for code, sources in sorted(by_code.items())
    ]