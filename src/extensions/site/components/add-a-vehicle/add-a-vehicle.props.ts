import type { A11y, Direction } from "@wix/editor-react-types";

export type AddAVehicleProps = {
  id: string;
  className?: string;
  direction?: Direction;
  a11y?: A11y;
  title: string;
  elementProps?: {
    form?: { className?: string };
  };
};

export const defaultProps = {
  title: "Add a vehicle for sale",
} satisfies Omit<AddAVehicleProps, "id" | "className">;
