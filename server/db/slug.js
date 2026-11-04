// Build a human-readable, unique article URL slug: "<slugified-title>-<timeHash>".
// timeHash is a stable short hash derived from the article's creation time, so
// the URL stays readable and unique without depending on the numeric id.
export function makeSlug(title, createdAt) {
  const base = slugify(title);
  const timeHash = timeHashFrom(createdAt);
  return `${base}-${timeHash}`;
}

function slugify(str) {
  return String(str || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'bai-viet';
}

function timeHashFrom(createdAt) {
  let t = createdAt != null ? Date.parse(createdAt) : NaN;
  if (Number.isNaN(t)) t = Math.floor(Math.random() * 1e12);
  const s = String(t);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33 + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).padStart(7, '0').slice(-7);
}
