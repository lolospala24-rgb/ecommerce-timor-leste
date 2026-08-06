import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  onCheckedChange?: (checked: boolean) => void
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, onCheckedChange, onChange, checked, defaultChecked, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      if (typeof onCheckedChange === 'function') onCheckedChange(e.target.checked)
    }

    // If `checked` is provided but no change handler exists, mark as readOnly to avoid React warning.
    const readOnly = checked !== undefined && !onChange && !onCheckedChange

    return (
      <label className={cn('inline-flex items-center cursor-pointer gap-2', className)}>
        <span className="sr-only">{label ?? 'Toggle switch'}</span>
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          onChange={handleChange}
          checked={checked}
          defaultChecked={defaultChecked}
          readOnly={readOnly}
          {...props}
        />
        <span className="h-5 w-10 rounded-full border border-input bg-muted transition-colors peer-checked:bg-primary"></span>
        {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
      </label>
    )
  }
)
Switch.displayName = 'Switch'
