import { ensureGroup, ensureMember, setMemberStatus, setMemberRole, addAudit } from 'lib/store';
import { BOT_OWNER_ID } from 'lib/config';

export default async function(update) {
  const chat = update?.chat;
  const member = update?.new_chat_member;
  if (!chat || !member?.user?.id) return;
  await ensureGroup(chat);
  const userId = member.user.id;
  const status = member.status;
  await ensureMember(chat.id, userId);
  await setMemberStatus(chat.id, userId, status);
  if (userId === BOT_OWNER_ID) await setMemberRole(chat.id, userId, 'BOT_OWNER');
  else if (status === 'creator') await setMemberRole(chat.id, userId, 'GROUP_OWNER');
  else if (status === 'administrator') await setMemberRole(chat.id, userId, 'ADMIN');
  else if (status === 'member') await setMemberRole(chat.id, userId, 'MEMBER');
  await addAudit(chat.id, userId, `MEMBER_${status.toUpperCase()}`, userId, '');
}
