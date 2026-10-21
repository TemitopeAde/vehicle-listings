import * as React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useI18n } from "../../../shared/i18n-react";
import { cn } from "./button";
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
export const DialogClose = Primitive.Close;
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, children, ...props }, ref) => {
  const { t } = useI18n();
  return (
  <Primitive.Portal>
    <Primitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
    <Primitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto",
        className,
      )}
      {...props}
    >
      {children}
      <Primitive.Close
        className="absolute end-4 top-4 rounded-sm p-1"
        aria-label={t("Close dialog")}
      >
        <X size={18} />
      </Primitive.Close>
    </Primitive.Content>
  </Primitive.Portal>
  );
});
DialogContent.displayName = "DialogContent";
