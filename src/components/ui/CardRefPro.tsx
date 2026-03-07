import type { ElementType, ReactNode } from "react";

type CardRefProProps<T extends ElementType = "section"> = {
  as?: T;
  className?: string;
  title?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
};

function cx(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

export function CardRefPro<T extends ElementType = "section">({
  as,
  className,
  title,
  meta,
  actions,
  footer,
  children,
}: CardRefProProps<T>) {
  const Component = (as ?? "section") as ElementType;
  const hasHeader = Boolean(title || meta || actions);

  return (
    <Component className={cx("card card-ref", className)}>
      {hasHeader ? (
        <header className="card-ref-head">
          <div>
            {title ? <h3 style={{ marginBottom: "0.25rem" }}>{title}</h3> : null}
            {meta ? <p className="meta-line">{meta}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </header>
      ) : null}
      <div className="card-ref-body">{children}</div>
      {footer ? <footer style={{ marginTop: "12px" }}>{footer}</footer> : null}
    </Component>
  );
}
