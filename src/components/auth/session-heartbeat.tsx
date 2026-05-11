"use client"

import * as React from "react"

import { USER_SESSION_HEARTBEAT_INTERVAL_MS } from "@/lib/auth/auth-config"

export function SessionHeartbeat() {
  React.useEffect(() => {
    let isDisposed = false

    const ping = async () => {
      if (isDisposed || document.visibilityState === "hidden") {
        return
      }

      try {
        const response = await fetch("/api/auth/session/heartbeat", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        })

        if (!isDisposed && response.status === 401) {
          window.location.assign("/login")
        }
      } catch {
        // Ignore transient network failures and try again on the next interval.
      }
    }

    const onVisible = () => {
      void ping()
    }

    void ping()

    const intervalId = window.setInterval(() => {
      void ping()
    }, USER_SESSION_HEARTBEAT_INTERVAL_MS)

    window.addEventListener("focus", onVisible)
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      isDisposed = true
      window.clearInterval(intervalId)
      window.removeEventListener("focus", onVisible)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  return null
}
