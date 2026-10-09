import { Redo2, Undo2 } from 'lucide-react'
import { plural } from '@/lib/schedule/catalog'
import { Button } from '@/components/ui/button'

interface Props {
  placed: number
  required: number
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function ScheduleHeader({ placed, required, canUndo, canRedo, onUndo, onRedo }: Props) {
  const left = required - placed
  const percent = required === 0 ? 100 : Math.round((placed / required) * 100)

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 px-3 py-3 md:px-5 md:py-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground" aria-hidden>
          <span className="grid grid-cols-2 gap-0.5">
            <span className="size-1.5 rounded-[2px] bg-ok" />
            <span className="size-1.5 rounded-[2px] bg-primary-foreground/40" />
            <span className="size-1.5 rounded-[2px] bg-primary-foreground/40" />
            <span className="size-1.5 rounded-[2px] bg-primary-foreground/40" />
          </span>
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight tracking-tight">Расписание на неделю</h1>
          <p className="text-sm text-muted-foreground">Весенний семестр</p>
        </div>
      </div>

      <div className="order-last flex min-w-64 flex-1 items-center gap-4 md:order-none md:max-w-md">
        <div className="flex-1">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-medium">
              Поставлено {placed} из {required}
            </span>
            <span className="text-muted-foreground">
              {left === 0 ? 'Всё готово' : `осталось ${left} ${plural(left, ['занятие', 'занятия', 'занятий'])}`}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={required}
            aria-valuenow={placed}
            aria-label="Сколько занятий уже в расписании"
          >
            <div
              className="h-full rounded-full bg-ok-strong transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="outline" className="h-9 gap-1.5 rounded-full bg-card px-3.5" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="size-4" aria-hidden />
          Отменить
        </Button>
        <Button variant="outline" className="h-9 gap-1.5 rounded-full bg-card px-3.5" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="size-4" aria-hidden />
          Вернуть
        </Button>
      </div>
    </header>
  )
}
