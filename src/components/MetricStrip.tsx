interface Metric {
  label: string;
  value: number;
}

export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="metric-strip">
      <div className="container metric-grid">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <strong>{metric.value.toLocaleString()}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
