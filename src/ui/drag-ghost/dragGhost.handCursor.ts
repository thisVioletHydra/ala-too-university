import type { CursorState } from '#interaction/cursor.state.ts';
import type { ScheduleCatalog } from '#schedule/types.ts';
import type { ReactNode, RefObject } from 'react';

import { acceptsPointer } from '#interaction/input.policy.ts';
import { isInteractionKey } from '#accessible/keyboard.bindings.ts';
import { cannotFly, firstSlotWidth, heldDrag, landingBox, placeAim, placeAt, sourceNode } from '#ui/drag-ghost/dragGhost.geometry.ts';
import { heldCard } from '#ui/drag-ghost/dragGhost.heldCard.tsx';
import { resolveCursorState, ownsAnimation } from '#interaction/cursor.state.ts';
import { setCardInput, setHandActive } from '#ui/drag-ghost/dragGhost.bodyFlags.ts';
import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { useEffect, useEffectEvent, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';

export type HandCursorState = {
  node: RefObject<HTMLDivElement | null>
  content: ReactNode
};

const LIFT = '150ms cubic-bezier(0.2, 0, 0, 1)';

/**
 * Одна карточка в руке: подъём из клетки, слежение за указателем или целью
 * клавиатуры и посадка обратно. Возвращает узел портала и его содержимое.
 */
export function useHandCursor(catalog: ScheduleCatalog): HandCursorState {
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
  const card = hand ? heldCard(catalog, lessons, remembered, heldDrag(hand)) : null;
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
      const width = hand.kind === 'section' ? firstSlotWidth() : source?.width;
      if (width) el.style.inlineSize = `${width}px`;

      el.style.visibility = 'visible';
      el.style.opacity = '1';
      el.style.scale = '1';
      el.style.transition = alreadyHolding && input.current === 'keyboard' ? `transform ${LIFT}` : 'none';
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
      if (ownsAnimation(state, token) === false) return;

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
      setCardInput('pointer');
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
      setCardInput('keyboard');
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
    setHandActive(hand !== null && board.editor === null);

    return () => setHandActive(false);
  }, [hand, board.editor]);

  const content = board.editor ? null : card ?? (board.landing ? snapshot.current : null);

  return { node, content };
}
