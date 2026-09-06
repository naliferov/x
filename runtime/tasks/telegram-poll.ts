import { getTelegramUpdates } from '../api/telegramBot.ts'

// Manual check for new bot messages: `node runtime/cli.ts run telegram-poll`.
// Stateless — no offset is stored, so each run returns whatever updates
// Telegram still has buffered (~24h) and hasn't been confirmed by an offset yet.
export const run = async (ctx) => {
  const token = ctx.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set')
  }

  const updates = await getTelegramUpdates({ token })

  for (const update of updates) {
    const msg = update.message
    if (!msg) {
      continue
    }
    ctx.log(
      `[${update.update_id}] chat ${msg.chat.id} ${msg.from?.username ?? ''}: ${msg.text ?? '<non-text>'}`,
    )
  }

  ctx.log(`${updates.length} update(s)`)
  return updates
}
