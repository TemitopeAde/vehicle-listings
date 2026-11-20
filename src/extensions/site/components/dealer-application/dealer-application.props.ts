import type { A11y, Direction, Wix } from "@wix/editor-react-types";

export type DealerApplicationProps = {
  id: string;
  className?: string;
  direction?: Direction;
  a11y?: A11y;
  /** Framework props; `presetsWrapperProps` must wrap the root for presets. */
  wix?: Wix;
  title: string;
  elementProps?: {
    form?: { className?: string };
  };
};

export const defaultProps = {
  title: "Apply to sell vehicles",
} satisfies Omit<DealerApplicationProps, "id" | "className">;
