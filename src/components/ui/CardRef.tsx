import type { ElementType, ReactNode } from "react";

type CardRefProps<T extends ElementType = "section"> = {
  as?: T;
  className?: string;
  prefix?: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  headerRight?: ReactNode;
  showMenu?: boolean;
  menuLabel?: string;
  onMenuClick?: () => void;
  footer?: ReactNode;
  children?: ReactNode;
};

function cx(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

export function CardRef<T extends ElementType = "section">({
  as,
  className,
  prefix,
  title,
  meta,
  headerRight,
  showMenu = false,
  menuLabel = "Card options",
  onMenuClick,
  footer,
  children,
}: CardRefProps<T>) {
  const Component = (as ?? "section") as ElementType;
  const hasHeader = Boolean(prefix || title || meta || headerRight || showMenu);
  const hasFooter = Boolean(footer);

  return (
    <Component className={cx("card-ref", className)}>
      {hasHeader ? (
        <header className="card-ref-head">
          <div className="card-ref-title-wrap">
            {(prefix || title) ? (
              <h3 className="card-ref-title-line">
                {prefix ? <span className="card-ref-prefix">{prefix}</span> : null}
                {title ? <span className="card-ref-title">{title}</span> : null}
              </h3>
            ) : null}
            {meta ? <p className="card-ref-meta">{meta}</p> : null}
          </div>
          {headerRight ? (
            <div className="card-ref-head-actions">{headerRight}</div>
          ) : showMenu ? (
            <button
              type="button"
              className="card-ref-menu"
              aria-label={menuLabel}
              title={menuLabel}
              onClick={onMenuClick}
            >
              •••
            </button>
          ) : null}
        </header>
      ) : null}

      {hasHeader || hasFooter ? <div className="card-ref-body">{children}</div> : children}

      {hasFooter ? (
        <>
          <hr className="card-ref-divider" />
          <footer>{footer}</footer>
        </>
      ) : null}
    </Component>
  );
}

export function CardRefDivider() {
  return <hr className="card-ref-divider" />;
}

export function CardRefInfoIcon({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span className={cx("card-ref-info-icon", className)} aria-label={label} role="img" title={label}>
      ?
    </span>
  );
}

type CardRefMetricCell = {
  label: ReactNode;
  value: ReactNode;
  subtext?: ReactNode;
};

export function CardRefKpiRow({
  left,
  right,
}: {
  left: CardRefMetricCell;
  right: CardRefMetricCell;
}) {
  return (
    <div className="card-ref-kpi-row">
      <div className="card-ref-kpi-cell">
        <span className="card-ref-kpi-label">{left.label}</span>
        <strong className="card-ref-kpi-value">{left.value}</strong>
        {left.subtext ? <span className="card-ref-kpi-sub">{left.subtext}</span> : null}
      </div>
      <div className="card-ref-kpi-cell">
        <span className="card-ref-kpi-label">{right.label}</span>
        <strong className="card-ref-kpi-value">{right.value}</strong>
        {right.subtext ? <span className="card-ref-kpi-sub">{right.subtext}</span> : null}
      </div>
    </div>
  );
}
