"use client";

import {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
  useId,
} from "react";
import { FloatingSurface } from "@/components/FloatingSurface";

function cx(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

export type FormModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  statusChip?: string;
  footer?: ReactNode;
  children: ReactNode;
  closeLabel?: string;
  maxWidth?: string;
  className?: string;
  panelClassName?: string;
  variant?: "modal" | "drawer";
  unsavedChanges?: boolean;
  confirmCloseMessage?: string;
};

export function FormModal({
  open,
  onClose,
  title,
  description,
  statusChip,
  footer,
  children,
  closeLabel = "Close form",
  maxWidth = "860px",
  className,
  panelClassName,
  variant = "modal",
  unsavedChanges = false,
  confirmCloseMessage,
}: FormModalProps) {
  return (
    <FloatingSurface
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      statusChip={statusChip}
      footer={footer}
      closeLabel={closeLabel}
      maxWidth={maxWidth}
      className={cx("form-modal-overlay", className)}
      panelClassName={cx("form-modal-panel", panelClassName)}
      variant={variant}
      unsavedChanges={unsavedChanges}
      confirmCloseMessage={confirmCloseMessage}
      headerIcon={<span className="form-modal-header-dot" aria-hidden="true" />}
    >
      {children}
    </FloatingSurface>
  );
}

export type FormPageProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function FormPage({ title, subtitle, children, className }: FormPageProps) {
  return (
    <section className={cx("form-page", className)}>
      <header className="form-page-header">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      <div className="form-page-body">{children}</div>
    </section>
  );
}

export type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cx("form-section", className)}>
      <header className="form-section-header">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="form-section-body">{children}</div>
    </section>
  );
}

export type RequiredLabelProps = {
  children: ReactNode;
  required?: boolean;
  className?: string;
};

export function RequiredLabel({ children, required = false, className }: RequiredLabelProps) {
  return (
    <span className={cx("required-label", className)}>
      <span>{children}</span>
      {required ? (
        <span className="required-label-indicator" aria-hidden="true">
          *
        </span>
      ) : null}
    </span>
  );
}

export type ValidationMessageProps = {
  message?: ReactNode;
  tone?: "error" | "success" | "info";
  className?: string;
};

export function ValidationMessage({
  message,
  tone = "error",
  className,
}: ValidationMessageProps) {
  if (!message) {
    return null;
  }
  return <p className={cx("validation-message", `validation-message--${tone}`, className)}>{message}</p>;
}

export type FormFieldProps = {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  helperText?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function FormField({
  label,
  htmlFor,
  required = false,
  helperText,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cx("form-field", className)}>
      <label htmlFor={htmlFor} className="form-field-label">
        <RequiredLabel required={required}>{label}</RequiredLabel>
      </label>
      <div className="form-field-control">{children}</div>
      {helperText ? <p className="form-field-help">{helperText}</p> : null}
      <ValidationMessage message={error} />
    </div>
  );
}

export type FormActionsProps = {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
  align?: "right" | "left" | "between";
};

export function FormActions({
  children,
  className,
  sticky = false,
  align = "right",
}: FormActionsProps) {
  return (
    <div
      className={cx(
        "form-actions",
        sticky && "form-actions--sticky",
        align === "left" && "form-actions--left",
        align === "between" && "form-actions--between",
        className,
      )}
    >
      {children}
    </div>
  );
}

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SearchableSelectProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> & {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (nextValue: string) => void;
  helperText?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  fieldClassName?: string;
};

export function SearchableSelect({
  id,
  name,
  label,
  value,
  options,
  onChange,
  helperText,
  error,
  required = false,
  placeholder = "Search and select...",
  disabled,
  fieldClassName,
}: SearchableSelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const datalistId = `${inputId}-list`;

  return (
    <FormField
      label={label}
      htmlFor={inputId}
      required={required}
      helperText={helperText}
      error={error}
      className={fieldClassName}
    >
      <input
        id={inputId}
        name={name}
        list={datalistId}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        disabled={disabled}
      />
      <datalist id={datalistId}>
        {options.map((option) => (
          <option key={option.value} value={option.value} label={option.label} disabled={option.disabled} />
        ))}
      </datalist>
    </FormField>
  );
}

type BaseInputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  helperText?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
};

export function DateField({
  id,
  label,
  helperText,
  error,
  required,
  fieldClassName,
  ...inputProps
}: BaseInputFieldProps) {
  const inputId = id ?? useId();
  return (
    <FormField
      label={label}
      htmlFor={inputId}
      required={required}
      helperText={helperText}
      error={error}
      className={fieldClassName}
    >
      <input id={inputId} type="date" required={required} {...inputProps} />
    </FormField>
  );
}

export function NumberField({
  id,
  label,
  helperText,
  error,
  required,
  fieldClassName,
  ...inputProps
}: BaseInputFieldProps) {
  const inputId = id ?? useId();
  return (
    <FormField
      label={label}
      htmlFor={inputId}
      required={required}
      helperText={helperText}
      error={error}
      className={fieldClassName}
    >
      <input id={inputId} type="number" inputMode="decimal" required={required} {...inputProps} />
    </FormField>
  );
}

export type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  helperText?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
};

export function TextAreaField({
  id,
  label,
  helperText,
  error,
  required,
  rows = 4,
  fieldClassName,
  ...textareaProps
}: TextAreaFieldProps) {
  const inputId = id ?? useId();
  return (
    <FormField
      label={label}
      htmlFor={inputId}
      required={required}
      helperText={helperText}
      error={error}
      className={fieldClassName}
    >
      <textarea id={inputId} rows={rows} required={required} {...textareaProps} />
    </FormField>
  );
}

export type FileUploadFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  helperText?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
};

export function FileUploadField({
  id,
  label,
  helperText,
  error,
  required,
  fieldClassName,
  ...inputProps
}: FileUploadFieldProps) {
  const inputId = id ?? useId();
  return (
    <FormField
      label={label}
      htmlFor={inputId}
      required={required}
      helperText={helperText}
      error={error}
      className={fieldClassName}
    >
      <input id={inputId} type="file" required={required} {...inputProps} />
    </FormField>
  );
}
