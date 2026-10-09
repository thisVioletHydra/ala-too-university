'use client'

import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface ToastMessage {
  id: number
  tone: 'ok' | 'error'
  text: string
  withUndo: boolean
}

interface Props {
  message: ToastMessage | null
  onUndo: () => void
  onDismiss: () => void
}

export function Toast({ message, onUndo, onDismiss }: Props) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, message.tone === 'error' ? 6000 : 4500)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      {message && (
        <div
          key={message.id}
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex max-w-xl animate-in items-center gap-3 rounded-2xl py-2.5 pr-2 pl-4 text-sm shadow-2xl fade-in slide-in-from-bottom-3',
            message.tone === 'error' ? 'bg-bad-strong text-card' : 'bg-primary text-primary-foreground',
          )}
        >
          {message.tone === 'error' ? (
            <CircleAlert className="size-4 shrink-0" aria-hidden />
          ) : (
            <CircleCheck className="size-4 shrink-0 text-ok" aria-hidden />
          )}
          <span className="text-pretty">{message.text}</span>
          {message.withUndo && (
            <button
              type="button"
              onClick={() => {
                onUndo()
                onDismiss()
              }}
              className="shrink-0 rounded-full bg-primary-foreground/15 px-3 py-1 font-medium hover:bg-primary-foreground/25"
            >
              Отменить
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-primary-foreground/15"
          >
            <X className="size-4" aria-hidden />
            <span className="sr-only">Закрыть</span>
          </button>
        </div>
      )}
    </div>
  )
}
