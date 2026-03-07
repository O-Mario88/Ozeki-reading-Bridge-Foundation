import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "accent" | "ghost";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "sm",
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        "button",
        variant === "secondary" && "button-ghost",
        variant === "accent" && "button-accent",
        variant === "ghost" && "button-ghost",
        size === "md" && "button-md",
        className,
      )}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
