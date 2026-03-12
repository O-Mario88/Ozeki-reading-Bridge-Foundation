import { ElementType, ReactNode } from "react";

type CommonProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children: ReactNode;
};

function cx(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

export function PageContainer<T extends ElementType = "div">({
  as,
  className,
  children,
}: CommonProps<T>) {
  const Component = (as ?? "div") as ElementType;
  return <Component className={cx("page-container", className)}>{children}</Component>;
}

export function Section<T extends ElementType = "section">({
  as,
  className,
  children,
}: CommonProps<T>) {
  const Component = (as ?? "section") as ElementType;
  return <Component className={cx("ui-section", className)}>{children}</Component>;
}

export function Stack<T extends ElementType = "div">({
  as,
  className,
  children,
}: CommonProps<T>) {
  const Component = (as ?? "div") as ElementType;
  return <Component className={cx("ui-stack", className)}>{children}</Component>;
}

export function Grid<T extends ElementType = "div">({
  as,
  className,
  children,
}: CommonProps<T>) {
  const Component = (as ?? "div") as ElementType;
  return <Component className={cx("ui-grid", className)}>{children}</Component>;
}
