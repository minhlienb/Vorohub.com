import type { Feed } from '../lib/api.js';

export interface ShortViewerProps {
  feeds: Feed[];
  startIndex?: number;
  onClose: () => void;
  onLoadMore?: () => Promise<Feed[]> | Feed[];
  onSaveChange?: (feedId: number, saved: boolean) => void;
  onIndexChange?: (index: number) => void;
}