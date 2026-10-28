export const BOOK_STATUSES = ['shelf', 'reading', 'read'];
export function safeCover(value) {
  if (typeof value !== 'string') return '';
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length <= 800000) return value;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && value.length <= 2000 ? url.href : ''; } catch { return ''; }
}
export function normalizeBooks(value) {
  if (!Array.isArray(value)) return [];
  const ids = new Set();
  return value.filter(book => {
    if (!book || typeof book.id !== 'string' || !book.id || ids.has(book.id) || typeof book.title !== 'string' || !book.title.trim()) return false;
    ids.add(book.id); return true;
  }).slice(0,500).map(book => {
    const total = Number.isInteger(book.total) ? Math.max(0, Math.min(100000, book.total)) : 0;
    const page = Number.isInteger(book.page) ? Math.max(0, Math.min(total || 100000, book.page)) : 0;
    return {id:book.id, title:book.title.trim().slice(0,150), author:typeof book.author === 'string' ? book.author.slice(0,150) : '', summary:typeof book.summary === 'string' ? book.summary.slice(0,900) : '', cover:safeCover(book.cover), page, total, status:BOOK_STATUSES.includes(book.status) ? book.status : 'shelf'};
  });
}
