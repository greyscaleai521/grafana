import { FieldColorModeId, FieldConfigProperty, PanelPlugin } from '@grafana/data';
import { config } from '@grafana/runtime';
import { VisibilityMode } from '@grafana/schema';
import { commonOptionsBuilder } from '@grafana/ui';

import { StatusHistoryPanel } from './StatusHistoryPanel';
import { Options, FieldConfig, defaultFieldConfig } from './panelcfg.gen';
import { StatusHistorySuggestionsSupplier } from './suggestions';

export const plugin = new PanelPlugin<Options, FieldConfig>(StatusHistoryPanel)
  .useFieldConfig({
    standardOptions: {
      [FieldConfigProperty.Color]: {
        settings: {
          byValueSupport: true,
        },
        defaultValue: {
          mode: FieldColorModeId.Thresholds,
        },
      },
    },
    useCustomConfig: (builder) => {
      builder
        .addSliderInput({
          path: 'lineWidth',
          name: 'Line width',
          defaultValue: defaultFieldConfig.lineWidth,
          settings: {
            min: 0,
            max: 10,
            step: 1,
          },
        })
        .addSliderInput({
          path: 'fillOpacity',
          name: 'Fill opacity',
          defaultValue: defaultFieldConfig.fillOpacity,
          settings: {
            min: 0,
            max: 100,
            step: 1,
          },
        });

      commonOptionsBuilder.addHideFrom(builder);
    },
  })
  .setPanelOptions((builder) => {
    builder
      .addRadio({
        path: 'showValue',
        name: 'Show values',
        settings: {
          options: [
            { value: VisibilityMode.Auto, label: 'Auto' },
            { value: VisibilityMode.Always, label: 'Always' },
            { value: VisibilityMode.Never, label: 'Never' },
          ],
        },
        defaultValue: VisibilityMode.Auto,
      })
      .addSliderInput({
        path: 'rowHeight',
        name: 'Row height',
        defaultValue: 0.9,
        settings: {
          min: 0,
          max: 1,
          step: 0.01,
        },
      })
      .addSliderInput({
        path: 'colWidth',
        name: 'Column width',
        defaultValue: 0.9,
        settings: {
          min: 0,
          max: 1,
          step: 0.01,
        },
      })
      .addNumberInput({
        path: 'axisWidth',
        name: 'Axis width',
        category: ['Axis'],
        settings: {
          placeholder: 'Auto',
        },
      })
      .addFieldNamePicker({
        path: 'dynamicColumnWidthField',
        name: 'Dynamic Column Width Using',
        description:
          'Select a field to use for dynamic column width. If the field is a timestamp, bars will stretch from from_time to the selected field value.',
        settings: {
          placeholder: 'Choose',
        },
      })
      .addTextInput({
        path: 'noDataMessage',
        name: 'No data message',
        description: 'Custom message to show when there is no data',
        defaultValue: '',
        settings: {
          placeholder: 'Data does not have a time field',
        },
      });

    commonOptionsBuilder.addLegendOptions(builder, false);
    commonOptionsBuilder.addTooltipOptions(builder, !config.featureToggles.newVizTooltips);
  })
  .setSuggestionsSupplier(new StatusHistorySuggestionsSupplier())
  .setDataSupport({ annotations: true });
