// Non-secret configuration only.
// Set BOT_OWNER_ID before deployment. Never place API keys or bot tokens here.
export const BOT_OWNER_ID = 0; // <-- replace with your Telegram numeric owner ID

export const VERSION = '5.0-serverless';
export const ROLES = [
  'RESTRICTED', 'MEMBER', 'HELPER', 'MODERATOR',
  'ADMIN', 'SENIOR_ADMIN', 'GROUP_OWNER', 'BOT_OWNER',
];

export const PERMISSIONS = [
  'WARN', 'MUTE', 'BAN', 'DELETE', 'MODERATION', 'LOCKS', 'ADMINS',
  'REPORTS', 'SETTINGS', 'WELCOME', 'AI', 'GAME', 'PIN', 'TAG',
  'NOTES', 'FILTERS', 'ANTIRAID', 'HELPER', 'EMOJI', 'VOICE_TOOLS',
];

export const LOCK_TYPES = [
  'links', 'media', 'photos', 'videos', 'documents', 'audio',
  'stickers', 'gifs', 'forwards', 'entities', 'zalgo',
];

export const DEFAULT_ROLE_PERMISSIONS = {
  RESTRICTED: [],
  MEMBER: ['GAME', 'AI', 'EMOJI'],
  HELPER: ['GAME', 'AI', 'EMOJI', 'HELPER'],
  MODERATOR: ['WARN', 'MUTE', 'DELETE', 'GAME', 'AI', 'EMOJI'],
  ADMIN: ['WARN', 'MUTE', 'BAN', 'DELETE', 'MODERATION', 'LOCKS', 'GAME', 'AI', 'PIN', 'NOTES', 'FILTERS'],
  SENIOR_ADMIN: PERMISSIONS,
  GROUP_OWNER: PERMISSIONS,
  BOT_OWNER: PERMISSIONS,
};
