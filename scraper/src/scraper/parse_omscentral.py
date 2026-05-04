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


# Smoke test — run this file directly.
if __name__ == "__main__":
    import httpx

    URL = "https://www.omscentral.com/"
    USER_AGENT = "omscs-radar/0.1 (+https://github.com/xqetsia/omscs-radar)"

    response = httpx.get(URL, headers={"User-Agent": USER_AGENT}, timeout=15.0)
    response.raise_for_status()

    courses = extract_courses(response.text)
    print(f"Extracted {len(courses)} courses\n")

    def _fmt(v: object) -> str:
        return f"{v:.2f}" if isinstance(v, (int, float)) else str(v)

    for c in courses[:10]:
        codes = c.get("codes", [])
        code = codes[0] if codes else "???"
        print(
            f"  {code:12s} {c.get('name', ''):40s}  "
            f"r={_fmt(c.get('rating'))}  "
            f"d={_fmt(c.get('difficulty'))}  "
            f"w={_fmt(c.get('workload'))}  "
            f"n={c.get('reviewCount')}"
        )