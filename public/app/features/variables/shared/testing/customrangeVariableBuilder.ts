import { CustomRangeVariableModel } from 'app/features/variables/types';

import { OptionsVariableBuilder } from './optionsVariableBuilder';

export class CustomRangeVariableBuilder<T extends CustomRangeVariableModel> extends OptionsVariableBuilder<T> {
  withOriginalQuery(original: string) {
    this.variable.originalQuery = original;
    return this;
  }
}
