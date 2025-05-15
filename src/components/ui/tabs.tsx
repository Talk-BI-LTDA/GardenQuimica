"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-2b", className)} {...props} />
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-white text-muted-foreground shadow-sm inline-flex h-13 w-fit items-center justify-center rounded-lg p-4 relative",
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-[#074366] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-white inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-12 py-5 text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out focus-visible:ring-[3px] focus-visible:outline-1 cursor-pointer disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[state=active]:text-white relative overflow-hidden",
        className,
      )}
      {...props}
    >
      {props.children}
      <TabsRipple />
    </TabsPrimitive.Trigger>
  )
}

// Componente de efeito ripple para o trigger
function TabsRipple() {
  const [ripples, setRipples] = React.useState<{ x: number; y: number; id: number }[]>([])

  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const id = Date.now()

    setRipples([...ripples, { x, y, id }])

    // Remover o ripple após a animação
    setTimeout(() => {
      setRipples((ripples) => ripples.filter((ripple) => ripple.id !== id))
    }, 1000)
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" onClick={addRipple}>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/20 animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} asChild {...props}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.3,
            ease: [0.22, 1, 0.36, 1],
          },
        }}
        exit={{ opacity: 0, y: -10 }}
      >
        {props.children}
      </motion.div>
    </TabsPrimitive.Content>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
