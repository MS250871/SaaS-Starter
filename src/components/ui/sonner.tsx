"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      richColors
      closeButton
      visibleToasts={4}
      expand={false}
      duration={4000}
      gap={10}
      offset={{ top: 16, right: 16, bottom: 16, left: 16 }}
      mobileOffset={{ top: 12, right: 12, bottom: 12, left: 12 }}
      containerAriaLabel="Notifications"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast rounded-xl border border-border/70 shadow-lg shadow-black/10 backdrop-blur-sm",
          title: "text-sm font-medium",
          description: "text-sm text-muted-foreground",
          closeButton:
            "border-border/70 bg-background text-muted-foreground hover:text-foreground",
          success: "border-emerald-500/25",
          error: "border-destructive/30",
          warning: "border-amber-500/30",
          info: "border-sky-500/25",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
