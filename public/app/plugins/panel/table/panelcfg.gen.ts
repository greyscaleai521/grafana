// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Generated by:
//     public/app/plugins/gen.go
// Using jennies:
//     TSTypesJenny
//     PluginTsTypesJenny
//
// Run 'make gen-cue' from repository root to regenerate.

import * as ui from '@grafana/schema';

export interface Options {
  /**
   * Controls the height of the rows
   */
  cellHeight?: ui.TableCellHeight;
  /**
   * Controls footer options
   */
  footer?: ui.TableFooterOptions;
  /**
   * Represents the index of the selected frame
   */
  frameIndex: number;
  /**
   * Controls whether the panel should show the header
   */
  showHeader: boolean;
  /**
   * Controls whether the header should show icons for the column types
   */
  showTypeIcons?: boolean;
  /**
   * Used to control row sorting
   */
  sortBy?: ui.TableSortByFieldState[];
  /**
   * Controls whether the panel should show row selection checkboxes
   */
  showRowSelection?: boolean;
  /**
   * Represents the name of the table
   */
  tableName?: string;
  /**
   * Represents the text for the action link
   */
  actionLinkText?: string;
  /**
   * Represents the text for the export data button
   */
  exportDataText?: string;
  /**
   * Represents the URL of the parent window
   */
  windowURL?: string;
}

export const defaultOptions: Partial<Options> = {
  cellHeight: ui.TableCellHeight.Sm,
  footer: {
    /**
     * Controls whether the footer should be shown
     */
    show: false,
    /**
     * Controls whether the footer should show the total number of rows on Count calculation
     */
    countRows: false,
    /**
     * Represents the selected calculations
     */
    reducer: [],
  },
  frameIndex: 0,
  showHeader: true,
  showTypeIcons: false,
  sortBy: [],
  showRowSelection: true,
  tableName: '',
  actionLinkText: 'View Images',
  exportDataText: 'Export Data',
};

export interface FieldConfig extends ui.TableFieldOptions {}
