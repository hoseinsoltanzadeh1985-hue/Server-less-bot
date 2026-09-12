import { api } from 'sdk';
import { mainPanel } from 'lib/panel';
import { resolveRole, allowed } from 'lib/rbac';
import { getRolePolicy } from 'lib/enterprise';
import { showGames, leaderboard } from 'lib/games';
import { setLock } from 'lib/security';
import { LOCK_TYPES } from 'lib/config';
import { html } from 'lib/util';

export default async function(callbackQuery, ctx) {
  const data = callbackQuery?.data || '';
  const { claimUpdate } = await import('lib/store');
  const updateId = ctx?.update?.update_id;
  if (updateId != null && !(await claimUpdate(updateId))) return;
  const fromId = callbackQuery?.from?.id;
  const message = callbackQuery?.message;
  if (!fromId || !message) return;
  const chatId = message.chat.id;

  try {
    await api.answerCallbackQuery({ callback_query_id: callbackQuery.id });
    if (data === 'panel:home') {
      const role = await resolveRole(chatId, fromId);
      const permissions = await getRolePolicy(chatId, role);
      const p = mainPanel(role, permissions);
      return api.editMessageText({ chat_id: chatId, message_id: message.message_id, text: p.text, parse_mode: 'HTML', reply_markup: p.reply_markup });
    }
    if (data === 'panel:games') return showGames(chatId);
    if (data === 'panel:security') {
      if (!(await allowed(chatId, fromId, 'LOCKS'))) throw new Error('دسترسی کافی نیست.');
      return api.editMessageText({ chat_id: chatId, message_id: message.message_id, text: `🔐 <b>امنیت</b>\nقفل‌های اصلی: ${LOCK_TYPES.join(', ')}`, parse_mode: 'HTML' });
    }
    if (data.startsWith('game:')) {
      if (!(await allowed(chatId, fromId, 'GAME'))) throw new Error('دسترسی کافی نیست.');
      const game = data.slice(5);
      if (game === 'scores') return leaderboard(chatId, 'air');
      return showGames(chatId);
    }
    if (data.startsWith('lock:')) {
      if (!(await allowed(chatId, fromId, 'LOCKS'))) throw new Error('دسترسی کافی نیست.');
      const [, type, state] = data.split(':');
      if (!LOCK_TYPES.includes(type)) throw new Error('قفل نامعتبر.');
      await setLock(chatId, type, state === '1');
      return api.answerCallbackQuery({ callback_query_id: callbackQuery.id, text: `قفل ${type} به‌روزرسانی شد.` });
    }
  } catch (e) {
    try { await api.answerCallbackQuery({ callback_query_id: callbackQuery.id, text: html(e?.message || 'خطا'), show_alert: true }); } catch {}
  }
}
