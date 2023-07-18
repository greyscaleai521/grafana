import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { getInstanceState } from '../state/selectors';
import { initialVariablesState, VariablePayload, VariablesState } from '../state/types';
import { initialVariableModelState, CustomRangeVariableModel, VariableOption } from '../types';

export const initialCustomRangeVariableModelState: CustomRangeVariableModel = {
  ...initialVariableModelState,
  type: 'customrange',
  query: '',
  current: {} as VariableOption,
  options: [],
  originalQuery: null,
};

export const customRangeVariableSlice = createSlice({
  name: 'templating/customrange',
  initialState: initialVariablesState,
  reducers: {
    createCustomRangeOptions: (state: VariablesState, action: PayloadAction<VariablePayload>) => {
      const instanceState = getInstanceState(state, action.payload.id);
      if (instanceState.type !== 'customrange') {
        return;
      }

      const option = { text: instanceState.query.trim(), value: instanceState.query.trim(), selected: false };
      instanceState.options = [option];
      instanceState.current = option;
    },
  },
});

export const customRangeVariableReducer = customRangeVariableSlice.reducer;

export const { createCustomRangeOptions } = customRangeVariableSlice.actions;
