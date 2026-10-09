import { cn } from '@/lib/utils'

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-b-2 border-border bg-card px-1.5 font-sans text-xs font-medium text-foreground',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
