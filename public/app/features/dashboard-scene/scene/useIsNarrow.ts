import { useEffect, useState } from 'react';

// GSAI override (responsive): matches the host left-nav breakpoint (<=768px).
// Below this width the dashboard controls switch to their mobile layout (filter
// categories collapse, and the time picker + filters move behind a drawer).
export const NARROW_QUERY = '(max-width: 768px)';

export function matchesNarrow(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(NARROW_QUERY).matches
    : false;
}

export function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(matchesNarrow);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    // Re-read the media query on every event. We listen to BOTH the matchMedia
    // `change` event and the window `resize` event: the latter fires reliably
    // when the viewport is resized for testing / when the embedded iframe is
    // resized, where the `change` event alone can be missed.
    const update = () => setIsNarrow(matchesNarrow());
    update();

    const mql = typeof window.matchMedia === 'function' ? window.matchMedia(NARROW_QUERY) : undefined;
    mql?.addEventListener('change', update);
    window.addEventListener('resize', update);

    return () => {
      mql?.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return isNarrow;
}
