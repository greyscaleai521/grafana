import React, { FormEvent } from 'react';

import { selectors } from '@grafana/e2e-selectors';
import {
  SceneObjectBase,
  SceneVariable,
  VariableValue,
  SceneObjectUrlValues,
  SceneComponentProps,
  SceneVariableState,
} from '@grafana/scenes';
import { VariableLegend } from 'app/features/dashboard-scene/settings/variables/components/VariableLegend';
import { VariableTextField } from 'app/features/dashboard-scene/settings/variables/components/VariableTextField';

interface TextBoxVariableState extends SceneVariableState {
  value: string;
}

export declare class CustomRangeVariable
  extends SceneObjectBase<TextBoxVariableState>
  implements SceneVariable<TextBoxVariableState>
{
  constructor(initialState: Partial<TextBoxVariableState>);
  getValue(): VariableValue;
  setValue(newValue: string): void;
  private getKey;
  getUrlState(): {
    [x: string]: string;
  };
  updateFromUrl(values: SceneObjectUrlValues): void;
  static Component: ({ model }: SceneComponentProps<CustomRangeVariable>) => JSX.Element;
}

interface CustomRangeVariableEditorProps {
  variable: CustomRangeVariable;
  onChange: (variable: CustomRangeVariable) => void;
}

export function CustomRangeVariableEditor({ variable, onChange }: CustomRangeVariableEditorProps) {
  const { value } = variable.useState();

  const onTextValueChange = (e: FormEvent<HTMLInputElement>) => {
    variable.setState({ value: e.currentTarget.value });
  };

  return (
    <>
      <VariableLegend>Text options</VariableLegend>
      <VariableTextField
        value={value}
        name="Default value"
        placeholder="default value, if any"
        onChange={onChange as any}
        onBlur={onTextValueChange}
        width={30}
        testId={selectors.pages.Dashboard.Settings.Variables.Edit.TextBoxVariable.textBoxOptionsQueryInputV2}
      />
    </>
  );
}
