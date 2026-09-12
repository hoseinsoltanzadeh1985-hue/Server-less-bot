import { getMemories, addMemory, setPersonality, getPersonality, awardXp, leaderboardEconomy, enqueueJob, claimJobs, completeJob, failJob, setRolePolicy, auditSummary } from 'lib/enterprise';
import { api } from 'sdk';
import { BOT_OWNER_ID, VERSION, LOCK_TYPES } from 'lib/config';
import { commandOf, argsOf, isGroup, isPrivate, userName, html } from 'lib/util';
import { upsertUser, ensureGroup, ensureMember, getMember, getSettings, setMemberRole, addWarning, warningCount, clearWarnings, updateSettings, saveNote, getNote, listNotes, deleteNote, recentAudit, claimUpdate, updatePresence } from 'lib/store';
import { resolveRole, allowed, canTarget, roleLabel } from 'lib/rbac';
import { getRolePolicy } from 'lib/enterprise';
import { mainPanel } from 'lib/panel';
import { setLock, setBadword, rateLimit } from 'lib/security';
import { inspectMessage, moderateTarget } from 'lib/moderation';
import { showGames, leaderboard } from 'lib/games';
import { aiStatus } from 'lib/ai';
import { botCan, chatMember } from 'lib/telegram';

import { runDailyMemoryMaintenance } from 'lib/enterprise';
async function reply(chatId, text, extra = {}) {
  return api.sendMessage({ chat_id: chatId, text, ...extra });
}

async function requireGroup(message) {
  if (!isGroup(message.chat)) throw new Error('این دستور فقط در گروه قابل استفاده است.');
  await ensureGroup(message.chat);
  await ensureMember(message.chat.id, message.from.id);
  return message.chat.id;
}

async function requirePermission(chatId, userId, permission) {
  if (!(await allowed(chatId, userId, permission))) throw new Error('⛔ دسترسی کافی ندارید.');
}

