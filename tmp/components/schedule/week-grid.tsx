'use client'

import { useMemo, useRef, useState } from 'react'
import { cellKey, type Catalog } from '@/lib/schedule/catalog'
import type { Evaluation } from '@/lib/schedule/rules'
import type { Cell, Lesson, PlacementSource, WeekDay } from '@/lib/schedule/types'
import { GridCell } from './grid-cell'
import type { Filters } from './schedule-app'

const SHORT_DAY: Record<string, string> = { MON: 'Пн', TUE: 'Вт', WED: 'Ср', THU: 'Чт', FRI: 'Пт' }

export const cellNavKey = (cell: Cell) => `c:${cellKey(cell.day, cell.timeSlotId)}`
export const lessonNavKey = (lessonId: string) => `l:${lessonId}`

interface Props {
  catalog: Catalog
  lessons: Lesson[]
  lessonsByCell: Map<string, Lesson[]>
  evaluations: Map<string, Evaluation>
  source: PlacementSource | null
  sourceSectionId: string | null
  filters: Filters
  holding: boolean
  onCellActivate: (cell: Cell) => void
  onLessonOpen: (lesson: Lesson) => void
  onLessonPick: (lesson: Lesson, copy: boolean) => void
  onLessonRemove: (lesson: Lesson) => void
}

