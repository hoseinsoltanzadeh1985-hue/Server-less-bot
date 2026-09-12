// Security boundary for AI.
// IMPORTANT: Telegram Serverless runtime must receive provider secrets through
// a documented secret mechanism. This module intentionally does NOT read
// bot tokens/API keys from source code or the public database.
//
// The provider adapters are prepared around SDK fetch. Until the exact
// Serverless secret API for this deployment is verified from the platform SDK
// reference, AI calls fail closed with a configuration message.

export function aiStatus() {
  return 'AI adapter آماده است؛ کلیدهای Provider باید با مکانیزم Secret رسمی Serverless تنظیم شوند. کلید داخل schema.js یا frontend قرار نمی‌گیرد.';
}

export async function askAI(_prompt) {
  throw new Error('AI secrets are not configured through a verified Serverless secret interface.');
}
