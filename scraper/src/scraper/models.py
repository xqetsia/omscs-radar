"""Canonical data models for scraped course data.

Right now there's just one source (OMSCentral), but the model is named
generically (`SourceCourseRating`) because OMSHub will produce the same
shape later. The merger downstream will combine multiple
`SourceCourseRating`s for the same course code into a final record.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class Source(StrEnum):
    """Which review site a record came from."""

    OMSCENTRAL = "omscentral"
    OMSHUB = "omshub"


class SourceCourseRating(BaseModel):
    """One source's data for one course at one point in time.

    All numeric stats are optional because brand-new courses have no reviews
    and therefore no aggregates. The presence of `course_code` and `name`
    is required — anything without those isn't a course we can use.
    """

    # Reject unknown fields so we notice if the upstream schema changes.
    model_config = ConfigDict(extra="forbid")

    source: Source
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    course_code: str  # canonical form: "CS-7641"
    name: str

    rating: float | None = None
    difficulty: float | None = None
    workload_hours_per_week: float | None = None
    review_count: int | None = None

    # Bonus fields from OMSCentral; OMSHub may not provide all of these.
    description: str | None = None
    credit_hours: int | None = None
    is_foundational: bool | None = None
    is_deprecated: bool | None = None
    official_url: str | None = None