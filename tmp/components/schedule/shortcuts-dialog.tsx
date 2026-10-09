'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Kbd } from './kbd'

const GROUPS: { title: string; items: { keys: string[][]; text: string }[] }[] = [
  {
    title: 'Перемещение',
    items: [
      { keys: [['Tab']], text: 'Перейти между списком секций и сеткой' },
      { keys: [['↑'], ['↓'], ['←'], ['→']], text: 'Двигаться по списку или по сетке' },
      { keys: [['Home'], ['End']], text: 'В начало / в конец строки' },
      { keys: [['/']], text: 'Поиск секций' },
    ],
  },
  {
    title: 'Список секций',
    items: [
      { keys: [['Enter']], text: 'Взять секцию — фокус сам прыгнет на свободную ячейку' },
      { keys: [['←'], ['→']], text: 'Свернуть / развернуть предмет' },
    ],
  },
  {
    title: 'Сетка',
    items: [
      { keys: [['Enter']], text: 'Поставить взятое сюда · открыть занятие' },
      { keys: [['Пробел']], text: 'Взять занятие, чтобы перенести' },
      { keys: [['C']], text: 'Взять копию занятия' },
      { keys: [['Delete']], text: 'Убрать занятие из расписания' },
      { keys: [['Esc']], text: 'Положить обратно, ничего не меняя' },
    ],
  },
  {
    title: 'История',
    items: [
      { keys: [['Ctrl', 'Z']], text: 'Отменить' },
      { keys: [['Ctrl', 'Shift', 'Z']], text: 'Вернуть' },
      { keys: [['?']], text: 'Показать эту подсказку' },
    ],
  },
]

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] gap-5 overflow-y-auto rounded-3xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Работа с клавиатуры</DialogTitle>
          <DialogDescription>
            Мышь не нужна. Буквы работают в любой раскладке — русской или английской.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group.title} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.title}</h3>
              <ul className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <li key={item.text} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-pretty">{item.text}</span>
                    <span className="flex shrink-0 gap-1">
                      {item.keys.map((combo) => (
                        <span key={combo.join('+')} className="flex items-center gap-0.5">
                          {combo.map((k) => (
                            <Kbd key={k}>{k}</Kbd>
                          ))}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
