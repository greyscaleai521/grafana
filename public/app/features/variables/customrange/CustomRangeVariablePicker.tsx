import React, { FocusEvent, KeyboardEvent, ReactElement, useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { Input, stylesFactory, useTheme, GrafanaTheme } from '@grafana/ui';

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
  const [error, setError] = useState('');

  useEffect(() => {
    setUpdatedValue(variable.current.value);
  }, [variable]);

  const updateVariable = useCallback(() => {
    if (!variable.rootStateKey) {
      console.error('Cannot update variable without rootStateKey');
      return;
    }

    const isValid = /^-?\d*\.?\d+\s*-\s*-?\d*\.?\d+$/.test(updatedValue);

    if (!isValid) {
      setError('Invalid format. Please use number - number format.');
      return;
    }

    setError('');

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

  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <div>
      <Input
        type="text"
        value={updatedValue}
        onBlur={onBlur}
        disabled={readOnly}
        onKeyDown={onKeyDown}
        placeholder="Enter variable value"
        id={`var-${variable.id}`}
      />
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}

const getStyles = stylesFactory((theme: GrafanaTheme) => ({
  error: {
    color: theme.palette.red,
    marginTop: theme.spacing.xs,
  },
}));
