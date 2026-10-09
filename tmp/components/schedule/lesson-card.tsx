'use client'

import { useDraggable } from '@dnd-kit/core'
import { DoorOpen } from 'lucide-react'
import { courseHue, type Catalog } from '@/lib/schedule/catalog'
import type { Lesson, PlacementSource } from '@/lib/schedule/types'
import { cn } from '@/lib/utils'

interface Props {
  catalog: Catalog
  lesson: Lesson
  dimmed: boolean
  tabIndex: number
  onOpen: () => void
}

export function LessonCard({ catalog, lesson, dimmed, tabIndex, onOpen }: Props) {
  const source: PlacementSource = { kind: 'lesson', lessonId: lesson.id, copy: false }
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `lesson:${lesson.id}`,
    data: { source },
  })

  const section = catalog.sections.get(lesson.sectionId)
  const course = section ? catalog.courses.get(section.courseId) : undefined
  const teacher = catalog.teachers.get(lesson.teacherId)
  const room = catalog.rooms.get(lesson.roomId)
  const hue = section ? courseHue(catalog, section.courseId) : 0

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      data-nav={`l:${lesson.id}`}
      tabIndex={tabIndex}
      aria-roledescription="занятие"
      aria-label={`${section?.code} ${course?.name}, ${teacher?.shortName}, аудитория ${room?.name}. Enter — изменить, пробел — перенести, C — копия, Delete — убрать.`}
      className={cn(
        'relative flex scroll-mt-14 scroll-ml-20 cursor-grab touch-manipulation flex-col gap-1 rounded-xl px-2.5 py-2 text-left outline-none transition-[opacity,transform,box-shadow] select-none',
        'hover:-translate-y-px hover:shadow-md focus-visible:-translate-y-px focus-visible:shadow-md focus-visible:ring-[2.5px] focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card active:cursor-grabbing',
        dimmed && 'opacity-35',
        isDragging && 'opacity-30 ring-2 ring-dashed ring-foreground/30',
      )}
      style={{
        backgroundColor: `oklch(0.95 0.045 ${hue})`,
        color: `oklch(0.28 0.06 ${hue})`,
      }}
    >
      <span className="font-mono text-[11px] font-semibold opacity-75">{section?.code}</span>
      <span className="line-clamp-2 text-[13px] font-semibold leading-snug">{course?.name}</span>
      <span className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate opacity-80">{teacher?.shortName}</span>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-medium"
          style={{ backgroundColor: `oklch(1 0 0 / 0.65)` }}
        >
          <DoorOpen className="size-3" aria-hidden />
          {room?.name}
        </span>
      </span>
    </div>
  )
}
