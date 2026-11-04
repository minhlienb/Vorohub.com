// Convert EditorJS output blocks to HTML for the reader to render.
// Mirrors the vanilla editorToHtml.js: list items may be strings
// (legacy flat list) or { content, meta, items } objects (EditorJS
// list v2 nested shape) — we normalize both so we never emit
// "[object Object]" into the article body.

function escapeAttr(value: any): string {
  return String(value ?? '').replace(/"/g, '&quot;');
}

export function editorBlocksToHtml(blocks: any[] = []): string {
  return blocks.map(renderBlock).filter(Boolean).join('\n');
}

function renderItem(item: any, parentStyle: string | undefined): string {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    const inner = item.content != null ? renderItem(item.content, parentStyle) : '';
    const sub = Array.isArray(item.items) && item.items.length
      ? renderListHtml(item.items, parentStyle)
      : '';
    return inner + sub;
  }
  return String(item);
}

function renderListHtml(list: any[], style: string | undefined): string {
  const wrap = style === 'ordered' ? 'ol' : 'ul';
  const inner = list.map((i) => `<li>${renderItem(i, style)}</li>`).join('');
  return `<${wrap}>${inner}</${wrap}>`;
}

function renderBlock(block: any): string {
  const { type, data } = block || {};
  switch (type) {
    case 'paragraph':
      return `<p>${data?.text || ''}</p>`;
    case 'header': {
      const level = Math.min(6, Math.max(2, Number(data?.level) || 2));
      return `<h${level}>${data?.text || ''}</h${level}>`;
    }
    case 'list':
      return renderListHtml(data?.items || [], data?.style);
    case 'quote':
      return `<blockquote>${data?.text || ''}${
        data?.caption ? `<cite>${escapeAttr(data.caption)}</cite>` : ''
      }</blockquote>`;
    case 'delimiter':
      return '<hr>';
    case 'image': {
      const url = data?.file?.url || data?.url || '';
      const caption = data?.caption ? escapeAttr(data.caption) : '';
      return `<figure><img src="${escapeAttr(url)}" alt="${caption}">${
        caption ? `<figcaption>${caption}</figcaption>` : ''
      }</figure>`;
    }
    case 'code':
      return `<pre><code>${escapeAttr(data?.code || '')}</code></pre>`;
    case 'link':
      return `<a href="${escapeAttr(data?.link || '')}" target="_blank" rel="noopener">${escapeAttr(
        data?.meta?.title || data?.link || ''
      )}</a>`;
    default:
      return data?.text ? `<p>${data.text}</p>` : '';
  }
}
