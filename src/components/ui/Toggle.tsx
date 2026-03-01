import { cn } from '@/lib/utils/cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
}

export function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <label className={cn('inline-flex items-center gap-3 cursor-pointer', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          checked ? 'bg-primary-500' : 'bg-warm-300'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
            checked ? 'translate-x-5.5 mt-0.5 ml-0' : 'translate-x-0.5 mt-0.5'
          )}
        />
      </button>
      {label && <span className="text-sm font-medium text-warm-700">{label}</span>}
    </label>
  )
}