export default async function(message, ctx) {
  if (!message?.chat || !message?.from) return;
  const updateId = ctx?.update?.update_id;
  if (updateId != null && !(await claimUpdate(updateId))) return;
  await runDailyMemoryMaintenance();
  await upsertUser(message.from);
  if (isGroup(message.chat)) {
    await ensureGroup(message.chat);
    await ensureMember(message.chat.id, message.from.id);
    await updatePresence(message.chat.id, message.from.id);
  }

  const command = commandOf(message);
  if (command) {
    if (!(await rateLimit(`cmd:${message.chat.id}:${message.from.id}`, 20, 60))) return reply(message.chat.id, '⏳ کمی صبر کنید.');
    try {
      const args = argsOf(message);
      switch (command) {
        case 'start':
        case 'help':
          return reply(message.chat.id, `<b>PediGuardian ${VERSION}</b>\n\n🛡 مدیریت و امنیت گروه\n🎮 سه بازی\n🤖 AI\n📊 Audit\n\n/panel برای پنل\n/help برای راهنما`, { parse_mode: 'HTML' });

        case 'panel': {
          const role = isGroup(message.chat) ? await resolveRole(message.chat.id, message.from.id) : (message.from.id === BOT_OWNER_ID ? 'BOT_OWNER' : 'MEMBER');
          const permissions = isGroup(message.chat) ? await getRolePolicy(message.chat.id, role) : (message.from.id === BOT_OWNER_ID ? (await getRolePolicy(0, 'BOT_OWNER')) : []);
          const p = mainPanel(role, permissions);
          return reply(message.chat.id, p.text, { parse_mode: 'HTML', reply_markup: p.reply_markup });
        }

        case 'id':
          return reply(message.chat.id, `🆔 User: <code>${message.from.id}</code>\nChat: <code>${message.chat.id}</code>`, { parse_mode: 'HTML' });

        case 'status': {
          const role = isGroup(message.chat) ? await resolveRole(message.chat.id, message.from.id) : 'MEMBER';
          return reply(message.chat.id, `🛡 <b>PediGuardian</b>\nنسخه: <code>${VERSION}</code>\nنقش: ${roleLabel(role)}`, { parse_mode: 'HTML' });
        }

        case 'security': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'LOCKS');
          const s = await getSettings(chatId);
          return reply(chatId, `🔐 امنیت\nAntiSpam: ${s.antispam ? 'ON' : 'OFF'}\nAntiLink: ${s.antilink ? 'ON' : 'OFF'}\nAntiRaid: ${s.antiraid ? 'ON' : 'OFF'}\nLocks: <code>${html(s.locks)}</code>`, { parse_mode: 'HTML' });
        }

        case 'lock':
        case 'unlock': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'LOCKS');
          const type = args[0];
          if (!LOCK_TYPES.includes(type)) return reply(chatId, `نوع قفل معتبر نیست.\n${LOCK_TYPES.join(', ')}`);
          await setLock(chatId, type, command === 'lock');
          return reply(chatId, `🔐 ${type}: ${command === 'lock' ? 'فعال' : 'غیرفعال'}`);
        }

        case 'lockall':
        case 'unlockall': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'LOCKS');
          for (const type of LOCK_TYPES) await setLock(chatId, type, command === 'lockall');
          return reply(chatId, `🔐 همه قفل‌ها ${command === 'lockall' ? 'فعال' : 'غیرفعال'} شدند.`);
        }

        case 'antispam':
        case 'antilink':
        case 'antiraid': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'LOCKS');
          const settings = await getSettings(chatId);
          const key = command;
          const value = args[0] === 'on' || args[0] === '1' || args[0] === 'فعال';
          await updateSettings(chatId, { [key]: value });
          return reply(chatId, `🛡 ${key}: ${value ? 'ON' : 'OFF'}`);
        }

        case 'warn': {
          const chatId = await requireGroup(message);
          await requirePermission(chatId, message.from.id, 'WARN');
          const target = message.reply_to_message?.from?.id || Number(args[0]);
          if (!target) return reply(chatId, 'روی پیام کاربر ریپلای کنید یا ID بدهید.');
          const reason = message.reply_to_message ? args.join(' ') : args.slice(1).join(' ');
          const count = await moderateTarget(chatId, message.from.id, target, 'warn', reason);
          return reply(chatId, `⚠️ اخطار ثبت شد. تعداد اخطار: ${count}`);
        }

        case 'warnings': {
          const chatId = await requireGroup(message);
          const target = message.reply_to_message?.from?.id || Number(args[0]) || message.from.id;
          return reply(chatId, `⚠️ اخطارهای کاربر <code>${target}</code>: ${await warningCount(chatId, target)}`, { parse_mode: 'HTML' });
        }

        case 'clearwarnings': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'WARN');
          const target = message.reply_to_message?.from?.id || Number(args[0]);
          if (!target) return reply(chatId, 'هدف مشخص نیست.');
          if (!(await canTarget(chatId, message.from.id, target, 'WARN'))) throw new Error('هدف در سطح مدیریتی بالاتر است.');
          await clearWarnings(chatId, target);
          return reply(chatId, '✅ اخطارها پاک شد.');
        }

        case 'mute':
        case 'unmute':
        case 'ban':
        case 'unban': {
          const chatId = await requireGroup(message);
          const target = message.reply_to_message?.from?.id || Number(args[0]);
          if (!target) return reply(chatId, 'روی پیام کاربر ریپلای کنید یا ID بدهید.');
          await moderateTarget(chatId, message.from.id, target, command, args.slice(1).join(' '));
          return reply(chatId, `✅ ${command} انجام شد.`);
        }

        case 'del': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'DELETE');
          if (!message.reply_to_message) return reply(chatId, 'روی پیام موردنظر ریپلای کنید.');
          await api.deleteMessage({ chat_id: chatId, message_id: message.reply_to_message.message_id });
          return reply(chatId, '🗑 حذف شد.');
        }

        case 'pin': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'PIN');
          if (!message.reply_to_message) return reply(chatId, 'روی پیام موردنظر ریپلای کنید.');
          if (!(await botCan(chatId, 'can_pin_messages'))) throw new Error('ربات مجوز Pin ندارد.');
          await api.pinChatMessage({ chat_id: chatId, message_id: message.reply_to_message.message_id });
          return reply(chatId, '📌 سنجاق شد.');
        }

        case 'badword': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'FILTERS');
          const op = (args[0] || 'add').toLowerCase();
          const word = args.slice(1).join(' ').trim();
          if (!['add', 'remove', 'del'].includes(op) || !word) return reply(chatId, 'مثال: /badword add کلمه یا /badword remove کلمه');
          await setBadword(chatId, word, op === 'add');
          return reply(chatId, `✅ کلمه ${op === 'add' ? 'افزوده' : 'حذف'} شد.`);
        }

        case 'note': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'NOTES');
          const name = args[0]; const value = args.slice(1).join(' ');
          if (!name || !value) return reply(chatId, 'مثال: /note قوانین متن');
          await saveNote(chatId, name, value); return reply(chatId, '📝 ذخیره شد.');
        }

        case 'notes': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'NOTES');
          const rows = await listNotes(chatId);
          return reply(chatId, rows.length ? rows.map(r => `• <b>${html(r.name)}</b>: ${html(r.value)}`).join('\n') : '📝 یادداشتی نیست.', { parse_mode: 'HTML' });
        }

        case 'delnote': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'NOTES');
          if (!args[0]) return reply(chatId, 'نام یادداشت را بدهید.');
          await deleteNote(chatId, args[0]); return reply(chatId, '🗑 حذف شد.');
        }

        case 'ai':
          if (isGroup(message.chat)) await requirePermission(message.chat.id, message.from.id, 'AI');
          return reply(message.chat.id, aiStatus());

        case 'aistatus':
          return reply(message.chat.id, aiStatus());

        case 'game':
        case 'games':
          if (isGroup(message.chat)) await requirePermission(message.chat.id, message.from.id, 'GAME');
          return showGames(message.chat.id);

        case 'score':
          if (isGroup(message.chat)) await requirePermission(message.chat.id, message.from.id, 'GAME');
          return leaderboard(message.chat.id, args[0] || 'air');

        case 'logs': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'REPORTS');
          const rows = await recentAudit(chatId, 20);
          return reply(chatId, rows.length ? rows.map(r => `• ${html(r.action)} · <code>${r.actorId}</code> · <code>${r.targetId ?? '-'}</code>`).join('\n') : '📊 لاگی نیست.', { parse_mode: 'HTML' });
        }

        case 'settings': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'SETTINGS');
          const s = await getSettings(chatId);
          return reply(chatId, `⚙️ warningLimit=${s.warningLimit}\nwelcome=${s.welcome ? 'ON' : 'OFF'}`);
        }

        case 'setwarninglimit': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'SETTINGS');
          const n = Math.max(1, Math.min(20, Number(args[0])));
          if (!Number.isFinite(n)) return reply(chatId, 'عدد معتبر نیست.');
          await updateSettings(chatId, { warningLimit: n }); return reply(chatId, `⚙️ حد اخطار: ${n}`);
        }

        case 'admins': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'ADMINS');
          const admins = await api.getChatAdministrators({ chat_id: chatId });
          const lines = admins.map(a => `• <code>${a.user.id}</code> — ${html(userName(a.user))}`);
          return reply(chatId, `👮 <b>ادمین‌ها</b>\n${lines.join('\n')}`, { parse_mode: 'HTML' });
        }

        case 'perms':
          return reply(message.chat.id, '🔐 مجوزها بر اساس نقش واقعی Telegram و hierarchy اعمال می‌شوند.');

        case 'welcome': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'WELCOME');
          const s = await getSettings(chatId);
          return reply(chatId, `👋 Welcome: ${s.welcome ? html(s.welcome) : 'خاموش'}`, { parse_mode: 'HTML' });
        }

        case 'setwelcome': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'WELCOME');
          const value = args.join(' ').slice(0, 1000);
          await updateSettings(chatId, { welcome: value });
          return reply(chatId, value ? '👋 پیام خوشامد ذخیره شد.' : '👋 خوشامد خاموش شد.');
        }

        case 'filter':
        case 'filters':
          return reply(message.chat.id, '🧰 فیلترها در ساختار DB آماده‌اند؛ تنظیمات per-filter در مرحله بعدی با schema نسخه‌دار اضافه می‌شود.');

        case 'emoji':
          return reply(message.chat.id, '✨ Emoji mode فعال است.');

        case 'voiceorder':
          return reply(message.chat.id, '🎙️ Voice Order در این نسخه به worker خارجی متصل نیست؛ Media/Voice runtime عمداً جدا نگه داشته شده است.');

        case 'memory': {
          if (isGroup(message.chat)) await requirePermission(message.chat.id, message.from.id, 'AI');
          const text = args.join(' ').trim();
          if (!text) { const rows = await getMemories(message.from.id, isGroup(message.chat) ? message.chat.id : null, 10); return reply(message.chat.id, rows.length ? '🧠 Memory:\n' + rows.map(r => '• ' + html(r.value)).join('\n') : '🧠 حافظه‌ای ثبت نشده است.', { parse_mode: 'HTML' }); }
          await addMemory(message.from.id, isGroup(message.chat) ? message.chat.id : null, text, 'preference', 30 * 86400);
          return reply(message.chat.id, '🧠 حافظه با TTL سی‌روزه ذخیره شد.');
        }

        case 'personality': {
          if (isGroup(message.chat)) await requirePermission(message.chat.id, message.from.id, 'SETTINGS');
          const prompt = args.join(' ').trim();
          if (!prompt) { const p = await getPersonality(isGroup(message.chat) ? `chat:${message.chat.id}` : 'global'); return reply(message.chat.id, `🎭 <b>${html(p.name)}</b>\n${html(p.prompt)}`, { parse_mode: 'HTML' }); }
          await setPersonality(isGroup(message.chat) ? `chat:${message.chat.id}` : 'global', 'Pedi', prompt);
          return reply(message.chat.id, '🎭 شخصیت AI به‌روزرسانی شد.');
        }

        case 'xp': {
          if (!isGroup(message.chat)) return reply(message.chat.id, '🏆 این دستور در گروه فعال است.');
          const row = await awardXp(message.chat.id, message.from.id, 10, 1);
          return reply(message.chat.id, `🏆 XP: ${row.xp} | Level: ${row.level} | Coins: ${row.coins}`);
        }

        case 'economy': {
          if (!isGroup(message.chat)) return reply(message.chat.id, '🏆 این دستور در گروه فعال است.');
          const rows = await leaderboardEconomy(message.chat.id, 10);
          return reply(message.chat.id, rows.length ? '🏆 <b>Leaderboard</b>\n' + rows.map((r,i)=>`${i+1}. <code>${r.userId}</code> — LV${r.level} / ${r.xp} XP / ${r.coins} 🪙`).join('\n') : '🏆 هنوز امتیازی ثبت نشده است.', { parse_mode:'HTML' });
        }

        case 'policy': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'ADMINS');
          const role = String(args[0] || '').toUpperCase();
          const perms = args.slice(1).join(' ').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
          const { ROLES, PERMISSIONS } = await import('lib/config');
          if (!ROLES.includes(role)) return reply(chatId, 'نقش نامعتبر است.');
          if (!perms.length) return reply(chatId, 'مثال: /policy ADMIN WARN,MUTE,DELETE');
          if (perms.some(p => !PERMISSIONS.includes(p))) return reply(chatId, 'یکی از مجوزها نامعتبر است.');
          await setRolePolicy(chatId, role, perms);
          return reply(chatId, `🔐 Policy نقش ${role} ذخیره شد: ${perms.join(', ')}`);
        }

        case 'audit': {
          const chatId = await requireGroup(message); await requirePermission(chatId, message.from.id, 'REPORTS');
          const a = await auditSummary(chatId, 200);
          const lines = Object.entries(a.counts).sort((x,y)=>y[1]-x[1]).slice(0,10).map(([k,v])=>`• ${html(k)}: ${v}`);
          return reply(chatId, `📊 <b>Security Audit</b>\nکل رویدادهای اخیر: ${a.total}\n${lines.join('\n') || 'بدون رویداد'}`, { parse_mode:'HTML' });
        }

        case 'queue': {
          if (isGroup(message.chat)) await requirePermission(message.chat.id, message.from.id, 'SETTINGS');
          const claimed = await claimJobs(5);
          for (const job of claimed) await completeJob(job.id);
          return reply(message.chat.id, `⚙️ ${claimed.length} job پردازش شد.`);
        }

        case 'trial': {
          const chatId = await requireGroup(message);
          const g = await ensureGroup(message.chat);
          return reply(chatId, g.trialUntil ? `🎟️ Trial تا ${new Date(g.trialUntil * 1000).toISOString()}` : 'Trial فعال نیست.');
        }

        default:
          return reply(message.chat.id, 'دستور ناشناخته است. /help');
      }
    } catch (e) {
      return reply(message.chat.id, `⛔ ${html(e?.message || 'خطا')}`, { parse_mode: 'HTML' });
    }
  }

  if (message.web_app_data?.data) {
    try {
      const p = JSON.parse(message.web_app_data.data);
      if (['air', 'backgammon', 'wheel'].includes(p.game)) {
        const score = Number(p.score);
        if (Number.isSafeInteger(score) && score >= 0 && score <= 100000000) {
          const { saveScore } = await import('lib/store');
          await saveScore(p.game, message.chat.id, message.from.id, score, { source: 'web_app' });
          await reply(message.chat.id, `🏆 امتیاز ثبت شد: <b>${score}</b>`, { parse_mode: 'HTML' });
        }
      }
    } catch {}
  }

  if (isGroup(message.chat)) {
    const inspection = await inspectMessage(message);
    if (inspection.action === 'badword' || inspection.action === 'locked') {
      try {
        if (await botCan(message.chat.id, 'can_delete_messages')) {
          await api.deleteMessage({ chat_id: message.chat.id, message_id: message.message_id });
        }
      } catch {}
    }
  }
}
