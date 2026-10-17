import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";
type Div = React.HTMLAttributes<HTMLDivElement>;
export const Card = ({ className, ...props }: Div) => (
  <div
    className={cn(
      "min-w-0 overflow-hidden rounded-lg border bg-background",
      className,
    )}
    {...props}
  />
);
export const CardHeader = ({ className, ...props }: Div) => (
  <div className={cn("grid gap-1.5 p-5", className)} {...props} />
);
export const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn("text-base font-semibold leading-snug", className)}
    {...props}
  />
);
export const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);
export const CardContent = ({ className, ...props }: Div) => (
  <div className={cn("p-5 pt-0", className)} {...props} />
);
export const CardFooter = ({ className, ...props }: Div) => (
  <div
    className={cn("flex flex-wrap items-center gap-2 p-5 pt-0", className)}
    {...props}
  />
);
const badgeVariants = cva(
  "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-muted text-foreground",
        outline: "border text-foreground",
      },
    },
    defaultVariants: { variant: "secondary" },
  },
);
export const Badge = ({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>) => (
  <span
    data-sf="badge"
    className={cn(badgeVariants({ variant }), className)}
    {...props}
  />
);
const alertVariants = cva("rounded-md border px-4 py-3 text-sm", {
  variants: {
    variant: {
      default: "bg-muted",
      destructive: "border-destructive text-destructive",
    },
  },
  defaultVariants: { variant: "default" },
});
export const Alert = ({
  className,
  variant,
  ...props
}: Div & VariantProps<typeof alertVariants>) => (
  <div
    data-sf="message"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
);
