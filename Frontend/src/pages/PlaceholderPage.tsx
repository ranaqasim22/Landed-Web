export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-4 text-center">
      <title>{`${title} · Landed`}</title>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">This page is coming soon.</p>
    </main>
  )
}
