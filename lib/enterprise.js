import { db } from 'sdk';
import { and, desc, eq, lte, sql } from 'sdk/db';
import { aiMemories, aiPersonalities, gameEconomy, jobQueue, rolePolicies, botConfig } from 'schema';
import { DEFAULT_ROLE_PERMISSIONS } from 'lib/config';
import { now } from 'lib/util';

export async function getRolePolicy(chatId, role) {
  const rows = await db.select().from(rolePolicies).where(and(eq(rolePolicies.chatId, chatId), eq(rolePolicies.role, role))).limit(1).all();
  if (!rows.length) return DEFAULT_ROLE_PERMISSIONS[role] || [];
  try { return JSON.parse(rows[0].permissions) || []; } catch { return []; }
}

export async function setRolePolicy(chatId, role, permissions) {
  const clean = [...new Set(permissions)].slice(0, 100);
  await db.insert(rolePolicies).values({ chatId, role, permissions: JSON.stringify(clean), updatedAt: now() })
    .onConflictDoUpdate({ target: [rolePolicies.chatId, rolePolicies.role], set: { permissions: JSON.stringify(clean), updatedAt: now() } }).run();
  return clean;
}

export async function enqueueJob(type, payload = {}, chatId = null, userId = null, delaySeconds = 0) {
  return db.insert(jobQueue).values({ type, payload: JSON.stringify(payload), chatId, userId, status: 'PENDING', attempts: 0, availableAt: now() + Math.max(0, delaySeconds), createdAt: now() }).returning().run();
}

export async function claimJobs(limit = 5) {
  const rows = await db.select().from(jobQueue).where(and(eq(jobQueue.status, 'PENDING'), lte(jobQueue.availableAt, now()))).orderBy(jobQueue.id).limit(limit).all();
  const claimed = [];
  for (const row of rows) {
    const result = await db.update(jobQueue).set({ status: 'RUNNING', lockedAt: now(), attempts: row.attempts + 1 }).where(and(eq(jobQueue.id, row.id), eq(jobQueue.status, 'PENDING'))).returning().run();
    if (result?.length) claimed.push(result[0]);
  }
  return claimed;
}

export async function completeJob(id) { await db.update(jobQueue).set({ status: 'DONE' }).where(eq(jobQueue.id, id)).run(); }
export async function failJob(id, retry = true) { await db.update(jobQueue).set({ status: retry ? 'PENDING' : 'FAILED', availableAt: now() + 30 }).where(eq(jobQueue.id, id)).run(); }

export async function addMemory(userId, chatId, value, kind = 'preference', ttlSeconds = 0) {
  const text = String(value).trim().slice(0, 1000); if (!text) return;
  await db.insert(aiMemories).values({ userId, chatId, kind, value: text, expiresAt: ttlSeconds ? now() + ttlSeconds : null, createdAt: now(), updatedAt: now() }).run();
}
export async function getMemories(userId, chatId, limit = 10) {
  const rows = await db.select().from(aiMemories).where(and(eq(aiMemories.userId, userId), chatId == null ? sql`1=1` : eq(aiMemories.chatId, chatId))).orderBy(desc(aiMemories.updatedAt)).limit(limit).all();
  return rows.filter(r => !r.expiresAt || r.expiresAt > now());
}
export async function cleanupMemories() {
  return db.delete(aiMemories).where(and(sql`${aiMemories.expiresAt} IS NOT NULL`, lte(aiMemories.expiresAt, now()))).run();
}

// Serverless has no always-on cron. Run maintenance lazily at most once per 24h
// whenever the bot receives traffic. Only expired memory is deleted; active
// memory is never removed by this maintenance pass.
export async function runDailyMemoryMaintenance() {
  const key = 'maintenance.memory_cleanup.last_run';
  const rows = await db.select().from(botConfig).where(eq(botConfig.key, key)).limit(1).all();
  const last = rows[0]?.value ? Number(rows[0].value) : 0;
  const current = now();
  if (Number.isFinite(last) && current - last < 86400) return { ran: false, deleted: 0 };
  const result = await cleanupMemories();
  await db.insert(botConfig).values({ key, value: String(current), updatedAt: current })
    .onConflictDoUpdate({ target: botConfig.key, set: { value: String(current), updatedAt: current } }).run();
  return { ran: true, deleted: Number(result?.changes || result?.rowCount || 0) };
}

export async function getPersonality(scopeKey = 'global') {
  const rows = await db.select().from(aiPersonalities).where(eq(aiPersonalities.scopeKey, scopeKey)).limit(1).all();
  return rows[0] || { scopeKey, name: 'Pedi', prompt: 'Helpful, concise, respectful Persian assistant.' };
}
export async function setPersonality(scopeKey, name, prompt) {
  await db.insert(aiPersonalities).values({ scopeKey, name: String(name).slice(0, 80), prompt: String(prompt).slice(0, 2000), updatedAt: now() })
    .onConflictDoUpdate({ target: aiPersonalities.scopeKey, set: { name: String(name).slice(0, 80), prompt: String(prompt).slice(0, 2000), updatedAt: now() } }).run();
}

export async function awardXp(chatId, userId, xp = 10, coins = 0) {
  const rows = await db.select().from(gameEconomy).where(and(eq(gameEconomy.chatId, chatId), eq(gameEconomy.userId, userId))).limit(1).all();
  const old = rows[0] || { xp: 0, coins: 0, level: 1 };
  const nextXp = Math.max(0, old.xp + Math.min(1000, Math.max(0, xp)));
  const level = Math.max(1, Math.floor(Math.sqrt(nextXp / 100)) + 1);
  const next = { chatId, userId, xp: nextXp, coins: Math.max(0, old.coins + coins), level, updatedAt: now() };
  if (rows.length) await db.update(gameEconomy).set(next).where(and(eq(gameEconomy.chatId, chatId), eq(gameEconomy.userId, userId))).run();
  else await db.insert(gameEconomy).values(next).run();
  return next;
}
export async function leaderboardEconomy(chatId, limit = 10) { return db.select().from(gameEconomy).where(eq(gameEconomy.chatId, chatId)).orderBy(desc(gameEconomy.xp)).limit(limit).all(); }

export async function auditSummary(chatId, limit = 100) {
  const { auditLogs } = await import('schema');
  const rows = await db.select().from(auditLogs).where(eq(auditLogs.chatId, chatId)).orderBy(desc(auditLogs.createdAt)).limit(limit).all();
  const counts = {};
  for (const r of rows) counts[r.action] = (counts[r.action] || 0) + 1;
  return { total: rows.length, counts };
}
