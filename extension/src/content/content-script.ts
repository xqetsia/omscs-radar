/**
 * Content script for omscs-radar.
 *
 * Runs on https://omscs.gatech.edu/current-courses. Discovers every course
 * link on the page, fetches the corresponding ratings from the omscs-radar
 * API, and injects a rating badge next to each matched course link.
 */

import { fetchCourses, indexByCourseCode } from "../lib/api";
import { renderBadge } from "./badge";

console.log("[omscs-radar] content script loaded");

interface DiscoveredCourse {
  rawText: string;
  courseCode: string;
  element: HTMLAnchorElement;
}

function normalizeCourseCode(rawText: string): string | null {
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

  const byCode = indexByCourseCode(apiData);

  let injectedCount = 0;
  for (const c of courses) {
    const apiCourse = byCode.get(c.courseCode);
    if (apiCourse === undefined) continue;

    // For now, hardcode OMSCentral as the source. Step 4.6 adds a user
    // preference that lets them choose. The shape of this code stays the
    // same — just replace "omscentral" with a value read from chrome.storage.
    const source = apiCourse.sources["omscentral"];
    if (source === undefined) continue;

    const badge = renderBadge(source);
    if (badge === null) continue;

    c.element.insertAdjacentElement("afterend", badge);
    injectedCount++;
  }

  console.log(`[omscs-radar] injected ${injectedCount} badges`);
}

main();