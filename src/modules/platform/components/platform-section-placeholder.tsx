import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type PlatformSectionPlaceholderProps = {
  route: string
  title: string
  description: string
}

export function PlatformSectionPlaceholder({
  route,
  title,
  description,
}: PlatformSectionPlaceholderProps) {
  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/80">
        <CardHeader>
          <CardDescription>{route}</CardDescription>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-6">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
