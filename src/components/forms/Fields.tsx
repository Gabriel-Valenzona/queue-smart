"use client";
// Control appearance adapted from TailAdmin form components (MIT).
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
  type LabelHTMLAttributes,
} from "react";
import ChevronDown from "@/components/icons/ChevronDown";
import Eye from "@/components/icons/Eye";
import EyeOff from "@/components/icons/EyeOff";

type FieldProps = {
  label?: string;
  hint?: string;
  error?: string;
  success?: boolean;
};
export function Label({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
      {...props}
    />
  );
}
export function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
}: FieldProps & { id: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && (
            <span
              aria-hidden="true"
              className="ml-1 text-error-600 dark:text-error-400"
            >
              *
            </span>
          )}
        </Label>
      )}
      {children}
      {(error || hint) && (
        <p
          id={`${id}-help`}
          className={`mt-1.5 text-xs ${error ? "text-error-600 dark:text-error-400" : "text-gray-500 dark:text-gray-400"}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
function controlStyle(error?: string, success?: boolean, className = "") {
  return `w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-3 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:disabled:bg-gray-800 ${error ? "border-error-500 focus:ring-error-500/20" : success ? "border-success-600 focus:ring-success-500/20" : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700"} ${className}`;
}
export type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldProps;
export function Input({
  id: givenId,
  label,
  hint,
  error,
  success,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = givenId || generatedId;
  return (
    <FormField
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
    >
      <input
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? `${id}-help` : undefined}
        className={controlStyle(error, success, `h-11 ${className || ""}`)}
        {...props}
      />
    </FormField>
  );
}
export function PasswordInput({
  id: givenId,
  label = "Password",
  hint,
  error,
  success,
  className,
  ...props
}: Omit<InputProps, "type">) {
  const generatedId = useId();
  const id = givenId || generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
    >
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className={controlStyle(
            error,
            success,
            `h-11 pr-12 ${className || ""}`,
          )}
          {...props}
        />
        <button
          type="button"
          disabled={props.disabled}
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400"
        >
          {visible ? <Eye /> : <EyeOff />}
        </button>
      </div>
    </FormField>
  );
}
export function TextArea({
  id: givenId,
  label,
  hint,
  error,
  success,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const generatedId = useId();
  const id = givenId || generatedId;
  return (
    <FormField
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
    >
      <textarea
        id={id}
        rows={4}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? `${id}-help` : undefined}
        className={controlStyle(error, success, className)}
        {...props}
      />
    </FormField>
  );
}
export function Select({
  id: givenId,
  label,
  hint,
  error,
  success,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  const generatedId = useId();
  const id = givenId || generatedId;
  return (
    <FormField
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
    >
      <div className="relative">
        <select
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className={controlStyle(
            error,
            success,
            `h-11 appearance-none pr-11 ${className || ""}`,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3 size-5 text-gray-500" />
      </div>
    </FormField>
  );
}
type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};
export function Checkbox({ label, className = "", ...props }: ChoiceProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
      <span className="relative inline-flex size-5 shrink-0">
        <input
          type="checkbox"
          className={`peer size-5 appearance-none rounded-md border border-gray-300 checked:border-transparent checked:bg-brand-500 disabled:opacity-50 dark:border-gray-700 ${className}`}
          {...props}
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-[3px] top-[3px] hidden peer-checked:block"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
            stroke="white"
            strokeWidth="1.94437"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {label}
    </label>
  );
}
export function Radio({ label, className = "", ...props }: ChoiceProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
      <input
        type="radio"
        className={`size-5 appearance-none rounded-full border border-gray-300 checked:border-[6px] checked:border-brand-500 checked:bg-white disabled:opacity-50 dark:border-gray-700 dark:checked:border-brand-500 ${className}`}
        {...props}
      />
      {label}
    </label>
  );
}
export function Switch({ label, className = "", ...props }: ChoiceProps) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-3 text-sm font-medium ${className}`}
    >
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        {...props}
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-gray-200 transition peer-checked:bg-brand-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-brand-500 peer-disabled:opacity-50 dark:bg-gray-700 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-theme-xs after:transition-transform peer-checked:after:translate-x-5"
      />
      {label}
    </label>
  );
}
