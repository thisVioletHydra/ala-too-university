import { Copy } from 'lucide-react'
import { courseHue, type Catalog } from '@/lib/schedule/catalog'
import type { Lesson, PlacementSource } from '@/lib/schedule/types'

export function DragPreview({
  catalog,
  source,
  lessons,
}: {
  catalog: Catalog
  source: PlacementSource
  lessons: Lesson[]
}) {
  const sectionId =
    source.kind === 'section' ? source.sectionId : lessons.find((l) => l.id === source.lessonId)?.sectionId
  const section = sectionId ? catalog.sections.get(sectionId) : undefined
  if (!section) return null
  const course = catalog.courses.get(section.courseId)
  const hue = courseHue(catalog, section.courseId)
  const copy = source.kind === 'lesson' && source.copy

  return (
    <div
      className="flex w-56 -rotate-2 cursor-grabbing flex-col gap-0.5 rounded-xl px-3 py-2.5 shadow-2xl ring-1 ring-foreground/10"
      style={{ backgroundColor: `oklch(0.95 0.045 ${hue})`, color: `oklch(0.28 0.06 ${hue})` }}
    >
      <span className="flex items-center justify-between font-mono text-[11px] font-semibold opacity-75">
        {section.code}
        {copy && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-sans text-primary-foreground">
            <Copy className="size-3" aria-hidden />
            Копия
          </span>
        )}
      </span>
      <span className="text-sm font-semibold leading-snug">{course?.name}</span>
    </div>
  )
}
