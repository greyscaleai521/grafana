import { UrlQueryValue } from '@grafana/data';

import { ThunkResult } from '../../../types';
import { variableAdapters } from '../adapters';
import { setOptionFromUrl } from '../state/actions';
import { toKeyedAction } from '../state/keyedVariablesReducer';
import { getVariable } from '../state/selectors';
import { changeVariableProp } from '../state/sharedReducer';
import { KeyedVariableIdentifier } from '../state/types';
import { ensureStringValues, toKeyedVariableIdentifier, toVariablePayload } from '../utils';

import { createCustomRangeOptions } from './reducer';

export const updateCustomRangeVariableOptions = (identifier: KeyedVariableIdentifier): ThunkResult<void> => {
  return async (dispatch, getState) => {
    const { rootStateKey, type } = identifier;
    dispatch(toKeyedAction(rootStateKey, createCustomRangeOptions(toVariablePayload(identifier))));

    const variableInState = getVariable(identifier, getState());
    if (variableInState.type !== 'customrange') {
      return;
    }
    await variableAdapters.get(type).setValue(variableInState, variableInState.options[0], true);
  };
};

export const setCustomRangeVariableOptionsFromUrl =
  (identifier: KeyedVariableIdentifier, urlValue: UrlQueryValue): ThunkResult<void> =>
  async (dispatch, getState) => {
    const { rootStateKey } = identifier;
    const variableInState = getVariable(identifier, getState());
    if (variableInState.type !== 'customrange') {
      return;
    }

    const stringUrlValue = ensureStringValues(urlValue);
    dispatch(
      toKeyedAction(
        rootStateKey,
        changeVariableProp(toVariablePayload(variableInState, { propName: 'query', propValue: stringUrlValue }))
      )
    );

    await dispatch(setOptionFromUrl(toKeyedVariableIdentifier(variableInState), stringUrlValue));
  };
