import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          {
            'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-md hover:shadow-lg':
              variant === 'primary',
            'bg-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700 shadow-md hover:shadow-lg':
              variant === 'secondary',
            'border-2 border-primary-300 text-primary-700 hover:bg-primary-50 active:bg-primary-100':
              variant === 'outline',
            'text-warm-600 hover:text-warm-800 hover:bg-warm-100':
              variant === 'ghost',
          },
          {
            'h-8 px-3 text-sm gap-1.5': size === 'sm',
            'h-10 px-5 text-sm gap-2': size === 'md',
            'h-12 px-7 text-base gap-2.5': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
