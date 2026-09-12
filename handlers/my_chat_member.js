import { ensureGroup, addAudit } from 'lib/store';

export default async function(update) {
  const chat = update?.chat;
  const member = update?.new_chat_member;
  if (!chat || !member) return;
  if (chat.type === 'group' || chat.type === 'supergroup') {
    await ensureGroup(chat);
    await addAudit(chat.id, member.user?.id || 0, `BOT_${member.status}`, null, '');
  }
}
