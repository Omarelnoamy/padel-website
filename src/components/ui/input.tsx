import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(
          "file:text-white placeholder:text-white/40 selection:bg-[#D4A817]/30 selection:text-white bg-[#1A1612]/90 border-[rgba(212,168,23,0.2)] flex h-9 w-full min-w-0 rounded-lg border px-3 py-1 text-base text-white transition-all duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "shadow-[0_1px_2px_rgba(0,0,0,0.2)] hover:border-[rgba(212,168,23,0.4)] hover:shadow-[0_0_0_1px_rgba(212,168,23,0.15)]",
          "focus:border-[#D4A817] focus:ring-2 focus:ring-[#D4A817]/40 focus:ring-offset-2 focus:ring-offset-[#252015] focus:shadow-[0_0_0_3px_rgba(212,168,23,0.2)] focus:outline-none",
          "focus-visible:border-[#D4A817] focus-visible:ring-2 focus-visible:ring-[#D4A817]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#252015] focus-visible:shadow-[0_0_0_3px_rgba(212,168,23,0.2)]",
          "aria-invalid:ring-[#DC2626]/20 aria-invalid:border-[#DC2626]",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
