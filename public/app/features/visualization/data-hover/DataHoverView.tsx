import { css } from '@emotion/css';

import {
  type DataFrame,
  type Field,
  formattedValueToString,
  getFieldDisplayName,
  type GrafanaTheme2,
  type LinkModel,
} from '@grafana/data';
import { Trans } from '@grafana/i18n';
import { TextLink, useStyles2 } from '@grafana/ui';
import { renderValue } from 'app/plugins/panel/geomap/utils/uiUtils';
import { getDataLinks } from 'app/plugins/panel/status-history/utils';

export interface Props {
  data?: DataFrame; // source data
  rowIndex?: number | null; // the hover row
  columnIndex?: number | null; // the hover column
  header?: string;
  padding?: number;
}

export interface DisplayValue {
  name: string;
  value: unknown;
  valueString: string;
}

export function getDisplayValuesAndLinks(data: DataFrame, rowIndex: number, columnIndex?: number) {
  const visibleFields = data.fields.filter(
    (f, i) => !Boolean(f.config.custom?.hideFrom?.tooltip) && (columnIndex == null || i === columnIndex)
  );

  if (visibleFields.length === 0) {
    return null;
  }

  const displayValues: DisplayValue[] = [];
  const links: Array<LinkModel<Field>> = [];
  const linkLookup = new Set<string>();

  for (const field of visibleFields) {
    const value = field.values[rowIndex];
    const fieldDisplay = field.display ? field.display(value) : { text: `${value}`, numeric: +value };

    getDataLinks(field, rowIndex).forEach((link) => {
      const key = `${link.title}/${link.href}`;
      if (!linkLookup.has(key)) {
        links.push(link);
        linkLookup.add(key);
      }
    });

    displayValues.push({
      name: getFieldDisplayName(field, data),
      value,
      valueString: formattedValueToString(fieldDisplay),
    });
  }

  return { displayValues, links };
}

export const DataHoverView = ({ data, rowIndex, columnIndex, header, padding = 0 }: Props) => {
  const styles = useStyles2(getStyles, padding);

  if (!data || rowIndex == null) {
    return null;
  }

  const dispValuesAndLinks = getDisplayValuesAndLinks(data, rowIndex);

  if (dispValuesAndLinks == null) {
    return null;
  }

  const { displayValues, links } = dispValuesAndLinks;

  // Parent-window navigation: when a data link is configured to navigate the
  // parent (target '_top'), forward the URL to the embedding host instead of
  // navigating inside the iframe.
  const sendToParent = (link: LinkModel<Field>) => {
    window.parent.postMessage(
      {
        key: 'navigateUrl',
        value: link.href,
      },
      '*'
    );
  };

  return (
    <div className={styles.wrapper}>
      {header && (
        <div className={styles.header}>
          <span className={styles.title}>{header}</span>
        </div>
      )}
      <table className={styles.infoWrap}>
        <tbody>
          {displayValues.map((displayValue, i) => (
            // GSAI override: highlight the row matching the hovered column
            <tr key={`${i}/${rowIndex}`} className={i === columnIndex ? styles.highlight : ''}>
              <th>{displayValue.name}</th>
              <td>{renderValue(displayValue.valueString)}</td>
            </tr>
          ))}
          {links.map((link, i) => (
            <tr key={i}>
              <th>
                <Trans i18nKey="visualization.data-hover-view.link">Link</Trans>
              </th>
              <td colSpan={2}>
                {link.target !== '_top' ? (
                  <TextLink href={link.href} external={link.target === '_blank'} weight={'medium'} inline={false}>
                    {link.title}
                  </TextLink>
                ) : (
                  <TextLink target="_top" weight="medium" inline={false} onClick={() => sendToParent(link)} href={''}>
                    {link.title}
                  </TextLink>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2, padding = 0) => {
  return {
    wrapper: css({
      padding: `${padding}px`,
      background: theme.components.tooltip.background,
      borderRadius: theme.shape.borderRadius(2),
    }),
    header: css({
      background: theme.colors.background.secondary,
      alignItems: 'center',
      alignContent: 'center',
      display: 'flex',
      paddingBottom: theme.spacing(1),
    }),
    title: css({
      fontWeight: theme.typography.fontWeightMedium,
      overflow: 'hidden',
      display: 'inline-block',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      flexGrow: 1,
    }),
    infoWrap: css({
      padding: theme.spacing(1),
      background: 'transparent',
      border: 'none',
      th: {
        fontWeight: theme.typography.fontWeightMedium,
        padding: theme.spacing(0.25, 2, 0.25, 0),
      },

      tr: {
        borderBottom: `1px solid ${theme.colors.border.weak}`,
        '&:last-child': {
          borderBottom: 'none',
        },
      },
    }),
    link: css({
      color: theme.colors.text.link,
    }),
    // GSAI override: highlight style for the hovered column row
    highlight: css({
      background: `${theme.colors.action.hover} !important`,
    }),
  };
};
