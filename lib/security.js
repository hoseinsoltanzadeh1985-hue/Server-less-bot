import { db } from 'sdk';
import { eq, and } from 'sdk/db';
import { groupSettings, rateBuckets } from 'schema';
import { getSettings, updateSettings, addAudit } from 'lib/store';
import { now, text } from 'lib/util';
import { LOCK_TYPES } from 'lib/config';

export const LINK_RE = /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|bit\.ly\/)/i;

export function detectLockedContent(message, settings) {
  const locks = JSON.parse(settings?.locks || '{}');
  const body = text(message?.text || message?.caption);
  if (locks.links && LINK_RE.test(body)) return 'links';
  if (locks.media && (message.photo || message.video || message.audio || message.document || message.voice || message.animation)) return 'media';
  if (locks.photos && message.photo) return 'photos';
  if (locks.videos && message.video) return 'videos';
  if (locks.documents && message.document) return 'documents';
  if (locks.audio && (message.audio || message.voice)) return 'audio';
  if (locks.stickers && message.sticker) return 'stickers';
  if (locks.gifs && message.animation) return 'gifs';
  if (locks.forwards && (message.forward_origin || message.is_automatic_forward)) return 'forwards';
  if (locks.entities && (message.entities || message.caption_entities)) return 'entities';
  if (/[\\u0300-\\u036f]{8,}/u.test(body)) return 'zalgo';
  return null;
}

export function detectBadword(message, settings) {
  const words = JSON.parse(settings?.badwords || '[]');
  const body = text(message?.text || message?.caption).toLowerCase();
  return words.find(w => w && body.includes(String(w).toLowerCase())) || null;
}

export async function setLock(chatId, lock, enabled) {
  if (!LOCK_TYPES.includes(lock)) throw new Error('unknown lock');
  const settings = await getSettings(chatId);
  const locks = JSON.parse(settings.locks || '{}');
  locks[lock] = !!enabled;
  await updateSettings(chatId, { locks: JSON.stringify(locks) });
}

export async function setBadword(chatId, word, enabled) {
  const settings = await getSettings(chatId);
  const words = JSON.parse(settings.badwords || '[]');
  const normalized = String(word).trim().toLowerCase();
  const next = enabled
    ? Array.from(new Set([...words, normalized])).slice(0, 500)
    : words.filter(w => w !== normalized);
  await updateSettings(chatId, { badwords: JSON.stringify(next) });
}

export async function rateLimit(key, max = 30, windowSeconds = 60) {
  const t = now();
  const existing = await db.select().from(rateBuckets).where(eq(rateBuckets.bucketKey, key)).limit(1).all();
  if (!existing.length || t - existing[0].windowStarted >= windowSeconds) {
    if (existing.length) {
      await db.update(rateBuckets).set({ count: 1, windowStarted: t }).where(eq(rateBuckets.bucketKey, key)).run();
    } else {
      await db.insert(rateBuckets).values({ bucketKey: key, count: 1, windowStarted: t }).run();
    }
    return true;
  }
  if (existing[0].count >= max) return false;
  await db.update(rateBuckets).set({ count: existing[0].count + 1 }).where(eq(rateBuckets.bucketKey, key)).run();
  return true;
}

export async function audit(chatId, actorId, action, targetId, details) {
  await addAudit(chatId, actorId, action, targetId, details);
}
