import { api } from 'sdk';
import { topScores } from 'lib/store';
import { html } from 'lib/util';

export const GAME_URLS = {
  backgammon: 'https://hoseinsoltanzadeh1985-hue.github.io/Server-less-bot/games/backgammon/',
  air: 'https://hoseinsoltanzadeh1985-hue.github.io/Server-less-bot/games/air-raider/',
  wheel: 'https://hoseinsoltanzadeh1985-hue.github.io/Server-less-bot/games/voice-wheel/',
};

// URL buttons work from both private chats and groups. Telegram WebApp buttons
// are restricted in some chat contexts, so the public HTTPS game host is the
// reliable universal launcher. Mini-App score reporting remains available when
// a game is opened inside Telegram and exposes WebApp initData.
function button(text, url) {
  return { text, url };
}

export function gameKeyboard(game) {
  const url = GAME_URLS[game];
  return { inline_keyboard: [[button('▶️ شروع بازی', url)]] };
}

export async function showGames(chatId) {
  await api.sendMessage({
    chat_id: chatId,
    text: '🎮 <b>Qoqnoos Games</b>\n\n🎲 تخته‌نرد\n✈️ Air Raiders\n🎡 گردونه انتخاب\n\nبازی‌ها روی HTTPS مستقل اجرا می‌شوند و به Backend ربات وابسته نیستند.',
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [button('🎲 تخته‌نرد', GAME_URLS.backgammon)],
        [button('✈️ Air Raiders', GAME_URLS.air)],
        [button('🎡 گردونه', GAME_URLS.wheel)],
      ],
    },
  });
}

export async function leaderboard(chatId, game) {
  const rows = await topScores(game, chatId, 10);
  if (!rows.length) return api.sendMessage({ chat_id: chatId, text: '🏆 هنوز امتیازی ثبت نشده.' });
  const lines = rows.map((r, i) => `${i + 1}. <code>${r.userId}</code> — <b>${r.score}</b>`);
  return api.sendMessage({ chat_id: chatId, text: `🏆 <b>${html(game)}</b>\n\n${lines.join('\n')}`, parse_mode: 'HTML' });
}
