'use client'

import { useDraggable } from '@dnd-kit/core'
import { Check, GripVertical, UserRound } from 'lucide-react'
import { plural, type Catalog } from '@/lib/schedule/catalog'
import type { PlacementSource, Section } from '@/lib/schedule/types'
import { cn } from '@/lib/utils'

interface Props {
  catalog: Catalog
  section: Section
  placed: number
  picked: boolean
  tabIndex: number
  onPick: () => void
}

export function SectionCard({ catalog, section, placed, picked, tabIndex, onPick }: Props) {
  const source: PlacementSource = { kind: 'section', sectionId: section.id }
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `section:${section.id}`,
    data: { source },
  })

  const course = catalog.courses.get(section.courseId)
  const teacher = section.teacherId ? catalog.teachers.get(section.teacherId) : undefined
  const required = section.requiredLessonsPerWeek
  const left = Math.max(required - placed, 0)
  const done = left === 0
  const dots = Math.max(required, placed)

  const status = done
    ? 'Всё поставлено'
    : placed === 0
      ? `Нужно ${required} ${plural(required, ['занятие', 'занятия', 'занятий'])}`
      : `Ещё ${left} ${plural(left, ['занятие', 'занятия', 'занятий'])}`

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-nav={`s:${section.id}`}
      tabIndex={tabIndex}
      onClick={onPick}
      aria-pressed={picked}
      aria-roledescription="секция"
      aria-label={`${course?.name}, ${section.code}, ${teacher?.shortName ?? 'преподаватель не выбран'}. ${status}. Enter — взять.`}
      className={cn(
        'group relative flex cursor-grab touch-manipulation items-center gap-3 rounded-2xl bg-card px-3 py-2.5 text-left outline-none transition-all select-none active:cursor-grabbing',
        'ring-1 ring-border hover:ring-foreground/20 hover:shadow-sm',
        'focus-visible:ring-[2.5px] focus-visible:ring-foreground',
        picked && 'bg-ok-soft ring-2 ring-ok-strong hover:ring-ok-strong',
        isDragging && 'opacity-40',
        done && !picked && 'bg-transparent opacity-60 hover:opacity-100',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          {teacher ? (
            <span className="truncate text-[15px] font-medium">{teacher.shortName}</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn-strong">
              <UserRound className="size-3" aria-hidden />
              Без преподавателя
            </span>
          )}
          <span className="shrink-0 font-mono text-xs text-muted-foreground">{section.code}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: dots }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 w-4 rounded-full',
                  i < placed ? (i >= required ? 'bg-warn-strong' : 'bg-ok-strong') : 'bg-foreground/10',
                )}
              />
            ))}
          </span>
          <span className={cn('flex items-center gap-1 text-xs font-medium', done ? 'text-ok-strong' : 'text-foreground')}>
            {done && <Check className="size-3.5" aria-hidden />}
            {status}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {section.studentsCount} {plural(section.studentsCount, ['студ.', 'студ.', 'студ.'])}
          </span>
        </div>
        {picked && (
          <p className="text-xs font-medium text-ok-strong">Теперь выберите зелёную ячейку справа</p>
        )}
      </div>
      <GripVertical
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground"
      />
    </div>
  )
}
