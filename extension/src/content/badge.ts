/**
 * Rating badge component.
 *
 * Builds a small DOM element shown next to a course on the OMSCS catalog,
 * displaying rating / difficulty / workload from one source.
 *
 * Visual design is deliberately minimal — the GT catalog is text-heavy, and
 * the badge should add info without disrupting the scan-down flow of the
 * course list.
 */

import type { CourseSourceData } from "../lib/api";

/**
 * Build a rating badge for one source's data.
 *
 * Returns null if the source has no useful numbers to show (course exists
 * but has zero reviews). The caller should skip insertion in that case.
 */
export function renderBadge(source: CourseSourceData): HTMLSpanElement | null {
  // If everything is null, the course has no ratings yet — skip the badge.
  if (
    source.rating === null
    && source.difficulty === null
    && source.workload_hours_per_week === null
  ) {
    return null;
  }

  const container = document.createElement("span");
  container.className = "omscs-radar-badge";

  appendStat(container, "★", source.rating, { decimals: 1 });
  appendStat(container, "D", source.difficulty, { decimals: 1 });
  appendStat(container, "W", source.workload_hours_per_week, {
    decimals: 1,
    suffix: "h",
  });

  return container;
}

/**
 * Append one labeled stat to the badge container. Skips silently if the
 * value is null (so partial data still produces a reasonable badge).
 */
function appendStat(
  container: HTMLSpanElement,
  label: string,
  value: number | null,
  options: { decimals: number; suffix?: string },
): void {
  if (value === null) return;

  const stat = document.createElement("span");
  stat.className = "omscs-radar-stat";

  const labelEl = document.createElement("span");
  labelEl.className = "omscs-radar-stat-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("span");
  valueEl.className = "omscs-radar-stat-value";
  valueEl.textContent = value.toFixed(options.decimals) + (options.suffix ?? "");

  stat.append(labelEl, valueEl);
  container.append(stat);
}