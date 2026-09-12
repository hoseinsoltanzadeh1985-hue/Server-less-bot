import { api } from 'sdk';
import { saveScore, topScores } from 'lib/store';
import { html } from 'lib/util';

export const GAME_URLS = {
  backgammon: 'https://hoseinsoltanzadeh1985-hue.github.io/Server-less-bot/games/backgammon/',
  air: 'https://hoseinsoltanzadeh1985-hue.github.io/Server-less-bot/games/air-raider/',
  wheel: 'https://hoseinsoltanzadeh1985-hue.github.io/Server-less-bot/games/voice-wheel/',
};

export function gameKeyboard(game) {
  const url = GAME_URLS[game];
  return { inline_keyboard: [[{ text: '▶️ شروع بازی', web_app: { url } }]] };
}

export async function showGames(chatId) {
  await api.sendMessage({
    chat_id: chatId,
    text: '🎮 <b>PediGuardian Games</b>\n\n🎲 تخته‌نرد\n✈️ Air Raiders\n🎡 گردونه انتخاب',
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎲 تخته‌نرد', web_app: { url: GAME_URLS.backgammon } }],
        [{ text: '✈️ Air Raiders', web_app: { url: GAME_URLS.air } }],
        [{ text: '🎡 گردونه', web_app: { url: GAME_URLS.wheel } }],
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
