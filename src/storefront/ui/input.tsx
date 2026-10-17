import * as React from "react";
import { Check, ChevronDown, Minus } from "lucide-react";
import { cn } from "./utils";
const field =
  "w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(field, "h-10", className)} {...props} />
));
Input.displayName = "Input";
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(field, "min-h-20", className)} {...props} />
));
Textarea.displayName = "Textarea";
// Native select styled like shadcn: no portal, so it stays inside the scoped widget styles.
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        field,
        "h-10 cursor-pointer appearance-none pr-9",
        className,
      )}
      {...props}
    />
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
    />
  </div>
));
NativeSelect.displayName = "NativeSelect";
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    /** Partially selected, e.g. a "select all" box when only some rows are chosen. */
    indeterminate?: boolean;
  }
>(({ className, indeterminate = false, ...props }, ref) => {
  const input = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(ref, () => input.current as HTMLInputElement);
  React.useEffect(() => {
    if (input.current) input.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <span
      className={cn(
        "relative inline-grid h-[18px] w-[18px] shrink-0 place-items-center",
        className,
      )}
    >
      <input
        ref={input}
        type="checkbox"
        className="peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none rounded-[5px] border-2 border-input bg-background transition-colors hover:border-primary checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
      <Check
        aria-hidden
        strokeWidth={3.5}
        className="pointer-events-none relative h-3 w-3 scale-50 text-primary-foreground opacity-0 transition peer-checked:scale-100 peer-checked:opacity-100 peer-indeterminate:opacity-0"
      />
      <Minus
        aria-hidden
        strokeWidth={3.5}
        className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 transition peer-indeterminate:opacity-100"
      />
    </span>
  );
});
Checkbox.displayName = "Checkbox";
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("grid min-w-0 gap-1.5 text-sm font-medium", className)}
    {...props}
  />
));
Label.displayName = "Label";
