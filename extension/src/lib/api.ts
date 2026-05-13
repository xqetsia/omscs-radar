/**
 * HTTP client for the omscs-radar backend API.
 *
 * The response shapes here mirror the Pydantic models in
 * backend/src/backend/schemas.py. When the backend changes its response
 * format, these types should change in lockstep.
 */

const API_BASE_URL = "https://backend-production-3c97.up.railway.app";

/**
 * One source's data for one course (e.g. OMSCentral's view of CS-7641).
 * Mirrors backend.schemas.CourseSourceData.
 */
export interface CourseSourceData {
  name: string;
  rating: number | null;
  difficulty: number | null;
  workload_hours_per_week: number | null;
  review_count: number | null;
  is_foundational: boolean | null;
  is_deprecated: boolean | null;
  fetched_at: string; // ISO 8601 timestamp
}

/**
 * One course's data across all sources, keyed by source name.
 * Mirrors backend.schemas.CourseResponse.
 */
export interface CourseResponse {
  course_code: string;
  sources: Record<string, CourseSourceData>;
}

/**
 * Fetch the latest snapshot per (source, course_code) from the omscs-radar API.
 * Returns a list of CourseResponse objects, sorted by course_code (server-side).
 */
export async function fetchCourses(): Promise<CourseResponse[]> {
  const url = `${API_BASE_URL}/api/courses`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`omscs-radar API returned ${response.status} ${response.statusText}`);
  }

  // We trust the API contract — if it ever drifts, the surrounding code will
  // catch the mismatch via type errors at compile time when types are updated.
  return response.json() as Promise<CourseResponse[]>;
}

/**
 * Convenience: turn the API response into a Map keyed by course_code for O(1) lookup.
 * The content script needs to look up "did the API have data for CS-7641?" 74 times
 * (once per course on the page), so an array scan would be O(n²). A Map is O(n).
 */
export function indexByCourseCode(courses: CourseResponse[]): Map<string, CourseResponse> {
  return new Map(courses.map((c) => [c.course_code, c]));
}