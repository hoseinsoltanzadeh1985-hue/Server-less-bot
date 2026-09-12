export function json(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export function text(value) {
  return value == null ? '' : String(value);
}

export function html(value) {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function now() {
  return Math.floor(Date.now() / 1000);
}

export function commandOf(message) {
  const raw = text(message?.text).trim();
  if (!raw.startsWith('/')) return null;
  const first = raw.split(/\s+/, 1)[0];
  const body = first.slice(1);
  const at = body.indexOf('@');
  return (at >= 0 ? body.slice(0, at) : body).toLowerCase();
}

export function argsOf(message) {
  const raw = text(message?.text).trim();
  const parts = raw.split(/\s+/);
  return parts.slice(1);
}

export function userName(user) {
  if (!user) return 'کاربر';
  return user.first_name || user.username || String(user.id);
}

export function isGroup(chat) {
  return chat && (chat.type === 'group' || chat.type === 'supergroup');
}

export function isPrivate(chat) {
  return chat?.type === 'private';
}

export function shortId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
