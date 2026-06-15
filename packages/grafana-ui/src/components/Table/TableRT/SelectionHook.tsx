import { css } from '@emotion/css';
import { forwardRef, useEffect, useRef, Fragment, type Ref, type MutableRefObject } from 'react';
import { type Hooks } from 'react-table';

import { Icon } from '../../Icon/Icon';

export interface Props {
  indeterminate?: boolean;
  checked?: boolean;
}

const IndeterminateCheckbox = forwardRef<HTMLInputElement, Props>(
  ({ indeterminate, checked, ...rest }, ref: Ref<HTMLInputElement>) => {
    const defaultRef = useRef<HTMLInputElement>(null);
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const combinedRef = (ref || defaultRef) as MutableRefObject<HTMLInputElement | null>;

    useEffect(() => {
      if (combinedRef?.current) {
        combinedRef.current.indeterminate = indeterminate ?? false;
        combinedRef.current.checked = checked ?? false;
      }
    }, [combinedRef, indeterminate, checked]);

    return (
      <Fragment>
        <label>
          <input type="checkbox" ref={combinedRef} {...rest} />
          <Icon id="check-icon" name="check" />
        </label>
      </Fragment>
    );
  }
);
IndeterminateCheckbox.displayName = 'IndeterminateCheckbox';

// react-table v7 hook render props are loosely typed; the selection column is wired here.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const SelectionHook = (hooks: Hooks, showRowSelection = false) => {
  if (!showRowSelection) {
    return;
  }
  hooks.visibleColumns.push((columns) => [
    // Let's make a column for selection
    {
      id: 'selection',
      width: showRowSelection ? 65 : 0,
      // The header can use the table's getToggleAllRowsSelectedProps method
      // to render a checkbox
      Header: ({ getToggleAllRowsSelectedProps, column }: any) => {
        return (
          <div {...column.getResizerProps()} className={inputCheckboxStyles.inputCheckbox}>
            <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
          </div>
        );
      },
      // The cell can use the individual row's getToggleRowSelectedProps method
      // to the render a checkbox
      Cell: ({ row, tableStyles, cell }: any) => {
        return (
          <div {...cell.getCellProps()} className={`${tableStyles.cellContainer} ${inputCheckboxStyles.inputCheckbox}`}>
            <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
          </div>
        );
      },
    },
    ...columns,
  ]);
};
/* eslint-enable @typescript-eslint/no-explicit-any */

const inputCheckboxStyles = {
  // eslint-disable-next-line @emotion/syntax-preference
  inputCheckbox: css`
    label {
      width: 18px;
      height: 18px;
      padding: 6px;
      position: relative;

      /* background-color only for content */
      background-clip: content-box;
      background: #ffffff;
      color: #ffffff;
      border: 1px solid #efefef;
      box-sizing: border-box;
      border-radius: 2px;
      margin-left: 15px;
      margin-right: 15px;

      #check-icon {
        display: inline-block;
        cursor: pointer;
        width: inherit;
        height: inherit;
        position: absolute;
        top: 0;
        left: 0;
        border: 1px solid #d2d2d2;
        border-radius: 2px;

        svg {
          margin-left: 1px;
          margin-bottom: 4px;
        }
      }

      input[type='checkbox'] {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        /* create custom checkbox appearance */
        display: none;
        /* background-color only for content */

        &:checked {
          + #check-icon {
            background-color: #48ac46;
            border: none;
          }
        }

        &:focus {
          outline: none !important;
        }
      }
    }
  `,
};
