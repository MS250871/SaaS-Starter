import Link from "next/link";
import { BellIcon } from "lucide-react";

import { LinkPendingHint } from "@/components/layout/link-pending-hint";
import { Button } from "@/components/ui/button";

export function AdminNotificationLinkButton({
  areaLabel,
  href,
}: {
  areaLabel: string;
  href: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="icon-sm"
      className="border-border/70 bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
    >
      <Link
        href={href}
        aria-label={`Open ${areaLabel.toLowerCase()} notifications`}
      >
        <BellIcon className="size-4" />
        <LinkPendingHint className="absolute -bottom-0.5 -right-0.5 size-2" />
      </Link>
    </Button>
  );
}
