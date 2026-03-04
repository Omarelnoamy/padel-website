import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#D4A817] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] will-change-transform",
  {
    variants: {
      variant: {
        default:
          "bg-[#D4A817] text-white shadow-[0_10px_30px_rgba(212,168,23,0.25)] hover:bg-[#E6C420] hover:shadow-[0_12px_35px_rgba(212,168,23,0.35)]",
        destructive:
          "bg-[#DC2626] text-white shadow-xs hover:bg-[#B91C1C] focus-visible:ring-[#DC2626]",
        outline:
          "border border-[rgba(255,255,255,0.2)] bg-transparent text-white shadow-xs hover:border-[#D4A817] hover:text-[#D4A817] hover:bg-[rgba(212,168,23,0.05)]",
        secondary:
          "bg-[rgba(255,255,255,0.08)] text-white shadow-xs hover:bg-[rgba(255,255,255,0.12)]",
        ghost:
          "text-white hover:bg-[rgba(255,255,255,0.08)] hover:text-white",
        link: "text-[#D4A817] underline-offset-4 hover:underline hover:text-[#E6C420]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
