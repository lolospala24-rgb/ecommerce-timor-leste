'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, defaultChecked, onCheckedChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(event.target.checked)
      props.onChange?.(event)
    }

    return (
      <label className={cn('inline-flex items-center cursor-pointer', className)}>
        <input
          type="checkbox"
          role="switch"
          ref={ref}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={handleChange}
          className="sr-only"
          {...props}
        />
        <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors duration-200 ease-in-out">
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out',
              checked || defaultChecked ? 'translate-x-5' : 'translate-x-1'
            )}
          />
        </span>
      </label>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }
