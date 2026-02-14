interface PageHeroProps {
  kicker?: string;
  title: string;
  description: string;
}

export function PageHero({ kicker, title, description }: PageHeroProps) {
  return (
    <section className="page-hero">
      <div className="container">
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
