import * as React from "react";
import { cn } from "./utils";
export const Table = ({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto rounded-lg border">
    <table
      className={cn("w-full border-collapse text-sm", className)}
      {...props}
    />
  </div>
);
export const TableHeader = (
  props: React.HTMLAttributes<HTMLTableSectionElement>,
) => <thead {...props} />;
export const TableBody = (
  props: React.HTMLAttributes<HTMLTableSectionElement>,
) => <tbody {...props} />;
export const TableRow = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b last:border-b-0", className)} {...props} />
);
export const TableHead = ({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "p-3 text-left align-top font-medium text-muted-foreground",
      className,
    )}
    {...props}
  />
);
export const TableCell = ({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("p-3 align-top", className)} {...props} />
);
