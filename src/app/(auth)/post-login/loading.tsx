export default function PostLoginLoading() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 text-center">
        <p className="text-sm font-medium">Finishing sign in...</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;re preparing your account and deciding where to take you next.
        </p>
      </div>
    </div>
  );
}
