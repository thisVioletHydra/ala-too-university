'use client'

import { useCallback, useReducer } from 'react'
import type { Lesson } from './types'

interface HistoryState {
  past: Lesson[][]
  present: Lesson[]
  future: Lesson[][]
}

type Action =
  | { type: 'add'; lesson: Lesson }
  | { type: 'update'; id: string; patch: Partial<Omit<Lesson, 'id' | 'sectionId'>> }
  | { type: 'remove'; id: string }
  | { type: 'undo' }
  | { type: 'redo' }

const HISTORY_LIMIT = 100

function commit(state: HistoryState, next: Lesson[]): HistoryState {
  return {
    past: [...state.past, state.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
  }
}

function reducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case 'add':
      return commit(state, [...state.present, action.lesson])
    case 'update':
      return commit(
        state,
        state.present.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l)),
      )
    case 'remove':
      return commit(
        state,
        state.present.filter((l) => l.id !== action.id),
      )
    case 'undo': {
      const previous = state.past.at(-1)
      if (!previous) return state
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] }
    }
    case 'redo': {
      const [next, ...rest] = state.future
      if (!next) return state
      return { past: [...state.past, state.present], present: next, future: rest }
    }
  }
}

export function useLessonsHistory(initial: Lesson[]) {
  const [state, dispatch] = useReducer(reducer, { past: [], present: initial, future: [] })

  return {
    lessons: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    add: useCallback((lesson: Lesson) => dispatch({ type: 'add', lesson }), []),
    update: useCallback(
      (id: string, patch: Partial<Omit<Lesson, 'id' | 'sectionId'>>) => dispatch({ type: 'update', id, patch }),
      [],
    ),
    remove: useCallback((id: string) => dispatch({ type: 'remove', id }), []),
    undo: useCallback(() => dispatch({ type: 'undo' }), []),
    redo: useCallback(() => dispatch({ type: 'redo' }), []),
  }
}
