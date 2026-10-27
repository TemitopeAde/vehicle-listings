import * as React from "react";
import * as Primitive from "@radix-ui/react-dropdown-menu";
import { EllipsisVertical } from "lucide-react";
import { Button, cn } from "./button";
export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-40 rounded-lg border bg-white p-1 text-sm shadow-lg",
        className,
      )}
      {...props}
    />
  </Primitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";
export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof Primitive.Item>,
  React.ComponentPropsWithoutRef<typeof Primitive.Item> & {
    destructive?: boolean;
  }
>(({ className, destructive, ...props }, ref) => (
  <Primitive.Item
    ref={ref}
    className={cn(
      "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      destructive
        ? "text-destructive data-[highlighted]:bg-red-50"
        : "data-[highlighted]:bg-muted",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";
export const DropdownMenuSeparator = () => (
  <Primitive.Separator className="my-1 h-px bg-border" />
);

/** The ⋮ button that opens a table row's actions. */
export function RowActions({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  // Not modal, so an item can open a dialog without the menu fighting it for focus.
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={label} title={label}>
          <EllipsisVertical size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
