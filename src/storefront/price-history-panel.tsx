import {
  formatPriceDate,
  priceDelta,
  type PricePoint,
} from "../shared/price-history";
import { money } from "../shared/utils";

function trendLabel(points: PricePoint[]) {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return "";
  if (points.length === 1)
    return `Listed at ${money(first.price, first.currency)} on ${formatPriceDate(first.recordedAt)}.`;
  const change = priceDelta(first, last);
  if (!change)
    return `${points.length} recorded prices, across more than one currency.`;
  if (change.amount === 0)
    return `Unchanged at ${money(last.price, last.currency)} since ${formatPriceDate(first.recordedAt)}.`;
  const direction = change.amount < 0 ? "Down" : "Up";
  const percent =
    change.percent === null
      ? ""
      : ` (${Math.abs(change.percent).toLocaleString("en-US", { maximumFractionDigits: 1 })}%)`;
  return `${direction} ${money(Math.abs(change.amount), last.currency)}${percent} since ${formatPriceDate(first.recordedAt)}.`;
}

function PriceChart({ points }: { points: PricePoint[] }) {
  const width = 320;
  const height = 88;
  const padX = 6;
  const padY = 8;
  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : padX + (index / (points.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (point.price - min) / span) * (height - padY * 2);
    return { x, y };
  });
  const line = coords
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
    .join(" ");
  const last = coords[coords.length - 1];
  const first = coords[0];
  const area =
    first && last
      ? `${line} L${last.x.toFixed(1)} ${height} L${first.x.toFixed(1)} ${height} Z`
      : "";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={trendLabel(points)}
      className="h-24 w-full text-[var(--accent,#196947)]"
    >
      <path d={area} fill="currentColor" opacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((point, index) => (
        <circle
          key={points[index]?._id ?? index}
          cx={point.x}
          cy={point.y}
          r="3.5"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

export function PriceHistoryPanel({ points }: { points: PricePoint[] }) {
  if (!points.length) return null;
  const sameCurrency = points.every(
    (point) => point.currency === points[0]?.currency,
  );
  return (
    <section className="grid gap-4" aria-labelledby="price-history-heading">
      <div className="grid gap-1">
        <h3 id="price-history-heading" className="text-lg font-semibold">
          Price history
        </h3>
        <p className="text-sm text-muted-foreground">{trendLabel(points)}</p>
      </div>
      {points.length > 1 && sameCurrency && <PriceChart points={points} />}
      <ol className="grid gap-3">
        {points.map((point, index) => {
          const previous = index > 0 ? points[index - 1] : undefined;
          const change = previous ? priceDelta(previous, point) : null;
          return (
            <li
              key={point._id}
              className="flex items-baseline justify-between gap-4 border-b pb-3"
            >
              <time
                dateTime={point.recordedAt}
                className="text-sm text-muted-foreground"
              >
                {formatPriceDate(point.recordedAt)}
              </time>
              <span className="text-right">
                <span className="font-medium">
                  {money(point.price, point.currency)}
                </span>
                {change && change.amount !== 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {change.amount < 0 ? "Down" : "Up"}{" "}
                    {money(Math.abs(change.amount), point.currency)}
                  </span>
                )}
                {change === null && previous && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    Currency changed
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
