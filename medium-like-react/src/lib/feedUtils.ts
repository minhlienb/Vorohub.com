// Helpers for turning the loosely-typed Feed payload into values the UI
// can rely on. Keep ALL shape-normalisation here so list cards and the
// full-screen viewer can't disagree about what a feed contains.

/**
 * `tags` arrives as string[], a JSON-encoded array, or a comma-separated
 * string. Never throws: a malformed JSON string falls back to a
 * comma split instead of crashing the render.
 */
export function normalizeTags(raw: unknown): string[] {
  let tags: string[] = [];

  if (Array.isArray(raw)) {
    tags = raw.filter((t): t is string => typeof t === 'string');
  } else if (typeof raw === 'string' && raw.trim()) {
    const s = raw.trim();
    let parsed: unknown = null;
    if (s.startsWith('[')) {
      try {
        parsed = JSON.parse(s);
      } catch {
        parsed = null;
      }
    }
    if (Array.isArray(parsed)) {
      tags = parsed.filter((t): t is string => typeof t === 'string');
    } else {
      tags = s
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((t) => t.trim().replace(/^["']|["']$/g, ''));
    }
  }

  // trim + drop empties + dedupe (tags are used as React keys)
  return [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
}


/**
 * HTML -> plain text. Parsed with DOMParser (inert document: scripts don't
 * run), then only textContent is read. Block-level closings become spaces
 * so "<p>a</p><p>b</p>" doesn't collapse into "ab".
 */
export function htmlToText(html: string): string {
  if (!html) return '';
  const spaced = html.replace(/<\/(p|div|h[1-6]|li|blockquote)>|<br\s*\/?>/gi, ' $&');
  if (typeof DOMParser === 'undefined') {
    return spaced.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
  const doc = new DOMParser().parseFromString(spaced, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Plain-text excerpt, truncated on TEXT (never on markup) at a word
 * boundary when one is reasonably close. Render the result as a normal
 * React text child — no dangerouslySetInnerHTML needed.
 */
export function makeExcerpt(
  feed: { excerpt?: string | null; content?: string | null },
  max = 200
): string {
  const text = htmlToText(feed.excerpt || feed.content || '');
  if (text.length <= max) return text;

  let cut = text.slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1); // don't split an emoji
  const space = cut.lastIndexOf(' ');
  if (space > max * 0.6) cut = cut.slice(0, space);
  return cut.trimEnd() + '…';
}
