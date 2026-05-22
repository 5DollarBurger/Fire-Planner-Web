"use client"

import { Tooltip } from "@base-ui/react/tooltip"
import { Info } from "lucide-react"

interface FieldTooltipProps {
  label: string
  tip: string
  htmlFor?: string
}

export function FieldTooltip({ label, tip, htmlFor }: FieldTooltipProps) {
  return (
    <Tooltip.Provider delay={250}>
      <label htmlFor={htmlFor} className="flex items-center gap-1.5">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Tooltip.Root>
          <Tooltip.Trigger className="flex text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-default outline-none">
            <Info className="w-3 h-3" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner side="top" align="start" sideOffset={6}>
              <Tooltip.Popup className="z-50 max-w-xs border border-border bg-card px-3 py-2 shadow-sm">
                <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </label>
    </Tooltip.Provider>
  )
}