export function WeekGrid({
  catalog,
  lessons,
  lessonsByCell,
  evaluations,
  source,
  sourceSectionId,
  filters,
  holding,
  onCellActivate,
  onLessonOpen,
  onLessonPick,
  onLessonRemove,
}: Props) {
  const { weekDays } = catalog.data.meta
  const { timeSlots } = catalog.data
  const originLessonId = source?.kind === 'lesson' && !source.copy ? source.lessonId : null
  const containerRef = useRef<HTMLDivElement>(null)

  const firstKey = cellNavKey({ day: weekDays[0].id, timeSlotId: timeSlots[0].id })
  const [cursor, setCursor] = useState(firstKey)
  const lessonById = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons])
  const roving = cursor.startsWith('l:') && !lessonById.has(cursor.slice(2)) ? firstKey : cursor

  const focusKey = (key: string) =>
    containerRef.current?.querySelector<HTMLElement>(`[data-nav="${key}"]`)?.focus()

  const cellAt = (r: number, c: number): Cell => ({ day: weekDays[c].id, timeSlotId: timeSlots[r].id })
  const itemsAt = (r: number, c: number) =>
    holding ? [] : (lessonsByCell.get(cellKey(weekDays[c].id, timeSlots[r].id)) ?? [])

  const locate = (key: string) => {
    if (key.startsWith('c:')) {
      const [day, slot] = key.slice(2).split('|')
      return {
        r: timeSlots.findIndex((s) => s.id === slot),
        c: weekDays.findIndex((d) => d.id === (day as WeekDay)),
        i: -1,
        lesson: undefined as Lesson | undefined,
      }
    }
    const lesson = lessonById.get(key.slice(2))
    if (!lesson) return null
    const r = timeSlots.findIndex((s) => s.id === lesson.timeSlotId)
    const c = weekDays.findIndex((d) => d.id === lesson.day)
    const i = holding ? -1 : itemsAt(r, c).findIndex((l) => l.id === lesson.id)
    return { r, c, i, lesson }
  }

  const goTo = (r: number, c: number, from: 'top' | 'bottom' = 'top') => {
    const rr = Math.max(0, Math.min(timeSlots.length - 1, r))
    const cc = Math.max(0, Math.min(weekDays.length - 1, c))
    const items = itemsAt(rr, cc)
    if (items.length === 0) return focusKey(cellNavKey(cellAt(rr, cc)))
    focusKey(lessonNavKey(items[from === 'top' ? 0 : items.length - 1].id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey || e.metaKey || (e.ctrlKey && !['Home', 'End'].includes(e.key))) return
    const key = (e.target as HTMLElement).dataset.nav
    if (!key) return
    const pos = locate(key)
    if (!pos) return
    const { r, c, i, lesson } = pos
    const items = itemsAt(r, c)
    const cell = cellAt(r, c)

    const handled = () => {
      e.preventDefault()
      e.stopPropagation()
    }

    switch (e.key) {
      case 'ArrowDown':
        handled()
        if (i < items.length - 1) focusKey(lessonNavKey(items[i + 1].id))
        else if (r < timeSlots.length - 1) goTo(r + 1, c, 'top')
        return
      case 'ArrowUp':
        handled()
        if (i > 0) focusKey(lessonNavKey(items[i - 1].id))
        else if (r > 0) goTo(r - 1, c, 'bottom')
        return
      case 'ArrowLeft':
        handled()
        if (c > 0) goTo(r, c - 1)
        return
      case 'ArrowRight':
        handled()
        if (c < weekDays.length - 1) goTo(r, c + 1)
        return
      case 'Home':
        handled()
        goTo(e.ctrlKey ? 0 : r, 0)
        return
      case 'End':
        handled()
        goTo(e.ctrlKey ? timeSlots.length - 1 : r, weekDays.length - 1)
        return
    }

    if (e.key === 'Enter' || e.key === ' ') {
      handled()
      if (holding) return onCellActivate(cell)
      if (!lesson) return
      if (e.key === 'Enter') return onLessonOpen(lesson)
      focusKey(cellNavKey(cell))
      return onLessonPick(lesson, false)
    }

    if (holding || !lesson) return

    if (e.code === 'KeyC' || e.code === 'KeyM') {
      handled()
      focusKey(cellNavKey(cell))
      onLessonPick(lesson, e.code === 'KeyC')
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      handled()
      focusKey(cellNavKey(cell))
      onLessonRemove(lesson)
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-3xl bg-card ring-1 ring-border">
      <div
        ref={containerRef}
        id="schedule-grid"
        role="grid"
        aria-label="Сетка: дни недели и время. Стрелки — двигаться, Enter — действие."
        className="grid min-w-[52rem]"
        style={{ gridTemplateColumns: `4.75rem repeat(${weekDays.length}, minmax(9.5rem, 1fr))` }}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          const key = (e.target as HTMLElement).dataset.nav
          if (key) setCursor(key)
        }}
      >
        <div role="row" className="contents">
          <div className="sticky top-0 left-0 z-20 bg-card" aria-hidden />
          {weekDays.map((day) => (
            <div
              key={day.id}
              role="columnheader"
              className="sticky top-0 z-10 flex items-baseline gap-2 border-b border-border bg-card/95 px-3 py-3 backdrop-blur"
            >
              <span className="text-sm font-semibold">{SHORT_DAY[day.id]}</span>
              <span className="hidden text-sm text-muted-foreground lg:inline">{day.label}</span>
            </div>
          ))}
        </div>

        {timeSlots.map((slot, rowIndex) => (
          <div role="row" key={slot.id} className="contents">
            <div
              role="rowheader"
              className="sticky left-0 z-10 flex flex-col gap-0.5 border-border bg-card px-3 py-3 data-[last=false]:border-b"
              data-last={rowIndex === timeSlots.length - 1}
            >
              <span className="text-sm font-semibold tabular-nums">{slot.start}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{slot.end}</span>
            </div>
            {weekDays.map((day) => {
              const cell = { day: day.id, timeSlotId: slot.id }
              const key = cellKey(day.id, slot.id)
              return (
                <GridCell
                  key={key}
                  catalog={catalog}
                  cell={cell}
                  label={`${day.label}, ${slot.start}–${slot.end}`}
                  lessons={lessonsByCell.get(key) ?? []}
                  evaluation={evaluations.get(key)}
                  source={source}
                  sourceSectionId={sourceSectionId}
                  originLessonId={originLessonId}
                  filters={filters}
                  isLastRow={rowIndex === timeSlots.length - 1}
                  clickToPlace={holding}
                  roving={roving}
                  onClick={onCellActivate}
                  onLessonOpen={onLessonOpen}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
