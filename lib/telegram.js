import { api } from 'sdk';

export async function chatMember(chatId, userId) {
  return api.getChatMember({ chat_id: chatId, user_id: userId });
}

export async function botMember(chatId) {
  const me = await api.getMe();
  return api.getChatMember({ chat_id: chatId, user_id: me.id });
}

export function statusRank(status) {
  return {
    creator: 100,
    administrator: 90,
    member: 50,
    restricted: 30,
    left: 0,
    kicked: 0,
  }[status] ?? 0;
}

export async function isTelegramAdmin(chatId, userId) {
  const m = await chatMember(chatId, userId);
  return m.status === 'creator' || m.status === 'administrator';
}

export async function botCan(chatId, field) {
  const m = await botMember(chatId);
  if (m.status === 'creator') return true;
  if (m.status !== 'administrator') return false;
  return m[field] === true;
}

export async function moderate(action, chatId, userId, extra = {}) {
  switch (action) {
    case 'ban': return api.banChatMember({ chat_id: chatId, user_id: userId, ...extra });
    case 'unban': return api.unbanChatMember({ chat_id: chatId, user_id: userId, only_if_banned: true, ...extra });
    case 'mute': return api.restrictChatMember({ chat_id: chatId, user_id: userId, permissions: { can_send_messages: false }, ...extra });
    case 'unmute': return api.restrictChatMember({ chat_id: chatId, user_id: userId, permissions: {
      can_send_messages: true, can_send_audios: true, can_send_documents: true,
      can_send_photos: true, can_send_videos: true, can_send_video_notes: true,
      can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true,
      can_add_web_page_previews: true, can_change_info: false, can_invite_users: true,
      can_pin_messages: false, can_manage_topics: false,
    }, ...extra });
    case 'delete': return api.deleteMessage({ chat_id: chatId, message_id: userId });
    case 'pin': return api.pinChatMessage({ chat_id: chatId, message_id: userId, ...extra });
    case 'unpin': return api.unpinChatMessage({ chat_id: chatId, message_id: userId, ...extra });
    default: throw new Error('unsupported action');
  }
}

export async function send(chatId, text, extra = {}) {
  return api.sendMessage({ chat_id: chatId, text, ...extra });
}
