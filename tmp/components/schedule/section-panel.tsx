'use client'

import { useDroppable } from '@dnd-kit/core'
import { ChevronDown, CircleCheck, Search, Undo2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { courseHue, plural, type Catalog } from '@/lib/schedule/catalog'
import type { Course, Section } from '@/lib/schedule/types'
import { cn } from '@/lib/utils'
import { Kbd } from './kbd'
import { SectionCard } from './section-card'

export const UNASSIGN_ZONE_ID = 'unassign-zone'
export const SEARCH_INPUT_ID = 'section-search'

type Tab = 'todo' | 'done' | 'all'

interface Props {
  catalog: Catalog
  placedBySection: Map<string, number>
  teacherFilter: string
  pickedSectionId: string | null
  onPick: (sectionId: string, viaKeyboard: boolean) => void
  isDraggingLesson: boolean
}

interface Group {
  course: Course
  hue: number
  sections: Section[]
  teacherIds: string[]
  withoutTeacher: number
  placed: number
  required: number
}

function initials(shortName: string) {
  return shortName
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
}

export function SectionPanel({
  catalog,
  placedBySection,
  teacherFilter,
  pickedSectionId,
  onPick,
  isDraggingLesson,
}: Props) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('todo')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [cursor, setCursor] = useState<string | null>(null)
  const { setNodeRef, isOver } = useDroppable({ id: UNASSIGN_ZONE_ID })

  const { groups, counts } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const isDone = (s: Section) => (placedBySection.get(s.id) ?? 0) >= s.requiredLessonsPerWeek
    const matching = catalog.data.sections.filter((section) => {
      if (teacherFilter !== 'all' && section.teacherId !== teacherFilter) return false
      if (!q) return true
      const course = catalog.courses.get(section.courseId)
      const teacher = section.teacherId ? catalog.teachers.get(section.teacherId) : undefined
      return [section.code, course?.name, course?.code, teacher?.name].some((v) => v?.toLowerCase().includes(q))
    })
    const byTab = (s: Section) => (tab === 'all' ? true : tab === 'done' ? isDone(s) : !isDone(s))

    const result: Group[] = []
    for (const course of catalog.data.courses) {
      const visible = matching.filter((s) => s.courseId === course.id && byTab(s))
      if (visible.length === 0) continue
      const all = catalog.data.sections.filter((s) => s.courseId === course.id)
      result.push({
        course,
        hue: courseHue(catalog, course.id),
        sections: visible,
        teacherIds: [...new Set(all.map((s) => s.teacherId).filter((id): id is string => Boolean(id)))],
        withoutTeacher: all.filter((s) => !s.teacherId).length,
        placed: all.reduce((sum, s) => sum + Math.min(placedBySection.get(s.id) ?? 0, s.requiredLessonsPerWeek), 0),
        required: all.reduce((sum, s) => sum + s.requiredLessonsPerWeek, 0),
      })
    }
    return {
      groups: result,
      counts: {
        todo: matching.filter((s) => !isDone(s)).length,
        done: matching.filter(isDone).length,
        all: matching.length,
      },
    }
  }, [catalog, placedBySection, query, tab, teacherFilter])

  const navKeys = useMemo(
    () =>
      groups.flatMap((g) => [
        `g:${g.course.id}`,
        ...(collapsed.has(g.course.id) ? [] : g.sections.map((s) => `s:${s.id}`)),
      ]),
    [groups, collapsed],
  )
  const roving = cursor && navKeys.includes(cursor) ? cursor : navKeys[0]

  const toggleGroup = (courseId: string, open?: boolean) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      const shouldOpen = open ?? next.has(courseId)
      if (shouldOpen) next.delete(courseId)
      else next.add(courseId)
      return next
    })

  const focusNav = (key: string | undefined, root: HTMLElement) => {
    if (key) root.querySelector<HTMLElement>(`[data-nav="${key}"]`)?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const key = (e.target as HTMLElement).dataset.nav
    if (!key || e.altKey || e.ctrlKey || e.metaKey) return
    const index = navKeys.indexOf(key)
    const root = e.currentTarget
    const id = key.slice(2)
    const isGroup = key.startsWith('g:')
    const go = (k: string | undefined) => {
      e.preventDefault()
      focusNav(k, root)
    }

    switch (e.key) {
      case 'ArrowDown':
        return go(navKeys[index + 1])
      case 'ArrowUp':
        return go(navKeys[index - 1])
      case 'Home':
        return go(navKeys[0])
      case 'End':
        return go(navKeys[navKeys.length - 1])
      case 'ArrowLeft':
        e.preventDefault()
        if (isGroup) return toggleGroup(id, false)
        return go(`g:${catalog.sections.get(id)?.courseId}`)
      case 'ArrowRight':
        e.preventDefault()
        if (isGroup && collapsed.has(id)) return toggleGroup(id, true)
        if (isGroup) return go(navKeys[index + 1])
        return
      case 'Enter':
      case ' ':
        if (isGroup) return
        e.preventDefault()
        return onPick(id, true)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'todo', label: 'Осталось' },
    { id: 'done', label: 'Готово' },
    { id: 'all', label: 'Все' },
  ]

  return (
    <aside
      ref={setNodeRef}
      aria-label="Секции"
      className="relative flex max-h-[42dvh] w-full shrink-0 flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-border md:max-h-none md:w-80 lg:w-[22rem]"
    >
      <div className="flex flex-col gap-3 p-4 pb-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Секции</h2>
          <span className="text-sm text-muted-foreground">
            {catalog.data.courses.length} {plural(catalog.data.courses.length, ['предмет', 'предмета', 'предметов'])} ·{' '}
            {catalog.data.sections.length} {plural(catalog.data.sections.length, ['секция', 'секции', 'секций'])}
          </span>
        </div>

        <label className="relative block">
          <span className="sr-only">Поиск секции</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id={SEARCH_INPUT_ID}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.stopPropagation()
                setQuery('')
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                focusNav(roving, e.currentTarget.closest('aside')!)
              }
            }}
            placeholder="Предмет, код или преподаватель"
            className="h-11 w-full rounded-2xl bg-secondary pr-10 pl-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-[2.5px] focus-visible:ring-foreground [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
              <span className="sr-only">Очистить поиск</span>
            </button>
          ) : (
            <Kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground">/</Kbd>
          )}
        </label>

        <div role="tablist" aria-label="Какие секции показать" className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex h-9 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-muted-foreground outline-none transition-colors focus-visible:ring-[2.5px] focus-visible:ring-foreground',
                tab === t.id ? 'bg-card text-foreground shadow-sm' : 'hover:text-foreground',
              )}
            >
              {t.label}
              <span
                className={cn(
                  'min-w-5 rounded-full px-1.5 text-xs tabular-nums',
                  tab === t.id && t.id === 'todo' && counts.todo > 0 ? 'bg-ok text-foreground' : 'bg-transparent',
                )}
              >
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <ul
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3"
        aria-label="Предметы и их секции. Стрелки — двигаться, Enter — взять секцию."
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          const key = (e.target as HTMLElement).dataset.nav
          if (key) setCursor(key)
        }}
      >
        {groups.map((group) => {
          const open = !collapsed.has(group.course.id)
          const groupKey = `g:${group.course.id}`
          const listId = `group-${group.course.id}`
          const teachers = group.teacherIds.map((id) => catalog.teachers.get(id)).filter(Boolean)
          return (
            <li key={group.course.id} className="flex flex-col">
              <button
                type="button"
                data-nav={groupKey}
                tabIndex={roving === groupKey ? 0 : -1}
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => toggleGroup(group.course.id)}
                className="group/head flex items-center gap-2.5 rounded-2xl px-2 py-2 text-left outline-none transition-colors hover:bg-secondary focus-visible:ring-[2.5px] focus-visible:ring-foreground"
              >
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded-lg transition-transform"
                  style={{ backgroundColor: `oklch(0.94 0.05 ${group.hue})`, color: `oklch(0.4 0.1 ${group.hue})` }}
                >
                  <ChevronDown className={cn('size-4 transition-transform', !open && '-rotate-90')} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{group.course.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {teachers.length} {plural(teachers.length, ['преподаватель', 'преподавателя', 'преподавателей'])}
                    {group.withoutTeacher > 0 && (
                      <span className="text-warn-strong"> · {group.withoutTeacher} без преп.</span>
                    )}
                    {' · '}
                    {group.placed}/{group.required} занятий
                  </span>
                </span>
                <span className="flex shrink-0 -space-x-1.5" aria-hidden>
                  {teachers.slice(0, 3).map((t) => (
                    <span
                      key={t!.id}
                      title={t!.shortName}
                      className="grid size-6 place-items-center rounded-full text-[10px] font-semibold ring-2 ring-card"
                      style={{ backgroundColor: `oklch(0.9 0.06 ${group.hue})`, color: `oklch(0.35 0.1 ${group.hue})` }}
                    >
                      {initials(t!.shortName)}
                    </span>
                  ))}
                  {group.withoutTeacher > 0 && (
                    <span className="grid size-6 place-items-center rounded-full bg-warn-soft text-[10px] font-semibold text-warn-strong ring-2 ring-card">
                      ?
                    </span>
                  )}
                </span>
              </button>

              {open && (
                <ul
                  id={listId}
                  className="mt-1 mb-2 ml-[1.375rem] flex flex-col gap-1.5 border-l-2 pl-3"
                  style={{ borderColor: `oklch(0.88 0.05 ${group.hue})` }}
                >
                  {group.sections.map((section) => {
                    const key = `s:${section.id}`
                    return (
                      <li key={section.id} className="relative">
                        <span
                          aria-hidden
                          className="absolute top-1/2 -left-3 h-0.5 w-2.5 -translate-y-1/2"
                          style={{ backgroundColor: `oklch(0.88 0.05 ${group.hue})` }}
                        />
                        <SectionCard
                          catalog={catalog}
                          section={section}
                          placed={placedBySection.get(section.id) ?? 0}
                          picked={pickedSectionId === section.id}
                          tabIndex={roving === key ? 0 : -1}
                          onPick={() => onPick(section.id, false)}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
        {groups.length === 0 && (
          <li className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
            {tab === 'todo' && !query ? (
              <>
                <CircleCheck className="size-8 text-ok-strong" aria-hidden />
                <span className="font-medium text-foreground">Всё поставлено</span>
                Все секции полностью в расписании.
              </>
            ) : (
              'Ничего не найдено. Попробуйте другой запрос или вкладку «Все».'
            )}
          </li>
        )}
      </ul>

      {isDraggingLesson && (
        <div
          className={cn(
            'absolute inset-2 z-10 flex flex-col items-center justify-center gap-3 rounded-[1.25rem] border-2 border-dashed p-6 text-center backdrop-blur-sm transition-colors',
            isOver
              ? 'border-bad-strong bg-bad-soft/95 text-bad-strong'
              : 'border-foreground/25 bg-card/90 text-foreground',
          )}
        >
          <span
            className={cn(
              'grid size-14 place-items-center rounded-full transition-transform',
              isOver ? 'scale-110 bg-bad-strong text-card' : 'bg-secondary',
            )}
          >
            <Undo2 className="size-6" aria-hidden />
          </span>
          <p className="text-base font-semibold">{isOver ? 'Отпустите — занятие уберётся' : 'Перетащите сюда, чтобы убрать'}</p>
          <p className="max-w-56 text-sm opacity-75">Занятие вернётся в список нераспределённых.</p>
        </div>
      )}
    </aside>
  )
}
