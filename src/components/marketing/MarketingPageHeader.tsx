export function MarketingPageHeader({
  label,
  title,
  description,
}: {
  label: string
  title: string
  description?: string
}) {
  return (
    <section className="py-20 sm:py-28">
      <div className="container-wide">
        <div className="mx-auto max-w-2xl text-center">
          <span className="label-caption text-primary">{label}</span>
          <h1 className="mt-4 text-display-lg font-display font-semibold tracking-tight text-foreground text-balance">
            {title}
          </h1>
          {description && (
            <p className="mx-auto mt-6 max-w-lg text-body-lg text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </section>
  )
}
