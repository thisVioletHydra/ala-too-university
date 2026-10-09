import type { CursorState } from '#interaction/cursor-state.ts';
import type { ScheduleCatalog } from '#schedule/types.ts';
import type { ReactNode } from 'react';
import type { DropAnimation } from '@dnd-kit/core';

import { resolveCursorState, ownsAnimation } from '#interaction/cursor-state.ts';
import { acceptsPointer } from '#interaction/input-policy.ts';
import { isInteractionKey } from '#interaction/keyboard.ts';
import { cannotFly, heldDrag, insetBox, isOverSidebar, landingBox, placeAim, placeAt, sourceNode } from '#ui/drag-ghost/ghost-geometry.ts';
import { DragOverlay } from '@dnd-kit/core';
import { heldCard } from '#ui/drag-ghost/held-card.tsx';
import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';

import styles from '#ui/drag-ghost/drag-ghost.module.css';

const dropAnimation: DropAnimation = ({ active, dragOverlay }) => {
  if (isOverSidebar(dragOverlay.rect, active.data.current?.kind)) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const data = active.data.current;
  const placed = data?.kind === 'lesson' && !data.copy && typeof data.lessonId === 'string'
    ? document.querySelector<HTMLElement>(`[data-lesson-id="${CSS.escape(data.lessonId)}"]`)
    : null;
  const opacity = placed?.style.opacity ?? '';
  const transition = placed?.style.transition ?? '';
  if (placed) {
    placed.style.transition = 'none';
    placed.style.opacity = '0';
  }

  const target = placed?.getBoundingClientRect();
  const transform = getComputedStyle(dragOverlay.node).transform;
  const position = transform === 'none' ? '' : transform;
  const frames = target
    ? [{ transform: position || 'none', opacity: 1 }, { transform: `translate3d(${target.left - dragOverlay.rect.left}px, ${target.top - dragOverlay.rect.top}px, 0) ${position}`, opacity: 1 }]
    : [{ opacity: 1 }, { opacity: 0 }];
  const animation = dragOverlay.node.animate(frames, { duration: 160, easing: 'ease-out', fill: 'forwards' });

  return new Promise<void>((resolve) => {
    function finish(): void {
      dragOverlay.node.style.visibility = 'hidden';
      if (placed) {
        placed.style.opacity = opacity;
        placed.getBoundingClientRect();
        placed.style.transition = transition;
      }

      resolve();
    }

    animation.onfinish = finish;
    animation.oncancel = finish;
  });
};
const lift = '150ms cubic-bezier(0.2, 0, 0, 1)';

export function DragGhost(props: { catalog: ScheduleCatalog }) {
  const board = useBoard();
  const ghost = board.ghost;
  const [width, setWidth] = useState<number | undefined>();
  const lessons = useSchedule((state) => state.lessons);
  const remembered = useSchedule((state) => state.rememberedTeachers);
  const card = ghost ? heldCard(props.catalog, lessons, remembered, ghost) : null;

  useLayoutEffect(() => {
    const cell = document.querySelector('[data-slot]');
    setWidth(ghost?.kind === 'section' && cell instanceof HTMLElement ? insetBox(cell).width : undefined);
  }, [ghost]);

  useEffect(() => {
    if (ghost === null || ghost === undefined) return;

    document.body.dataset.drag = 'yes';

    return () => {
      delete document.body.dataset.drag;
    };
  }, [ghost]);

  return (
    <DragOverlay dropAnimation={dropAnimation} zIndex={30}>
      {card ? <div className={styles.preview} style={{ width }}>{card}</div> : null}
    </DragOverlay>
  );
}

export function HandCursor(props: { catalog: ScheduleCatalog }) {
  const board = useBoard();
  const lessons = useSchedule((state) => state.lessons);
  const remembered = useSchedule((state) => state.rememberedTeachers);
  const node = useRef<HTMLDivElement>(null);
  const cursor = useRef<CursorState>({ phase: 'idle' });
  const input = useRef<'pointer' | 'keyboard'>('pointer');
  const pointer = useRef<{ x: number, y: number } | null>(null);
  const snapshot = useRef<ReactNode>(null);
  const generation = useRef(0);
  const hand = board.hold.hand;
  const card = hand ? heldCard(props.catalog, lessons, remembered, heldDrag(hand)) : null;
  const complete = useEffectEvent(() => board.clearLanding());

  useLayoutEffect(() => {
    const el = node.current;
    const token = ++generation.current;
    const alreadyHolding = cursor.current.phase === 'holding';
    const next = resolveCursorState({ editing: board.editor !== null, carrying: hand !== null, input: input.current, landing: board.landing, token });
    cursor.current = next;
    if (next.phase === 'paused') {
      return;
    }

    if (hand) {

      snapshot.current = card;
      if (board.landing) complete();

      if (el === null || el === undefined) return;

      const source = sourceNode(hand)?.getBoundingClientRect();
      const cell = document.querySelector('[data-slot]');
      const width = hand.kind === 'section' && cell instanceof HTMLElement ? insetBox(cell).width : source?.width;
      if (width) el.style.inlineSize = `${width}px`;

      el.style.visibility = 'visible';
      el.style.opacity = '1';
      el.style.scale = '1';
      el.style.transition = alreadyHolding && input.current === 'keyboard' ? `transform ${lift}` : 'none';
      if (input.current === 'keyboard') placeAim(el);
      else if (pointer.current) placeAt(el, pointer.current.x, pointer.current.y);
      else if (source) el.style.transform = `translate(${source.left}px, ${source.top}px)`;

      return;
    }

    const landing = board.landing;
    if (landing === null || landing === undefined) {
      snapshot.current = null;

      return;
    }

    const returning = landing.kind === 'tray';
    const target = returning ? null : landingBox(landing);
    if (el === null || cannotFly(returning, target)) {
      complete();

      return;
    }

    // Один владелец анимации: движение указателя и старые callbacks не могут
    // изменить превью, пока машина находится в placing / returning.
    const start = getComputedStyle(el).transform;
    el.style.transition = 'none';
    const frames = returning
      ? [{ opacity: 1, transform: start }, { opacity: 0, transform: start }]
      : [{ opacity: 1, transform: start }, { opacity: 1, transform: `translate(${target!.left}px, ${target!.top}px)` }];
    const animation = el.animate(frames, {
      duration: returning ? 140 : 250,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
      fill: 'forwards',
    });
    animation.onfinish = () => {
      const state = cursor.current;
      if (ownsAnimation(state, token) === null || ownsAnimation(state, token) === undefined) return;

      flushSync(() => complete());
    };

    return () => {
      animation.onfinish = null;
      animation.cancel();
    };
  }, [hand, board.landing, board.editor, board.hold.aim]);

  useEffect(() => {
    function point(event: PointerEvent): void {
      const pointerAllowed = acceptsPointer(input.current, {
        primary: event.isPrimary,
        eventType: event.type,
        x: event.clientX,
        y: event.clientY,
        movementX: event.movementX,
        movementY: event.movementY,
      });
      if (pointerAllowed === false) return;

      pointer.current = { x: event.clientX, y: event.clientY };
      input.current = 'pointer';
      document.body.dataset.cardInput = 'pointer';
      if (cursor.current.phase !== 'holding') return;

      cursor.current = { phase: 'holding', input: 'pointer' };
      const el = node.current;
      if (el === null || el === undefined) return;

      el.style.transition = 'none';
      placeAt(el, event.clientX, event.clientY);
    }

    function key(event: KeyboardEvent): void {
      if (!isInteractionKey(event.key)) return;

      input.current = 'keyboard';
      document.body.dataset.cardInput = 'keyboard';
      if (cursor.current.phase === 'holding') cursor.current = { phase: 'holding', input: 'keyboard' };
    }

    window.addEventListener('pointermove', point);
    window.addEventListener('pointerdown', point);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('pointermove', point);
      window.removeEventListener('pointerdown', point);
      window.removeEventListener('keydown', key, true);
    };
  }, []);

  useEffect(() => {
    if (hand && !board.editor) document.body.dataset.hand = 'yes';
    else delete document.body.dataset.hand;
    return () => { delete document.body.dataset.hand; };
  }, [hand, board.editor]);

  const shown = board.editor ? null : card ?? (board.landing ? snapshot.current : null);
  if (shown === null || shown === undefined) return null;

  return createPortal(<div ref={node} className={styles.float}>{shown}</div>, document.body);
}
