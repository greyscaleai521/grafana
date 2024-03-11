import React, { ChangeEvent, FocusEvent, KeyboardEvent, ReactElement, useCallback, useEffect, useState } from 'react';

import { isEmptyObject } from '@grafana/data';
import { Input, Tooltip } from '@grafana/ui';
import { useDispatch } from 'app/types';

import { variableAdapters } from '../adapters';
import { VariablePickerProps } from '../pickers/types';
import { toKeyedAction } from '../state/keyedVariablesReducer';
import { changeVariableProp } from '../state/sharedReducer';
import { CustomRangeVariableModel } from '../types';
import { toVariablePayload } from '../utils';

interface Props extends VariablePickerProps<CustomRangeVariableModel> {}

export function CustomRangeVariablePicker({ variable, onVariableChange, readOnly }: Props): ReactElement {
  const dispatch = useDispatch();
  const [updatedValue, setUpdatedValue] = useState<string>(variable.current.value.toString());
  const [error, setError] = useState<boolean>(false);

  useEffect(() => setUpdatedValue(variable.current.value.toString()), [variable]);

  const validateInput = useCallback((input: string): boolean => {
    return (
      /^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/.test(input) ||
      /^(?:\d+(\.\d+)?|\.\d+)(?:[eE]\d+)?$/.test(input) ||
      input === '' ||
      input === undefined
    );
  }, []);

  const updateVariable = useCallback(() => {
    if (!variable.rootStateKey) {
      console.error('Cannot update variable without rootStateKey');
      return;
    }

    const isValid = validateInput(updatedValue);
    setError(!isValid);

    if (!isValid) {
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
        current: isEmptyObject(variable.current) ? {} : { ...variable.current, value: updatedValue },
      });
    } else {
      variableAdapters.get(variable.type).updateOptions(variable);
    }
  }, [variable, updatedValue, dispatch, onVariableChange, validateInput]);

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setUpdatedValue(event.target.value);
  }, []);

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
      {error ? (
        <Tooltip content={'Invalid format. Format should be number or number - number'} placement={'bottom'}>
          <Input
            type="text"
            value={updatedValue}
            onChange={onChange}
            onBlur={onBlur}
            disabled={readOnly}
            onKeyDown={onKeyDown}
            placeholder="e.g. 1.2 or 1.2-100.4"
            id={`var-${variable.id}`}
            invalid={error}
          />
        </Tooltip>
      ) : (
        <Input
          type="text"
          value={updatedValue}
          onChange={onChange}
          onBlur={onBlur}
          disabled={readOnly}
          onKeyDown={onKeyDown}
          placeholder="e.g. 1.2 or 1.2-100.4"
          id={`var-${variable.id}`}
        />
      )}
    </div>
  );
}
