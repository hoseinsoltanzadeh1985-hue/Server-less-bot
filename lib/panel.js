import { roleLabel } from 'lib/rbac';
import { DEFAULT_ROLE_PERMISSIONS } from 'lib/config';

export function mainPanel(role, permissions = DEFAULT_ROLE_PERMISSIONS[role] || []) {
  const can = (p) => permissions.includes(p);
  const rows = [[{ text: '🏠 داشبورد', callback_data: 'panel:home' }]];
  if (can('MODERATION') || can('WARN') || can('MUTE') || can('BAN')) rows.push([{ text: '👥 مدیریت گروه', callback_data: 'panel:group' }]);
  if (can('LOCKS')) rows.push([{ text: '🔐 امنیت', callback_data: 'panel:security' }]);
  if (can('AI')) rows.push([{ text: '🤖 هوش مصنوعی', callback_data: 'panel:ai' }]);
  if (can('GAME')) rows.push([{ text: '🎮 بازی‌ها', callback_data: 'panel:games' }]);
  if (can('REPORTS')) rows.push([{ text: '📊 لاگ و آمار', callback_data: 'panel:logs' }]);
  if (can('SETTINGS')) rows.push([{ text: '⚙️ تنظیمات', callback_data: 'panel:settings' }]);
  if (can('ADMINS')) rows.push([{ text: '👑 مدیریت نقش‌ها', callback_data: 'panel:policies' }]);
  return {
    text: `<b>ققنوس | Qoqnoos</b> · ${roleLabel(role)}\n\nپنل بر اساس نقش و مجوزهای مؤثر ساخته شده است.`,
    reply_markup: { inline_keyboard: rows },
  };
}

export function gamesPanel() {
  return {
    text: '🎮 <b>مرکز بازی ققنوس</b>\n\nسه بازی HTML5 پروژه:',
    reply_markup: { inline_keyboard: [
      [{ text: '🎲 تخته‌نرد', callback_data: 'game:backgammon' }],
      [{ text: '✈️ Air Raiders', callback_data: 'game:air' }],
      [{ text: '🎡 گردونه انتخاب', callback_data: 'game:wheel' }],
      [{ text: '🏆 جدول امتیاز', callback_data: 'game:scores' }],
    ]},
  };
}

export function enterprisePanel() {
  return {
    text: '🦅 <b>ققنوس Enterprise</b>\n\nسیاست نقش‌ها، صف کار، حافظه AI، شخصیت و اقتصاد بازی.',
    reply_markup: { inline_keyboard: [
      [{ text: '🔐 Policy نقش‌ها', callback_data: 'panel:policies' }],
      [{ text: '🧠 Memory / Personality', callback_data: 'panel:memory' }],
      [{ text: '⚙️ Queue', callback_data: 'panel:queue' }, { text: '🏆 Economy', callback_data: 'panel:economy' }],
      [{ text: '📊 Security Audit', callback_data: 'panel:audit' }],
    ]},
  };
}
