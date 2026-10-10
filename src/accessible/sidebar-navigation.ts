import type { SidebarTarget, SidebarDestination } from '#interaction/sidebar.navigation.ts';

import { sidebarDestination } from '#interaction/sidebar.navigation.ts';

// DOM is read only at this adapter boundary; the route itself is framework-free.
export function navigateSidebar(target: HTMLElement, key: string, cardCount: number): SidebarDestination {
  const statuses = Array.from(document.querySelectorAll<HTMLButtonElement>('#sections-panel header button'));
  const issues = Array.from(document.querySelectorAll<HTMLButtonElement>('#sections-panel footer button'));
  const statusIndex = statuses.indexOf(target as HTMLButtonElement);
  const issueIndex = issues.indexOf(target as HTMLButtonElement);
  let source: SidebarTarget = { kind: 'other' };
  if (target.id === 'section-search') source = { kind: 'search' };
  else if (statusIndex >= 0) source = { kind: 'status', index: statusIndex };
  else if (issueIndex >= 0) source = { kind: 'issue', index: issueIndex };

  const destination = sidebarDestination({
    target: source,
    key,
    cardCount,
    statusCount: statuses.length,
    issueCount: issues.length,
    selectedStatus: Math.max(0, statuses.findIndex((button) => button.getAttribute('aria-pressed') === 'true')),
  });
  if (destination.kind === 'search') document.getElementById('section-search')?.focus();

  if (destination.kind === 'status') statuses[destination.index]?.focus();

  if (destination.kind === 'issue') issues[destination.index]?.focus();

  return destination;
}
