import { css } from '@emotion/css';
import memoize from 'micro-memoize';

import { isTableCellStylesKeyEqual } from '../styles';
import { type DataLinksCellProps, type TableCellStyles } from '../types';
import { getCellLinks, getJustifyContent } from '../utils';

export const DataLinksCell = ({ field, rowIdx }: DataLinksCellProps) => {
  const links = getCellLinks(field, rowIdx);

  if (!links?.length) {
    return null;
  }

  return links.map((link, idx) =>
    // GSAI override: '_top' (navigate-parent) links must navigate the parent frame via
    // postMessage (host listens for 'navigateUrl'); direct _top navigation is blocked
    // cross-origin. Mirrors DataLinksContextMenu.
    link.target === '_top' ? (
      // eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <a key={idx} onClick={() => window.parent.postMessage({ key: 'navigateUrl', value: link.href }, '*')}>
        {link.title}
      </a>
    ) : (
      <a key={idx} onClick={link.onClick} href={link.href} target={link.target}>
        {link.title}
      </a>
    )
  );
};

export const getStyles: TableCellStyles = memoize(
  (theme, { textWrap, textAlign }) =>
    css({
      ...(textWrap && {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: `${getJustifyContent(textAlign)} !important`, // we can't guarantee order, and alignItems is set on a sibling class.
      }),
      '> a': {
        flexWrap: 'nowrap',
        ...(!textWrap && {
          paddingInline: theme.spacing(0.5),
          borderRight: `2px solid ${theme.colors.border.medium}`,
          '&:first-child': {
            paddingInlineStart: 0,
          },
          '&:last-child': {
            paddingInlineEnd: 0,
            borderRight: 'none',
          },
        }),
      },
    }),
  { isMatchingKey: isTableCellStylesKeyEqual }
);
