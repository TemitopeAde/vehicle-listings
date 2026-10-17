import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "./utils";
export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        outline: "border border-input bg-background hover:bg-muted",
        ghost: "bg-transparent hover:bg-muted",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and keeps the button label. */
  pending?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    pending = false,
    children,
    disabled,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        {...props}
        className={cn(
          buttonVariants({ variant, size }),
          pending && "disabled:opacity-100",
          className,
        )}
        ref={ref}
        data-sf={
          variant === "outline" || variant === "ghost"
            ? "secondary-button"
            : "button"
        }
        disabled={disabled || pending || undefined}
        aria-busy={pending || props["aria-busy"]}
      >
        {pending && !asChild ? (
          <LoaderCircle
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";
