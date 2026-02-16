interface PageHeroProps {
  kicker?: string;
  title: string;
  description: string;
}

export function PageHero({ kicker, title, description }: PageHeroProps) {
  return (
    <section className="hero hero-unified">
      <div className="container hero-layout hero-layout-single">
        <div className="hero-copy hero-copy-with-photo page-hero-copy">
          {kicker ? <p className="kicker">{kicker}</p> : null}
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
    </section>
  );
}
