"use client";

import { useLinkStatus } from "next/link";

import { cn } from "@/lib/utils";

export function LinkPendingHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 shrink-0 rounded-full bg-current opacity-0 transition-opacity duration-150 ease-out",
        pending
          ? "visible opacity-35 motion-safe:animate-pulse"
          : "invisible",
        className,
      )}
    />
  );
}
