import { Accordion } from "@wix/design-system";
import { useI18n } from "../../../../shared/i18n-react";
import {
  filterTextSections,
  listingTextSections,
  type WidgetStyle,
} from "../../../../storefront/widget-style";
import { ColorField, FontField } from "./style-fields";

type Props = {
  settings: WidgetStyle;
  onChange: (key: string, value: string) => void;
};
function ElementFields({
  settings,
  onChange,
  section: [key, label, size, parent],
}: Props & { section: readonly [string, string, string, string] }) {
  return (
    <>
      {key !== "save-vehicle" && (
        <FontField
          name={`${key}-font`}
          label={label}
          size={size}
          value={settings[`${key}-font`] ?? ""}
          fallbackValue={
            settings[`${parent}-font`] || settings["body-font"] || ""
          }
          resetLabel="Use shared font"
          onChange={onChange}
        />
      )}
      <ColorField
        name={`${key}-color`}
        label={`${label} color`}
        value={settings[`${key}-color`] ?? ""}
        fallback={
          settings[`${parent}-color`] ||
          (parent === "button" ? "#ffffff" : "#243b2e")
        }
        resetLabel="Use shared color"
        onChange={onChange}
      />
    </>
  );
}
export function IndividualFilterStyles(props: Props) {
  const { t } = useI18n();
  return (
    <Accordion
      skin="light"
      hideShadow
      contentPadding="none"
      items={filterTextSections.map(({ label, sections }) => ({
        title: t(label),
        children: sections.map((section) => (
          <ElementFields key={section[0]} section={section} {...props} />
        )),
      }))}
    />
  );
}
export function IndividualListingStyles(props: Props) {
  const { t } = useI18n();
  return (
    <Accordion
      skin="light"
      hideShadow
      contentPadding="none"
      items={listingTextSections.map((section) => ({
        title: t(section[1]),
        children: <ElementFields section={section} {...props} />,
      }))}
    />
  );
}
