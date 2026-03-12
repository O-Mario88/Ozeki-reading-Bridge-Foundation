import { ReactNode } from "react";

type FloatingFieldProps = {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
};

function cx(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

export function FloatingField({
  label,
  hint,
  error,
  className,
  children,
}: FloatingFieldProps) {
  return (
    <label className={cx("portal-filter-field", className)}>
      <span className="portal-filter-field-label">{label}</span>
      {children}
      {hint ? <small className="portal-field-help">{hint}</small> : null}
      {error ? <small style={{ color: "var(--md-sys-color-error)" }}>{error}</small> : null}
    </label>
  );
}
