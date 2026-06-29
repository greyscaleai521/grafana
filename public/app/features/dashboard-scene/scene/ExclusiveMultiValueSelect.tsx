import { css, cx } from '@emotion/css';
import { isArray } from 'lodash';
import { type ComponentProps, useEffect, useMemo, useState } from 'react';

import { type GrafanaTheme2, type SelectableValue } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { type MultiValueVariable, type VariableValueOption, type VariableValueSingle } from '@grafana/scenes';
import { Checkbox, getSelectStyles, MultiSelect, ToggleAllState, useStyles2, useTheme2 } from '@grafana/ui';

import { ALL_VARIABLE_TEXT, ALL_VARIABLE_VALUE } from 'app/features/variables/constants';

/**
 * GSAI override (F8) — multi-value variable picker where the "All" option and
 * individual items are mutually exclusive *live* (not just on commit).
 *
 * Scenes' built-in `VariableValueSelectMulti` only normalises the All/items
 * conflict in `changeValueTo`, which runs on blur — so while the menu is open
 * the user can see both "All" and individual items ticked at once. This is a
 * faithful copy of that component with the exclusivity applied in `onChange`:
 *   - picking "All" clears any individual items, and
 *   - picking an item clears "All".
 *
 * Single-value variables have no such conflict, so they keep using the stock
 * scenes picker (see `renderVariablePicker`).
 */

// Mirrors scenes' (non-exported at runtime) getVariableControlId for the input id.
const getVariableControlId = (variableType: string, key?: string) =>
  variableType === 'switch' ? `var-switch-${key}` : `var-${key}`;

const filterAll = (v: SelectableValue<VariableValueSingle>) => v.value !== ALL_VARIABLE_VALUE;

function getOptionSearcher(options: VariableValueOption[], includeAll?: boolean) {
  const allOptions = includeAll
    ? [{ value: ALL_VARIABLE_VALUE, label: ALL_VARIABLE_TEXT }, ...options]
    : options;
  return (search: string) => {
    if (!search) {
      return allOptions;
    }
    const needle = search.toLowerCase();
    return allOptions.filter((o) => String(o.label).toLowerCase().includes(needle));
  };
}

const determineToggleAllState = (
  selectedValues: Array<SelectableValue<VariableValueSingle>>,
  options: Array<SelectableValue<VariableValueSingle>>
): ToggleAllState => {
  if (selectedValues.length === options.filter(filterAll).length) {
    return ToggleAllState.allSelected;
  } else if (
    selectedValues.length === 0 ||
    (selectedValues.length === 1 && selectedValues[0] && selectedValues[0].value === ALL_VARIABLE_VALUE)
  ) {
    return ToggleAllState.noneSelected;
  }
  return ToggleAllState.indeterminate;
};

export function ExclusiveMultiValueSelect({ model }: { model: MultiValueVariable }) {
  const { value, options, key, includeAll, isReadOnly } = model.useState();
  const maxVisibleValues = model.state.maxVisibleValues;
  const noValueOnClear = model.state.noValueOnClear;
  const allowCustomValue = model.state.allowCustomValue ?? true;

  const arrayValue = useMemo<VariableValueSingle[]>(() => (isArray(value) ? value : [value]), [value]);
  const [uncommittedValue, setUncommittedValue] = useState<VariableValueSingle[]>(arrayValue);
  const [inputValue, setInputValue] = useState('');
  const optionSearcher = useMemo(() => getOptionSearcher(options, includeAll), [options, includeAll]);

  useEffect(() => {
    setUncommittedValue(arrayValue);
  }, [arrayValue]);

  const onInputChange = (val: string, { action }: { action: string }) => {
    if (action === 'input-change') {
      setInputValue(val);
      if (model.onSearchChange) {
        model.onSearchChange(val);
      }
      return val;
    }
    if (action === 'input-blur') {
      setInputValue('');
      return '';
    }
    return inputValue;
  };

  // Plain string (matches scenes' own picker, which is also untranslated here).
  const placeholder = options.length > 0 ? 'Select value' : '';
  const filteredOptions = optionSearcher(inputValue);

  return (
    <MultiSelect<VariableValueSingle>
      id={key}
      inputId={getVariableControlId(model.state.type, key)}
      placeholder={placeholder}
      width="auto"
      inputValue={inputValue}
      disabled={isReadOnly}
      value={uncommittedValue}
      noMultiValueWrap={true}
      maxVisibleValues={maxVisibleValues ?? 5}
      tabSelectsValue={false}
      virtualized
      allowCustomValue={allowCustomValue}
      toggleAllOptions={{
        enabled: true,
        optionsFilter: filterAll,
        determineToggleAllState,
      }}
      options={filteredOptions}
      closeMenuOnSelect={false}
      components={{ Option: OptionWithCheckbox }}
      isClearable
      hideSelectedOptions={false}
      onInputChange={onInputChange}
      onBlur={() => {
        model.changeValueTo(uncommittedValue, undefined, true);
      }}
      filterOption={() => true}
      data-testid={selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownValueLinkTexts(`${uncommittedValue}`)}
      onChange={(newValue, action) => {
        if (action.action === 'clear' && noValueOnClear) {
          model.changeValueTo([], undefined, true);
        }

        let values = newValue.map((x) => x.value!);

        // GSAI override: keep "All" and individual items mutually exclusive.
        const allWasSelected = uncommittedValue.includes(ALL_VARIABLE_VALUE);
        const allNowSelected = values.includes(ALL_VARIABLE_VALUE);
        if (allNowSelected && (!allWasSelected || values.length === 1)) {
          // user just picked "All" -> drop every individual item
          values = [ALL_VARIABLE_VALUE];
        } else if (allNowSelected && values.length > 1) {
          // user picked an item while "All" was selected -> drop "All"
          values = values.filter((v) => v !== ALL_VARIABLE_VALUE);
        }

        setUncommittedValue(values);
      }}
    />
  );
}

type OptionProps = ComponentProps<NonNullable<ComponentProps<typeof MultiSelect>['components']>['Option']>;

const OptionWithCheckbox = ({
  children,
  data,
  innerProps,
  innerRef,
  isFocused,
  isSelected,
  indeterminate,
}: OptionProps & { indeterminate?: boolean }) => {
  const { onMouseMove, onMouseOver, ...rest } = innerProps;
  const theme = useTheme2();
  const selectStyles = getSelectStyles(theme);
  const optionStyles = useStyles2(getOptionStyles);

  return (
    <div
      ref={innerRef}
      className={cx(selectStyles.option, isFocused && selectStyles.optionFocused)}
      {...rest}
      data-testid="data-testid Select option"
      title={data.title}
    >
      <div className={optionStyles.checkbox}>
        <Checkbox indeterminate={indeterminate} value={isSelected} />
      </div>
      <div
        className={selectStyles.optionBody}
        data-testid={selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownOptionTexts(
          data.label ?? String(data.value)
        )}
      >
        <span>{children}</span>
      </div>
    </div>
  );
};
OptionWithCheckbox.displayName = 'SelectMenuOptions';

const getOptionStyles = (theme: GrafanaTheme2) => ({
  checkbox: css({
    marginRight: theme.spacing(2),
  }),
});
