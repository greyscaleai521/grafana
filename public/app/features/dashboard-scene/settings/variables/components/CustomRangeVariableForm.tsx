import { type FormEvent } from 'react';

import { selectors } from '@grafana/e2e-selectors';
import { Trans, t } from '@grafana/i18n';
import { VariableLegend } from 'app/features/dashboard-scene/settings/variables/components/VariableLegend';
import { VariableTextField } from 'app/features/dashboard-scene/settings/variables/components/VariableTextField';

interface CustomRangeVariableFormProps {
  value?: string;
  defaultValue?: string;
  onChange?: (event: FormEvent<HTMLInputElement>) => void;
  onBlur?: (event: FormEvent<HTMLInputElement>) => void;
}

export function CustomRangeVariableForm({ defaultValue, value, onChange, onBlur }: CustomRangeVariableFormProps) {
  return (
    <>
      <VariableLegend>
        <Trans i18nKey="dashboard-scene.custom-range-variable-form.text-options">Text options</Trans>
      </VariableLegend>
      <VariableTextField
        value={value}
        defaultValue={defaultValue}
        name={t('dashboard-scene.custom-range-variable-form.name-default-value', 'Default value')}
        placeholder={t(
          'dashboard-scene.custom-range-variable-form.placeholder-default-value-if-any',
          'default value, if any'
        )}
        onChange={onChange}
        onBlur={onBlur}
        width={30}
        testId={selectors.pages.Dashboard.Settings.Variables.Edit.TextBoxVariable.textBoxOptionsQueryInputV2}
      />
    </>
  );
}
