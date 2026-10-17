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

const Panel: FC = () => {
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    widget.getProp('display-name')
      .then(displayName => setDisplayName(displayName || "Apply to sell vehicles"))
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
            <FormField label="Heading">
              <Input
                type="text"
                value={displayName}
                onChange={handleDisplayNameChange}
                aria-label="Heading"
              />
            </FormField>
          </SidePanel.Field>
        </SidePanel.Content>
        <SidePanel.Footer noPadding>
          <SectionHelper fullWidth appearance="success" border="topBottom">
            Dealers log in here and apply. Approve them in the app dashboard before they can add vehicles.
          </SectionHelper>
        </SidePanel.Footer>
      </SidePanel>
    </WixDesignSystemProvider>
  );
};

export default Panel;
