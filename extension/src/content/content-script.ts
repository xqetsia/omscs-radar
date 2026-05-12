/**
 * Content script for omscs-radar.
 *
 * Runs on https://omscs.gatech.edu/current-courses when the user visits the
 * catalog. Currently a hello-world: finds every course link on the page,
 * extracts the course code, and logs the list to the page's console.
 *
 * Next step (4.3): replace logging with a fetch to the omscs-radar API.
 */

console.log("[omscs-radar] content script loaded");

/** A course discovered on the OMSCS catalog page. */
interface DiscoveredCourse {
  /** The raw text from the link, e.g. "CS 6035: Introduction to Information Security". */
  rawText: string;
  /** The normalized course code in the API's format, e.g. "CS-6035". */
  courseCode: string;
  /** The DOM element so we can later inject a badge next to it. */
  element: HTMLAnchorElement;
}

/**
 * Convert a course code as displayed on the GT page ("CS 6035") to the
 * canonical form used everywhere else in omscs-radar ("CS-6035").
 * Returns null if the input doesn't look like a course code.
 */
function normalizeCourseCode(rawText: string): string | null {
  // Match patterns like "CS 6035", "CSE 6242", "PUBP 8823", possibly followed
  // by ":" or "—" or the course name. We anchor at the start of the string.
  const match = rawText.match(/^([A-Z]{2,4})\s+(\d{4})/);
  if (!match) return null;
  const [, subject, number] = match;
  return `${subject}-${number}`;
}

/**
 * Scan the page DOM for every course link and return what we found.
 */
function discoverCourses(): DiscoveredCourse[] {
  // Courses live in <li><a href="/cs-XXXX-...">CS XXXX: ...</a></li> structure.
  // We anchor on the anchor element rather than the <li> so we have the link
  // to inject the badge next to later.
  const anchors = document.querySelectorAll<HTMLAnchorElement>("li > a[href^='/']");

  const discovered: DiscoveredCourse[] = [];
  for (const anchor of anchors) {
    const rawText = anchor.textContent?.trim() ?? "";
    const courseCode = normalizeCourseCode(rawText);
    if (courseCode === null) continue; // not a course link (e.g. nav link)
    discovered.push({ rawText, courseCode, element: anchor });
  }
  return discovered;
}

const courses = discoverCourses();
console.log(`[omscs-radar] discovered ${courses.length} courses:`);
console.table(courses.map((c) => ({ code: c.courseCode, name: c.rawText })));
