import type { HandKeyContext, Zone } from './hand.types.ts';
import type { navigationPermissions } from '#interaction/input.policy.ts';

import { navigateSidebar } from '#accessible/sidebar-navigation.ts';
import { matchesKey } from '#accessible/keyboard.bindings.ts';
import { keyboardGrid } from '#accessible/keyboard-grid.ts';
import { keyboardSlot } from '#accessible/keyboard-slot.ts';

type Permissions = ReturnType<typeof navigationPermissions>;

export function handleSidebarNavigation(context: HandKeyContext, permissions: Permissions): boolean {
  const { event, input, day, slot, keyboardRef, publish } = context;
  const sidebarArrow = matchesKey('navigation', event.key) && permissions.sidebar;
  if (sidebarArrow && event.target instanceof HTMLElement) {
    const destination = navigateSidebar(event.target, event.key, input.sections.length);
    if (destination.kind !== 'unhandled') {
      event.preventDefault();
      if (destination.kind === 'card') {
        keyboardRef.current = true;
        publish({ zone: 'list', list: destination.index, day, slot, hand: null, focus: true });
      }

      return true;
    }
  }

  return false;
}

export function recoverHandFocus(context: HandKeyContext, permissions: Permissions): void {
  const { event, day, slot, keyboardRef, publish } = context;
  if (permissions.recoverFocus === false) return;

  if (document.querySelector('dialog[open], [role="dialog"], [role="listbox"], [popover]:popover-open')) return;

  const target = event.target;
  if (target instanceof Element && target.closest('button, a[href], input, textarea, select, [contenteditable], [tabindex], [role="button"], [role="combobox"], [role="menu"], [role="slider"], [role="spinbutton"], [role="tablist"]')) return;

  const first = document.querySelector<HTMLElement>('[data-section-scroll] [data-section-id]');
  if (!first || first.closest('[inert], [hidden]') || first.getClientRects().length === 0) return;

  event.preventDefault();
  keyboardRef.current = true;
  publish({ zone: 'list', list: 0, day, slot, hand: null, focus: true });

  return;
}

export function navigateHand(context: HandKeyContext, place: Zone): void {
  const { event, input, hand, list, day, slot, keyboardRef, publish } = context;
  event.preventDefault();
  keyboardRef.current = true;
  if (place === 'list') {
    if (matchesKey('next', event.key) && list === input.sections.length - 1 && !hand) {
      const issue = document.querySelector<HTMLButtonElement>('#sections-panel footer button');
      if (issue) {
        issue.focus();

        return;
      }
    }

    if (matchesKey('previous', event.key) && list === 0 && !hand) {
      document.getElementById('section-search')?.focus();

      return;
    }

    publish({
      zone: 'list',
      list: keyboardSlot(list, event.key, input.sections.length),
      day,
      slot,
      hand,
      focus: true,
    });

    return;
  }

  const next = keyboardGrid({ day, slot }, event.key, input.days.length, input.slots.length);
  publish({ zone: 'grid', list, day: next.day, slot: next.slot, hand, focus: true });

  return;
}
