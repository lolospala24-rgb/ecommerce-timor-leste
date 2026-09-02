import * as React from 'react'

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function ScrollArea({ className = '', children, ...props }: ScrollAreaProps) {
  return (
    <div className={`overflow-auto ${className}`} data-lenis-prevent {...props}>
      {children}
    </div>
  )
}
