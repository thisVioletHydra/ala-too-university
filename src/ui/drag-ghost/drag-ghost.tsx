import type { Lesson, ScheduleCatalog } from '#schedule/types.ts';
import type { ActiveDrag, Hand, Landing } from '#app/providers.tsx';
import type { ReactNode } from 'react';
import type { DropAnimation } from '@dnd-kit/core';

import { DragOverlay } from '@dnd-kit/core';
import { slotKey, useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { LessonPreview } from '#ui/lesson-card/lesson-card.tsx';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';

import styles from '#ui/drag-ghost/drag-ghost.module.css';

const dropAnimation: DropAnimation = ({ active, dragOverlay }) => {
  const sidebar = document.getElementById('sections-panel')?.getBoundingClientRect();
  const x = dragOverlay.rect.left + dragOverlay.rect.width / 2;
  const y = dragOverlay.rect.top + dragOverlay.rect.height / 2;
  if (active.data.current?.kind === 'section' && sidebar && x >= sidebar.left && x <= sidebar.right && y >= sidebar.top && y <= sidebar.bottom) return;

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

type CursorState =
  | { phase: 'idle' }
  | { phase: 'holding', input: 'pointer' | 'keyboard' }
  | { phase: 'paused' }
  | { phase: 'placing', target: Landing, token: number }
  | { phase: 'returning', token: number };

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
    if (board.editor) {
      cursor.current = { phase: 'paused' };
      return;
    }
    if (hand) {
      const alreadyHolding = cursor.current.phase === 'holding';
      cursor.current = { phase: 'holding', input: input.current };
      snapshot.current = card;
      if (board.landing) complete();
      if (!el) return;
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
    if (!landing) {
      cursor.current = { phase: 'idle' };
      snapshot.current = null;
      return;
    }
    const returning = landing.kind === 'tray';
    cursor.current = returning ? { phase: 'returning', token } : { phase: 'placing', target: landing, token };
    const target = returning ? null : landingBox(landing);
    if (!el || (!returning && !target) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
      if ((state.phase !== 'placing' && state.phase !== 'returning') || state.token !== token) return;
      flushSync(() => complete());
    };
    return () => {
      animation.onfinish = null;
      animation.cancel();
    };
  }, [hand, board.landing, board.editor, board.hold.aim]);

  useEffect(() => {
    function point(event: PointerEvent): void {
      if (!event.isPrimary || (event.clientX === 0 && event.clientY === 0)) return;
      if (event.type === 'pointermove' && input.current === 'keyboard' && Math.hypot(event.movementX, event.movementY) < 6) return;
      pointer.current = { x: event.clientX, y: event.clientY };
      input.current = 'pointer';
      document.body.dataset.cardInput = 'pointer';
      if (cursor.current.phase !== 'holding') return;
      cursor.current = { phase: 'holding', input: 'pointer' };
      const el = node.current;
      if (!el) return;
      el.style.transition = 'none';
      placeAt(el, event.clientX, event.clientY);
    }
    function key(event: KeyboardEvent): void {
      if (![' ', 'Spacebar', 'Tab', 'Enter', 'Shift', 'Delete', 'Backspace', 'Escape'].includes(event.key) && !event.key.startsWith('Arrow')) return;
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
  if (!shown) return null;
  return createPortal(<div ref={node} className={styles.float}>{shown}</div>, document.body);
}

function landingBox(landing: Landing): { left: number, top: number, width: number } | null {
  if (landing.kind === 'card') {
    const node = document.querySelector(`[data-lesson-id="${CSS.escape(landing.lessonId)}"]`);

    return node instanceof HTMLElement ? plainBox(node) : null;
  }

  if (landing.kind === 'slot') {
    const node = document.querySelector(`[data-slot="${CSS.escape(slotKey(landing.day, landing.timeSlotId))}"]`);

    return node instanceof HTMLElement ? insetBox(node) : null;
  }

  const tray = document.querySelector('[data-tray]');

  return tray instanceof HTMLElement ? plainBox(tray) : null;
}

function plainBox(node: HTMLElement): { left: number, top: number, width: number } {
  const rect = node.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width };
}

function insetBox(node: HTMLElement): { left: number, top: number, width: number } {
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  const padStart = Number.parseFloat(style.paddingInlineStart);
  const padEnd = Number.parseFloat(style.paddingInlineEnd);
  const padTop = Number.parseFloat(style.paddingBlockStart);

  return {
    left: rect.left + padStart,
    top: rect.top + padTop,
    width: rect.width - padStart - padEnd,
  };
}

function placeAt(element: HTMLElement, x: number, y: number): void {
  placeWithinViewport(element, x + 16, y - 16);
}

function placeAim(element: HTMLElement): void {
  const aim = document.querySelector('[data-aim="yes"]');
  if (!(aim instanceof HTMLElement)) return;

  const rect = aim.getBoundingClientRect();
  if (aim.matches('[data-section-scroll]')) {
    const top = Math.max(8, rect.top);
    const bottom = Math.min(window.innerHeight - 8, rect.bottom);
    placeWithinViewport(element, rect.left + (rect.width - element.offsetWidth) / 2, top + (bottom - top) / 2 + 24);

    return;
  }

  placeWithinViewport(element, rect.right - element.offsetWidth * 0.4, rect.bottom - 24);
}

function placeWithinViewport(element: HTMLElement, left: number, top: number): void {
  const x = Math.max(8, Math.min(left, window.innerWidth - element.offsetWidth - 8));
  const y = Math.max(8, Math.min(top, window.innerHeight - element.offsetHeight - 8));
  element.style.transform = `translate(${x}px, ${y}px)`;
}

function heldDrag(hand: Hand): ActiveDrag {
  if (hand.kind === 'section') return { ...hand };

  return { kind: 'lesson', lessonId: hand.lessonId, copy: false };
}

function sourceNode(hand: Hand): HTMLElement | null {
  const selector = hand.kind === 'lesson'
    ? `[data-lesson-id="${CSS.escape(hand.lessonId)}"]`
    : `[data-section-id="${CSS.escape(hand.sectionId)}"]`;
  const node = document.querySelector(selector);
  return node instanceof HTMLElement ? node : null;
}

function heldCard(
  catalog: ScheduleCatalog,
  lessons: Lesson[],
  remembered: Record<string, string>,
  drag: ActiveDrag,
) {
  if (drag.kind === 'section') {
    const section = catalog.sections.find((item) => item.id === drag.sectionId);
    if (section === null || section === undefined) return null;

    const course = catalog.courses.find((item) => item.id === section.courseId);
    const teacherId = drag.teacherId ?? section.teacherId ?? remembered[section.id];
    const room = catalog.rooms.find((item) => item.id === drag.roomId);
    const teacher = catalog.teachers.find((item) => item.id === teacherId);

    return (
      <LessonPreview
        courseId={section.courseId}
        courseName={course?.name ?? section.code}
        courseCode={course?.code ?? section.code}
        code={section.code}
        teacherName={teacher?.shortName ?? 'Выбор преподавателя'}
        roomName={room?.name ?? 'Не выбрана'}
        roomType={room?.type ?? section.preferredRoomType}
        preferredRoomType={section.preferredRoomType}
      />
    );
  }

  const lesson = lessons.find((item) => item.id === drag.lessonId);
  const section = catalog.sections.find((item) => item.id === lesson?.sectionId);
  const teacher = catalog.teachers.find((item) => item.id === lesson?.teacherId);
  const room = catalog.rooms.find((item) => item.id === lesson?.roomId);
  const course = catalog.courses.find((item) => item.id === section?.courseId);
  if (!lesson || !section || !room) return null;

  return (
    <LessonPreview
      courseId={section.courseId}
      courseCode={course?.code ?? section.code}
      courseName={course?.name ?? section.code}
      code={section.code}
      teacherName={teacher?.shortName ?? 'Нужен преподаватель'}
      roomName={room.name}
      roomType={room.type}
      preferredRoomType={section.preferredRoomType}
    />
  );
}
