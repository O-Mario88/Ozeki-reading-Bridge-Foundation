interface PageHeroProps {
  kicker?: string;
  title: string;
  description: string;
}

export function PageHero({ kicker, title, description }: PageHeroProps) {
  return (
    <section className="section tpd-hero-section bg-surface-container" style={{ backgroundColor: 'var(--md-sys-color-surface-container)', padding: '5rem 0 3rem' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          {kicker ? <p className="kicker">{kicker}</p> : null}
          <h1 className="tpd-page-title" style={{ margin: 0, color: 'var(--md-sys-color-primary)' }}>{title}</h1>
          <p style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '1.15rem', margin: 0 }}>{description}</p>
        </div>
      </div>
    </section>
  );
}
