import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';

const EMPTY_STATE: Record<string, unknown> = {};

interface HistoryOverlayState extends Record<string, unknown> {
  historyOverlay?: boolean;
  scrollRestorationKey?: string;
}

export function getHistoryScrollKey(
  location: Pick<Location, 'key' | 'state'>
): string {
  const state = location.state as HistoryOverlayState | null;
  if (state?.historyOverlay && state.scrollRestorationKey) {
    return state.scrollRestorationKey;
  }
  return location.key;
}

export function useHistoryOverlay(stateKey: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = (
    location.state && typeof location.state === 'object'
      ? location.state
      : EMPTY_STATE
  ) as HistoryOverlayState;

  const open = useCallback(
    (overlayState: Record<string, unknown> = {}) => {
      navigate(
        {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        {
          preventScrollReset: true,
          state: {
            ...locationState,
            ...overlayState,
            [stateKey]: true,
            historyOverlay: true,
            scrollRestorationKey: location.key,
          },
        }
      );
    },
    [location.hash, location.key, location.pathname, location.search, locationState, navigate, stateKey]
  );

  const close = useCallback(() => navigate(-1), [navigate]);

  return {
    isOpen: locationState[stateKey] === true,
    open,
    close,
  };
}