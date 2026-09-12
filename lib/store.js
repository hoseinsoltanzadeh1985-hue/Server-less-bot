import { db } from 'sdk';
import { eq, and, desc } from 'sdk/db';
import {
  users, groups, members, groupSettings, warnings, notes,
  auditLogs, processedUpdates, gameScores, gameSessions,
  groupPresence,
} from 'schema';
import { DEFAULT_ROLE_PERMISSIONS, ROLES } from 'lib/config';
import { now } from 'lib/util';

export async function upsertUser(user) {
  if (!user?.id) return;
  const row = {
    tgId: user.id,
    name: user.first_name || user.username || String(user.id),
    username: user.username || null,
    lang: user.language_code || 'fa',
    updatedAt: now(),
  };
  await db.insert(users).values(row).onConflictDoUpdate({
    target: users.tgId,
    set: { name: row.name, username: row.username, lang: row.lang, updatedAt: row.updatedAt },
  }).run();
}

export async function ensureGroup(chat) {
  const existing = await db.select().from(groups).where(eq(groups.chatId, chat.id)).limit(1).all();
  if (existing.length) return existing[0];
  const trialUntil = now() + 15 * 86400;
  const row = { chatId: chat.id, title: chat.title || '', trialUntil, active: true, createdAt: now(), updatedAt: now() };
  await db.insert(groups).values(row).run();
  await db.insert(groupSettings).values({ chatId: chat.id, updatedAt: now() }).run();
  return row;
}

export async function getGroup(chatId) {
  const rows = await db.select().from(groups).where(eq(groups.chatId, chatId)).limit(1).all();
  return rows[0] || null;
}

export async function ensureMember(chatId, userId, role = 'MEMBER') {
  const rows = await db.select().from(members).where(and(eq(members.chatId, chatId), eq(members.userId, userId))).limit(1).all();
  if (rows.length) return rows[0];
  const permissions = JSON.stringify(DEFAULT_ROLE_PERMISSIONS[role] || []);
  const row = { chatId, userId, role, status: 'member', permissions, updatedAt: now() };
  await db.insert(members).values(row).run();
  return row;
}

export async function getMember(chatId, userId) {
  const rows = await db.select().from(members).where(and(eq(members.chatId, chatId), eq(members.userId, userId))).limit(1).all();
  return rows[0] || null;
}

export async function setMemberRole(chatId, userId, role) {
  if (!ROLES.includes(role)) throw new Error('invalid role');
  const existing = await getMember(chatId, userId);
  const permissions = JSON.stringify(DEFAULT_ROLE_PERMISSIONS[role] || []);
  if (existing) {
    await db.update(members).set({ role, permissions, updatedAt: now() })
      .where(and(eq(members.chatId, chatId), eq(members.userId, userId))).run();
  } else {
    await db.insert(members).values({ chatId, userId, role, status: 'member', permissions, updatedAt: now() }).run();
  }
}

export async function setMemberStatus(chatId, userId, status) {
  await ensureMember(chatId, userId);
  await db.update(members).set({ status, updatedAt: now() })
    .where(and(eq(members.chatId, chatId), eq(members.userId, userId))).run();
}

export async function getSettings(chatId) {
  const rows = await db.select().from(groupSettings).where(eq(groupSettings.chatId, chatId)).limit(1).all();
  if (rows.length) return rows[0];
  await db.insert(groupSettings).values({ chatId, updatedAt: now() }).run();
  return (await db.select().from(groupSettings).where(eq(groupSettings.chatId, chatId)).limit(1).all())[0];
}

export async function updateSettings(chatId, patch) {
  await getSettings(chatId);
  await db.update(groupSettings).set({ ...patch, updatedAt: now() }).where(eq(groupSettings.chatId, chatId)).run();
}

export async function addWarning(chatId, userId, actorId, reason) {
  return db.insert(warnings).values({ chatId, userId, actorId, reason: reason || '', createdAt: now() }).returning().run();
}

export async function warningCount(chatId, userId) {
  const rows = await db.select().from(warnings).where(and(eq(warnings.chatId, chatId), eq(warnings.userId, userId))).all();
  return rows.length;
}

export async function clearWarnings(chatId, userId) {
  await db.delete(warnings).where(and(eq(warnings.chatId, chatId), eq(warnings.userId, userId))).run();
}

export async function addAudit(chatId, actorId, action, targetId = null, details = '') {
  await db.insert(auditLogs).values({ chatId, actorId, action, targetId, details: String(details).slice(0, 2000), createdAt: now() }).run();
}

export async function recentAudit(chatId, limit = 20) {
  return db.select().from(auditLogs).where(eq(auditLogs.chatId, chatId)).orderBy(desc(auditLogs.createdAt)).limit(limit).all();
}

export async function claimUpdate(updateId) {
  const rows = await db.select().from(processedUpdates).where(eq(processedUpdates.updateId, updateId)).limit(1).all();
  if (rows.length) return false;
  try {
    await db.insert(processedUpdates).values({ updateId, createdAt: now() }).run();
    return true;
  } catch {
    return false;
  }
}

export async function getNote(chatId, name) {
  const rows = await db.select().from(notes).where(and(eq(notes.chatId, chatId), eq(notes.name, name))).limit(1).all();
  return rows[0] || null;
}

export async function listNotes(chatId) {
  return db.select().from(notes).where(eq(notes.chatId, chatId)).orderBy(desc(notes.createdAt)).limit(100).all();
}

export async function saveNote(chatId, name, value) {
  const existing = await getNote(chatId, name);
  if (existing) {
    await db.update(notes).set({ value }).where(eq(notes.id, existing.id)).run();
  } else {
    await db.insert(notes).values({ chatId, name, value, createdAt: now() }).run();
  }
}

export async function deleteNote(chatId, name) {
  await db.delete(notes).where(and(eq(notes.chatId, chatId), eq(notes.name, name))).run();
}

export async function saveScore(game, chatId, userId, score, metadata = {}) {
  await db.insert(gameScores).values({ game, chatId, userId, score: Math.max(0, Math.floor(score)), metadata: JSON.stringify(metadata), createdAt: now() }).run();
}

export async function topScores(game, chatId, limit = 10) {
  return db.select().from(gameScores).where(and(eq(gameScores.game, game), eq(gameScores.chatId, chatId)))
    .orderBy(desc(gameScores.score)).limit(limit).all();
}

export async function createGameSession(game, chatId, ownerId, payload = {}) {
  const id = `${game}:${chatId}:${ownerId}:${Date.now()}`;
  await db.insert(gameSessions).values({ id, game, chatId, ownerId, state: 'WAITING', payload: JSON.stringify(payload), createdAt: now(), updatedAt: now() }).run();
  return id;
}

export async function getGameSession(id) {
  const rows = await db.select().from(gameSessions).where(eq(gameSessions.id, id)).limit(1).all();
  return rows[0] || null;
}

export async function updatePresence(chatId, userId) {
  const existing = await db.select().from(groupPresence)
    .where(and(eq(groupPresence.chatId, chatId), eq(groupPresence.userId, userId))).limit(1).all();
  if (existing.length) {
    await db.update(groupPresence).set({ lastSeen: now() })
      .where(and(eq(groupPresence.chatId, chatId), eq(groupPresence.userId, userId))).run();
  } else {
    await db.insert(groupPresence).values({ chatId, userId, lastSeen: now() }).run();
  }
}
