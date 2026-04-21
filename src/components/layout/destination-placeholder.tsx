type DestinationPlaceholderProps = {
  title: string;
  description: string;
  route: string;
};

export function DestinationPlaceholder({
  title,
  description,
  route,
}: DestinationPlaceholderProps) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-2xl rounded-xl border bg-background p-8 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">{route}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
