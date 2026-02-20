import React, { ChangeEvent, FocusEvent, KeyboardEvent, ReactElement, useCallback, useEffect, useState } from 'react';

import { isEmptyObject } from '@grafana/data';
import { Input } from '@grafana/ui';
import { t } from 'app/core/internationalization';
import { useDispatch } from 'app/types';

import { variableAdapters } from '../adapters';
import { VARIABLE_PREFIX } from '../constants';
import { VariablePickerProps } from '../pickers/types';
import { toKeyedAction } from '../state/keyedVariablesReducer';
import { changeVariableProp } from '../state/sharedReducer';
import { TextBoxVariableModel } from '../types';
import { toVariablePayload } from '../utils';

export interface Props extends VariablePickerProps<TextBoxVariableModel> {}

export function TextBoxVariablePicker({ variable, onVariableChange, readOnly }: Props): ReactElement {
  const dispatch = useDispatch();
  const [updatedValue, setUpdatedValue] = useState(variable.current.value);
  useEffect(() => {
    setUpdatedValue(variable.current.value);
  }, [variable]);

  const updateVariable = useCallback(() => {
    if (!variable.rootStateKey) {
      console.error('Cannot update variable without rootStateKey');
      return;
    }

    const trimmedValue = typeof updatedValue === 'string' ? updatedValue.trim() : updatedValue;

    if (variable.current.value === trimmedValue) {
      return;
    }

    dispatch(
      toKeyedAction(
        variable.rootStateKey,
        changeVariableProp(
          toVariablePayload({ id: variable.id, type: variable.type }, { propName: 'query', propValue: trimmedValue })
        )
      )
    );

    if (onVariableChange) {
      onVariableChange({
        ...variable,
        current: isEmptyObject(variable.current) ? {} : { ...variable.current, value: trimmedValue },
      });
      return;
    }

    variableAdapters.get(variable.type).updateOptions(variable);
  }, [variable, updatedValue, dispatch, onVariableChange]);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;

      if (value === '') {
        setUpdatedValue('');
        return;
      }

      const regex = /^(?!.*--)[a-zA-Z0-9][a-zA-Z0-9.@_ -]*$/;
      if (!regex.test(value)) {
        return;
      }

      setUpdatedValue(value);
    },
    [setUpdatedValue]
  );

  const onBlur = (e: FocusEvent<HTMLInputElement>) => updateVariable();
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.keyCode === 13) {
      event.preventDefault();
      updateVariable();
    }
  };

  return (
    <Input
      type="text"
      value={updatedValue}
      onChange={onChange}
      onBlur={onBlur}
      disabled={readOnly}
      onKeyDown={onKeyDown}
      placeholder={t('variable.textbox.placeholder', 'Enter variable value')}
      id={VARIABLE_PREFIX + variable.id}
    />
  );
}
