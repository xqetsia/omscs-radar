"""Pydantic response models — describe what the API returns to clients.

Kept distinct from the scraper's input models (scraper.models). The scraper's
models describe what comes in from OMSCentral; these describe what goes out
to the Chrome extension. They overlap heavily, but the API's shape may
evolve independently of the scraper's, so we keep them separate.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CourseSourceData(BaseModel):
    """A single source's view of a course (e.g., OMSCentral's data for CS-7641)."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    rating: float | None
    difficulty: float | None
    workload_hours_per_week: float | None
    review_count: int | None
    is_foundational: bool | None
    is_deprecated: bool | None
    fetched_at: datetime


class CourseResponse(BaseModel):
    """One course's data across all sources we have, keyed by source name."""

    course_code: str
    sources: dict[str, CourseSourceData]