import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "bg-[#1A1612]/90 border-[rgba(212,168,23,0.2)] text-white placeholder:text-white/40",
        "hover:border-[rgba(212,168,23,0.4)] hover:shadow-[0_0_0_1px_rgba(212,168,23,0.15)]",
        "focus:border-[#D4A817] focus:ring-2 focus:ring-[#D4A817]/40 focus:ring-offset-2 focus:ring-offset-[#252015] focus:outline-none focus:shadow-[0_0_0_3px_rgba(212,168,23,0.2)]",
        "focus-visible:border-[#D4A817] focus-visible:ring-2 focus-visible:ring-[#D4A817]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#252015] focus-visible:shadow-[0_0_0_3px_rgba(212,168,23,0.2)]",
        "aria-invalid:ring-[#DC2626]/20 aria-invalid:border-[#DC2626]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
