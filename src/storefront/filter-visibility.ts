export const filterSettings = [
  ["search", "Search", "show-search"],
  ["category", "Category", "show-category"],
  ["make", "Make", "show-make"],
  ["minYear", "Min. year", "show-min-year"],
  ["maxPrice", "Max. price", "show-max-price"],
  ["bodyStyle", "Body", "show-body"],
  ["fuel", "Fuel", "show-fuel"],
  ["sort", "Sort", "show-sort"],
  ["model", "Model", "show-model"],
  ["location", "Location", "show-location"],
  ["minPrice", "Min. price", "show-min-price"],
  ["maxMileage", "Max. mileage", "show-max-mileage"],
  ["maxYear", "Max. year", "show-max-year"],
  ["condition", "Condition", "show-condition"],
  ["transmission", "Transmission", "show-transmission"],
] as const;

/** Filters before this index are the original primary set; later keys are additional. */
export const primaryFilterCount = 8;
export type FilterKey = (typeof filterSettings)[number][0];
export type FilterVisibility = Partial<Record<FilterKey, boolean>>;
export const filterVisibilityKeys = filterSettings.map(([, , key]) => key);

/** Missing settings keep every filter visible for existing widgets. */
export function readFilterVisibility(
  read: (attribute: string) => string | null,
): FilterVisibility {
  return Object.fromEntries(
    filterSettings.map(([key, , attribute]) => [
      key,
      read(attribute) !== "false",
    ]),
  );
}
