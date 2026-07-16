import { type Field, type LinkModel } from '@grafana/data';

import { type ButtonProps, Button } from '../Button/Button';

type DataLinkButtonProps = {
  link: LinkModel<Field>;
  buttonProps?: Omit<ButtonProps, 'children'>;
};

/**
 * @internal
 */
export function DataLinkButton({ link, buttonProps }: DataLinkButtonProps) {
  // GSAI override: '_top' (navigate-parent) links inside the embedding iframe must navigate the
  // parent frame via postMessage (host listens for 'navigateUrl'); direct _top navigation is
  // blocked cross-origin. Mirrors DataLinksContextMenu.
  if (link.target === '_top') {
    return (
      // eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <a onClick={() => window.parent.postMessage({ key: 'navigateUrl', value: link.href }, '*')}>
        <Button icon="link" variant="primary" size="sm" {...buttonProps}>
          {link.title}
        </Button>
      </a>
    );
  }

  return (
    <a
      href={link.href}
      target={link.target}
      rel="noreferrer"
      onClick={
        link.onClick
          ? (event) => {
              if (!(event.ctrlKey || event.metaKey || event.shiftKey) && link.onClick) {
                event.preventDefault();
                link.onClick(event);
              }
            }
          : undefined
      }
    >
      <Button
        icon={link.target === '_blank' ? 'external-link-alt' : 'link'}
        variant="primary"
        size="sm"
        {...buttonProps}
      >
        {link.title}
      </Button>
    </a>
  );
}
