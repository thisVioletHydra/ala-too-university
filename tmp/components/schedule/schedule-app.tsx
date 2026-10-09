'use client'

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildCatalog, cellKey, countLessonsBySection, groupLessonsByCell } from '@/lib/schedule/catalog'
import { draftFromSource, evaluatePlacement, type Evaluation } from '@/lib/schedule/rules'
import type { Cell, Lesson, PlacementSource, ScheduleData } from '@/lib/schedule/types'
import { useLessonsHistory } from '@/lib/schedule/use-lessons-history'
import { DragPreview } from './drag-preview'
import { HintBar } from './hint-bar'
import { LessonDialog, type LessonDialogState } from './lesson-dialog'
import { ScheduleHeader } from './schedule-header'
import { SectionPanel, UNASSIGN_ZONE_ID } from './section-panel'
import { Toast, type ToastMessage } from './toast'
import { WeekGrid } from './week-grid'

export interface Filters {
  teacherId: string
  roomId: string
}

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length > 0 ? hits : rectIntersection(args)
}

let lessonCounter = 0
const newLessonId = () => `L-new-${Date.now()}-${++lessonCounter}`

export function ScheduleApp({ data }: { data: ScheduleData }) {
  const catalog = useMemo(() => buildCatalog(data), [data])
  const history = useLessonsHistory(data.lessons)
  const { lessons } = history

  const [dragging, setDragging] = useState<PlacementSource | null>(null)
  const [picked, setPicked] = useState<PlacementSource | null>(null)
  const [altPressed, setAltPressed] = useState(false)
  const [filters, setFilters] = useState<Filters>({ teacherId: 'all', roomId: 'all' })
  const [dialog, setDialog] = useState<LessonDialogState | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const toastId = useRef(0)

  const notify = useCallback((tone: ToastMessage['tone'], text: string, withUndo = false) => {
    setToast({ id: ++toastId.current, tone, text, withUndo })
  }, [])

  const activeSource = useMemo<PlacementSource | null>(() => {
    const source = dragging ?? picked
    if (source?.kind === 'lesson' && dragging) return { ...source, copy: altPressed }
    return source
  }, [dragging, picked, altPressed])

  const sourceSectionId = useMemo(() => {
    if (!activeSource) return null
    if (activeSource.kind === 'section') return activeSource.sectionId
    return lessons.find((l) => l.id === activeSource.lessonId)?.sectionId ?? null
  }, [activeSource, lessons])

  const dismissToast = useCallback(() => setToast(null), [])

  const lessonsByCell = useMemo(() => groupLessonsByCell(lessons), [lessons])
  const placedBySection = useMemo(() => countLessonsBySection(lessons), [lessons])

  const evaluations = useMemo(() => {
    const map = new Map<string, Evaluation>()
    if (!activeSource) return map
    const draft = draftFromSource(activeSource, catalog, lessons)
    if (!draft) return map
    for (const day of data.meta.weekDays) {
      for (const slot of data.timeSlots) {
        const cell = { day: day.id, timeSlotId: slot.id }
        map.set(cellKey(cell.day, cell.timeSlotId), evaluatePlacement({ catalog, lessons }, draft, cell))
      }
    }
    return map
  }, [activeSource, catalog, lessons, data])

  const describeCell = useCallback(
    (cell: Cell) => {
      const slot = data.timeSlots.find((s) => s.id === cell.timeSlotId)
      return `${catalog.dayLabel.get(cell.day)}, ${slot?.start ?? ''}`
    },
    [catalog, data.timeSlots],
  )

  const placeAt = useCallback(
    (source: PlacementSource, cell: Cell) => {
      const draft = draftFromSource(source, catalog, lessons)
      if (!draft) return
      const result = evaluatePlacement({ catalog, lessons }, draft, cell)
      const section = catalog.sections.get(draft.sectionId)
      if (!section) return

      if (!result.ok) {
        notify('error', `Сюда нельзя: ${result.conflicts.map((c) => c.message).join(' ')}`)
        return
      }

      if (source.kind === 'lesson' && !source.copy) {
        const lesson = lessons.find((l) => l.id === source.lessonId)
        if (lesson && lesson.day === cell.day && lesson.timeSlotId === cell.timeSlotId) return
        history.update(source.lessonId, { day: cell.day, timeSlotId: cell.timeSlotId, roomId: result.roomId })
        const room = catalog.rooms.get(result.roomId)?.name
        notify(
          'ok',
          `${section.code} перенесена на ${describeCell(cell)}${result.roomChanged ? ` · аудитория ${room}` : ''}`,
          true,
        )
        return
      }

      if (result.needsTeacher || !result.teacherId) {
        setDialog({
          mode: 'create',
          sectionId: section.id,
          cell,
          teacherId: result.teacherId,
          roomId: result.roomId,
        })
        return
      }

      history.add({
        id: newLessonId(),
        sectionId: section.id,
        teacherId: result.teacherId,
        roomId: result.roomId,
        day: cell.day,
        timeSlotId: cell.timeSlotId,
      })
      const verb = source.kind === 'lesson' ? 'скопирована' : 'поставлена'
      notify('ok', `${section.code} ${verb} на ${describeCell(cell)} · ${catalog.rooms.get(result.roomId)?.name}`, true)
    },
    [catalog, lessons, history, notify, describeCell],
  )

  const unassign = useCallback(
    (lessonId: string) => {
      const lesson = lessons.find((l) => l.id === lessonId)
      if (!lesson) return
      history.remove(lessonId)
      notify('ok', `${catalog.sections.get(lesson.sectionId)?.code} убрана из расписания`, true)
    },
    [lessons, history, notify, catalog],
  )

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setPicked(null)
    setDragging((event.active.data.current?.source as PlacementSource | undefined) ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const source = activeSource
    setDragging(null)
    const overId = event.over?.id
    if (!source || !overId) return
    if (overId === UNASSIGN_ZONE_ID) {
      if (source.kind === 'lesson') unassign(source.lessonId)
      return
    }
    const cell = event.over?.data.current?.cell as Cell | undefined
    if (cell) placeAt(source, cell)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      setAltPressed(e.altKey)
      if (e.type !== 'keydown') return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, [role="dialog"]')) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) history.redo()
        else history.undo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        history.redo()
      } else if (e.key === 'Escape') {
        setPicked(null)
      }
    }
    const reset = () => setAltPressed(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', reset)
    }
  }, [history])

  const handleCellClick = (cell: Cell) => {
    if (!picked) return
    const source = picked
    setPicked(null)
    placeAt(source, cell)
  }

  const togglePickSection = (sectionId: string) =>
    setPicked((current) =>
      current?.kind === 'section' && current.sectionId === sectionId ? null : { kind: 'section', sectionId },
    )

  const totalRequired = data.sections.reduce((sum, s) => sum + s.requiredLessonsPerWeek, 0)
  const totalPlaced = data.sections.reduce(
    (sum, s) => sum + Math.min(placedBySection.get(s.id) ?? 0, s.requiredLessonsPerWeek),
    0,
  )

  const saveDialog = (state: LessonDialogState, teacherId: string, roomId: string) => {
    const section = catalog.sections.get(state.sectionId)
    if (state.mode === 'create') {
      history.add({
        id: newLessonId(),
        sectionId: state.sectionId,
        teacherId,
        roomId,
        day: state.cell.day,
        timeSlotId: state.cell.timeSlotId,
      })
      notify('ok', `${section?.code} поставлена на ${describeCell(state.cell)}`, true)
    } else if (state.lessonId) {
      history.update(state.lessonId, { teacherId, roomId })
      notify('ok', `${section?.code}: изменения сохранены`, true)
    }
    setDialog(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'Чтобы взять карточку, нажмите пробел. Стрелками выберите ячейку и нажмите пробел, чтобы поставить. Escape — отмена.',
        },
      }}
    >
      <div className="flex h-dvh flex-col overflow-hidden">
        <ScheduleHeader
          placed={totalPlaced}
          required={totalRequired}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.undo}
          onRedo={history.redo}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 md:flex-row md:gap-4 md:px-5 md:pb-5">
          <SectionPanel
            catalog={catalog}
            placedBySection={placedBySection}
            teacherFilter={filters.teacherId}
            pickedSectionId={picked?.kind === 'section' ? picked.sectionId : null}
            onPick={togglePickSection}
            isDraggingLesson={dragging?.kind === 'lesson'}
          />

          <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3" aria-label="Недельное расписание">
            <HintBar
              catalog={catalog}
              source={activeSource}
              lessons={lessons}
              isDragging={Boolean(dragging)}
              filters={filters}
              onFiltersChange={setFilters}
              onCancelPick={() => setPicked(null)}
            />
            <WeekGrid
              catalog={catalog}
              lessonsByCell={lessonsByCell}
              evaluations={evaluations}
              source={activeSource}
              sourceSectionId={sourceSectionId}
              filters={filters}
              clickToPlace={Boolean(picked)}
              onCellClick={handleCellClick}
              onLessonOpen={(lesson: Lesson) =>
                setDialog({
                  mode: 'edit',
                  lessonId: lesson.id,
                  sectionId: lesson.sectionId,
                  cell: { day: lesson.day, timeSlotId: lesson.timeSlotId },
                  teacherId: lesson.teacherId,
                  roomId: lesson.roomId,
                })
              }
            />
          </main>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging ? <DragPreview catalog={catalog} source={activeSource ?? dragging} lessons={lessons} /> : null}
      </DragOverlay>

      <LessonDialog
        catalog={catalog}
        lessons={lessons}
        state={dialog}
        onClose={() => setDialog(null)}
        onSave={saveDialog}
        onRemove={(lessonId) => {
          setDialog(null)
          unassign(lessonId)
        }}
        onMove={(lessonId) => {
          setDialog(null)
          setPicked({ kind: 'lesson', lessonId, copy: false })
        }}
        describeCell={describeCell}
      />

      <Toast message={toast} onUndo={history.undo} onDismiss={dismissToast} />
    </DndContext>
  )
}
