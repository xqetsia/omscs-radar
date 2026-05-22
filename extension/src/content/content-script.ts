/**
 * Content script for omscs-radar.
 *
 * Runs on https://omscs.gatech.edu/current-courses. Discovers every course
 * link on the page, fetches the corresponding ratings from the omscs-radar
 * API, and injects a rating badge next to each matched course link.
 */

import { fetchCourses, indexByCourseCode } from "../lib/api";
import { getPreferredSource } from "../lib/storage";
import { renderBadge } from "./badge";
import { createPanel, attachHoverListeners } from "./course-panel";
import { DiscoveredCourse } from "../lib/types";

console.log("[omscs-radar] content script loaded");


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
  const preferredSource = await getPreferredSource();

  let injectedCount = 0;
  for (const c of courses) {
    const apiCourse = byCode.get(c.courseCode);
    if (apiCourse === undefined) continue;

    const source = apiCourse.sources[preferredSource];
    if (source === undefined) continue;

    const badge = renderBadge(source);
    if (badge === null) continue;

    // Place the badge at the end of the <li> so it appears under the *entire*
    // course line — past any "(formerly CS 8803 ...)" annotation that may
    // follow the course title.
    const wrapper = document.createElement("div");
    wrapper.className = "omscs-radar-badge-wrap";
    wrapper.append(badge);
    const listItem = c.element.closest("li");
    (listItem ?? c.element).append(wrapper);

    injectedCount++;
  }

  console.log(`[omscs-radar] injected ${injectedCount} badges`);

  const panel = createPanel();
  console.log("omscs-radar panel injected:", panel.id);

  attachHoverListeners(panel, courses, byCode, preferredSource);

}

main();