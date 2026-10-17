import { useElementStyle } from "./element-style";
import { pageWindow } from "../shared/utils";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

export function Pagination({
  page,
  pages,
  disabled,
  onChange,
}: {
  page: number;
  pages: number;
  disabled?: boolean;
  onChange: (page: number) => void;
}) {
  const elementStyle = useElementStyle();
  if (pages <= 1) return null;
  return (
    <nav
      aria-label="Inventory pages"
      className="mt-6 flex flex-wrap items-center justify-center gap-1"
    >
      <Button
        {...elementStyle("previous-page")}
        variant="outline"
        size="sm"
        disabled={disabled || page === 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      {pageWindow(page, pages).map((n, i) =>
        n === null ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            className="px-1 text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Button
            {...elementStyle("page-number")}
            key={n}
            variant={n === page ? "default" : "ghost"}
            size="sm"
            className={cn("min-w-9 px-2", n === page && "pointer-events-none")}
            disabled={disabled}
            aria-label={`Page ${n}`}
            aria-current={n === page ? "page" : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </Button>
        ),
      )}
      <Button
        {...elementStyle("next-page")}
        variant="outline"
        size="sm"
        disabled={disabled || page === pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
