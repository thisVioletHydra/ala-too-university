'use client'

import { Check, Move, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { plural, ROOM_TYPE_LABEL, type Catalog } from '@/lib/schedule/catalog'
import { checkRoom, checkTeacher } from '@/lib/schedule/rules'
import type { Cell, Lesson } from '@/lib/schedule/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface LessonDialogState {
  mode: 'create' | 'edit'
  lessonId?: string
  sectionId: string
  cell: Cell
  teacherId: string | null
  roomId: string | null
}

interface Props {
  catalog: Catalog
  lessons: Lesson[]
  state: LessonDialogState | null
  onClose: () => void
  onSave: (state: LessonDialogState, teacherId: string, roomId: string) => void
  onRemove: (lessonId: string) => void
  onMove: (lessonId: string) => void
  describeCell: (cell: Cell) => string
}

export function LessonDialog(props: Props) {
  const { state, onClose } = props
  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-lg">
        {state && <DialogBody key={`${state.mode}-${state.lessonId ?? state.sectionId}-${state.cell.day}-${state.cell.timeSlotId}`} {...props} state={state} />}
      </DialogContent>
    </Dialog>
  )
}

function DialogBody({
  catalog,
  lessons,
  state,
  onClose,
  onSave,
  onRemove,
  onMove,
  describeCell,
}: Props & { state: LessonDialogState }) {
  const section = catalog.sections.get(state.sectionId)
  const [teacherId, setTeacherId] = useState<string | null>(state.teacherId)
  const [roomId, setRoomId] = useState<string | null>(state.roomId)
  if (!section) return null

  const course = catalog.courses.get(section.courseId)
  const ctx = { catalog, lessons }
  const ignore = state.mode === 'edit' ? state.lessonId : undefined
  const slot = catalog.data.timeSlots.find((s) => s.id === state.cell.timeSlotId)

  const teacherIds = Array.from(new Set([...section.allowedTeacherIds, ...(state.teacherId ? [state.teacherId] : [])]))
  const teachers = teacherIds
    .map((id) => ({ teacher: catalog.teachers.get(id)!, conflict: checkTeacher(ctx, id, state.cell, ignore) }))
    .filter((t) => t.teacher)

  const rooms = [...catalog.data.rooms]
    .map((room) => ({ room, conflict: checkRoom(ctx, room, section.studentsCount, state.cell, ignore) }))
    .sort((a, b) => Number(Boolean(a.conflict)) - Number(Boolean(b.conflict)))

  const canSave = Boolean(
    teacherId && roomId && !teachers.find((t) => t.teacher.id === teacherId)?.conflict && !rooms.find((r) => r.room.id === roomId)?.conflict,
  )

  return (
    <>
      <DialogHeader className="gap-1 border-b border-border p-5 pr-12">
        <p className="font-mono text-xs font-semibold text-muted-foreground">{section.code}</p>
        <DialogTitle className="text-lg leading-snug">{course?.name}</DialogTitle>
        <DialogDescription>
          {describeCell(state.cell)}–{slot?.end} · {section.studentsCount}{' '}
          {plural(section.studentsCount, ['студент', 'студента', 'студентов'])}
        </DialogDescription>
      </DialogHeader>

      <div className="flex max-h-[60dvh] flex-col gap-5 overflow-y-auto p-5">
        {state.mode === 'create' && !section.teacherId && (
          <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn-strong">
            У этой секции пока нет преподавателя. Выберите, кто будет вести это занятие.
          </p>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Преподаватель</legend>
          {teachers.map(({ teacher, conflict }) => (
            <OptionRow
              key={teacher.id}
              name="teacher"
              checked={teacherId === teacher.id}
              disabled={Boolean(conflict)}
              onSelect={() => setTeacherId(teacher.id)}
              title={teacher.name}
              note={conflict ? conflict.message : 'Свободен в это время'}
            />
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Аудитория</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rooms.map(({ room, conflict }) => (
              <OptionRow
                key={room.id}
                name="room"
                checked={roomId === room.id}
                disabled={Boolean(conflict)}
                onSelect={() => setRoomId(room.id)}
                title={room.name}
                badge={room.type === section.preferredRoomType && !conflict ? 'Подходит' : undefined}
                note={
                  conflict
                    ? conflict.short
                    : `${room.capacity} мест · ${ROOM_TYPE_LABEL[room.type].toLowerCase()}`
                }
              />
            ))}
          </div>
        </fieldset>
      </div>

      <DialogFooter className="m-0 flex-row flex-wrap items-center gap-2 rounded-none border-t border-border bg-secondary/50 p-4 sm:justify-between">
        {state.mode === 'edit' && state.lessonId ? (
          <div className="flex gap-1">
            <Button variant="ghost" className="h-10 gap-1.5 rounded-full text-bad-strong hover:bg-bad-soft hover:text-bad-strong" onClick={() => onRemove(state.lessonId!)}>
              <Trash2 className="size-4" aria-hidden />
              Убрать
            </Button>
            <Button variant="ghost" className="h-10 gap-1.5 rounded-full" onClick={() => onMove(state.lessonId!)}>
              <Move className="size-4" aria-hidden />
              Переставить
            </Button>
          </div>
        ) : (
          <span />
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="h-10 rounded-full bg-card px-4" onClick={onClose}>
            Отмена
          </Button>
          <Button
            className="h-10 rounded-full px-5"
            disabled={!canSave}
            onClick={() => teacherId && roomId && onSave(state, teacherId, roomId)}
          >
            {state.mode === 'create' ? 'Поставить' : 'Сохранить'}
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}

function OptionRow({
  name,
  checked,
  disabled,
  onSelect,
  title,
  note,
  badge,
}: {
  name: string
  checked: boolean
  disabled: boolean
  onSelect: () => void
  title: string
  note: string
  badge?: string
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-3 ring-1 ring-border transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring',
        checked && 'bg-ok-soft ring-2 ring-ok-strong',
        disabled && 'cursor-not-allowed bg-stripes opacity-60',
        !checked && !disabled && 'hover:bg-secondary',
      )}
    >
      <input type="radio" name={name} className="sr-only" checked={checked} disabled={disabled} onChange={onSelect} />
      <span
        aria-hidden
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-foreground/20',
          checked && 'bg-ok-strong text-card ring-0',
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 text-sm font-medium">
          {title}
          {badge && <span className="rounded-full bg-ok px-1.5 py-px text-[11px] font-medium">{badge}</span>}
        </span>
        <span className="text-xs text-muted-foreground text-pretty">{note}</span>
      </span>
    </label>
  )
}
