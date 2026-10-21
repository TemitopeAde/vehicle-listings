import { inputs } from "@wix/editor";
import {
  Box,
  Button,
  FillPreview,
  FormField,
  SidePanel,
} from "@wix/design-system";
import { useI18n } from "../../../../shared/i18n-react";
import { readFont } from "../../../../storefront/widget-style";
import { fontFamilyName } from "../../../../storefront/font-family";

type FieldProps = {
  name: string;
  label: string;
  value: string;
  onChange: (key: string, value: string) => void;
};
export function ColorField({
  name,
  label,
  value,
  fallback,
  resetLabel = "Use default color",
  onChange,
}: FieldProps & { fallback: string; resetLabel?: string }) {
  const { t } = useI18n();
  return (
    <SidePanel.Field>
      <FormField label={t(label)}>
        <Box gap="SP2" verticalAlign="middle">
          <Box width={36} height={36}>
            <FillPreview
              dataHook={name}
              size="small"
              aria-label={t(`Choose ${label.toLowerCase()}`)}
              fill={value || fallback}
              onClick={() => {
                void inputs
                  .selectColor(value || fallback, {
                    onChange: (color) => {
                      if (color) onChange(name, color);
                    },
                  })
                  .catch(console.error);
              }}
            />
          </Box>
          {value && (
            <Button
              size="tiny"
              priority="tertiary"
              onClick={() => onChange(name, "")}
            >
              {t(resetLabel)}
            </Button>
          )}
        </Box>
      </FormField>
    </SidePanel.Field>
  );
}
export function FontField({
  name,
  label,
  value,
  size,
  fallbackValue,
  resetLabel = "Use general font",
  onChange,
}: FieldProps & { size: string; fallbackValue?: string; resetLabel?: string }) {
  const { t } = useI18n();
  const font = readFont(value) ??
    readFont(fallbackValue) ?? {
      font: `normal normal 400 ${size}/1.5 system-ui`,
      textDecoration: "",
    };
  return (
    <SidePanel.Field>
      <FormField label={t(`${label} font`)}>
        <Button
          dataHook={name}
          size="small"
          priority="secondary"
          fullWidth
          ellipsis
          onClick={() => {
            void inputs
              .selectFont(font, {
                onChange: (selected) =>
                  onChange(
                    name,
                    JSON.stringify({
                      font: selected.font,
                      textDecoration: selected.textDecoration || "",
                    }),
                  ),
              })
              .catch(console.error);
          }}
        >
          {value
            ? fontFamilyName(font.font)
            : fallbackValue
              ? t("{name} (shared)", { name: fontFamilyName(font.font) })
              : t("Choose font")}
        </Button>
        {value && (
          <Button
            size="tiny"
            priority="tertiary"
            onClick={() => onChange(name, "")}
          >
            {t(resetLabel)}
          </Button>
        )}
      </FormField>
    </SidePanel.Field>
  );
}
