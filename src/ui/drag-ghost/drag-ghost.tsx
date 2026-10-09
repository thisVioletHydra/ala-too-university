import type { Lesson, ScheduleCatalog } from '#schedule/types.ts';
import type { ActiveDrag, Hand, Landing } from '#app/providers.tsx';
import type { ReactNode } from 'react';

import { DragOverlay } from '@dnd-kit/core';
import { slotKey, useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { LessonPreview } from '#ui/lesson-card/lesson-card.tsx';
import { SectionPreview } from '#ui/section-card/section-card.tsx';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from '#ui/drag-ghost/drag-ghost.module.css';

const dropAnimation = { duration: 250, easing: 'cubic-bezier(0.2, 0, 0, 1)' };
const flight = '250ms cubic-bezier(0.2, 0, 0, 1)';

export function DragGhost(props: { catalog: ScheduleCatalog }) {
  const ghost = useBoard().ghost;
  const lessons = useSchedule((state) => state.lessons);
  const remembered = useSchedule((state) => state.rememberedTeachers);
  const card = ghost ? heldCard(props.catalog, lessons, remembered, ghost) : null;

  useEffect(() => {
    if (ghost === null || ghost === undefined) return;

    document.body.dataset.drag = 'yes';

    return () => {
      delete document.body.dataset.drag;
    };
  }, [ghost]);

  return (
    <DragOverlay dropAnimation={dropAnimation}>
      {card ? <div className={styles.preview}>{card}</div> : null}
    </DragOverlay>
  );
}

export function HandCursor(props: { catalog: ScheduleCatalog }) {
  const board = useBoard();
  const lessons = useSchedule((state) => state.lessons);
  const remembered = useSchedule((state) => state.rememberedTeachers);
  const node = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number, y: number } | null>(null);
  const fromKeys = useRef(false);
  const flying = useRef(false);
  const [pinned, setPinned] = useState<ReactNode>(null);
  const hand = board.hold.hand;
  const drag = hand ? heldDrag(hand) : null;
  const card = drag && board.editor === null ? heldCard(props.catalog, lessons, remembered, drag) : null;
  const handKey = hand === null ? '' : `${hand.kind}:${hand.kind === 'lesson' ? hand.lessonId : hand.sectionId}`;
  const pin = useEffectEvent(() => {
    if (card) setPinned(card);
  });

  useEffect(() => {
    pin();
  }, [handKey]);

  useEffect(() => {
    function remember(event: PointerEvent): void {
      if (!event.isPrimary) return;

      if (event.clientX === 0 && event.clientY === 0) return;

      pointer.current = { x: event.clientX, y: event.clientY };
      fromKeys.current = false;
      if (flying.current) return;

      const el = node.current;
      if (!el || el.style.visibility === 'hidden') return;

      el.style.transform = `translate(${event.clientX + 12}px, ${event.clientY + 12}px)`;
    }

    window.addEventListener('pointermove', remember);
    return () => window.removeEventListener('pointermove', remember);
  }, []);

  useEffect(() => {
    if (!hand || board.editor) {
      delete document.body.dataset.hand;

      return;
    }

    document.body.dataset.hand = 'yes';

    return () => {
      delete document.body.dataset.hand;
    };
  }, [hand, board.editor]);

  const endFlight = useEffectEvent(() => {
    board.clearLanding();
  });

  useLayoutEffect(() => {
    flying.current = board.landing !== null && hand === null;
    const el = node.current;
    if (!el || !board.landing || hand) return;

    const flyer = el;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      endFlight();

      return;
    }

    const from = el.getBoundingClientRect();
    const to = landingBox(board.landing);
    if (to === null || to === undefined) {
      endFlight();

      return;
    }

    const fade = board.landing.kind === 'tray';
    const target = fade
      ? { left: to.left + (to.width - from.width) / 2, top: to.top + 16, width: from.width }
      : to;
    el.style.visibility = 'visible';
    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.transform = `translate(${from.left}px, ${from.top}px)`;
    el.style.inlineSize = `${from.width}px`;
    el.getBoundingClientRect();
    el.style.transition = fade
      ? `transform ${flight}, inline-size ${flight}, opacity ${flight}`
      : `transform ${flight}, inline-size ${flight}`;
    el.style.transform = `translate(${target.left}px, ${target.top}px)`;
    el.style.inlineSize = `${target.width}px`;
    if (fade) el.style.opacity = '0';

    let settled = false;
    function finish(): void {
      if (settled) return;

      settled = true;
      window.clearTimeout(timer);
      flyer.removeEventListener('transitionend', onEnd);
      flyer.style.transition = '';
      flyer.style.opacity = '';
      endFlight();
    }

    function onEnd(event: TransitionEvent): void {
      if (event.target !== el || event.propertyName !== 'transform') return;

      finish();
    }

    const timer = window.setTimeout(finish, 320);
    el.addEventListener('transitionend', onEnd);

    return () => {
      settled = true;
      window.clearTimeout(timer);
      el.removeEventListener('transitionend', onEnd);
    };
  }, [board.landing, hand]);

  useLayoutEffect(() => {
    const el = node.current;
    if (!el || !hand || flying.current) return;

    const source = sourceNode(hand);
    if (source) el.style.inlineSize = `${source.getBoundingClientRect().width}px`;

    if (fromKeys.current) placeAim(el);
    else if (pointer.current) placeAt(el, pointer.current.x, pointer.current.y);
    else if (source) {
      const rect = source.getBoundingClientRect();
      el.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    }

    el.style.visibility = 'visible';
  }, [hand, board.hold.aim]);

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key !== ' ' && event.key !== 'Spacebar' && !event.key.startsWith('Arrow') && event.key !== 'Tab') return;

      fromKeys.current = true;
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const shown = card ?? (board.landing ? pinned : null);
  if (shown === null || shown === undefined) return null;

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
  element.style.transform = `translate(${x + 12}px, ${y + 12}px)`;
}

function placeAim(element: HTMLElement): void {
  const aim = document.querySelector('[data-aim="yes"]');
  if (!(aim instanceof HTMLElement)) return;

  const rect = aim.getBoundingClientRect();
  const top = Math.max(8, rect.top - element.offsetHeight - 8);
  element.style.transform = `translate(${rect.left}px, ${top}px)`;
}

function heldDrag(hand: Hand): ActiveDrag {
  if (hand.kind === 'section') return { kind: 'section', sectionId: hand.sectionId };

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
    const teacherId = section.teacherId ?? remembered[section.id];
    const teacher = catalog.teachers.find((item) => item.id === teacherId);

    return (
      <SectionPreview
        section={section}
        courseName={course?.name ?? section.code}
        courseCode={course?.code ?? section.code}
        teacherName={teacher?.shortName ?? null}
        lessons={lessons}
      />
    );
  }

  const lesson = lessons.find((item) => item.id === drag.lessonId);
  const section = catalog.sections.find((item) => item.id === lesson?.sectionId);
  const teacher = catalog.teachers.find((item) => item.id === lesson?.teacherId);
  const room = catalog.rooms.find((item) => item.id === lesson?.roomId);
  const course = catalog.courses.find((item) => item.id === section?.courseId);
  if (!lesson || !section || !teacher || !room) return null;

  return (
    <LessonPreview
      courseId={section.courseId}
      courseCode={course?.code ?? section.code}
      courseName={course?.name ?? section.code}
      code={section.code}
      teacherName={teacher.shortName}
      roomName={room.name}
      roomType={room.type}
      preferredRoomType={section.preferredRoomType}
    />
  );
}
