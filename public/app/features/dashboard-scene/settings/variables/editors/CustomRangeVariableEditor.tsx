import React, { FormEvent } from 'react';

import { TextBoxVariable } from '@grafana/scenes';

import { CustomRangeVariableForm } from '../components/CustomRangeVariableForm';

interface CustomRangeVariableEditorProps {
  variable: TextBoxVariable;
  onChange: (variable: TextBoxVariable) => void;
}

export function CustomRangeVariableEditor({ variable }: CustomRangeVariableEditorProps) {
  const { value } = variable.useState();

  const onTextValueChange = (e: FormEvent<HTMLInputElement>) => {
    variable.setState({ value: e.currentTarget.value });
  };

  return <CustomRangeVariableForm defaultValue={value} onBlur={onTextValueChange} />;
}
