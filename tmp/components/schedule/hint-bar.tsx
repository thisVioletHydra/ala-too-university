'use client'

import { Copy, Hand, MousePointerClick, X } from 'lucide-react'
import type { Catalog } from '@/lib/schedule/catalog'
import type { Lesson, PlacementSource } from '@/lib/schedule/types'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Filters } from './schedule-app'

interface Props {
  catalog: Catalog
  source: PlacementSource | null
  lessons: Lesson[]
  isDragging: boolean
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  onCancelPick: () => void
}

function sourceCode(catalog: Catalog, source: PlacementSource, lessons: Lesson[]) {
  const sectionId =
    source.kind === 'section' ? source.sectionId : lessons.find((l) => l.id === source.lessonId)?.sectionId
  return sectionId ? catalog.sections.get(sectionId)?.code : ''
}

export function HintBar({ catalog, source, lessons, isDragging, filters, onFiltersChange, onCancelPick }: Props) {
  const teacherItems = [
    { value: 'all', label: 'Все преподаватели' },
    ...catalog.data.teachers.map((t) => ({ value: t.id, label: t.shortName })),
  ]
  const roomItems = [
    { value: 'all', label: 'Все аудитории' },
    ...catalog.data.rooms.map((r) => ({ value: r.id, label: `${r.name} · ${r.capacity} мест` })),
  ]

  const active = Boolean(source)
  const code = source ? sourceCode(catalog, source, lessons) : ''

  let icon = <MousePointerClick className="size-4" aria-hidden />
  let text: React.ReactNode = (
    <>
      Перетащите секцию в ячейку. <span className="text-muted-foreground">Или нажмите на секцию, а потом на ячейку.</span>
    </>
  )

  if (source?.kind === 'section') {
    icon = <Hand className="size-4" aria-hidden />
    text = (
      <>
        <span className="font-mono font-semibold">{code}</span> — выберите{' '}
        <span className="rounded-md bg-ok px-1.5 py-0.5 font-medium">зелёную</span> ячейку. Серые заняты, причина написана внутри.
      </>
    )
  } else if (source?.kind === 'lesson') {
    icon = source.copy ? <Copy className="size-4" aria-hidden /> : <Hand className="size-4" aria-hidden />
    text = source.copy ? (
      <>
        Копируем <span className="font-mono font-semibold">{code}</span> — отпустите в зелёной ячейке.
      </>
    ) : (
      <>
        Переносим <span className="font-mono font-semibold">{code}</span>.{' '}
        <span className="text-muted-foreground">
          {isDragging ? 'Влево в список — убрать. Зажмите Alt — копия.' : 'Нажмите на зелёную ячейку.'}
        </span>
      </>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-4 py-2 text-sm transition-colors',
          active ? 'bg-primary text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/60' : 'bg-card ring-1 ring-border',
        )}
      >
        <span className={cn('shrink-0', active ? 'text-ok' : 'text-muted-foreground')}>{icon}</span>
        <p className="min-w-0 flex-1 text-pretty [&_.bg-ok]:text-foreground">{text}</p>
        {active && !isDragging && (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 gap-1 rounded-full"
            onClick={onCancelPick}
          >
            <X className="size-3.5" aria-hidden />
            Отмена
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Select
          items={teacherItems}
          value={filters.teacherId}
          onValueChange={(value) => onFiltersChange({ ...filters, teacherId: (value as string) ?? 'all' })}
        >
          <SelectTrigger
            aria-label="Показать преподавателя"
            className={cn('h-11 min-w-44 rounded-2xl bg-card px-3.5', filters.teacherId !== 'all' && 'ring-2 ring-ring')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teacherItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={roomItems}
          value={filters.roomId}
          onValueChange={(value) => onFiltersChange({ ...filters, roomId: (value as string) ?? 'all' })}
        >
          <SelectTrigger
            aria-label="Показать аудиторию"
            className={cn('h-11 min-w-40 rounded-2xl bg-card px-3.5', filters.roomId !== 'all' && 'ring-2 ring-ring')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roomItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
