import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "./button";
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
