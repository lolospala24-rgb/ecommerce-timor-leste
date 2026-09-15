"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cn } from '@/lib/utils'

function Sheet({ children, ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root {...props}>{children}</SheetPrimitive.Root>
}

function SheetTrigger({ children, ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger {...props}>{children}</SheetPrimitive.Trigger>
}

function SheetContent({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50" />
      <SheetPrimitive.Content
        className={cn("fixed right-0 top-0 z-50 h-full w-[320px] bg-background p-4 shadow-lg", className)}
        {...props}
      />
    </SheetPrimitive.Portal>
  )
}

export { Sheet, SheetTrigger, SheetContent }
