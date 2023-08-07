import React, { ChangeEvent, FocusEvent, KeyboardEvent, ReactElement, useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { Input, stylesFactory, useTheme, GrafanaTheme, Tooltip } from '@grafana/ui';

import { variableAdapters } from '../adapters';
import { VariablePickerProps } from '../pickers/types';
import { toKeyedAction } from '../state/keyedVariablesReducer';
import { changeVariableProp } from '../state/sharedReducer';
import { CustomRangeVariableModel } from '../types';
import { toVariablePayload } from '../utils';

interface Props extends VariablePickerProps<CustomRangeVariableModel> {}

export function CustomRangeVariablePicker({ variable, onVariableChange, readOnly }: Props): ReactElement {
  const dispatch = useDispatch();
  const [updatedValue, setUpdatedValue] = useState(variable.current.value);
  const [error, setError] = useState(false);

  useEffect(() => {
    setUpdatedValue(variable.current.value);
  }, [variable]);

  const updateVariable = useCallback(() => {
    if (!variable.rootStateKey) {
      console.error('Cannot update variable without rootStateKey');
      return;
    }
    setError(false);
    console.log(updatedValue);
    const isValid = /^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/.test(updatedValue) || /^(?:\d+(\.\d*)?|\.\d+)(?:[eE]\d+)?$/.test(updatedValue) || updatedValue === '';
    console.log(isValid);
    if (!isValid) {
      setError(true);
      return;
    }

    if (variable.current.value === updatedValue) {
      return;
    }

    dispatch(
      toKeyedAction(
        variable.rootStateKey,
        changeVariableProp(
          toVariablePayload({ id: variable.id, type: variable.type }, { propName: 'query', propValue: updatedValue })
        )
      )
    );

    if (onVariableChange) {
      onVariableChange({
        ...variable,
        current: { ...variable.current, value: updatedValue },
      });
      return;
    }

    variableAdapters.get(variable.type).updateOptions(variable);
  }, [variable, updatedValue, dispatch, onVariableChange]);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setUpdatedValue(event.target.value),
    [setUpdatedValue]
  );

  const onBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      updateVariable();
    },
    [updateVariable]
  );
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.keyCode === 13) {
        event.preventDefault();
        updateVariable();
      }
    },
    [updateVariable]
  );

  return (
    <div>
      <Tooltip content={"Invalid format.Format should be number or number - number"} placement={'bottom'} show={error}>
        <Input
          type="text"
          value={updatedValue}
          onChange={onChange}
          onBlur={onBlur}
          disabled={readOnly}
          onKeyDown={onKeyDown}
          placeholder="number or number - number format"
          id={`var-${variable.id}`}
          invalid={error}
        />
      </Tooltip>
    </div>
  );
}
