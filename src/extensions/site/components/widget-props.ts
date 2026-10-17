import { styleKeys, type WidgetStyle } from "../../../storefront/widget-style";
import { filterSettings } from "../../../storefront/filter-visibility";
const camelCase = (key: string) =>
  key.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());

export type WidgetAppearanceProps = {
  backgroundColor?: string;
  textColor?: string;
  mutedColor?: string;
  accent?: string;
  borderColor?: string;
  subtleColor?: string;
  cardBackground?: string;
  inputBackground?: string;
  placeholderColor?: string;
  buttonBackground?: string;
  buttonHoverBackground?: string;
  secondaryButtonBackground?: string;
  secondaryButtonHoverBackground?: string;
  badgeBackground?: string;
  errorColor?: string;
  bodyFont?: string;
  bodyColor?: string;
  brandFont?: string;
  brandColor?: string;
  headingFont?: string;
  headingColor?: string;
  descriptionFont?: string;
  descriptionColor?: string;
  labelFont?: string;
  labelColor?: string;
  inputFont?: string;
  inputColor?: string;
  vehicleTitleFont?: string;
  vehicleTitleColor?: string;
  vehicleMetaFont?: string;
  vehicleMetaColor?: string;
  priceFont?: string;
  priceColor?: string;
  badgeFont?: string;
  badgeColor?: string;
  buttonFont?: string;
  buttonColor?: string;
  secondaryButtonFont?: string;
  secondaryButtonColor?: string;
  messageFont?: string;
  messageColor?: string;
  filterSearchLabelFont?: string;
  filterSearchLabelColor?: string;
  filterSearchInputFont?: string;
  filterSearchInputColor?: string;
  filterCategoryLabelFont?: string;
  filterCategoryLabelColor?: string;
  filterCategoryInputFont?: string;
  filterCategoryInputColor?: string;
  filterMakeLabelFont?: string;
  filterMakeLabelColor?: string;
  filterMakeInputFont?: string;
  filterMakeInputColor?: string;
  filterMinYearLabelFont?: string;
  filterMinYearLabelColor?: string;
  filterMinYearInputFont?: string;
  filterMinYearInputColor?: string;
  filterMaxPriceLabelFont?: string;
  filterMaxPriceLabelColor?: string;
  filterMaxPriceInputFont?: string;
  filterMaxPriceInputColor?: string;
  filterBodyLabelFont?: string;
  filterBodyLabelColor?: string;
  filterBodyInputFont?: string;
  filterBodyInputColor?: string;
  filterFuelLabelFont?: string;
  filterFuelLabelColor?: string;
  filterFuelInputFont?: string;
  filterFuelInputColor?: string;
  filterSortLabelFont?: string;
  filterSortLabelColor?: string;
  filterSortInputFont?: string;
  filterSortInputColor?: string;
  filterModelLabelFont?: string;
  filterModelLabelColor?: string;
  filterModelInputFont?: string;
  filterModelInputColor?: string;
  filterLocationLabelFont?: string;
  filterLocationLabelColor?: string;
  filterLocationInputFont?: string;
  filterLocationInputColor?: string;
  filterMinPriceLabelFont?: string;
  filterMinPriceLabelColor?: string;
  filterMinPriceInputFont?: string;
  filterMinPriceInputColor?: string;
  filterMaxMileageLabelFont?: string;
  filterMaxMileageLabelColor?: string;
  filterMaxMileageInputFont?: string;
  filterMaxMileageInputColor?: string;
  filterMaxYearLabelFont?: string;
  filterMaxYearLabelColor?: string;
  filterMaxYearInputFont?: string;
  filterMaxYearInputColor?: string;
  filterConditionLabelFont?: string;
  filterConditionLabelColor?: string;
  filterConditionInputFont?: string;
  filterConditionInputColor?: string;
  filterTransmissionLabelFont?: string;
  filterTransmissionLabelColor?: string;
  filterTransmissionInputFont?: string;
  filterTransmissionInputColor?: string;
  vehicleMileageFont?: string;
  vehicleMileageColor?: string;
  vehicleTransmissionFont?: string;
  vehicleTransmissionColor?: string;
  vehicleFuelFont?: string;
  vehicleFuelColor?: string;
  vehicleLocationFont?: string;
  vehicleLocationColor?: string;
  viewVehicleFont?: string;
  viewVehicleColor?: string;
  compareToggleFont?: string;
  compareToggleColor?: string;
  saveVehicleFont?: string;
  saveVehicleColor?: string;
  compareVehiclesFont?: string;
  compareVehiclesColor?: string;
  moreFiltersFont?: string;
  moreFiltersColor?: string;
  resultsCountFont?: string;
  resultsCountColor?: string;
  emptyResultsFont?: string;
  emptyResultsColor?: string;
  previousPageFont?: string;
  previousPageColor?: string;
  nextPageFont?: string;
  nextPageColor?: string;
  pageNumberFont?: string;
  pageNumberColor?: string;
  loadMoreFont?: string;
  loadMoreColor?: string;
  retryFont?: string;
  retryColor?: string;
  backToInventoryFont?: string;
  backToInventoryColor?: string;
};

export const appearanceFields = styleKeys.map(
  (key) => [key, camelCase(key) as keyof WidgetAppearanceProps] as const,
);
export function widgetAppearance(props: WidgetAppearanceProps): WidgetStyle {
  return Object.fromEntries(
    appearanceFields.map(([key, prop]) => [key, props[prop] ?? ""]),
  );
}
export const appearanceData = Object.fromEntries(
  appearanceFields.map(([key, prop]) => [
    prop,
    {
      displayName: key.replaceAll("-", " "),
      dataType: "text" as const,
      text: {},
    },
  ]),
);

export type InventoryFilterProps = {
  showSearch?: boolean;
  showCategory?: boolean;
  showMake?: boolean;
  showMinYear?: boolean;
  showMaxPrice?: boolean;
  showBody?: boolean;
  showFuel?: boolean;
  showSort?: boolean;
  showModel?: boolean;
  showLocation?: boolean;
  showMinPrice?: boolean;
  showMaxMileage?: boolean;
  showMaxYear?: boolean;
  showCondition?: boolean;
  showTransmission?: boolean;
};
export const filterFields = filterSettings.map(
  ([key, , attribute]) =>
    [key, camelCase(attribute) as keyof InventoryFilterProps] as const,
);
export const filterData = Object.fromEntries(
  filterFields.map(([key, prop]) => [
    prop,
    {
      displayName: `Show ${key}`,
      dataType: "booleanValue" as const,
      defaultValue: true,
    },
  ]),
);
export function inventoryFilterVisibility(props: InventoryFilterProps) {
  return Object.fromEntries(
    filterFields.map(([key, prop]) => [key, props[prop] !== false]),
  );
}
