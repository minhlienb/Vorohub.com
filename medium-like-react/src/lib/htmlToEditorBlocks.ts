// Parse the HTML string we get from feed.content back into EditorJS
// block objects so the writer can edit an existing post. Browser-only
// because we use DOMParser to walk the parsed tree.

export function htmlToEditorBlocks(html: string = ''): any[] {
  if (!html || typeof html !== 'string') return [];
  const container = document.createElement('div');
  container.innerHTML = html;
  const blocks: any[] = [];
  let id = 0;
  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        blocks.push({
          id: `b${++id}`,
          type: 'paragraph',
          data: { text: node.textContent.trim() }
        });
      }
      continue;
    }
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = el.innerHTML;
    switch (tag) {
      case 'h2':
      case 'h3':
      case 'h4': {
        const level = Number(tag[1]);
        blocks.push({ id: `b${++id}`, type: 'header', data: { level, text: inner } });
        break;
      }
      case 'p':
        blocks.push({ id: `b${++id}`, type: 'paragraph', data: { text: inner } });
        break;
      case 'ul':
      case 'ol': {
        const items = Array.from(el.querySelectorAll(':scope > li')).map((li) => (li as HTMLElement).innerHTML);
        blocks.push({
          id: `b${++id}`,
          type: 'list',
          data: { style: tag === 'ol' ? 'ordered' : 'unordered', items }
        });
        break;
      }
      case 'blockquote': {
        const cite = el.querySelector('cite');
        const caption = cite ? cite.textContent || '' : '';
        const clone = el.cloneNode(true) as HTMLElement;
        if (cite) cite.remove();
        blocks.push({
          id: `b${++id}`,
          type: 'quote',
          data: { text: clone.innerHTML, caption }
        });
        break;
      }
      case 'hr':
        blocks.push({ id: `b${++id}`, type: 'delimiter', data: {} });
        break;
      case 'figure': {
        const img = el.querySelector('img');
        const cap = el.querySelector('figcaption');
        if (img) {
          blocks.push({
            id: `b${++id}`,
            type: 'image',
            data: {
              file: { url: img.getAttribute('src') || '' },
              caption: cap ? cap.textContent || '' : '',
              withBorder: false,
              stretched: false,
              withBackground: false
            }
          });
        }
        break;
      }
      case 'pre': {
        const code = el.querySelector('code');
        blocks.push({
          id: `b${++id}`,
          type: 'code',
          data: { code: code ? code.textContent || '' : el.textContent || '' }
        });
        break;
      }
      default:
        if (el.textContent?.trim()) {
          blocks.push({
            id: `b${++id}`,
            type: 'paragraph',
            data: { text: inner }
          });
        }
    }
  }
  return blocks;
}
