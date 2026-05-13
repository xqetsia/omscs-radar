/**
 * Content script for omscs-radar.
 *
 * Runs on https://omscs.gatech.edu/current-courses when the user visits the
 * catalog. Discovers every course link, fetches ratings from the omscs-radar
 * API, and (in the next step) injects rating badges next to each course.
 *
 * For now: logs the matched data for each course to the console.
 */

import { fetchCourses, indexByCourseCode } from "../lib/api";

console.log("[omscs-radar] content script loaded");

interface DiscoveredCourse {
  rawText: string;
  courseCode: string;
  element: HTMLAnchorElement;
}

function normalizeCourseCode(rawText: string): string | null {
  // Match patterns like:
  //   "CS 6035: Introduction..."   -> CS-6035
  //   "CS 8803 O11: Quantum..."     -> CS-8803-O11
  //   "CSE 8803 AA1: ..."           -> CSE-8803-AA1
  //
  // The optional (\s+([A-Z0-9]{2,4}))? captures a section suffix that's
  // separated by whitespace from the course number (the format GT uses on
  // their catalog).
  const match = rawText.match(/^([A-Z]{2,4})\s+(\d{4})(?:\s+([A-Z0-9]{2,4}))?/);
  if (!match) return null;
  const [, subject, number, suffix] = match;
  return suffix ? `${subject}-${number}-${suffix}` : `${subject}-${number}`;
}

function discoverCourses(): DiscoveredCourse[] {
  const anchors = document.querySelectorAll<HTMLAnchorElement>("li > a[href^='/']");
  const discovered: DiscoveredCourse[] = [];
  for (const anchor of anchors) {
    const rawText = anchor.textContent?.trim() ?? "";
    const courseCode = normalizeCourseCode(rawText);
    if (courseCode === null) continue;
    discovered.push({ rawText, courseCode, element: anchor });
  }
  return discovered;
}

async function main(): Promise<void> {
  const courses = discoverCourses();
  console.log(`[omscs-radar] discovered ${courses.length} courses on the page`);

  let apiData;
  try {
    apiData = await fetchCourses();
  } catch (error) {
    console.error("[omscs-radar] failed to fetch course data:", error);
    return;
  }
  console.log(`[omscs-radar] fetched ${apiData.length} courses from the API`);

  const byCode = indexByCourseCode(apiData);

  // Log how many of the page's courses we have data for.
  const matched: { code: string; rating: number | null }[] = [];
  const unmatched: string[] = [];

  for (const c of courses) {
    const apiCourse = byCode.get(c.courseCode);
    if (apiCourse === undefined) {
      unmatched.push(c.courseCode);
      continue;
    }
    const omscentral = apiCourse.sources["omscentral"];
    matched.push({ code: c.courseCode, rating: omscentral?.rating ?? null });
  }

  console.log(`[omscs-radar] ${matched.length} matched, ${unmatched.length} unmatched`);
  console.table(matched);
  if (unmatched.length > 0) {
    console.log("[omscs-radar] unmatched course codes:", unmatched);
  }
}

main();