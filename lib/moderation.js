import { api } from 'sdk';
import { allowed, canTarget } from 'lib/rbac';
import { addWarning, warningCount, getSettings, addAudit } from 'lib/store';
import { botCan, moderate } from 'lib/telegram';
import { detectBadword, detectLockedContent } from 'lib/security';

export async function moderateTarget(chatId, actorId, targetId, action, reason = '') {
  const permission = action === 'warn' ? 'WARN' :
    action === 'mute' ? 'MUTE' :
    action === 'ban' || action === 'unban' ? 'BAN' :
    action === 'delete' ? 'DELETE' : 'MODERATION';

  if (!(await canTarget(chatId, actorId, targetId, permission))) throw new Error('not authorized');

  const botField = action === 'delete' ? 'can_delete_messages' :
    action === 'ban' || action === 'unban' ? 'can_restrict_members' :
    action === 'mute' ? 'can_restrict_members' : null;
  if (botField && !(await botCan(chatId, botField))) throw new Error('bot lacks native Telegram permission');

  if (action === 'warn') {
    await addWarning(chatId, targetId, actorId, reason);
    await addAudit(chatId, actorId, 'WARN', targetId, reason);
    const count = await warningCount(chatId, targetId);
    const settings = await getSettings(chatId);
    if (count >= settings.warningLimit) {
      await moderate('mute', chatId, targetId);
      await addAudit(chatId, actorId, 'AUTO_MUTE_WARNING_LIMIT', targetId, String(count));
    }
    return count;
  }

  if (action === 'delete') {
    await api.deleteMessage({ chat_id: chatId, message_id: targetId });
  } else {
    await moderate(action, chatId, targetId);
  }
  await addAudit(chatId, actorId, action.toUpperCase(), targetId, reason);
}

export async function inspectMessage(message) {
  if (!message?.chat?.id || !message.from?.id) return { action: 'ignore' };
  const chatId = message.chat.id;
  const actorId = message.from.id;
  const settings = await getSettings(chatId);
  const roleOk = await allowed(chatId, actorId, 'MODERATION') || await allowed(chatId, actorId, 'LOCKS');
  if (roleOk) return { action: 'allow' };

  if (settings.antispam) {
    // Lightweight per-user spam detection is implemented by rate limiting in handler.
  }

  const bad = detectBadword(message, settings);
  if (bad) return { action: 'badword', value: bad };

  const locked = detectLockedContent(message, settings);
  if (locked) return { action: 'locked', value: locked };

  return { action: 'allow' };
}
