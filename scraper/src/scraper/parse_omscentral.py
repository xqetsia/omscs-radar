"""Extract OMSCentral course data from the Next.js RSC payload.

OMSCentral renders the course list with React on the client. The data is
streamed into the page via Next.js's `self.__next_f.push([1, "..."])` calls
(React Server Components). We pull the JSON out of one of those calls
directly — more robust than scraping the rendered DOM, and we get fields
the rendered table doesn't even show (description, isFoundational, etc).

See README data-sources notes for context.
"""

from __future__ import annotations

import json
from typing import Any

from bs4 import BeautifulSoup
from .models import Source, SourceCourseRating

class ParseError(Exception):
    """Raised when expected data cannot be extracted from the HTML.

    We use a custom exception (rather than returning None or raising
    a generic ValueError) so callers can distinguish "OMSCentral changed
    its markup" from other failures like network errors. When scraping
    many courses, this lets us skip a single broken page without
    masking real bugs.
    """


# Marker we use to identify which <script> tag carries the courses payload.
# Any well-known course code would do; CS-7641 (Machine Learning) is one of
# the most popular OMSCS courses, so it's almost certainly always present.
_COURSE_MARKER = "CS-7641"

# Sentinel that opens the JSON object holding the courses array inside the
# Next.js RSC chunk string. Anchored on the property name so we don't pick
# up some other "courses" elsewhere in the payload.
_PAYLOAD_OPEN = '{\\"courses\\":'


def _find_courses_script(html: str) -> str:
    """Return the text content of the <script> that holds the courses payload."""
    soup = BeautifulSoup(html, "lxml")
    for script in soup.find_all("script"):
        text = script.string or ""
        if _COURSE_MARKER in text and _PAYLOAD_OPEN in text:
            return text
    raise ParseError("No <script> contained the courses payload")


def _extract_push_arg(script_text: str) -> str:
    """Pull the inner string out of `self.__next_f.push([1, "..."])`.

    The whole `[1, "..."]` is itself a valid JSON array, so we slice it out
    and let `json.loads` handle all the escaping correctly.
    """
    start = script_text.find("self.__next_f.push(")
    if start == -1:
        raise ParseError("Could not find self.__next_f.push(...) call")

    # Position of the opening '['
    bracket_start = script_text.find("[", start)
    bracket_end = script_text.rfind("]", bracket_start)
    if bracket_start == -1 or bracket_end == -1:
        raise ParseError("Malformed self.__next_f.push(...) call")

    raw = script_text[bracket_start : bracket_end + 1]
    try:
        push_args = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ParseError(f"push args were not valid JSON: {e}") from e

    if not isinstance(push_args, list) or len(push_args) != 2 or not isinstance(push_args[1], str):
        raise ParseError(f"Unexpected push args shape: {push_args!r:.200}")

    return push_args[1]


def _slice_balanced_braces(text: str, start: int) -> str:
    """Return the substring starting at `start` (which must point at '{') up
    to and including its matching '}', accounting for nested braces and
    strings. Naive but sufficient for the shapes we see in OMSCentral data.
    """
    if text[start] != "{":
        raise ParseError(f"Expected '{{' at offset {start}, got {text[start]!r}")

    depth = 0
    in_string = False
    escape = False

    for i in range(start, len(text)):
        ch = text[i]
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    raise ParseError("Unbalanced braces while scanning for courses payload")


def extract_courses(html: str) -> list[dict[str, Any]]:
    """Top-level entry point. Return a list of raw course dicts from OMSCentral."""
    script_text = _find_courses_script(html)

    # Inside the RSC chunk string, find the {"courses":[...]} object.
    # The chunk looks like:  8:["$","$L12",null,{"courses":[...], ...other props}]
    inner = script_text  # we work directly on the script text; the marker survives unescaping
    obj_start = inner.find('{"courses":')
    if obj_start == -1:
        # If we got here from _find_courses_script we know the escaped form
        # is present, but the unescaped `{"courses":` only exists after we
        # decode the push() argument. Do that now.
        push_arg = _extract_push_arg(script_text)
        obj_start = push_arg.find('{"courses":')
        if obj_start == -1:
            raise ParseError("Could not locate {'courses':...} in payload")
        inner = push_arg

    obj_text = _slice_balanced_braces(inner, obj_start)

    try:
        obj = json.loads(obj_text)
    except json.JSONDecodeError as e:
        raise ParseError(f"Courses payload was not valid JSON: {e}") from e

    courses = obj.get("courses")
    if not isinstance(courses, list):
        raise ParseError(f"'courses' field was not a list (got {type(courses).__name__})")

    return courses


def _clean_undefined(value: object) -> object:
    """RSC encodes JS `undefined` as the string '$undefined'. Treat as None."""
    return None if value == "$undefined" else value


def to_source_rating(raw: dict[str, object]) -> "SourceCourseRating":
    """Convert one raw OMSCentral RSC dict into a SourceCourseRating."""
    codes = raw.get("codes") or []
    if not isinstance(codes, list) or not codes:
        raise ParseError(f"Course has no codes: {raw.get('_id')}")
    code = codes[0]

    name = raw.get("name")
    if not isinstance(name, str) or not name:
        raise ParseError(f"Course {code} has no name")

    return SourceCourseRating(
        source=Source.OMSCENTRAL,
        course_code=code,
        name=name,
        rating=_clean_undefined(raw.get("rating")),
        difficulty=_clean_undefined(raw.get("difficulty")),
        workload_hours_per_week=_clean_undefined(raw.get("workload")),
        review_count=_clean_undefined(raw.get("reviewCount")),
        description=raw.get("description"),
        credit_hours=raw.get("creditHours"),
        is_foundational=raw.get("isFoundational"),
        is_deprecated=raw.get("isDeprecated"),
        official_url=raw.get("officialURL"),
    )


# Smoke test — run this file directly.
if __name__ == "__main__":
    import httpx

    URL = "https://www.omscentral.com/"
    USER_AGENT = "omscs-radar/0.1 (+https://github.com/xqetsia/omscs-radar)"

    response = httpx.get(URL, headers={"User-Agent": USER_AGENT}, timeout=15.0)
    response.raise_for_status()

    raw_courses = extract_courses(response.text)
    ratings = [to_source_rating(c) for c in raw_courses]

    print(f"Parsed {len(ratings)} courses\n")

    # Show 10 with reviews and 3 without, to verify both code paths
    with_reviews = [r for r in ratings if r.rating is not None]
    without = [r for r in ratings if r.rating is None]

    print(f"  {len(with_reviews)} courses have ratings, {len(without)} do not\n")

    for r in with_reviews[:10]:
        print(
            f"  {r.course_code:14s} {r.name[:40]:40s}  "
            f"r={r.rating:.2f}  d={r.difficulty:.2f}  w={r.workload_hours_per_week:.2f}  n={r.review_count}"
        )

    print()
    for r in without[:3]:
        print(f"  {r.course_code:14s} {r.name[:40]:40s}  (no reviews)")