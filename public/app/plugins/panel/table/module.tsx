import { identityOverrideProcessor, FieldConfigProperty, PanelPlugin, standardEditorsRegistry } from '@grafana/data';
import { t } from '@grafana/i18n';
import {
  TableCellDisplayMode,
  type TableCellOptions,
  TableCellTooltipPlacement,
  defaultTableFieldOptions,
} from '@grafana/schema';
import { addTableCustomConfig } from 'app/features/panel/table/addTableCustomConfig';
import { addTableCustomPanelOptions } from 'app/features/panel/table/addTableCustomPanelOptions';

import { TableCellOptionEditor } from './TableCellOptionEditor';
import { TablePanel } from './TablePanel';
import { tableMigrationHandler, tablePanelChangedHandler } from './migrations';
import { type FieldConfig, type Options, defaultOptions } from './panelcfg.gen';
import { tableSuggestionsSupplier } from './suggestions';

function getTableNoValuePlaceholder(): string {
  return t('table.no-value-placeholder', 'No rows');
}

export const plugin = new PanelPlugin<Options, FieldConfig>(TablePanel)
  .setPanelChangeHandler(tablePanelChangedHandler)
  .setMigrationHandler(tableMigrationHandler)
  .useFieldConfig({
    standardOptions: {
      [FieldConfigProperty.Actions]: {
        hideFromDefaults: false,
      },
      [FieldConfigProperty.NoValue]: {
        settings: {
          placeholder: getTableNoValuePlaceholder(),
        },
      },
    },
    useCustomConfig: (builder) => {
      addTableCustomConfig(builder, {
        filters: true,
        wrapHeaderText: true,
        hideFields: true,
      });

      const cellCategory = [t('table.category-cell-options', 'Cell options')];

      builder.addCustomEditor({
        id: 'footer.reducers',
        category: [t('table.category-table-footer', 'Table footer')],
        path: 'footer.reducers',
        name: t('table.name-calculation', 'Calculation'),
        description: t('table.description-calculation', 'Choose a reducer function / calculation'),
        editor: standardEditorsRegistry.get('stats-picker').editor,
        override: standardEditorsRegistry.get('stats-picker').editor,
        defaultValue: [],
        process: identityOverrideProcessor,
        shouldApply: () => true,
        settings: {
          allowMultiple: true,
        },
      });

      builder
        .addCustomEditor<void, TableCellOptions>({
          id: 'cellOptions',
          path: 'cellOptions',
          name: t('table.name-cell-type', 'Cell type'),
          editor: TableCellOptionEditor,
          override: TableCellOptionEditor,
          defaultValue: defaultTableFieldOptions.cellOptions,
          process: identityOverrideProcessor,
          category: cellCategory,
          shouldApply: () => true,
        })
        .addBooleanSwitch({
          path: 'inspect',
          name: t('table.name-cell-value-inspect', 'Cell value inspect'),
          description: t('table.description-cell-value-inspect', 'Enable cell value inspection in a modal window'),
          defaultValue: false,
          category: cellCategory,
          showIf: (cfg) => {
            return (
              cfg.cellOptions.type === TableCellDisplayMode.Auto ||
              cfg.cellOptions.type === TableCellDisplayMode.JSONView ||
              cfg.cellOptions.type === TableCellDisplayMode.ColorText ||
              cfg.cellOptions.type === TableCellDisplayMode.ColorBackground
            );
          },
        })
        .addFieldNamePicker({
          path: 'tooltip.field',
          name: t('table.name-tooltip-from-field', 'Tooltip from field'),
          description: t(
            'table.description-tooltip-from-field',
            'Render a cell from a field (hidden or visible) in a tooltip'
          ),
          category: cellCategory,
        })
        .addSelect({
          path: 'tooltip.placement',
          name: t('table.name-tooltip-placement', 'Tooltip placement'),
          category: cellCategory,
          settings: {
            options: [
              {
                label: t('table.tooltip-placement-options.label-auto', 'Auto'),
                value: TableCellTooltipPlacement.Auto,
              },
              {
                label: t('table.tooltip-placement-options.label-top', 'Top'),
                value: TableCellTooltipPlacement.Top,
              },
              {
                label: t('table.tooltip-placement-options.label-right', 'Right'),
                value: TableCellTooltipPlacement.Right,
              },
              {
                label: t('table.tooltip-placement-options.label-bottom', 'Bottom'),
                value: TableCellTooltipPlacement.Bottom,
              },
              {
                label: t('table.tooltip-placement-options.label-left', 'Left'),
                value: TableCellTooltipPlacement.Left,
              },
            ],
          },
          showIf: (cfg) => cfg.tooltip?.field !== undefined,
        })
        .addFieldNamePicker({
          path: 'styleField',
          name: t('table.name-styling-from-field', 'Styling from field'),
          description: t('table.description-styling-from-field', 'A field containing JSON objects with CSS properties'),
          category: cellCategory,
        });
    },
  })
  .setPanelOptions((builder) => {
    addTableCustomPanelOptions(builder);

    const rowSelectionCategory = [t('table.category-row-selection', 'Row Selection')];
    builder
      .addBooleanSwitch({
        path: 'showRowSelection',
        name: t('table.name-show-row-selection', 'Show Row Selection'),
        description: t('table.description-show-row-selection', "To display table's row selection or not to display"),
        defaultValue: defaultOptions.showRowSelection,
        category: rowSelectionCategory,
      })
      .addTextInput({
        path: 'tableName',
        name: t('table.name-table-name', 'Table name'),
        description: t('table.description-table-name', 'Display name for selected rows'),
        category: rowSelectionCategory,
        showIf: (cfg) => cfg.showRowSelection,
      })
      .addTextInput({
        path: 'actionLinkText',
        name: t('table.name-action-link-text', 'Action Link Text'),
        description: t('table.description-action-link-text', 'Display name for link text'),
        category: rowSelectionCategory,
        showIf: (cfg) => cfg.showRowSelection,
      })
      .addTextInput({
        path: 'exportDataText',
        name: t('table.name-export-data-text', 'Export Data Text'),
        description: t('table.description-export-data-text', 'Display name for Export Data button text'),
        category: rowSelectionCategory,
        showIf: (cfg) => cfg.showRowSelection,
      })
      .addTextInput({
        path: 'windowURL',
        name: t('table.name-window-url', 'Parent Window URL'),
        description: t('table.description-window-url', 'Specify URL of parent window to listen action event'),
        category: rowSelectionCategory,
        showIf: (cfg) => cfg.showRowSelection,
      });
  })
  .setSuggestionsSupplier(tableSuggestionsSupplier);
