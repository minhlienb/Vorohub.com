import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserEmail } from '../lib/auth.js';
import { savedApi } from '../lib/api.js';

/**
 * Single implementation of "save / unsave a feed", shared by FeedCard and
 * ShortViewer so they can't drift apart again.
 *
 *  - not logged in   -> redirect to /login (same in both places)
 *  - optimistic      -> onChange(id, next) fires BEFORE the request
 *  - failure         -> onChange(id, previous) rolls back
 *  - in-flight guard -> a second tap on the same feed is ignored until
 *                       the first request settles (prevents double-send
 *                       and out-of-order results)
 *
 * The caller passes the CURRENT saved state; this hook holds no state.
 */
export function useSaveToggle(onChange?: (feedId: number, saved: boolean) => void) {
  const navigate = useNavigate();
  const inFlight = useRef(new Set<number>());

  const toggleSave = useCallback(
    async (feedId: number, currentlySaved: boolean) => {
      const email = getUserEmail();
      if (!email) {
        navigate('/login', { state: { returnPath: window.location.pathname } });
        return;
      }
      if (inFlight.current.has(feedId)) return;
      inFlight.current.add(feedId);

      const next = !currentlySaved;
      onChange?.(feedId, next);
      try {
        if (next) await savedApi.saveFeed(email, feedId);
        else await savedApi.unsaveFeed(email, feedId);
      } catch (err) {
        console.error('Save toggle failed:', err);
        onChange?.(feedId, currentlySaved);
      } finally {
        inFlight.current.delete(feedId);
      }
    },
    [navigate, onChange]
  );

  return { toggleSave };
}
