import type { Hand } from '#interaction/types.ts';

import { groupCommand, groupView } from '#interaction/group-policy.ts';
import { describe, expect, it } from 'vitest';

const pair = ['L1', 'L2'];
const heldInPair: Hand = { kind: 'lesson', lessonId: 'L1' };
const heldOutside: Hand = { kind: 'lesson', lessonId: 'L9' };

function command(patch: Partial<Parameters<typeof groupCommand>[0]> = {}) {
  return groupCommand({
    lessonIds: pair,
    hand: null,
    dragging: false,
    copyMode: false,
    key: 'ArrowUp',
    cellTarget: true,
    ...patch,
  });
}

describe('groupView', () => {
  it('различает одиночное занятие, пару и полоски', () => {
    expect(groupView(1)).toBe('single');
    expect(groupView(2)).toBe('pair');
    expect(groupView(3)).toBe('strips');
  });
});

describe('groupCommand', () => {
  it('игнорирует перетаскивание и одиночное занятие', () => {
    expect(command({ dragging: true, hand: heldInPair })).toBe('ignore');
    expect(command({ lessonIds: ['L1'], hand: heldInPair })).toBe('ignore');
  });

  it('открывает пикер по Enter и пробелу в пустой клетке', () => {
    expect(command({ lessonIds: ['L1', 'L2', 'L3'], key: 'Enter' })).toBe('open-picker');
    expect(command({ lessonIds: ['L1', 'L2', 'L3'], key: ' ' })).toBe('open-picker');
  });

  it('переставляет пару только когда занятие из этой пары и режим копирования выключен', () => {
    expect(command({ hand: heldInPair, key: 'ArrowUp' })).toBe('reorder-up');
    expect(command({ hand: heldInPair, key: 'ArrowDown' })).toBe('reorder-down');
    expect(command({ hand: heldInPair, key: ' ' })).toBe('confirm-order');
  });

  it('не переставляет пару чужим занятием и в режиме копирования', () => {
    expect(command({ hand: heldOutside, key: 'ArrowUp' })).toBe('ignore');
    expect(command({ hand: heldInPair, key: 'ArrowUp', copyMode: true })).toBe('ignore');
  });

  it('не переставляет, когда занятий не пара', () => {
    expect(command({ lessonIds: ['L1', 'L2', 'L3'], hand: heldInPair, key: 'ArrowUp' })).toBe('ignore');
  });

  it('игнорирует клавиши без команды', () => {
    expect(command({ hand: heldInPair, key: 'q' })).toBe('ignore');
  });
});
