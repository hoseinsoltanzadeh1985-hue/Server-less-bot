import { table, integer, text, boolean, index, sql, primaryKey } from 'sdk/db';

// No foreign keys: Telegram Serverless does not support them.
// Every access path is explicitly scoped by chat/user IDs in lib/store.js.

export const users = table('users', {
  tgId: integer('tg_id').primaryKey(),
  name: text('name').notNull(),
  username: text('username'),
  lang: text('lang').default('fa'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const groups = table('groups', {
  chatId: integer('chat_id').primaryKey(),
  title: text('title').notNull().default(''),
  trialUntil: integer('trial_until', { mode: 'timestamp' }),
  active: boolean('active').notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const members = table('members', {
  chatId: integer('chat_id').notNull(),
  userId: integer('user_id').notNull(),
  role: text('role').notNull().default('MEMBER'),
  status: text('status').notNull().default('member'),
  permissions: text('permissions').notNull().default('{}'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  memberPk: primaryKey({ columns: [t.chatId, t.userId] }),
  memberRole: index('idx_members_chat_role').on(t.chatId, t.role),
}));

export const groupSettings = table('group_settings', {
  chatId: integer('chat_id').primaryKey(),
  locks: text('locks').notNull().default('{}'),
  badwords: text('badwords').notNull().default('[]'),
  filters: text('filters').notNull().default('{}'),
  welcome: text('welcome').notNull().default(''),
  rules: text('rules').notNull().default(''),
  warningLimit: integer('warning_limit').notNull().default(3),
  antispam: boolean('antispam').notNull().default(true),
  antilink: boolean('antilink').notNull().default(false),
  antiraid: boolean('antiraid').notNull().default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const warnings = table('warnings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').notNull(),
  userId: integer('user_id').notNull(),
  actorId: integer('actor_id').notNull(),
  reason: text('reason').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  warningLookup: index('idx_warnings_chat_user').on(t.chatId, t.userId),
}));

export const notes = table('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').notNull(),
  name: text('name').notNull(),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  noteLookup: index('idx_notes_chat_name').on(t.chatId, t.name),
}));

export const auditLogs = table('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').notNull(),
  actorId: integer('actor_id').notNull(),
  action: text('action').notNull(),
  targetId: integer('target_id'),
  details: text('details').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  auditLookup: index('idx_audit_chat_time').on(t.chatId, t.createdAt),
}));

export const processedUpdates = table('processed_updates', {
  updateId: integer('update_id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const rateBuckets = table('rate_buckets', {
  bucketKey: text('bucket_key').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStarted: integer('window_started').notNull(),
});

export const gameScores = table('game_scores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  game: text('game').notNull(),
  chatId: integer('chat_id').notNull(),
  userId: integer('user_id').notNull(),
  score: integer('score').notNull().default(0),
  metadata: text('metadata').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  gameBoard: index('idx_game_scores_game_chat').on(t.game, t.chatId),
  gameUser: index('idx_game_scores_game_user').on(t.game, t.userId),
}));

export const gameSessions = table('game_sessions', {
  id: text('id').primaryKey(),
  game: text('game').notNull(),
  chatId: integer('chat_id').notNull(),
  ownerId: integer('owner_id').notNull(),
  opponentId: integer('opponent_id'),
  state: text('state').notNull().default('WAITING'),
  payload: text('payload').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  sessionLookup: index('idx_game_sessions_chat_state').on(t.chatId, t.state),
}));

export const groupPresence = table('group_presence', {
  chatId: integer('chat_id').notNull(),
  userId: integer('user_id').notNull(),
  lastSeen: integer('last_seen').notNull(),
}, (t) => ({
  presencePk: primaryKey({ columns: [t.chatId, t.userId] }),
  presenceLookup: index('idx_presence_chat_seen').on(t.chatId, t.lastSeen),
}));

export const botConfig = table('bot_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const rolePolicies = table('role_policies', {
  chatId: integer('chat_id').notNull(),
  role: text('role').notNull(),
  permissions: text('permissions').notNull().default('[]'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({ pk: primaryKey({ columns: [t.chatId, t.role] }), policyLookup: index('idx_role_policies_chat_role').on(t.chatId, t.role) }));

export const jobQueue = table('job_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id'),
  userId: integer('user_id'),
  type: text('type').notNull(),
  payload: text('payload').notNull().default('{}'),
  status: text('status').notNull().default('PENDING'),
  attempts: integer('attempts').notNull().default(0),
  availableAt: integer('available_at').notNull(),
  lockedAt: integer('locked_at'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({ queueLookup: index('idx_job_queue_status_time').on(t.status, t.availableAt) }));

export const aiMemories = table('ai_memories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  chatId: integer('chat_id'),
  kind: text('kind').notNull().default('preference'),
  value: text('value').notNull(),
  expiresAt: integer('expires_at'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({ memoryLookup: index('idx_ai_memories_user_chat').on(t.userId, t.chatId) }));

export const aiPersonalities = table('ai_personalities', {
  scopeKey: text('scope_key').primaryKey(),
  name: text('name').notNull().default('Pedi'),
  prompt: text('prompt').notNull().default('Helpful, concise, respectful Persian assistant.'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const gameEconomy = table('game_economy', {
  chatId: integer('chat_id').notNull(),
  userId: integer('user_id').notNull(),
  xp: integer('xp').notNull().default(0),
  coins: integer('coins').notNull().default(0),
  level: integer('level').notNull().default(1),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  economyPk: primaryKey({ columns: [t.chatId, t.userId] }),
  economyLookup: index('idx_game_economy_chat_xp').on(t.chatId, t.xp),
}));
