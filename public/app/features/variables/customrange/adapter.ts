import { cloneDeep } from 'lodash';

import { dispatch } from '../../../store/store';
import { VariableAdapter } from '../adapters';
import { setOptionAsCurrent } from '../state/actions';
import { CustomRangeVariableModel } from '../types';
import { toKeyedVariableIdentifier } from '../utils';

import { CustomRangeVariableEditor } from './CustomRangeVariableEditor';
import { CustomRangeVariablePicker } from './CustomRangeVariablePicker';
import { setCustomRangeVariableOptionsFromUrl, updateCustomRangeVariableOptions } from './actions';
import { initialCustomRangeVariableModelState, customRangeVariableReducer } from './reducer';

export const createCustomRangeVariableAdapter = (): VariableAdapter<CustomRangeVariableModel> => {
  return {
    id: 'customrange',
    description: 'Define a customrange variable, where users can enter any arbitrary string',
    name: 'Text box',
    initialState: initialCustomRangeVariableModelState,
    reducer: customRangeVariableReducer,
    picker: CustomRangeVariablePicker,
    editor: CustomRangeVariableEditor,
    dependsOn: (variable, variableToTest) => {
      return false;
    },
    setValue: async (variable, option, emitChanges = false) => {
      await dispatch(setOptionAsCurrent(toKeyedVariableIdentifier(variable), option, emitChanges));
    },
    setValueFromUrl: async (variable, urlValue) => {
      await dispatch(setCustomRangeVariableOptionsFromUrl(toKeyedVariableIdentifier(variable), urlValue));
    },
    updateOptions: async (variable) => {
      await dispatch(updateCustomRangeVariableOptions(toKeyedVariableIdentifier(variable)));
    },
    getSaveModel: (variable, saveCurrentAsDefault) => {
      const { index, id, state, global, originalQuery, rootStateKey, ...rest } = cloneDeep(variable);

      if (variable.query !== originalQuery && !saveCurrentAsDefault) {
        const origQuery = originalQuery ?? '';
        const current = { selected: false, text: origQuery, value: origQuery };
        return { ...rest, query: origQuery, current, options: [current] };
      }

      return rest;
    },
    getValueForUrl: (variable) => {
      return variable.current.value;
    },
    beforeAdding: (model) => {
      return { ...cloneDeep(model), originalQuery: model.query };
    },
  };
};
