import { BOT_OWNER_ID, DEFAULT_ROLE_PERMISSIONS, ROLES } from 'lib/config';
import { getMember, ensureMember, setMemberRole } from 'lib/store';
import { getRolePolicy } from 'lib/enterprise';
import { chatMember } from 'lib/telegram';

const roleRank = Object.fromEntries(ROLES.map((r, i) => [r, i]));

export async function resolveRole(chatId, userId) {
  if (userId === BOT_OWNER_ID && BOT_OWNER_ID !== 0) return 'BOT_OWNER';
  const tg = await chatMember(chatId, userId);
  if (tg.status === 'creator') return 'GROUP_OWNER';
  if (tg.status === 'administrator') {
    const saved = await getMember(chatId, userId);
    return saved?.role && roleRank[saved.role] >= roleRank.ADMIN ? saved.role : 'ADMIN';
  }
  const saved = await getMember(chatId, userId);
  if (tg.status === 'restricted') return 'RESTRICTED';
  if (tg.status === 'left' || tg.status === 'kicked') return 'MEMBER';
  if (saved?.role && roleRank[saved.role] < roleRank.ADMIN) return saved.role;
  return 'MEMBER';
}

export async function syncMember(chatId, userId) {
  const tg = await chatMember(chatId, userId);
  let role;
  if (userId === BOT_OWNER_ID && BOT_OWNER_ID !== 0) role = 'BOT_OWNER';
  else if (tg.status === 'creator') role = 'GROUP_OWNER';
  else if (tg.status === 'administrator') role = 'ADMIN';
  else if (tg.status === 'restricted') role = 'RESTRICTED';
  else role = 'MEMBER';
  await ensureMember(chatId, userId, role);
  const existing = await getMember(chatId, userId);
  if (existing?.role === 'BOT_OWNER' && role !== 'BOT_OWNER') return 'BOT_OWNER';
  if (existing?.role === 'GROUP_OWNER' && role !== 'GROUP_OWNER' && userId !== BOT_OWNER_ID) {
    await setMemberRole(chatId, userId, role);
  }
  return await resolveRole(chatId, userId);
}

export async function canRoleForChat(chatId, role, permission) {
  const policy = await getRolePolicy(chatId, role);
  return (policy || DEFAULT_ROLE_PERMISSIONS[role] || []).includes(permission);
}

export function canRole(role, permission) {
  return (DEFAULT_ROLE_PERMISSIONS[role] || []).includes(permission);
}

export async function allowed(chatId, actorId, permission) {
  const role = await resolveRole(chatId, actorId);
  return canRoleForChat(chatId, role, permission);
}

export async function canTarget(chatId, actorId, targetId, permission) {
  const actorRole = await resolveRole(chatId, actorId);
  const targetRole = await resolveRole(chatId, targetId);
  if (!(await canRoleForChat(chatId, actorRole, permission))) return false;
  if (actorRole === 'BOT_OWNER') return true;
  return roleRank[actorRole] > roleRank[targetRole];
}

export function roleLabel(role) {
  return {
    BOT_OWNER: '👑 مالک ربات',
    GROUP_OWNER: '🛡 مالک گروه',
    SENIOR_ADMIN: '⭐ ادمین ارشد',
    ADMIN: '🔧 ادمین',
    MODERATOR: '🛡 ناظر',
    HELPER: '🤝 همیار',
    MEMBER: '👤 عضو',
    RESTRICTED: '🚫 محدود',
  }[role] || role;
}
