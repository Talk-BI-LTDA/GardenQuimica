'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="flex items-center border-b px-3">
        <Input
          ref={ref}
          className={cn(
            "flex w-full rounded-md bg-transparent py-2 px-2 text-sm outline-none placeholder:text-gray-500",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

CommandInput.displayName = "CommandInput"

export default CommandInput