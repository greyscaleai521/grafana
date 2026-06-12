import { type FormEvent, type ReactElement, useCallback } from 'react';

import { type CustomRangeVariableModel } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { Trans, t } from '@grafana/i18n';

import { VariableLegend } from '../../dashboard-scene/settings/variables/components/VariableLegend';
import { VariableTextField } from '../../dashboard-scene/settings/variables/components/VariableTextField';
import { type VariableEditorProps } from '../editor/types';

export interface Props extends VariableEditorProps<CustomRangeVariableModel> {}

export function CustomRangeVariableEditor({ onPropChange, variable: { query } }: Props): ReactElement {
  const updateVariable = useCallback(
    (event: FormEvent<HTMLInputElement>, updateOptions: boolean) => {
      event.preventDefault();
      onPropChange({ propName: 'originalQuery', propValue: event.currentTarget.value, updateOptions: false });
      onPropChange({ propName: 'query', propValue: event.currentTarget.value, updateOptions });
    },
    [onPropChange]
  );

  const onChange = useCallback((e: FormEvent<HTMLInputElement>) => updateVariable(e, false), [updateVariable]);
  const onBlur = useCallback((e: FormEvent<HTMLInputElement>) => updateVariable(e, true), [updateVariable]);

  return (
    <>
      <VariableLegend>
        <Trans i18nKey="variables.custom-range-variable-editor.text-options">Text options</Trans>
      </VariableLegend>
      <VariableTextField
        value={query}
        name={t('variables.custom-range-variable-editor.name-default-value', 'Default value')}
        placeholder={t(
          'variables.custom-range-variable-editor.placeholder-default-value-if-any',
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
