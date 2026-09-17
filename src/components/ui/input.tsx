import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-border bg-input px-3 py-1 text-[13px] shadow-xs transition-colors",
        "placeholder:text-faint focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[76px] w-full rounded-lg border border-border bg-input px-3 py-2 text-[13px] shadow-xs transition-colors",
        "placeholder:text-faint focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-9 w-full appearance-none rounded-lg border border-border bg-input px-3 pe-8 text-[13px] shadow-xs transition-colors",
          "focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-surface [&>option]:text-foreground",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute end-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint rtl:rotate-180"
        viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
      >
        <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
);
Select.displayName = "Select";

const Label = ({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-[12.5px] font-medium text-foreground", className)} {...props}>
    {children}
  </label>
);

const FieldError = ({ children }: { children?: React.ReactNode }) =>
  children ? <p className="text-[12px] font-medium text-error">{children}</p> : null;

const Field = ({ label, error, children, hint, className }: { label?: React.ReactNode; error?: React.ReactNode; hint?: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("space-y-1.5", className)}>
    {label ? <Label>{label}</Label> : null}
    {children}
    {hint && !error ? <p className="text-[12px] text-faint">{hint}</p> : null}
    <FieldError>{error}</FieldError>
  </div>
);

export { Input, Textarea, Select, Label, Field, FieldError };
