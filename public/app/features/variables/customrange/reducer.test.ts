import { cloneDeep } from 'lodash';

import { type CustomRangeVariableModel } from '@grafana/data';

import { reducerTester } from '../../../../test/core/redux/reducerTester';
import { getVariableTestContext } from '../state/helpers';
import { type VariablesState } from '../state/types';
import { toVariablePayload } from '../utils';

import { createCustomRangeVariableAdapter } from './adapter';
import { createCustomRangeOptions, customRangeVariableReducer } from './reducer';

describe('customRangeVariableReducer', () => {
  const adapter = createCustomRangeVariableAdapter();

  describe('when createCustomRangeOptions is dispatched', () => {
    it('then state should be correct', () => {
      const query = '1.2-100.4';
      const id = '0';
      const { initialState } = getVariableTestContext(adapter, { id, query });
      const payload = toVariablePayload({ id: '0', type: 'customrange' });

      reducerTester<VariablesState>()
        .givenReducer(customRangeVariableReducer, cloneDeep(initialState))
        .whenActionIsDispatched(createCustomRangeOptions(payload))
        .thenStateShouldEqual({
          [id]: {
            ...initialState[id],
            options: [
              {
                text: query,
                value: query,
                selected: false,
              },
            ],
            current: {
              text: query,
              value: query,
              selected: false,
            },
          } as CustomRangeVariableModel,
        });
    });
  });

  describe('when createCustomRangeOptions is dispatched and query contains spaces', () => {
    it('then state should be correct', () => {
      const query = '  1.2 - 100.4  ';
      const id = '0';
      const { initialState } = getVariableTestContext(adapter, { id, query });
      const payload = toVariablePayload({ id: '0', type: 'customrange' });

      reducerTester<VariablesState>()
        .givenReducer(customRangeVariableReducer, cloneDeep(initialState))
        .whenActionIsDispatched(createCustomRangeOptions(payload))
        .thenStateShouldEqual({
          [id]: {
            ...initialState[id],
            options: [
              {
                text: query.trim(),
                value: query.trim(),
                selected: false,
              },
            ],
            current: {
              text: query.trim(),
              value: query.trim(),
              selected: false,
            },
          } as CustomRangeVariableModel,
        });
    });
  });
});
