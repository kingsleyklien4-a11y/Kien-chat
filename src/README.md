# Klien Chat starter

This is a public-room, real-time chat starter for Cloudflare Workers + Durable Objects.

## Deploy (recommended)
1. Use a computer with Node.js LTS installed.
2. Unzip the project and open a terminal in the extracted folder.
3. Run: `npm install`
4. Run: `npx wrangler login`
5. Run: `npm run deploy`
6. Open the workers.dev URL shown by Wrangler.

## Phone-only note
The Cloudflare “Hello World” editor alone is not enough: this project needs both `src/worker.js` and `wrangler.toml`, including the Durable Object binding and migration. You can put these files in a GitHub repository and connect that repository to Cloudflare, or deploy with Wrangler on a computer.

## Scope and safety
This is a starter, not a full Telegram clone. It provides public rooms, live messages, and the last 100 messages per room. It does NOT yet have secure accounts, verified usernames, private direct messages, private group membership, channels, file uploads, push notifications, moderation, or end-to-end encryption. Room names are not private; anyone who guesses a room name can join. Add authentication, rate limiting, abuse controls, and privacy features before public production use.
