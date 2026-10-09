'use client'

import { useDroppable } from '@dnd-kit/core'
import { Ban, Plus } from 'lucide-react'
import { cellKey, courseHue, type Catalog } from '@/lib/schedule/catalog'
import type { Evaluation } from '@/lib/schedule/rules'
import type { Cell, Lesson, PlacementSource } from '@/lib/schedule/types'
import { cn } from '@/lib/utils'
import { LessonCard } from './lesson-card'
import type { Filters } from './schedule-app'

interface Props {
  catalog: Catalog
  cell: Cell
  label: string
  lessons: Lesson[]
  evaluation: Evaluation | undefined
  source: PlacementSource | null
  sourceSectionId: string | null
  originLessonId: string | null
  filters: Filters
  isLastRow: boolean
  clickToPlace: boolean
  roving: string
  onClick: (cell: Cell) => void
  onLessonOpen: (lesson: Lesson) => void
}

export function GridCell({
  catalog,
  cell,
  label,
  lessons,
  evaluation,
  source,
  sourceSectionId,
  originLessonId,
  filters,
  isLastRow,
  clickToPlace,
  roving,
  onClick,
  onLessonOpen,
}: Props) {
  const navKey = `c:${cellKey(cell.day, cell.timeSlotId)}`
  const { setNodeRef, isOver } = useDroppable({ id: cellKey(cell.day, cell.timeSlotId), data: { cell } })

  const isOrigin = Boolean(originLessonId && lessons.some((l) => l.id === originLessonId))
  const showState = Boolean(source && evaluation && !isOrigin)
  const ok = showState && evaluation?.ok
  const blocked = showState && evaluation && !evaluation.ok
  const firstConflict = evaluation && !evaluation.ok ? evaluation.conflicts[0] : undefined

  const teacherUnavailable =
    !source &&
    filters.teacherId !== 'all' &&
    catalog.blocked.has(`${filters.teacherId}|${cellKey(cell.day, cell.timeSlotId)}`)

  const matches = (lesson: Lesson) =>
    (filters.teacherId === 'all' || lesson.teacherId === filters.teacherId) &&
    (filters.roomId === 'all' || lesson.roomId === filters.roomId)

  const spokenState = source
    ? isOrigin
      ? 'занятие сейчас здесь'
      : evaluation?.ok
        ? 'можно поставить, нажмите Enter'
        : `нельзя: ${firstConflict?.message ?? ''}`
    : lessons.length === 0
      ? 'свободно'
      : `${lessons.length} ${lessons.length === 1 ? 'занятие' : 'занятия'}`

  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      data-nav={navKey}
      tabIndex={roving === navKey ? 0 : -1}
      aria-label={`${label}: ${spokenState}`}
      className={cn(
        'group/cell relative flex min-h-32 scroll-mt-14 scroll-ml-20 flex-col gap-1.5 border-l border-border p-1.5 outline-none transition-colors',
        !isLastRow && 'border-b',
        teacherUnavailable && 'bg-stripes',
        ok && 'bg-ok-soft/60',
        ok && isOver && 'bg-ok',
        blocked && 'bg-stripes bg-secondary/60',
        blocked && isOver && 'bg-bad-soft',
      )}
    >
      {ok && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-1 rounded-xl border-2 border-dashed transition-colors',
            isOver ? 'border-ok-strong' : 'border-ok-strong/30',
          )}
        />
      )}
      {blocked && isOver && (
        <span aria-hidden className="pointer-events-none absolute inset-1 rounded-xl border-2 border-bad-strong" />
      )}

      {lessons.map((lesson) => (
        <LessonCard
          key={lesson.id}
          catalog={catalog}
          lesson={lesson}
          dimmed={!matches(lesson) || (Boolean(source) && lesson.id !== originLessonId)}
          tabIndex={roving === `l:${lesson.id}` ? 0 : -1}
          onOpen={() => onLessonOpen(lesson)}
        />
      ))}

      {ok && isOver && evaluation?.ok && <GhostPreview catalog={catalog} sectionId={sourceSectionId} evaluation={evaluation} />}

      {ok && !isOver && lessons.length === 0 && (
        <span
          aria-hidden
          className="pointer-events-none m-auto grid size-8 place-items-center rounded-full bg-card/80 text-ok-strong shadow-sm"
        >
          <Plus className="size-4" />
        </span>
      )}

      {blocked && firstConflict && (
        <span
          className={cn(
            'relative flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium',
            lessons.length === 0 && 'my-auto',
            isOver ? 'bg-card text-bad-strong shadow-sm' : 'text-muted-foreground',
          )}
        >
          <Ban className="mt-px size-3.5 shrink-0" aria-hidden />
          <span className="text-pretty">{isOver ? firstConflict.message : firstConflict.short}</span>
        </span>
      )}

      {teacherUnavailable && lessons.length === 0 && (
        <span className="my-auto text-center text-xs text-muted-foreground">Преподаватель недоступен</span>
      )}

      {clickToPlace && !isOrigin && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => onClick(cell)}
          className={cn(
            'absolute inset-0 z-[5] rounded-none outline-none',
            evaluation?.ok ? 'cursor-pointer hover:bg-ok/50' : 'cursor-not-allowed',
          )}
        />
      )}

      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0.5 z-10 hidden rounded-xl ring-[2.5px] ring-foreground group-focus-visible/cell:block',
          ok && 'bg-ok/40',
        )}
      />
    </div>
  )
}

function GhostPreview({
  catalog,
  sectionId,
  evaluation,
}: {
  catalog: Catalog
  sectionId: string | null
  evaluation: Extract<Evaluation, { ok: true }>
}) {
  const section = sectionId ? catalog.sections.get(sectionId) : undefined
  const room = catalog.rooms.get(evaluation.roomId)
  const teacher = evaluation.teacherId ? catalog.teachers.get(evaluation.teacherId) : undefined
  const hue = section ? courseHue(catalog, section.courseId) : 125

  return (
    <div
      aria-hidden
      className="relative rounded-xl border-2 border-dashed border-foreground/30 px-2.5 py-2 text-xs"
      style={{ backgroundColor: `oklch(0.97 0.03 ${hue} / 0.9)` }}
    >
      <p className="font-semibold">Будет здесь</p>
      <p className="text-muted-foreground">
        {section ? `${section.code} · ` : ''}
        {room?.name}
        {teacher ? ` · ${teacher.shortName}` : ''}
        {evaluation.needsTeacher ? ' (выбрать)' : ''}
        {evaluation.roomChanged ? ' — новая аудитория' : ''}
      </p>
    </div>
  )
}
