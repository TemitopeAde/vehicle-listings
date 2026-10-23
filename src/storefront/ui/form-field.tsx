import { useId, type ReactNode } from "react";
import { Label } from "./input";

export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <Label htmlFor={id}>
      {label}
      {children({
        id,
        "aria-invalid": Boolean(error),
        ...(error ? { "aria-describedby": errorId } : {}),
      })}
      {error && (
        <span id={errorId} className="text-xs font-normal text-destructive">
          {error}
        </span>
      )}
    </Label>
  );
}
