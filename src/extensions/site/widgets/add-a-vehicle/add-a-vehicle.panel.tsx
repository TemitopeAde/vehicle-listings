import React, { type FC, useState, useEffect, useCallback } from 'react';
import { widget } from '@wix/editor';
import {
  SidePanel,
  WixDesignSystemProvider,
  Input,
  FormField,
  SectionHelper,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { LocaleProvider, useI18n } from '../../../../shared/i18n-react';
import { TrialFooter } from '../../trial-footer';

const Panel: FC = () => (
  <LocaleProvider>
    <PanelContent />
  </LocaleProvider>
);

const PanelContent: FC = () => {
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    widget.getProp('display-name')
      .then(displayName => setDisplayName(displayName || "Add a vehicle for sale"))
      .catch(error => console.error('Failed to fetch display-name:', error));
  }, [setDisplayName]);

  const handleDisplayNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayName = event.target.value;
    setDisplayName(newDisplayName);
    widget.setProp('display-name', newDisplayName);
  }, [setDisplayName]);

  return (
    <WixDesignSystemProvider>
      <SidePanel width="300" height="100vh">
        <SidePanel.Content noPadding stretchVertically>
          <SidePanel.Field>
            <FormField label={t("Heading")}>
              <Input
                type="text"
                value={displayName}
                onChange={handleDisplayNameChange}
                aria-label={t("Heading")}
              />
            </FormField>
          </SidePanel.Field>
        </SidePanel.Content>
        <SidePanel.Footer noPadding>
          <SectionHelper fullWidth appearance="success" border="topBottom">
            {t("Approved dealers log in with the account they used to apply, then use the same vehicle form as the dashboard.")}
          </SectionHelper>
        </SidePanel.Footer>
        <TrialFooter />
      </SidePanel>
    </WixDesignSystemProvider>
  );
};

export default Panel;
