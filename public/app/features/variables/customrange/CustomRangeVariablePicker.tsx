import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { type CustomRangeVariableModel, isEmptyObject } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Input, Tooltip } from '@grafana/ui';
import { useDispatch } from 'app/types/store';

import { variableAdapters } from '../adapters';
import { VARIABLE_PREFIX } from '../constants';
import { type VariablePickerProps } from '../pickers/types';
import { toKeyedAction } from '../state/keyedVariablesReducer';
import { changeVariableProp } from '../state/sharedReducer';
import { toVariablePayload } from '../utils';

export interface Props extends VariablePickerProps<CustomRangeVariableModel> {}

export function CustomRangeVariablePicker({ variable, onVariableChange, readOnly }: Props): ReactElement {
  const dispatch = useDispatch();
  const [updatedValue, setUpdatedValue] = useState<string>(variable.current?.value?.toString());
  const [error, setError] = useState<boolean>(false);

  useEffect(() => setUpdatedValue(variable?.current?.value?.toString()), [variable]);

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
    const { value: filter } = event.target;
    const trimmedFilter = filter?.trim();
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/;
    if (trimmedFilter && !regex.test(trimmedFilter)) {
      return;
    }
    setUpdatedValue(trimmedFilter);
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

  const placeholder = t('variable.customrange.placeholder', 'e.g. 1.2 or 1.2-100.4');

  return (
    <div>
      {error ? (
        <Tooltip
          content={t(
            'variable.customrange.invalid-format',
            'Invalid format. Format should be number or number - number'
          )}
          placement={'bottom'}
        >
          <Input
            type="text"
            value={updatedValue}
            onChange={onChange}
            onBlur={onBlur}
            disabled={readOnly}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            id={VARIABLE_PREFIX + variable.id}
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
          placeholder={placeholder}
          id={VARIABLE_PREFIX + variable.id}
        />
      )}
    </div>
  );
}
